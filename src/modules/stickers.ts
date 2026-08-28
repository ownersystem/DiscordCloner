import { DiscordClient } from "../api/client";
import { StickerFormat } from "../types";
import { Logger } from "../ui/logger";
import { Spinner } from "../ui/spinner";
import { sleep, withRetry, withTimeout } from "../utils/api";
import { t } from "../i18n";

function stickerMeta(formatType: number): { mimeType: string; filename: string } {
  if (formatType === StickerFormat.GIF) return { mimeType: "image/gif", filename: "sticker.gif" };
  if (formatType === StickerFormat.LOTTIE) return { mimeType: "application/json", filename: "sticker.json" };
  return { mimeType: "image/png", filename: "sticker.png" };
}

export async function cloneStickers(
  client: DiscordClient,
  sourceGuildId: string,
  targetGuildId: string,
  errors: string[]
): Promise<{ cloned: number }> {
  const spinner = new Spinner(t("stickers.loading"), "dots").start();

  const [sourceStickers, targetStickers] = await Promise.all([
    client.getGuildStickers(sourceGuildId),
    client.getGuildStickers(targetGuildId),
  ]);

  spinner.stop();

  let cloned = 0;

  if (targetStickers.length > 0) {
    Logger.step(t("stickers.deletingExisting", { count: targetStickers.length }));
    for (const sticker of targetStickers) {
      try {
        await withTimeout(() => client.deleteSticker(targetGuildId, sticker.id), 6000);
        Logger.delete(t("stickers.deleted"), sticker.name);
      } catch {
        errors.push(t("stickers.deleteError", { name: sticker.name }));
      }
      await sleep(450);
    }
    await sleep(1000);
  }

  const clonable = sourceStickers.filter((s) => s.available !== false);

  Logger.step(t("stickers.cloning", { count: clonable.length }));

  for (const sticker of clonable) {
    try {
      const url = client.stickerUrl(sticker.id, sticker.format_type);
      const buffer = await withTimeout(() => client.downloadBuffer(url), 10000);
      const { mimeType, filename } = stickerMeta(sticker.format_type);

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
      Logger.clone(t("stickers.created"), sticker.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown.error");
      errors.push(t("stickers.cloneError", { name: sticker.name, message: msg }));
      Logger.error(t("stickers.cloneErrorShort"), sticker.name);
    }
    await sleep(600);
  }

  return { cloned };
}
