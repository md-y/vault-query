import { build, argv, type BunPlugin, file, stringWidth } from "bun";
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

function replacePackage(pkg: string, replacement: string, ignoreOnCycle = true): BunPlugin {
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

const binaryWasm: BunPlugin = {
  name: "Wasm Loader",
  setup(build) {
    build.onLoad({ filter: /\.wasm$/ }, async (args) => {
      const bytes = await file(args.path).bytes();
      const b64 = Buffer.from(bytes).toBase64();
      return {
        contents: `export default new Uint8Array(Buffer.from("${b64}", "base64"))`,
        loader: "js",
      };
    });
  },
};

await build({
  entrypoints: ["src/main.ts"],
  minify: true,
  outdir,
  target: "node",
  splitting: false,
  external: ["obsidian"],
  plugins: [
    binaryWasm,
    replacePackage("node:path", "path-browserify"),
    replacePackage("uuid", "uuid"), // Langchain imports uuid incorrectly, so this fixes it
    shim("node:fs/promises", "fs.ts"),
    shim("voy-search", "voy.js"),
    copy("static/", outdir),
  ],
  format: "cjs",
});
