import { DiscordClient } from "../api/client";
import { SnapshotData, SnapshotEmoji, SnapshotSticker } from "../types/snapshot";
import { StickerFormat } from "../types";
import { Spinner } from "../ui/spinner";
import { ProgressBar } from "../ui/progressBar";
import { sleep, withTimeout } from "../utils/api";
import { t } from "../i18n";

function stickerMeta(formatType: number): { mimeType: string; filename: string } {
  if (formatType === StickerFormat.GIF) return { mimeType: "image/gif", filename: "sticker.gif" };
  if (formatType === StickerFormat.LOTTIE) return { mimeType: "application/json", filename: "sticker.json" };
  return { mimeType: "image/png", filename: "sticker.png" };
}

export async function captureSnapshot(client: DiscordClient, guildId: string): Promise<SnapshotData> {
  const spinner = new Spinner(t("snapshot.loadingGuild"), "circle").start();

  const [guild, roles, channels, emojis, stickers] = await Promise.all([
    client.getGuild(guildId),
    client.getGuildRoles(guildId),
    client.getGuildChannels(guildId),
    client.getGuildEmojis(guildId),
    client.getGuildStickers(guildId),
  ]);

  spinner.stop();

  let iconBase64: string | null = null;
  let iconIsAnimated = false;
  if (guild.icon) {
    try {
      const url = client.iconUrl(guildId, guild.icon);
      const buffer = await withTimeout(() => client.downloadBuffer(url), 10000);
      iconBase64 = buffer.toString("base64");
      iconIsAnimated = guild.icon.startsWith("a_");
    } catch {
    }
  }

  let bannerBase64: string | null = null;
  let bannerIsAnimated = false;
  if (guild.banner) {
    try {
      const url = client.bannerUrl(guildId, guild.banner);
      const buffer = await withTimeout(() => client.downloadBuffer(url), 10000);
      bannerBase64 = buffer.toString("base64");
      bannerIsAnimated = guild.banner.startsWith("a_");
    } catch {
    }
  }

  const clonableEmojis = emojis.filter((e) => !e.managed && e.available !== false);
  const snapshotEmojis: SnapshotEmoji[] = [];

  if (clonableEmojis.length > 0) {
    const emojiBar = new ProgressBar(t("snapshot.downloadingEmojis"), clonableEmojis.length);
    for (const emoji of clonableEmojis) {
      try {
        const animated = emoji.animated === true;
        const url = client.emojiUrl(emoji.id, animated);
        const buffer = await withTimeout(() => client.downloadBuffer(url), 10000);
        snapshotEmojis.push({ ...emoji, imageBase64: buffer.toString("base64") });
      } catch {
        emojiBar.interrupt(`   ${t("snapshot.emojiDownloadError")}: ${emoji.name}`);
      }
      emojiBar.increment();
      await sleep(300);
    }
    emojiBar.finish();
  }

  const clonableStickers = stickers.filter((s) => s.available !== false);
  const snapshotStickers: SnapshotSticker[] = [];

  if (clonableStickers.length > 0) {
    const stickerBar = new ProgressBar(t("snapshot.downloadingStickers"), clonableStickers.length);
    for (const sticker of clonableStickers) {
      try {
        const url = client.stickerUrl(sticker.id, sticker.format_type);
        const buffer = await withTimeout(() => client.downloadBuffer(url), 10000);
        const { mimeType, filename } = stickerMeta(sticker.format_type);
        snapshotStickers.push({ ...sticker, imageBase64: buffer.toString("base64"), mimeType, filename });
      } catch {
        stickerBar.interrupt(`   ${t("snapshot.stickerDownloadError")}: ${sticker.name}`);
      }
      stickerBar.increment();
      await sleep(300);
    }
    stickerBar.finish();
  }

  return {
    formatVersion: 1,
    capturedAt: new Date().toISOString(),
    guild: {
      name: guild.name,
      iconBase64,
      iconIsAnimated,
      bannerBase64,
      bannerIsAnimated,
      verification_level: guild.verification_level,
      default_message_notifications: guild.default_message_notifications,
      explicit_content_filter: guild.explicit_content_filter,
      afk_timeout: guild.afk_timeout,
      system_channel_flags: guild.system_channel_flags,
      preferred_locale: guild.preferred_locale,
    },
    roles,
    channels,
    emojis: snapshotEmojis,
    stickers: snapshotStickers,
  };
}
