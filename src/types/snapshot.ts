import { DiscordChannel, DiscordEmoji, DiscordRole, DiscordSticker } from "./index";

export interface SnapshotEmoji extends DiscordEmoji {
  imageBase64: string;
}

export interface SnapshotSticker extends DiscordSticker {
  imageBase64: string;
  mimeType: string;
  filename: string;
}

export interface SnapshotGuildSettings {
  name: string;
  iconBase64: string | null;
  iconIsAnimated: boolean;
  bannerBase64: string | null;
  bannerIsAnimated: boolean;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  afk_timeout: number;
  system_channel_flags: number;
  preferred_locale: string;
}

export interface SnapshotData {
  formatVersion: 1;
  capturedAt: string;
  guild: SnapshotGuildSettings;
  roles: DiscordRole[];
  channels: DiscordChannel[];
  emojis: SnapshotEmoji[];
  stickers: SnapshotSticker[];
}
