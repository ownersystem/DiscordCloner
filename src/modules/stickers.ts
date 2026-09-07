import { DiscordClient } from "../api/client";
import { StickerFormat, DiscordSticker } from "../types";
import { Spinner } from "../ui/spinner";
import { ProgressBar } from "../ui/progressBar";
import { sleep, withRetry, withTimeout } from "../utils/api";
import { t } from "../i18n";

function stickerMeta(formatType: number): { mimeType: string; filename: string } {
  if (formatType === StickerFormat.GIF) return { mimeType: "image/gif", filename: "sticker.gif" };
  if (formatType === StickerFormat.LOTTIE) return { mimeType: "application/json", filename: "sticker.json" };
  return { mimeType: "image/png", filename: "sticker.png" };
}

export interface StickerWithImage extends DiscordSticker {
  imageBuffer: Buffer;
  mimeType: string;
  filename: string;
}

export type StickerSource = { guildId: string } | { stickers: StickerWithImage[] };

export async function cloneStickers(
  client: DiscordClient,
  source: StickerSource,
  targetGuildId: string,
  errors: string[]
): Promise<{ cloned: number }> {
  const spinner = new Spinner(t("stickers.loading"), "dots").start();

  const [sourceStickersRaw, targetStickers] = await Promise.all([
    "stickers" in source ? Promise.resolve(source.stickers) : client.getGuildStickers(source.guildId),
    client.getGuildStickers(targetGuildId),
  ]);

  spinner.stop();

  let cloned = 0;

  if (targetStickers.length > 0) {
    const deleteBar = new ProgressBar(t("progress.deletingStickers"), targetStickers.length);
    for (const sticker of targetStickers) {
      try {
        await withTimeout(() => client.deleteSticker(targetGuildId, sticker.id), 6000);
      } catch {
        errors.push(t("stickers.deleteError", { name: sticker.name }));
      }
      deleteBar.increment();
      await sleep(450);
    }
    deleteBar.finish();
    await sleep(1000);
  }

  const clonable = sourceStickersRaw.filter((s) => s.available !== false);

  const createBar = new ProgressBar(t("progress.creatingStickers"), clonable.length);

  for (const sticker of clonable) {
    try {
      let buffer: Buffer;
      let mimeType: string;
      let filename: string;

      if ("imageBuffer" in sticker) {
        buffer = (sticker as StickerWithImage).imageBuffer;
        mimeType = (sticker as StickerWithImage).mimeType;
        filename = (sticker as StickerWithImage).filename;
      } else {
        const url = client.stickerUrl(sticker.id, sticker.format_type);
        buffer = await withTimeout(() => client.downloadBuffer(url), 10000);
        const meta = stickerMeta(sticker.format_type);
        mimeType = meta.mimeType;
        filename = meta.filename;
      }

      await withRetry(
        () =>
          withTimeout(
            () =>
              client.createSticker(
                targetGuildId,
                sticker.name,
                sticker.tags || "sticker",
                sticker.description ?? "",
                buffer,
                mimeType,
                filename
              ),
            10000
          ),
        3,
        800
      );

      cloned++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown.error");
      errors.push(t("stickers.cloneError", { name: sticker.name, message: msg }));
      createBar.interrupt(`   ${t("stickers.cloneErrorShort")}: ${sticker.name}`);
    }
    createBar.increment();
    await sleep(600);
  }
  createBar.finish();

  return { cloned };
}
