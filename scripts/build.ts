import { build, env, argv } from "bun";
import copy from "bun-copy-plugin";
import { getPluginDir } from "./util";

const outdir = argv.includes("--to-vault") ? getPluginDir() : "dist";

await build({
  entrypoints: ["src/main.ts"],
  minify: true,
  outdir,
  target: "node",
  splitting: false,
  external: ["obsidian"],
  plugins: [copy("static/", outdir)],
  format: "cjs",
});
