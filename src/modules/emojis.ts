import { DiscordClient } from "../api/client";
import { CreateEmojiPayload, DiscordEmoji } from "../types";
import { Spinner } from "../ui/spinner";
import { ProgressBar } from "../ui/progressBar";
import { sleep, withRetry, withTimeout } from "../utils/api";
import { t } from "../i18n";

const EMOJI_LIMIT_CODES = new Set([30008, 30010]);

export interface EmojiWithImage extends DiscordEmoji {
  imageBuffer: Buffer;
}

export type EmojiSource = { guildId: string } | { emojis: EmojiWithImage[] };

function isEmojiLimitError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const response = (err as Record<string, unknown>)["response"];
  if (response === null || typeof response !== "object") return false;
  const data = (response as Record<string, unknown>)["data"];
  if (data === null || typeof data !== "object") return false;
  const code = (data as Record<string, unknown>)["code"];
  return typeof code === "number" && EMOJI_LIMIT_CODES.has(code);
}

export async function cloneEmojis(
  client: DiscordClient,
  source: EmojiSource,
  targetGuildId: string,
  errors: string[]
): Promise<{ cloned: number }> {
  const spinner = new Spinner(t("emojis.loading"), "dots").start();

  const [sourceEmojisRaw, targetEmojis] = await Promise.all([
    "emojis" in source ? Promise.resolve(source.emojis) : client.getGuildEmojis(source.guildId),
    client.getGuildEmojis(targetGuildId),
  ]);

  spinner.stop();

  let cloned = 0;

  if (targetEmojis.length > 0) {
    const deleteBar = new ProgressBar(t("progress.deletingEmojis"), targetEmojis.length);
    for (const emoji of targetEmojis) {
      if (emoji.managed) {
        deleteBar.increment();
        continue;
      }
      try {
        await withTimeout(() => client.deleteEmoji(targetGuildId, emoji.id), 6000);
      } catch {
        errors.push(t("emojis.deleteError", { name: emoji.name }));
      }
      deleteBar.increment();
      await sleep(400);
    }
    deleteBar.finish();
    await sleep(1000);
  }

  const clonable = sourceEmojisRaw.filter((e) => !e.managed && e.available !== false);

  const createBar = new ProgressBar(t("progress.creatingEmojis"), clonable.length);

  const BATCH_SIZE = 10;
  const BATCH_PAUSE_MS = 9000;
  let limitReached = false;

  for (let i = 0; i < clonable.length; i++) {
    if (limitReached) break;

    const emoji = clonable[i]!;

    if (i > 0 && i % BATCH_SIZE === 0) {
      createBar.interrupt(`   ${t("emojis.batchPause", { current: i, total: clonable.length })}`);
      await sleep(BATCH_PAUSE_MS);
    }

    try {
      const animated = emoji.animated === true;
      const buffer =
        "imageBuffer" in emoji
          ? (emoji as EmojiWithImage).imageBuffer
          : await withTimeout(() => client.downloadBuffer(client.emojiUrl(emoji.id, animated)), 10000);
      const mimeType = animated ? "image/gif" : "image/png";
      const imageData = `data:${mimeType};base64,${buffer.toString("base64")}`;

      const payload: CreateEmojiPayload = { name: emoji.name, image: imageData };

      await withRetry(
        () => withTimeout(() => client.createEmoji(targetGuildId, payload), 8000),
        3,
        1200
      );
      cloned++;
    } catch (err: unknown) {
      if (isEmojiLimitError(err)) {
        limitReached = true;
        const remaining = clonable.length - i;
        createBar.interrupt(
          `   ${t("emojis.limitReached", { cloned, total: clonable.length })} (${t("emojis.limitSkipped", { count: remaining })})`
        );
        createBar.interrupt(`   ${t("emojis.limitBoostHint")} — ${t("emojis.limitTiers")}`);
        errors.push(
          t("emojis.limitError", { current: i + 1, total: clonable.length, cloned })
        );
      } else {
        const msg = err instanceof Error ? err.message : t("unknown.error");
        errors.push(t("emojis.cloneError", { name: emoji.name, message: msg }));
        createBar.interrupt(`   ${t("emojis.cloneErrorShort")}: ${emoji.name}`);
      }
    }
    createBar.increment();
    await sleep(700);
  }
  createBar.finish();

  return { cloned };
}
