import chalk from "chalk";

const BLUE = chalk.hex("#5865F2");
const GREEN = chalk.hex("#57F287");
const GRAY = chalk.hex("#99AAB5");
const WHITE = chalk.white;

const BAR_WIDTH = 30;
const CLEAR_LINE = "\r\x1b[K";

export class ProgressBar {
  private total: number;
  private current = 0;
  private label: string;

  constructor(label: string, total: number) {
    this.label = label;
    this.total = Math.max(total, 1);
  }

  private render(): void {
    const ratio = Math.min(this.current / this.total, 1);
    const filled = Math.round(ratio * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    const bar = GREEN("█".repeat(filled)) + GRAY("░".repeat(empty));
    const percent = String(Math.round(ratio * 100)).padStart(3, " ");
    const counter = `${this.current}/${this.total}`;

    const line = `   ${BLUE("›")} ${WHITE(this.label)}  ${bar}  ${WHITE(`${percent}%`)}  ${GRAY(counter)}`;

    process.stdout.write(CLEAR_LINE);
    process.stdout.write(line);
  }

  increment(step = 1): void {
    this.current = Math.min(this.current + step, this.total);
    this.render();
  }

  interrupt(line: string): void {
    process.stdout.write(CLEAR_LINE);
    console.log(line);
    this.render();
  }

  finish(): void {
    this.current = this.total;
    this.render();
    process.stdout.write("\n");
  }
}
