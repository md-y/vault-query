import { Document } from "@langchain/core/documents";
import { ObsidianLoader } from "@langchain/community/document_loaders/fs/obsidian";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import path, { join, extname } from "path";
import { v5 as uuid } from "uuid";
import ObsidianVectorStore from "./ObsidianVectorStore";
import type VaultQueryPlugin from "../main";
import type { TAbstractFile } from "obsidian";

type VaultLoaderOptions = {
  forbiddenTags: string[];
};

const DEFAULT_LOADER_OPTIONS: VaultLoaderOptions = {
  forbiddenTags: ["excalidraw"],
};

export default class VaultLoader {
  private store?: ObsidianVectorStore;
  private didInitialLoad = false;
  private filesToEmbed = new Map<string, Document[]>();
  private filesToDelete = new Set<string>();
  private filesToReload = new Set<string>();

  private textSplitter: MarkdownTextSplitter;

  constructor(private plugin: VaultQueryPlugin, private options = DEFAULT_LOADER_OPTIONS) {
    this.textSplitter = new MarkdownTextSplitter();
    plugin.app.workspace.onLayoutReady(() => this.registerVaultEvents());
  }

  public get vectorStore() {
    return this.store;
  }

  async reset() {
    this.didInitialLoad = false;
    this.filesToEmbed.clear();
    this.filesToDelete.clear();
    this.filesToReload.clear();
    if (this.store) {
      this.store.delete({ clear: true });
      await this.store.save();
    }
    this.store = undefined;
  }

  async syncStoreAndQueue() {
    if (!this.store) throw new Error("Please initialize a store before syncing it");

    this.filesToDelete.forEach((path) => {
      this.filesToEmbed.delete(path);
      this.filesToReload.delete(path);
    });
    await this.store.delete({ deletePaths: Array.from(this.filesToDelete) });
    this.filesToDelete.clear();

    for (const path of this.filesToReload) {
      const docs = await this.loadFiles(this.getDocumentPath(path));
      this.addDocsToEmbed(docs);
    }
    this.filesToReload.clear();
    await this.store.save();

    const originalCount = this.filesToEmbed.size;
    let purgedCount = 0;
    let cachedFileCount = 0;
    for (const [path, docs] of this.filesToEmbed) {
      const loadedIds = this.store.getLoadedDocumentIDsByPath(path);
      const currentIds = new Set(docs.map((doc) => doc.id).filter((v) => v != undefined));
      const idsToPurge = loadedIds.difference(currentIds);
      const newIds = currentIds.difference(loadedIds);
      if (idsToPurge.size > 0) {
        await this.store.delete({ deletePaths: [path] });
        purgedCount += idsToPurge.size;
      } else if (newIds.size == 0) {
        this.filesToEmbed.delete(path);
        cachedFileCount += 1;
      }
    }
    await this.store.save();
    console.log(
      "[Vault Query] Synced vector store by checking the queue of",
      originalCount,
      "files. The store contained",
      purgedCount,
      "out-of-date documents, and the current documents for",
      cachedFileCount,
      "files are already stored. Now,",
      this.filesToEmbed.size,
      "files remain to be embedded"
    );
  }

  async *update(): AsyncGenerator<[number, number]> {
    if (this.plugin.savedStoreAPI !== this.plugin.modelAPI.currentAPI) {
      await this.reset();
      console.log("Reset vector store because the model API has changed");
    }

    if (!this.store) {
      this.store = await ObsidianVectorStore.load(this.plugin, this.plugin.modelAPI.createEmbeddings());
    }

    if (!this.didInitialLoad) {
      this.didInitialLoad = true;
      const allDocs = await this.loadFiles(this.getDocumentPath());
      this.addDocsToEmbed(allDocs);
      // Delete any files from store that no longer exist
      await this.store.delete({ keepPaths: Array.from(this.filesToEmbed.keys()) });
    }

    const embedBatchSize = this.plugin.settings.embedBatchSize;

    const loadStatus: [number, number] = [0, 0];
    while (this.filesToEmbed.size > 0 || this.filesToDelete.size > 0 || this.filesToReload.size > 0) {
      await this.syncStoreAndQueue();

      loadStatus[1] = this.filesToEmbed.size;
      const firstEntry = this.filesToEmbed.entries().take(1).toArray().first();
      if (firstEntry) {
        const [path, docs] = firstEntry;
        const embeddings = this.plugin.modelAPI.createEmbeddings();
        this.filesToEmbed.delete(path);

        const vectors: number[][] = [];
        for (let i = 0; i < docs.length; i += embedBatchSize) {
          const texts = docs.slice(i, i + embedBatchSize).map((d) => d.pageContent);
          const vec = await embeddings.embedDocuments(texts);
          vectors.push(...vec);
          yield loadStatus;
        }

        if (vectors.length != docs.length) {
          throw new Error("Number of document embeddings is different than the number of documents.");
        }

        await this.store.delete({ deletePaths: [path] });
        await this.store.addVectors(vectors, docs);
        await this.store.save();
      }
      loadStatus[0]++;
      yield loadStatus;
    }
  }

  private getFileLoader(path: string) {
    const dirLoader = new ObsidianLoader(path);
    if (extname(path) === "") return dirLoader;
    const fileLoader = dirLoader.loaders[".md"];
    if (!fileLoader) throw new Error("Could not find Obsidian file loader");
    return fileLoader(path);
  }

  async loadFiles(path: string): Promise<Document[]> {
    const loader = this.getFileLoader(path);
    let docs = await loader.load();
    const tagSet = new Set(this.options.forbiddenTags);
    docs = docs.filter((doc) => {
      const tagsStr: string = doc.metadata.tags ?? "";
      const tags = new Set(tagsStr.split(","));
      return tags.isDisjointFrom(tagSet);
    });
    docs = await this.textSplitter.splitDocuments(docs);
    docs.forEach((doc) => {
      if (!doc.id) doc.id = uuid(doc.pageContent, "2cfd07a4-0b14-452d-a23b-84835b288b55");
    });
    return docs;
  }

  private registerVaultEvents() {
    const vault = this.plugin.app.vault;
    const isInvalidFile = (file: TAbstractFile) =>
      !this.didInitialLoad || extname(file.path) == "" || file.vault.getName() != vault.getName();

    vault.on("create", (file) => {
      if (isInvalidFile(file)) return;
      this.filesToReload.add(file.path);
    });

    vault.on("modify", (file) => {
      if (isInvalidFile(file)) return;
      this.filesToReload.add(file.path);
    });

    vault.on("rename", (file, oldPath) => {
      if (extname(oldPath) == "" || isInvalidFile(file)) return;
      this.filesToDelete.add(oldPath);
      this.filesToReload.add(file.path);
    });

    vault.on("delete", (file) => {
      if (isInvalidFile(file)) return;
      this.filesToDelete.add(file.path);
    });
  }

  private get vaultName() {
    return this.plugin.app.vault.getName();
  }

  private getDocumentPath(docPath?: string): string {
    const root = `/${this.vaultName}`;
    if (docPath) return join(root, docPath);
    return root;
  }

  private addDocsToEmbed(docs: Document[]) {
    docs.forEach((doc) => {
      const path = doc.metadata.path;
      if (!this.filesToEmbed.has(path)) this.filesToEmbed.set(path, []);
      this.filesToEmbed.get(path)!.push(doc);
    });
  }
}
