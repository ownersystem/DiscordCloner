import chalk from "chalk";
import { renderBanner } from "./ui/banner";
import { Logger } from "./ui/logger";
import { prompt, promptSecret, promptConfirm, selectFromList } from "./ui/prompt";
import { authenticate, AuthResult } from "./core/auth";
import { Cloner } from "./core/cloner";
import { LANGUAGES, Locale, setLocale, t } from "./i18n";
import {
  sessionExists,
  isSessionExpired,
  saveSession,
  loadSession,
  peekSessionMeta,
  deleteSession,
  backupSession,
} from "./core/session";
import { loadRecentLogs } from "./utils/logSaver";

const BLUE = chalk.hex("#5865F2");
const GRAY = chalk.hex("#99AAB5");
const CYAN = chalk.hex("#00D4FF");
const GREEN = chalk.hex("#57F287");
const RED = chalk.hex("#ED4245");

const MAX_UNLOCK_ATTEMPTS = 3;

type MenuAction = "continue" | "loggedOut" | "exit";

function isValidSnowflake(id: string): boolean {
  return /^\d{17,20}$/.test(id.trim());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

async function gracefulExit(code = 0): Promise<never> {
  console.log();
  console.log(`   ${GRAY(t("app.sessionEnded"))}`);
  console.log();
  process.exit(code);
}

async function selectLanguage(): Promise<Locale> {
  const items = LANGUAGES.map((lang) => ({
    id: lang.code,
    name: `${lang.flag}  ${lang.label}`,
  }));

  const { id } = await selectFromList(t("lang.promptTitle"), items);
  const locale = id as Locale;
  setLocale(locale);
  return locale;
}

async function promptNewMasterPassword(): Promise<string> {
  while (true) {
    const pw1 = await promptSecret(t("session.setMasterPasswordPrompt"));
    if (pw1.length < 8) {
      Logger.error(t("session.masterPasswordTooShort"));
      continue;
    }
    const pw2 = await promptSecret(t("session.confirmMasterPasswordPrompt"));
    if (pw1 !== pw2) {
      Logger.error(t("session.masterPasswordMismatch"));
      continue;
    }
    return pw1;
  }
}

async function loginWithFreshToken(): Promise<AuthResult> {
  const locale = await selectLanguage();

  let auth: AuthResult | null = null;

  while (!auth) {
    const token = await promptSecret(t("prompt.token"));

    if (!token) {
      Logger.error(t("prompt.tokenEmpty"));
      continue;
    }

    try {
      auth = await authenticate(token);
    } catch {
      Logger.error(t("prompt.authRetry"));
    }
  }

  Logger.info(t("session.autoLoginNew"));

  const wantsToSave = await promptConfirm(t("session.savePrompt"));
  if (wantsToSave) {
    Logger.info(t("session.setMasterPasswordIntro"));
    const password = await promptNewMasterPassword();
    try {
      saveSession(auth.client.token, locale, password);
      Logger.success(t("session.saved"));
    } catch {
      Logger.error(t("session.saveFailed"));
    }
  }

  return auth;
}

async function tryRestoreSession(): Promise<AuthResult | null> {
  if (!sessionExists()) return null;

  if (isSessionExpired()) {
    Logger.warn(t("session.expired"));
    deleteSession();
    return null;
  }

  for (let attempt = 1; attempt <= MAX_UNLOCK_ATTEMPTS; attempt++) {
    const password = await promptSecret(t("session.unlockPrompt"));

    try {
      const session = loadSession(password);
      setLocale(session.locale as Locale);

      try {
        const auth = await authenticate(session.token);
        Logger.info(t("session.autoLoginSaved"));
        return auth;
      } catch {
        Logger.error(t("session.tokenInvalidSaved"));
        deleteSession();
        return null;
      }
    } catch {
      const remaining = MAX_UNLOCK_ATTEMPTS - attempt;
      if (remaining > 0) {
        Logger.error(t("session.unlockFailed"));
        Logger.warn(t("session.unlockAttemptsLeft", { count: remaining }));
      } else {
        Logger.error(t("session.unlockExhausted"));
        deleteSession();
      }
    }
  }

  return null;
}

async function runCloneFlow(auth: AuthResult): Promise<void> {
  console.log();
  console.log(`   ${BLUE("─".repeat(68))}`);
  console.log();

  let sourceGuildId = "";
  while (true) {
    sourceGuildId = await prompt(t("prompt.sourceGuildId"));
    if (isValidSnowflake(sourceGuildId)) break;
    Logger.error(t("prompt.invalidGuildId"));
  }

  let targetGuildId = "";
  while (true) {
    targetGuildId = await prompt(t("prompt.targetGuildId"));
    if (isValidSnowflake(targetGuildId)) break;
    Logger.error(t("prompt.invalidGuildId"));
  }

  if (sourceGuildId === targetGuildId) {
    Logger.error(t("prompt.sameGuildError"));
    return;
  }

  console.log();

  const cloner = new Cloner(auth.client);

  try {
    const result = await cloner.clone({ sourceGuildId, targetGuildId });

    Logger.summary(result);

    if (result.errors.length === 0) {
      Logger.success(t("prompt.cloneSuccessNoErrors"));
    } else {
      Logger.warn(t("prompt.cloneSuccessWithErrors", { count: result.errors.length }));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : t("unknown.error");
    Logger.error(t("prompt.criticalCloneError"), msg);
  }
}

async function runDeleteFlow(): Promise<boolean> {
  console.log();

  if (!sessionExists()) {
    Logger.info(t("delete.nothingToDelete"));
    return false;
  }

  Logger.warn(t("delete.warning"));
  console.log();

  const confirmed = await promptConfirm(t("delete.confirm"));
  if (!confirmed) return false;

  const confirmWord = t("delete.confirmWord");
  const typed = await prompt(t("delete.typeToConfirm", { word: confirmWord }));

  if (typed.trim().toUpperCase() !== confirmWord) {
    Logger.error(t("delete.wrongWord"));
    return false;
  }

  const wantsBackup = await promptConfirm(t("delete.backupOffer"));
  if (wantsBackup) {
    const backupPath = backupSession();
    if (backupPath) {
      Logger.success(t("delete.backupSaved", { path: backupPath }));
    }
  }

  deleteSession();
  Logger.success(t("delete.done"));
  return true;
}

async function runHistoryFlow(): Promise<void> {
  console.log();
  console.log(`   ${CYAN(t("history.title"))}`);
  console.log();

  const entries = loadRecentLogs(10);

  if (entries.length === 0) {
    Logger.info(t("history.empty"));
  } else {
    for (const entry of entries) {
      const line = t("history.entry", {
        date: formatDate(entry.date),
        source: entry.sourceGuild.name,
        target: entry.targetGuild.name,
        errors: entry.result.errors.length,
      });
      const color = entry.result.errors.length > 0 ? RED : GREEN;
      console.log(`   ${GRAY("·")} ${color(line)}`);
    }
  }

  console.log();
  await prompt(t("history.backToMenu"));
}

async function showMainMenu(auth: AuthResult): Promise<MenuAction> {
  const meta = peekSessionMeta();
  const tag =
    auth.user.discriminator === "0"
      ? auth.user.username
      : `${auth.user.username}#${auth.user.discriminator}`;

  if (meta) {
    console.log();
    console.log(
      `   ${GRAY(
        t("menu.accountInfo", {
          tag: CYAN(tag),
          date: formatDate(meta.savedAt),
          count: meta.usageCount,
        })
      )}`
    );
  }

  const items = [
    { id: "clone", name: t("menu.clone") },
    { id: "delete", name: t("menu.deleteData") },
    { id: "switch", name: t("menu.switchAccount") },
    { id: "history", name: t("menu.history") },
    { id: "exit", name: t("menu.exit") },
  ];

  const { id } = await selectFromList(t("menu.title"), items);

  switch (id) {
    case "clone":
      await runCloneFlow(auth);
      return "continue";

    case "delete": {
      const deleted = await runDeleteFlow();
      return deleted ? "loggedOut" : "continue";
    }

    case "switch": {
      const confirmed = await promptConfirm(t("switch.confirm"));
      if (!confirmed) return "continue";
      deleteSession();
      return "loggedOut";
    }

    case "history":
      await runHistoryFlow();
      return "continue";

    default:
      return "exit";
  }
}

async function main(): Promise<void> {
  renderBanner();

  let auth = await tryRestoreSession();
  if (!auth) {
    auth = await loginWithFreshToken();
  }

  while (true) {
    const action = await showMainMenu(auth);

    if (action === "continue") continue;

    if (action === "loggedOut") {
      await main();
      return;
    }

    break;
  }

  await gracefulExit(0);
}

async function handleResetFlag(): Promise<void> {
  if (process.argv.includes("--reset")) {
    if (sessionExists()) {
      deleteSession();
      console.log(`   ${GREEN("✔")}  ${t("session.resetFlagDone")}`);
    }
  }
}

async function bootstrap(): Promise<void> {
  await handleResetFlag();
  await main();
}

process.on("SIGINT", async () => {
  console.log();
  Logger.warn(t("app.interrupted"));
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.log();
  console.log(`   ${RED("✖")}  ${t("app.uncaughtException")}: ${err.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.log();
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.log(`   ${RED("✖")}  ${t("app.unhandledRejection")}: ${msg}`);
  process.exit(1);
});

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
