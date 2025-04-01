import { env } from "bun";
import { join } from "node:path";

export function getPluginDir() {
  const obsidianPluginDir = env["OBSIDIAN_PLUGIN_DIR"];
  if (!obsidianPluginDir)
    throw new Error("Cannot get plugin dir if OBSIDIAN_PLUGIN_DIR is not set.");
  return join(obsidianPluginDir, "vault-query");
}
