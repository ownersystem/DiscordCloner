import * as readline from "readline";
import chalk from "chalk";
import { t } from "../i18n";

const BLUE = chalk.hex("#5865F2");
const CYAN = chalk.hex("#00D4FF");
const GRAY = chalk.hex("#99AAB5");
const RED = chalk.hex("#ED4245");
const WHITE = chalk.white;
const DIM = chalk.hex("#4752C4");

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();
    const formatted = `   ${BLUE("›")} ${WHITE(question)} ${GRAY("›")} `;
    rl.question(formatted, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function promptSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    const formatted = `   ${BLUE("›")} ${WHITE(question)} ${GRAY("›")} `;
    process.stdout.write(formatted);

    let input = "";
    const stdin = process.stdin as NodeJS.ReadStream;
    let rawModeActive = false;

    const cleanup = (onData: (c: string) => void): void => {
      stdin.removeListener("data", onData);
      if (rawModeActive) {
        try { stdin.setRawMode(false); } catch {}
      }
      stdin.pause();
    };

    const hasRawMode =
      "setRawMode" in stdin &&
      typeof stdin.setRawMode === "function" &&
      stdin.isTTY === true;

    if (hasRawMode) {
      try {
        stdin.setRawMode(true);
        rawModeActive = true;
        stdin.resume();
        stdin.setEncoding("utf8");

        const onData = (char: string): void => {
          for (const c of char) {
            if (c === "\n" || c === "\r" || c === "\u0004") {
              cleanup(onData);
              process.stdout.write("\n");
              resolve(input);
              return;
            }
            if (c === "\u0003") {
              cleanup(onData);
              process.stdout.write("\n");
              process.exit(0);
            }
            if (c === "\u007f") {
              if (input.length > 0) {
                input = input.slice(0, -1);
                process.stdout.write("\b \b");
              }
              continue;
            }
            input += c;
            process.stdout.write(BLUE("•"));
          }
        };

        stdin.on("data", onData);
      } catch {
        const rl = createReadlineInterface();
        rl.question("", (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      }
    } else {
      const rl = createReadlineInterface();
      rl.question("", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export async function promptConfirm(question: string): Promise<boolean> {
  while (true) {
    const answer = await prompt(`${question} ${GRAY("(y/n)")}`);
    const lower = answer.toLowerCase().trim();
    if (lower === "y" || lower === "yes") return true;
    if (lower === "n" || lower === "no") return false;
    console.log(
      `   ${RED("✖")}  ${t("prompt.yesNoHint", { yes: WHITE("y"), no: GRAY("n") })}`
    );
  }
}

export interface SelectItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  danger?: boolean;
  divider?: boolean;
}

export interface SelectOptions {
  hint?: string;
  cancelLabel?: string;
  cancelIcon?: string;
}

export const CANCEL_ID = "__cancel__";

export async function selectFromList<T extends SelectItem>(
  label: string,
  items: T[],
  options?: SelectOptions
): Promise<T> {
  console.log();
  console.log(`   ${CYAN(label)}`);
  console.log();

  const selectable = items.filter((item) => !item.divider);
  const maxNameLength = Math.max(0, ...selectable.map((item) => item.name.length));

  const indexToItem = new Map<number, T>();
  let running = 0;

  items.forEach((item) => {
    if (item.divider) {
      console.log();
      return;
    }

    running++;
    indexToItem.set(running, item);

    const num = BLUE(`[${String(running).padStart(2, " ")}]`);
    const icon = item.icon ? `${item.icon}  ` : "";
    const nameColor = item.danger ? RED : WHITE;
    const paddedName = item.name.padEnd(maxNameLength, " ");

    console.log(`   ${num}  ${icon}${nameColor(paddedName)}`);
    if (item.description) {
      const indent = " ".repeat(6 + (item.icon ? 3 : 0));
      console.log(`   ${indent}${GRAY(item.description)}`);
    }
  });

  if (options?.cancelLabel) {
    console.log();
    const icon = options.cancelIcon ? `${options.cancelIcon}  ` : "";
    console.log(`   ${DIM("[ 0]")}  ${icon}${GRAY(options.cancelLabel)}`);
  }

  console.log();

  if (options?.hint) {
    console.log(`   ${DIM(options.hint)}`);
    console.log();
  }

  while (true) {
    const raw = await prompt(t("lang.enterNumber"));
    const idx = parseInt(raw, 10);

    if (options?.cancelLabel && idx === 0) {
      return { id: CANCEL_ID, name: options.cancelLabel } as T;
    }

    const found = indexToItem.get(idx);
    if (found) {
      return found;
    }

    console.log(
      `   ${RED("✖")}  ${t("prompt.invalidChoice", { max: running })}`
    );
  }
}
