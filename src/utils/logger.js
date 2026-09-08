import pc from "picocolors";

export function info(message) {
  console.log(`${pc.cyan("ℹ")} ${message}`);
}

export function success(message) {
  console.log(`${pc.green("✓")} ${message}`);
}

export function warn(message) {
  console.log(`${pc.yellow("⚠")} ${message}`);
}

export function error(message) {
  console.log(`${pc.red("✗")} ${message}`);
}
