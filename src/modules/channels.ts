import { DiscordClient } from "../api/client";
import {
  DiscordChannel,
  ChannelType,
  ChannelIdMap,
  RoleIdMap,
  CreateChannelPayload,
  PermissionOverwrite,
} from "../types";
import { Logger } from "../ui/logger";
import { ProgressBar } from "../ui/progressBar";
import { sleep, withRetry, withTimeout } from "../utils/api";
import { t } from "../i18n";

const MAX_CHANNEL_NAME_LENGTH = 100;

function remapPermissionOverwrites(
  overwrites: PermissionOverwrite[],
  roleIdMap: RoleIdMap
): PermissionOverwrite[] {
  return overwrites.map((ow) => ({
    id: ow.type === 0 ? (roleIdMap[ow.id] ?? ow.id) : ow.id,
    type: ow.type,
    allow: ow.allow,
    deny: ow.deny,
  }));
}

function truncateByCodePoints(value: string, maxLength: number): string {
  const codePoints = Array.from(value);
  if (codePoints.length <= maxLength) return value;
  return codePoints.slice(0, maxLength).join("");
}

function normalizeChannelName(rawName: string): string {
  const normalized = rawName.normalize("NFC");
  const collapsedWhitespace = normalized.replace(/\s+/g, " ").trim();
  const withoutControlChars = collapsedWhitespace.replace(/[\u0000-\u001F\u007F]/g, "");
  const truncated = truncateByCodePoints(withoutControlChars, MAX_CHANNEL_NAME_LENGTH);
  return truncated.length > 0 ? truncated : t("channels.unnamed");
}

function stripEmojiAndSymbols(rawName: string): string {
  const withoutEmoji = rawName
    .normalize("NFC")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\p{Emoji_Modifier}/gu, "")
    .replace(/[\u200D\uFE0F]/g, "");
  const collapsedWhitespace = withoutEmoji.replace(/\s+/g, " ").trim();
  const truncated = truncateByCodePoints(collapsedWhitespace, MAX_CHANNEL_NAME_LENGTH);
  return truncated.length > 0 ? truncated : "channel";
}

interface DiscordApiErrorDetail {
  status: number | undefined;
  message: string;
}

function extractApiErrorDetail(err: unknown): DiscordApiErrorDetail {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (err as { response?: { status?: number; data?: unknown } }).response;
    const status = response?.status;
    const data = response?.data as
      | { message?: string; errors?: unknown; code?: number }
      | undefined;

    if (data) {
      const parts: string[] = [];
      if (data.message) parts.push(data.message);
      if (data.errors) {
        try {
          parts.push(JSON.stringify(data.errors));
        } catch {
          parts.push("");
        }
      }
      const message = parts.filter(Boolean).join(" | ") || `HTTP ${status ?? "?"}`;
      return { status, message };
    }

    return { status, message: `HTTP ${status ?? "?"}` };
  }

  return {
    status: undefined,
    message: err instanceof Error ? err.message : t("unknown.error"),
  };
}

function isBadRequest(err: unknown): boolean {
  return extractApiErrorDetail(err).status === 400;
}

function buildChannelPayload(
  channel: DiscordChannel,
  roleIdMap: RoleIdMap,
  validRegions: Set<string>,
  parentId?: string
): CreateChannelPayload {
  const overwrites = channel.permission_overwrites
    ? remapPermissionOverwrites(channel.permission_overwrites, roleIdMap)
    : [];

  const base: CreateChannelPayload = {
    name: channel.name ?? t("channels.unnamed"),
    type: channel.type,
    permission_overwrites: overwrites,
  };

  if (parentId) {
    base.parent_id = parentId;
  }

  switch (channel.type) {
    case ChannelType.GuildText:
    case ChannelType.GuildAnnouncement: {
      if (channel.topic) base.topic = channel.topic;
      if (channel.nsfw !== undefined) base.nsfw = channel.nsfw;
      if (channel.rate_limit_per_user) base.rate_limit_per_user = channel.rate_limit_per_user;
      if (channel.default_auto_archive_duration)
        base.default_auto_archive_duration = channel.default_auto_archive_duration;
      break;
    }

    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice: {
      if (channel.bitrate && channel.bitrate > 0) base.bitrate = channel.bitrate;
      if (channel.user_limit !== undefined) base.user_limit = channel.user_limit;
      if (channel.rtc_region && validRegions.has(channel.rtc_region))
        base.rtc_region = channel.rtc_region;
      if (channel.video_quality_mode !== undefined)
        base.video_quality_mode = channel.video_quality_mode;
      break;
    }

    case ChannelType.GuildForum:
    case ChannelType.GuildMedia: {
      if (channel.topic) base.topic = channel.topic;
      if (channel.nsfw !== undefined) base.nsfw = channel.nsfw;
      if (channel.rate_limit_per_user) base.rate_limit_per_user = channel.rate_limit_per_user;
      if (channel.default_sort_order !== undefined && channel.default_sort_order !== null)
        base.default_sort_order = channel.default_sort_order;
      if (channel.default_forum_layout !== undefined)
        base.default_forum_layout = channel.default_forum_layout;
      if (channel.available_tags) {
        base.available_tags = channel.available_tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          moderated: tag.moderated,
          emoji_id: null,
          emoji_name: tag.emoji_name,
        }));
      }
      if (channel.default_reaction_emoji !== undefined) {
        if (
          channel.default_reaction_emoji !== null &&
          channel.default_reaction_emoji.emoji_id !== null
        ) {
          base.default_reaction_emoji = {
            emoji_id: null,
            emoji_name: channel.default_reaction_emoji.emoji_name,
          };
        } else {
          base.default_reaction_emoji = channel.default_reaction_emoji;
        }
      }
      if (channel.default_thread_rate_limit_per_user !== undefined)
        base.default_thread_rate_limit_per_user = channel.default_thread_rate_limit_per_user;
      break;
    }
  }

  return base;
}

const SAFE_FALLBACK_BITRATE = 64000;

function hasBitrateMaxError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("response" in err)) return false;
  const response = (err as { response?: { data?: unknown } }).response;
  const data = response?.data as
    | { errors?: { bitrate?: { _errors?: Array<{ code?: string }> } } }
    | undefined;
  const bitrateErrors = data?.errors?.bitrate?._errors;
  return Array.isArray(bitrateErrors) && bitrateErrors.some((e) => e?.code === "NUMBER_TYPE_MAX");
}

async function createChannelResilient(
  client: DiscordClient,
  targetGuildId: string,
  payload: CreateChannelPayload,
  originalName: string
): Promise<{ created: import("../types").DiscordChannel; warning: string | undefined }> {
  let currentPayload: CreateChannelPayload = { ...payload };
  const warnings: string[] = [];
  let lastErr: unknown;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await withRetry(
        () => withTimeout(() => client.createChannel(targetGuildId, currentPayload), 8000),
        attempt === 0 ? 3 : 2,
        700,
        (err) => !isBadRequest(err)
      );
      return { created, warning: warnings.length > 0 ? warnings.join("; ") : undefined };
    } catch (err: unknown) {
      lastErr = err;
      if (!isBadRequest(err)) throw err;

      let adjusted = false;

      if (
        typeof currentPayload.bitrate === "number" &&
        currentPayload.bitrate > SAFE_FALLBACK_BITRATE &&
        hasBitrateMaxError(err)
      ) {
        currentPayload = { ...currentPayload, bitrate: SAFE_FALLBACK_BITRATE };
        warnings.push(t("channels.bitrateAdjustedWarning", { bitrate: SAFE_FALLBACK_BITRATE / 1000 }));
        adjusted = true;
      }

      if (!adjusted) {
        const normalizedName = normalizeChannelName(originalName);
        if (currentPayload.name !== normalizedName) {
          currentPayload = { ...currentPayload, name: normalizedName };
          warnings.push(t("channels.normalizedNameWarning"));
          adjusted = true;
        }
      }

      if (!adjusted) {
        const strippedName = stripEmojiAndSymbols(originalName);
        if (currentPayload.name !== strippedName) {
          currentPayload = { ...currentPayload, name: strippedName };
          warnings.push(t("channels.strippedNameWarning", { name: strippedName }));
          adjusted = true;
        }
      }

      if (!adjusted) throw err;
    }
  }

  throw lastErr;
}

export type ChannelSource = { guildId: string } | { channels: DiscordChannel[] };

async function resolveSourceChannels(client: DiscordClient, source: ChannelSource): Promise<DiscordChannel[]> {
  return "guildId" in source ? client.getGuildChannels(source.guildId) : source.channels;
}

export async function cloneChannels(
  client: DiscordClient,
  source: ChannelSource,
  targetGuildId: string,
  roleIdMap: RoleIdMap,
  errors: string[]
): Promise<{ channelIdMap: ChannelIdMap; cloned: number; permissionsApplied: number }> {
  const [sourceChannels, targetChannels, voiceRegions] = await Promise.all([
    resolveSourceChannels(client, source),
    client.getGuildChannels(targetGuildId),
    client.getVoiceRegions().catch(() => []),
  ]);

  const validRegions = new Set(voiceRegions.map((r) => r.id));

  const channelIdMap: ChannelIdMap = {};
  let cloned = 0;
  let permissionsApplied = 0;

  if (targetChannels.length > 0) {
    Logger.step(t("channels.deletingExisting", { count: targetChannels.length }));
    const deleteBar = new ProgressBar(t("progress.deletingChannels"), targetChannels.length);

    for (const ch of targetChannels) {
      try {
        await withTimeout(() => client.deleteChannel(ch.id), 6000);
      } catch {
        errors.push(t("channels.deleteError", { name: ch.name ?? ch.id }));
      }
      deleteBar.increment();
      await sleep(450);
    }
    deleteBar.finish();
  }

  await sleep(1500);

  const categories = sourceChannels
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const nonCategories = sourceChannels
    .filter((c) => c.type !== ChannelType.GuildCategory)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  Logger.step(t("channels.creatingCategories", { count: categories.length }));
  if (categories.length > 0) {
    const categoryBar = new ProgressBar(t("progress.creatingCategories"), categories.length);

    for (const cat of categories) {
      const payload = buildChannelPayload(cat, roleIdMap, validRegions);
      try {
        const { created, warning } = await createChannelResilient(
          client,
          targetGuildId,
          payload,
          cat.name ?? t("channels.unnamed")
        );
        channelIdMap[cat.id] = created.id;
        cloned++;
        if (warning) {
          categoryBar.interrupt(`   ${warning}: ${cat.name ?? ""}`);
        }
      } catch (err: unknown) {
        const detail = extractApiErrorDetail(err);
        errors.push(t("channels.categoryCreateError", { name: cat.name ?? "", message: detail.message }));
        categoryBar.interrupt(`   ${t("channels.categoryCreateErrorShort")}: ${cat.name ?? ""}`);
      }
      categoryBar.increment();
      await sleep(500);
    }
    categoryBar.finish();
  }

  await sleep(1000);

  Logger.step(t("channels.creatingChannels", { count: nonCategories.length }));

  const COMMUNITY_TYPES = [
    ChannelType.GuildAnnouncement,
    ChannelType.GuildForum,
    ChannelType.GuildMedia,
  ];

  if (nonCategories.length > 0) {
  const channelBar = new ProgressBar(t("progress.creatingChannels"), nonCategories.length);

  for (const ch of nonCategories) {
    const resolvedParentId = ch.parent_id ? channelIdMap[ch.parent_id] : undefined;
    const payload = buildChannelPayload(ch, roleIdMap, validRegions, resolvedParentId);

    try {
      const { created, warning } = await createChannelResilient(
        client,
        targetGuildId,
        payload,
        ch.name ?? t("channels.unnamed")
      );
      channelIdMap[ch.id] = created.id;
      cloned++;
      permissionsApplied += ch.permission_overwrites?.length ?? 0;
      if (warning) {
        channelBar.interrupt(`   ${warning}: ${ch.name ?? ""}`);
      }
    } catch (err: unknown) {
      if (COMMUNITY_TYPES.includes(ch.type)) {
        try {
          const minimalPayload: CreateChannelPayload = {
            name: payload.name,
            type: ch.type,
            permission_overwrites: payload.permission_overwrites ?? [],
          };
          if (resolvedParentId) minimalPayload.parent_id = resolvedParentId;
          if (payload.topic) minimalPayload.topic = payload.topic;
          if (payload.nsfw !== undefined) minimalPayload.nsfw = payload.nsfw;
          if (payload.rate_limit_per_user) minimalPayload.rate_limit_per_user = payload.rate_limit_per_user;

          const { created, warning } = await createChannelResilient(
            client,
            targetGuildId,
            minimalPayload,
            ch.name ?? t("channels.unnamed")
          );
          channelIdMap[ch.id] = created.id;
          cloned++;
          permissionsApplied += ch.permission_overwrites?.length ?? 0;
          channelBar.interrupt(`   ${warning ?? t("channels.resetParamsWarning")}: ${ch.name ?? ""}`);
        } catch {
          try {
            const fallback: CreateChannelPayload = {
              name: payload.name,
              type: ChannelType.GuildText,
              permission_overwrites: payload.permission_overwrites ?? [],
            };
            if (resolvedParentId) fallback.parent_id = resolvedParentId;
            if (payload.topic) fallback.topic = payload.topic;
            if (payload.nsfw !== undefined) fallback.nsfw = payload.nsfw;
            if (payload.rate_limit_per_user) fallback.rate_limit_per_user = payload.rate_limit_per_user;

            const { created, warning } = await createChannelResilient(
              client,
              targetGuildId,
              fallback,
              ch.name ?? t("channels.unnamed")
            );
            channelIdMap[ch.id] = created.id;
            cloned++;
            permissionsApplied += ch.permission_overwrites?.length ?? 0;
            channelBar.interrupt(`   ${warning ?? t("channels.fallbackTextWarning")}: ${ch.name ?? ""}`);
          } catch (fallbackErr: unknown) {
            const detail = extractApiErrorDetail(fallbackErr);
            errors.push(t("channels.createError", { name: ch.name ?? "", message: detail.message }));
            channelBar.interrupt(`   ${t("channels.createErrorShort")}: ${ch.name ?? ""}`);
          }
        }
      } else {
        const detail = extractApiErrorDetail(err);
        errors.push(t("channels.createError", { name: ch.name ?? "", message: detail.message }));
        channelBar.interrupt(`   ${t("channels.createErrorShort")}: ${ch.name ?? ""}`);
      }
    }
    channelBar.increment();
    await sleep(500);
  }
  channelBar.finish();
  }

  return { channelIdMap, cloned, permissionsApplied };
}
