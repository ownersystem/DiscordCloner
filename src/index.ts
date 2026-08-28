import chalk from "chalk";
import { renderBanner } from "./ui/banner";
import { Logger } from "./ui/logger";
import { prompt, promptSecret, promptConfirm, selectFromList } from "./ui/prompt";
import { authenticate } from "./core/auth";
import { Cloner } from "./core/cloner";
import { LANGUAGES, setLocale, t } from "./i18n";

const BLUE = chalk.hex("#5865F2");
const GRAY = chalk.hex("#99AAB5");
const RED = chalk.hex("#ED4245");

function isValidSnowflake(id: string): boolean {
  return /^\d{17,20}$/.test(id.trim());
}

async function gracefulExit(code = 0): Promise<never> {
  console.log();
  console.log(`   ${GRAY(t("app.sessionEnded"))}`);
  console.log();
  process.exit(code);
}

async function selectLanguage(): Promise<void> {
  const items = LANGUAGES.map((lang) => ({
    id: lang.code,
    name: `${lang.flag}  ${lang.label}`,
  }));

  const { id } = await selectFromList(t("lang.promptTitle"), items);
  setLocale(id as (typeof LANGUAGES)[number]["code"]);
}

async function main(): Promise<void> {
  renderBanner();

  let authResult: Awaited<ReturnType<typeof authenticate>>;

  while (true) {
    const token = await promptSecret(t("prompt.token"));

    if (!token) {
      Logger.error(t("prompt.tokenEmpty"));
      continue;
    }

    try {
      authResult = await authenticate(token);
      break;
    } catch {
      Logger.error(t("prompt.authRetry"));
    }
  }

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
    await gracefulExit(1);
  }

  console.log();

  const cloner = new Cloner(authResult.client);

  try {
    const result = await cloner.clone({
      sourceGuildId,
      targetGuildId,
    });

    Logger.summary(result);

    if (result.errors.length === 0) {
      Logger.success(t("prompt.cloneSuccessNoErrors"));
    } else {
      Logger.warn(t("prompt.cloneSuccessWithErrors", { count: result.errors.length }));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : t("unknown.error");
    Logger.error(t("prompt.criticalCloneError"), msg);
    await gracefulExit(1);
  }

  console.log();
  const again = await promptConfirm(t("prompt.cloneAnother"));

  if (again) {
    await main();
  } else {
    await gracefulExit(0);
  }
}

async function bootstrap(): Promise<void> {
  await selectLanguage();
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
