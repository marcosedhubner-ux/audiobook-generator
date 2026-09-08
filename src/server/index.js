import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import open from "open";
import { AUDIOS_DIR, SERVER_PORT } from "../config.js";
import { ensureBaseDirs } from "../utils/paths.js";
import { createRouter } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../../public");

async function main() {
  await ensureBaseDirs();

  const app = express();
  app.use(express.static(PUBLIC_DIR));
  app.use("/audios", express.static(AUDIOS_DIR));
  app.use(createRouter());

  app.listen(SERVER_PORT, () => {
    const url = `http://localhost:${SERVER_PORT}`;
    console.log(`Audiobook Generator disponivel em ${url}`);
    open(url);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
