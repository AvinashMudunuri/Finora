import { join } from "node:path";

import { startAccountServer } from "./accountRuntime.ts";
import { defaultAccountStorePath } from "./jsonFileAccountStore.ts";
import { defaultCardStorePath } from "./jsonFileCardStore.ts";

const host = process.env.FINORA_ACCOUNT_HOST ?? "127.0.0.1";
const port = Number(process.env.FINORA_ACCOUNT_PORT ?? "4174");
const storePath = defaultAccountStorePath();
const cardStorePath = defaultCardStorePath();
const staticDir =
  process.env.FINORA_STATIC_DIR?.trim() || join(process.cwd(), "dist");

const started = await startAccountServer({
  storePath,
  cardStorePath,
  host,
  port: Number.isFinite(port) ? port : 4174,
  staticDir,
});

process.stdout.write(
  `Finora account server listening on http://${host}:${started.port}\n`,
);
