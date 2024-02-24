import chalk from "chalk";

export const info = (msg: string) => {
  console.log(
    `[${chalk.white(Date.now())}][INFO]`,
    chalk.white("BullMQ Proxy:"),
    msg
  );
};

export const warn = (msg: string) => {
  console.log(
    `[${chalk.white(Date.now())}][WARN]`,
    chalk.yellow("BullMQ Proxy:"),
    chalk.magenta(msg)
  );
};

export const error = (msg: string) => {
  console.log(
    `[${chalk.white(Date.now())}] [ERR]`,
    chalk.yellow("BullMQ Proxy:"),
    chalk.red(msg)
  );
};

export const debug = (msg: string) => {
  console.log(
    `[${chalk.white(Date.now())}][DBG]`,
    chalk.yellow("BullMQ Proxy:"),
    chalk.blue(msg)
  );
}
