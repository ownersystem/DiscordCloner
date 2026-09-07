import { DiscordClient } from "../api/client";
import { RoleIdMap, CreateRolePayload, DiscordRole } from "../types";
import { Logger } from "../ui/logger";
import { Spinner } from "../ui/spinner";
import { ProgressBar } from "../ui/progressBar";
import { sleep, withRetry, withTimeout } from "../utils/api";
import { t } from "../i18n";

export interface CloneRolesOptions {
  includePermissions: boolean;
  includePositions: boolean;
}

export type RoleSource = { guildId: string } | { roles: DiscordRole[] };

async function resolveSourceRoles(client: DiscordClient, source: RoleSource): Promise<DiscordRole[]> {
  return "guildId" in source ? client.getGuildRoles(source.guildId) : source.roles;
}

export async function cloneRoles(
  client: DiscordClient,
  source: RoleSource,
  targetGuildId: string,
  errors: string[],
  options: CloneRolesOptions = { includePermissions: true, includePositions: true }
): Promise<{ roleIdMap: RoleIdMap; cloned: number }> {
  const spinner = new Spinner(t("roles.loading"), "dots").start();

  const [sourceRoles, targetRoles] = await Promise.all([
    resolveSourceRoles(client, source),
    client.getGuildRoles(targetGuildId),
  ]);

  spinner.stop();

  const roleIdMap: RoleIdMap = {};
  let cloned = 0;

  const deletableTargetRoles = targetRoles.filter(
    (r) => r.name !== "@everyone" && !r.managed
  );

  if (deletableTargetRoles.length > 0) {
    const deleteBar = new ProgressBar(t("progress.deletingRoles"), deletableTargetRoles.length);

    for (const role of deletableTargetRoles) {
      try {
        await withTimeout(() => client.deleteRole(targetGuildId, role.id), 6000);
      } catch {
        errors.push(t("roles.deleteError", { name: role.name }));
      }
      deleteBar.increment();
      await sleep(350);
    }
    deleteBar.finish();

    await sleep(1000);
  }

  const sortedRoles = [...sourceRoles]
    .filter((r) => r.name !== "@everyone" && !r.managed)
    .sort((a, b) => a.position - b.position);

  const createBar = new ProgressBar(t("progress.creatingRoles"), sortedRoles.length);

  const createdRoles: Array<{ oldId: string; newId: string; position: number }> = [];

  for (const sourceRole of sortedRoles) {
    const payload: CreateRolePayload = {
      name: sourceRole.name,
      permissions: options.includePermissions ? sourceRole.permissions : "0",
      color: sourceRole.color,
      hoist: sourceRole.hoist,
      mentionable: sourceRole.mentionable,
    };

    if (sourceRole.unicode_emoji !== undefined && sourceRole.unicode_emoji !== null) {
      payload.unicode_emoji = sourceRole.unicode_emoji;
    }

    try {
      const newRole = await withRetry(
        () => withTimeout(() => client.createRole(targetGuildId, payload), 8000),
        3,
        600
      );
      roleIdMap[sourceRole.id] = newRole.id;
      createdRoles.push({ oldId: sourceRole.id, newId: newRole.id, position: sourceRole.position });
      cloned++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown.error");
      errors.push(t("roles.createError", { name: sourceRole.name, message: msg }));
      createBar.interrupt(`   ${t("roles.createErrorShort")}: ${sourceRole.name}`);
    }
    createBar.increment();
    await sleep(400);
  }
  createBar.finish();

  if (options.includePositions && createdRoles.length > 0) {
    Logger.step(t("roles.sortingPositions"));
    const positionPayload = createdRoles
      .sort((a, b) => a.position - b.position)
      .map((r, i) => ({ id: r.newId, position: i + 1 }));

    try {
      await client.modifyRolePositions(targetGuildId, positionPayload);
      Logger.success(t("roles.positionsApplied"));
    } catch {
      errors.push(t("roles.positionsError"));
    }
  }

  const everyoneSource = sourceRoles.find((r) => r.name === "@everyone");
  const everyoneTarget = targetRoles.find((r) => r.name === "@everyone");

  if (everyoneSource && everyoneTarget) {
    roleIdMap[everyoneSource.id] = everyoneTarget.id;
  }

  return { roleIdMap, cloned };
}
