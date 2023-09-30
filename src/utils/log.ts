import chalk from "chalk";

export const log = (msg: string) => {
  console.log(
    `[${chalk.white(Date.now())}]`,
    chalk.yellow("BullMQ Proxy:"),
    msg
  );
};

export const warn = (msg: string) => {
  console.log(
    `[${chalk.white(Date.now())}]`,
    chalk.yellow("BullMQ Proxy:"),
    chalk.magenta(msg)
  );
};

export const error = (msg: string) => {
  console.log(
    `[${chalk.white(Date.now())}]`,
    chalk.yellow("BullMQ Proxy:"),
    chalk.red(msg)
  );
};
