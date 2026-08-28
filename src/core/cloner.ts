import { DiscordClient } from "../api/client";
import { CloneOptions, CloneResult } from "../types";
import { Logger } from "../ui/logger";
import { Spinner } from "../ui/spinner";
import { cloneRoles } from "../modules/roles";
import { cloneChannels } from "../modules/channels";
import { cloneEmojis } from "../modules/emojis";
import { cloneStickers } from "../modules/stickers";
import { renderSectionHeader, renderSectionFooter } from "../ui/banner";
import { promptConfirm, selectFromList } from "../ui/prompt";
import { sleep } from "../utils/api";
import { saveLog } from "../utils/logSaver";
import { t } from "../i18n";

async function sectionPause(label: string): Promise<void> {
  const spinner = new Spinner(t("cloner.waitingStabilization", { label }), "dots").start();
  await sleep(2500);
  spinner.stop();
}

export class Cloner {
  constructor(private readonly client: DiscordClient) {}

  async clone(options: CloneOptions): Promise<CloneResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const spinner = new Spinner(t("cloner.loadingGuildInfo"), "circle").start();

    let sourceName = "";
    let targetName = "";
    let sourceIconHash: string | null = null;
    let sourceBannerHash: string | null = null;
    let sourceId = options.sourceGuildId;

    try {
      const [source, target] = await Promise.all([
        this.client.getGuild(options.sourceGuildId),
        this.client.getGuild(options.targetGuildId),
      ]);

      sourceName = source.name;
      targetName = target.name;
      sourceIconHash = source.icon;
      sourceBannerHash = source.banner;
      sourceId = source.id;
      spinner.succeed(t("cloner.guildsLoaded"));
    } catch (err: unknown) {
      spinner.fail(t("cloner.guildsLoadError"));
      const msg = err instanceof Error ? err.message : t("unknown.error");
      throw new Error(t("cloner.guildsFetchError", { message: msg }));
    }

    const statsSpinner = new Spinner(t("cloner.collectingStats"), "dots").start();
    let rolesCount = 0;
    let channelsCount = 0;
    let emojisCount = 0;
    let stickersCount = 0;

    try {
      const [roles, channels, emojis, stickers] = await Promise.all([
        this.client.getGuildRoles(options.sourceGuildId),
        this.client.getGuildChannels(options.sourceGuildId),
        this.client.getGuildEmojis(options.sourceGuildId),
        this.client.getGuildStickers(options.sourceGuildId),
      ]);
      rolesCount = roles.filter((r) => r.name !== "@everyone" && !r.managed).length;
      channelsCount = channels.length;
      emojisCount = emojis.filter((e) => !e.managed && e.available !== false).length;
      stickersCount = stickers.filter((s) => s.available !== false).length;
      statsSpinner.stop();
    } catch {
      statsSpinner.stop();
    }

    Logger.info(t("cloner.sourceServer"), sourceName);
    Logger.info(t("cloner.targetServer"), targetName);
    console.log();

    const MODE_ITEMS = [
      {
        id: "full",
        name: t("cloner.modeFull"),
      },
      {
        id: "media",
        name: t("cloner.modeMedia", { emojis: emojisCount, stickers: stickersCount }),
      },
      {
        id: "roles_basic",
        name: t("cloner.modeRolesBasic", { roles: rolesCount }),
      },
      {
        id: "roles_perms",
        name: t("cloner.modeRolesPerms", { roles: rolesCount }),
      },
      {
        id: "roles_full",
        name: t("cloner.modeRolesFull", { roles: rolesCount }),
      },
    ];

    const { id: mode } = await selectFromList(t("cloner.modeTitle"), MODE_ITEMS);
    console.log();

    if (mode === "media") {
      Logger.info(t("cloner.emojisToCopy"), String(emojisCount));
      Logger.info(t("cloner.stickersToCopy"), String(stickersCount));
      console.log();

      const confirmedMedia = await promptConfirm(t("cloner.confirmMedia"));
      if (!confirmedMedia) {
        Logger.info(t("cloner.cancelled"));
        process.exit(0);
      }

      console.log();

      let emojisCloned = 0;
      let stickersCloned = 0;

      if (emojisCount > 0) {
        renderSectionHeader(t("cloner.emojisSectionTitle"));
        const { cloned: ec } = await cloneEmojis(
          this.client,
          options.sourceGuildId,
          options.targetGuildId,
          errors
        );
        emojisCloned = ec;
        Logger.success(t("cloner.emojisCopied", { count: emojisCloned }));
        renderSectionFooter();
      }

      if (stickersCount > 0) {
        if (emojisCount > 0) await sectionPause(t("cloner.emojisSectionTitle"));
        renderSectionHeader(t("cloner.stickersSectionTitle"));
        const { cloned: sc } = await cloneStickers(
          this.client,
          options.sourceGuildId,
          options.targetGuildId,
          errors
        );
        stickersCloned = sc;
        Logger.success(t("cloner.stickersCopied", { count: stickersCloned }));
        renderSectionFooter();
      }

      const mediaDuration = Date.now() - startTime;
      const mediaResult = {
        rolesCloned: 0,
        channelsCloned: 0,
        permissionsApplied: 0,
        emojisCloned,
        stickersCloned,
        errors,
        duration: mediaDuration,
      };

      saveLog({
        date: new Date().toISOString(),
        sourceGuild: { id: options.sourceGuildId, name: sourceName },
        targetGuild: { id: options.targetGuildId, name: targetName },
        result: mediaResult,
      });

      return mediaResult;
    }

    if (mode === "roles_basic" || mode === "roles_perms" || mode === "roles_full") {
      const modeLabels: Record<string, string> = {
        roles_basic: t("cloner.modeLabelRolesBasic"),
        roles_perms: t("cloner.modeLabelRolesPerms"),
        roles_full: t("cloner.modeLabelRolesFull"),
      };

      Logger.info(t("cloner.rolesModeLabel"), modeLabels[mode]);
      Logger.info(t("cloner.rolesToCopy"), String(rolesCount));
      console.log();

      const confirmedRoles = await promptConfirm(t("cloner.confirmRoles", { mode: modeLabels[mode] ?? "" }));
      if (!confirmedRoles) {
        Logger.info(t("cloner.cancelled"));
        process.exit(0);
      }

      console.log();

      const roleOptions = {
        includePermissions: mode === "roles_perms" || mode === "roles_full",
        includePositions: mode === "roles_full",
      };

      renderSectionHeader(t("cloner.rolesSectionTitle"));
      const { cloned: rolesCloned } = await cloneRoles(
        this.client,
        options.sourceGuildId,
        options.targetGuildId,
        errors,
        roleOptions
      );
      Logger.success(t("cloner.rolesCopied", { count: rolesCloned }));
      renderSectionFooter();

      const rolesDuration = Date.now() - startTime;
      const rolesResult = {
        rolesCloned,
        channelsCloned: 0,
        permissionsApplied: 0,
        emojisCloned: 0,
        stickersCloned: 0,
        errors,
        duration: rolesDuration,
      };

      saveLog({
        date: new Date().toISOString(),
        sourceGuild: { id: options.sourceGuildId, name: sourceName },
        targetGuild: { id: options.targetGuildId, name: targetName },
        result: rolesResult,
      });

      return rolesResult;
    }

    Logger.warn(t("cloner.destructiveWarning1"));
    Logger.warn(t("cloner.destructiveWarning2"));
    console.log();

    const copyName = await promptConfirm(t("cloner.confirmCopyName", { name: sourceName }));
    const copyIcon =
      sourceIconHash !== null
        ? await promptConfirm(t("cloner.confirmCopyIcon"))
        : false;
    const copyBanner =
      sourceBannerHash !== null
        ? await promptConfirm(t("cloner.confirmCopyBanner"))
        : false;

    console.log();

    const confirmedFull = await promptConfirm(t("cloner.confirmFull"));
    if (!confirmedFull) {
      Logger.info(t("cloner.cancelled"));
      process.exit(0);
    }

    console.log();

    Logger.preCloneStats({
      roles: rolesCount,
      channels: channelsCount,
      emojis: emojisCount,
      stickers: stickersCount,
      copyEmojis: false,
      copyStickers: false,
    });

    if (copyName || copyIcon || copyBanner) {
      renderSectionHeader(t("cloner.settingsSectionTitle"));
      await this.syncGuildSettings(
        options.sourceGuildId,
        sourceId,
        options.targetGuildId,
        sourceIconHash,
        sourceBannerHash,
        sourceName,
        copyName,
        copyIcon,
        copyBanner,
        errors
      );
      renderSectionFooter();
      await sectionPause(t("cloner.settingsShort"));
    }

    renderSectionHeader(t("cloner.rolesSectionTitle"));

    const { roleIdMap, cloned: rolesCloned } = await cloneRoles(
      this.client,
      options.sourceGuildId,
      options.targetGuildId,
      errors
    );

    Logger.success(t("cloner.rolesCloned", { count: rolesCloned }));
    renderSectionFooter();

    await sectionPause(t("cloner.rolesSectionTitle"));

    renderSectionHeader(t("cloner.channelsSectionTitle"));

    const { cloned: channelsCloned, permissionsApplied } = await cloneChannels(
      this.client,
      options.sourceGuildId,
      options.targetGuildId,
      roleIdMap,
      errors
    );

    Logger.success(t("cloner.channelsCloned", { count: channelsCloned }));
    renderSectionFooter();

    if (!copyName && !copyIcon && !copyBanner) {
      renderSectionHeader(t("cloner.settingsSectionTitle"));
      await this.syncGuildSettings(
        options.sourceGuildId,
        sourceId,
        options.targetGuildId,
        sourceIconHash,
        sourceBannerHash,
        sourceName,
        false,
        false,
        false,
        errors
      );
      renderSectionFooter();
    }

    const duration = Date.now() - startTime;

    const cloneResult = {
      rolesCloned,
      channelsCloned,
      permissionsApplied,
      emojisCloned: 0,
      stickersCloned: 0,
      errors,
      duration,
    };

    saveLog({
      date: new Date().toISOString(),
      sourceGuild: { id: options.sourceGuildId, name: sourceName },
      targetGuild: { id: options.targetGuildId, name: targetName },
      result: cloneResult,
    });

    return cloneResult;
  }

  private async syncGuildSettings(
    sourceGuildId: string,
    sourceId: string,
    targetGuildId: string,
    iconHash: string | null,
    bannerHash: string | null,
    sourceName: string,
    copyName: boolean,
    copyIcon: boolean,
    copyBanner: boolean,
    errors: string[]
  ): Promise<void> {
    try {
      const source = await this.client.getGuild(sourceGuildId);

      const patch: Partial<{
        name: string;
        icon: string | null;
        banner: string | null;
        verification_level: number;
        default_message_notifications: number;
        explicit_content_filter: number;
        afk_timeout: number;
        system_channel_flags: number;
        preferred_locale: string;
      }> = {
        verification_level: source.verification_level,
        default_message_notifications: source.default_message_notifications,
        explicit_content_filter: source.explicit_content_filter,
        afk_timeout: source.afk_timeout,
        system_channel_flags: source.system_channel_flags,
        preferred_locale: source.preferred_locale,
      };

      if (copyName) {
        patch.name = sourceName;
        Logger.step(t("cloner.copyingName"));
      }

      if (copyIcon && iconHash !== null) {
        try {
          const url = this.client.iconUrl(sourceId, iconHash);
          const buffer = await this.client.downloadBuffer(url);
          const mime = iconHash.startsWith("a_") ? "image/gif" : "image/png";
          patch.icon = `data:${mime};base64,${buffer.toString("base64")}`;
          Logger.step(t("cloner.copyingIcon"));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : t("unknown.error");
          errors.push(t("cloner.iconError", { message: msg }));
          Logger.error(t("cloner.iconErrorShort"));
        }
      }

      if (copyBanner && bannerHash !== null) {
        try {
          const url = this.client.bannerUrl(sourceId, bannerHash);
          const buffer = await this.client.downloadBuffer(url);
          const mime = bannerHash.startsWith("a_") ? "image/gif" : "image/png";
          patch.banner = `data:${mime};base64,${buffer.toString("base64")}`;
          Logger.step(t("cloner.copyingBanner"));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : t("unknown.error");
          errors.push(t("cloner.bannerError", { message: msg }));
          Logger.error(t("cloner.bannerErrorShort"));
        }
      }

      await this.client.modifyGuild(targetGuildId, patch);
      Logger.success(t("cloner.settingsSynced"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown.error");
      errors.push(t("cloner.settingsError", { message: msg }));
      Logger.error(t("cloner.settingsErrorShort"));
    }
  }
}
