import type { Vault } from "obsidian";
import ShimData from "./ShimData";
import { basename } from "node:path";
import { Dirent, type Stats } from "node:fs";

export async function readdir(
  path: string,
  opts: {
    withFileTypes?: boolean;
    recursive?: boolean;
  } = {}
): Promise<string[] | Dirent[]> {
  if (opts.recursive) {
    throw new Error(`This shim does not support recursive operations`);
  }

  const [vault, normalizedPath] = parsePath(path);
  const files = await vault.adapter.list(normalizedPath);
  const fileNames = files.files.map((n) => basename(n));
  const folderNames = files.folders.map((n) => basename(n));

  if (opts.withFileTypes) {
    const fileEntities: Dirent[] = [fileNames, folderNames]
      .map((names, arrIdx) =>
        names.map((name) => ({
          name,
          path,
          parentPath: path,
          ...getFileInfoFuncs(arrIdx == 0),
        }))
      )
      .flat();
    return fileEntities;
  }

  return folderNames.concat(fileNames);
}

export async function stat(path: string): Promise<Stats> {
  const [vault, normalizedPath] = parsePath(path);
  const stats = await vault.adapter.stat(normalizedPath);
  if (!stats) throw new Error(`Failed to get stat for: ${normalizedPath}`);
  return {
    ctime: new Date(stats.ctime),
    ctimeMs: stats.ctime,
    mtime: new Date(stats.mtime),
    mtimeMs: stats.mtime,
    size: stats.size,
    ...getFileInfoFuncs(stats.type === "file"),

    // Estimates
    atime: new Date(stats.mtime),
    atimeMs: stats.mtime,
    birthtime: new Date(stats.ctime),
    birthtimeMs: stats.ctime,
  } as Stats;
}

export async function readFile(path: string, opts?: any): Promise<string> {
  if (opts && (typeof opts != "string" || opts != "utf-8")) {
    throw new Error(`This shim doesn't support: ${JSON.stringify(opts)}`);
  }

  const [vault, normalizedPath] = parsePath(path);
  const file = vault.getFileByPath(normalizedPath);
  if (!file) throw new Error(`File does not exist: ${normalizedPath}`);

  const contents = await vault.cachedRead(file);
  return contents;
}

function parsePath(path: string): [Vault, string] {
  const regex = /\/([^\/]+)\/?(.*)/;
  const res = regex.exec(path);
  if (!res || res.length < 3) throw new Error(`Unable to parse path: ${path}`);
  const vaultName = res[1]!;
  const normalizedPath = (res[2] ?? "") === "" ? "/" : res[2]!;
  return [ShimData.getVault(vaultName), normalizedPath];
}

function getFileInfoFuncs(isFile: boolean) {
  return {
    isDirectory: () => !isFile,
    isFile: () => isFile,
    isFIFO: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
  } as const;
}
