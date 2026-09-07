import chalk from "chalk";
import { t } from "../i18n";

const BLUE_BRIGHT = chalk.hex("#7289DA").bold;
const BLUE_DIM = chalk.hex("#4752C4");
const CYAN = chalk.hex("#00D4FF");
const WHITE = chalk.white;
const GRAY = chalk.hex("#99AAB5");

const ASCII_LOGO = `
██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ ██████╗
██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
██║  ██║██║███████╗██║     ██║   ██║██████╔╝██║  ██║
██║  ██║██║╚════██║██║     ██║   ██║██╔══██╗██║  ██║
██████╔╝██║███████║╚██████╗╚██████╔╝██║  ██║██████╔╝
╚═════╝ ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝
 ██████╗██╗      ██████╗ ███╗   ██╗███████╗██████╗
██╔════╝██║     ██╔═══██╗████╗  ██║██╔════╝██╔══██╗
██║     ██║     ██║   ██║██╔██╗ ██║█████╗  ██████╔╝
██║     ██║     ██║   ██║██║╚██╗██║██╔══╝  ██╔══██╗
╚██████╗███████╗╚██████╔╝██║ ╚████║███████╗██║  ██║
 ╚═════╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝`;

const LINE = BLUE_DIM("─".repeat(70));
const SHORT_LINE = BLUE_DIM("─".repeat(56));

export function printDivider(): void {
  console.log(`   ${SHORT_LINE}`);
}

function padLabel(label: string, width: number): string {
  return label.padEnd(width, " ");
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function typewrite(prefix: string, text: string, colorFn: (s: string) => string, delayMs: number): Promise<void> {
  process.stdout.write(prefix);
  for (const ch of text) {
    process.stdout.write(colorFn(ch));
    await sleep(delayMs);
  }
}

export async function renderBanner(animated = false): Promise<void> {
  console.clear();

  const logoLines = ASCII_LOGO.split("\n").filter((l) => l.trim().length > 0);

  console.log();
  console.log(LINE);
  console.log();

  if (animated) {
    for (const line of logoLines) {
      console.log(BLUE_BRIGHT(line));
      await sleep(35);
    }
    await sleep(150);
  } else {
    logoLines.forEach((line) => {
      console.log(BLUE_BRIGHT(line));
    });
  }

  console.log();
  console.log(LINE);
  console.log();

  const labelSystem = "system";
  const labelOwner = "owner";
  const labelVersion = "version";
  const labelBuild = "build";

  const valueSystem = "DiscordCloner";
  const valueOwner = "ownersystem";
  const valueVersion = "8.2";
  const valueBuild = "stable";

  const leftLabelWidth = Math.max(labelSystem.length, labelOwner.length);
  const leftValueWidth = Math.max(valueSystem.length, valueOwner.length);
  const rightLabelWidth = Math.max(labelVersion.length, labelBuild.length);

  const divider = BLUE_DIM("│");

  const line1 =
    `   ${GRAY(padLabel(labelSystem, leftLabelWidth))}  ${CYAN(valueSystem.padEnd(leftValueWidth))}  ` +
    `${divider}  ${GRAY(padLabel(labelVersion, rightLabelWidth))}  ${WHITE(valueVersion)}`;
  const line2 =
    `   ${GRAY(padLabel(labelOwner, leftLabelWidth))}  ${CYAN(valueOwner.padEnd(leftValueWidth))}  ` +
    `${divider}  ${GRAY(padLabel(labelBuild, rightLabelWidth))}  ${WHITE(valueBuild)}`;

  if (animated) {
    console.log(line1);
    await sleep(80);
    console.log(line2);
    await sleep(200);
  } else {
    console.log(line1);
    console.log(line2);
  }

  console.log();

  if (animated) {
    await typewrite("   © ", "2026 ownersystem", GRAY, 12);
    process.stdout.write(`  ${GRAY("—")}  `);
    await typewrite("", "All rights reserved. DiscordCloner is proprietary software.", GRAY, 6);
    process.stdout.write("\n");
    await sleep(250);
  } else {
    console.log(
      `   ${GRAY("©")} ${WHITE("2026 ownersystem")}  ${GRAY("—")}  ${GRAY("All rights reserved. DiscordCloner is proprietary software.")}`
    );
  }

  console.log();
  console.log(LINE);
  console.log();
  console.log(
    `   ${GRAY(t("banner.hint"))}`
  );
  console.log();
}

export function renderSectionHeader(title: string): void {
  const pad = "─".repeat(Math.max(0, 68 - title.length - 4));
  console.log();
  console.log(BLUE_DIM(`┌── ${title} ${pad}┐`));
  console.log();
}

export function renderSectionFooter(): void {
  console.log();
  console.log(BLUE_DIM("└" + "─".repeat(69) + "┘"));
  console.log();
}
