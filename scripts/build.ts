import { build, argv, type BunPlugin, type OnResolveCallback } from "bun";
import copy from "bun-copy-plugin";
import { getPluginDir } from "./util";
import { join, normalize } from "node:path";

const outdir = argv.includes("--to-vault") ? getPluginDir() : "dist";

function resolvePackage(pkg: string) {
  return normalize(import.meta.resolve(pkg).replace("file://", ""));
}

function shim(pkg: string, shimFile = `${pkg}.ts`): BunPlugin {
  const path = normalize(join(import.meta.dir, "..", "src", "shims", shimFile));
  return replacePackage(pkg, path);
}

function replacePackage(
  pkg: string,
  replacement: string,
  ignoreOnCycle = true
): BunPlugin {
  const path = resolvePackage(replacement);
  return {
    name: `Package Replacement: ${pkg} to ${replacement}`,
    setup(build) {
      build.onResolve({ filter: new RegExp(`^${pkg}$`) }, (args) => {
        const scriptPath = args.importer;
        if (scriptPath === path && ignoreOnCycle) {
          return { path: resolvePackage(args.path) };
        }
        return { path };
      });
    },
  };
}

await build({
  entrypoints: ["src/main.ts"],
  // minify: true,
  outdir,
  target: "node",
  splitting: false,
  external: ["obsidian"],
  plugins: [
    replacePackage("node:path", "path-browserify"),
    shim("uuid"),
    shim("node:fs/promises", "fs.ts"),
    copy("static/", outdir),
  ],
  format: "cjs",
});
