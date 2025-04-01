import { rm, exists } from "node:fs/promises";
import { getPluginDir } from "./util";

try {
  const pluginDir = getPluginDir();
  if (!(await exists(pluginDir))) throw new Error("Plugin already deactivated");
  rm(pluginDir, { recursive: true });
  console.log("Deactivated");
} catch (err) {
  console.log(`Could not deactivate: ${err}`);
}
