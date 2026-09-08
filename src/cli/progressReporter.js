import cliProgress from "cli-progress";
import pc from "picocolors";

export function createProgressBar(total) {
  const bar = new cliProgress.SingleBar(
    {
      format: `${pc.magenta("Narrando")} |{bar}| {percentage}% | {value}/{total} trechos`,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(total, 0);
  return {
    increment: () => bar.increment(),
    stop: () => bar.stop(),
  };
}
