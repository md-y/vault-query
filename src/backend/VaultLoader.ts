import { Document } from "@langchain/core/documents";
import { ObsidianLoader } from "@langchain/community/document_loaders/fs/obsidian";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import VaultIndex from "./VaultIndex";
import { join } from "path";
import { v4 as uuid } from "uuid";

const DEFAULT_FORBIDDEN_TAGS = ["excalidraw"];

export default class VaultLoader {
  private textSplitter: MarkdownTextSplitter;

  private loadedDocuments=  new Set<Document>();
  private documentsByPath = new Map<string, Set<Document>>();
  private filesToDelete = new Set<string>();
  private filesToReload = new Set<string>();

  private currentLoadJob?: Promise<Set<Document>>;

  private forbiddenTags: Set<string>;

  constructor(private vaultName: string, forbiddenTags: string[] = DEFAULT_FORBIDDEN_TAGS) {
    this.textSplitter = new MarkdownTextSplitter();
    this.forbiddenTags = new Set(forbiddenTags);
    this.setupVaultEvents();
  }

  loadDocuments(): Promise<Set<Document>> {
    if (!this.currentLoadJob) {
      this.currentLoadJob = new Promise<Set<Document>>(async (resolve) => {
        if (this.loadedDocuments.size === 0) {
          const allDocLoader = new ObsidianLoader(this.getDocumentPath());
          let docs = await allDocLoader.load();
          docs = await this.parseDocuments(docs);
          this.commitDocumentReloads(new Set(docs));
        }

        // Repeat in case a doc is modified during loading
        while (this.filesToReload.size > 0) {
          const loadPromises = Array.from(this.filesToReload).map((path) => {
            const loader = new ObsidianLoader(this.getDocumentPath(path));
            loader.recursive = false;
            return loader.load();
          });
          this.filesToReload.clear();

          let docs = (await Promise.all(loadPromises)).flat();
          docs = await this.parseDocuments(docs);
          this.commitDocumentReloads(new Set(docs));
        }

        this.currentLoadJob = undefined;
        resolve(this.loadedDocuments);
      });
    }
    return this.currentLoadJob;
  }

  private async parseDocuments(docs: Document[]): Promise<Document[]> {
    docs = docs.filter((doc) => {
      const tagsStr: string = doc.metadata.tags ?? "";
      const tags = new Set(tagsStr.split(","));
      return tags.isDisjointFrom(this.forbiddenTags);
    });
    docs.forEach((doc) => {
      if (!doc.id) doc.id = uuid();
    });
    docs = await this.textSplitter.splitDocuments(docs);
    return docs;
  }

  private commitDocumentReloads(reloadedDocs: Set<Document>) {
    const changedFiles: Set<string> = new Set();
    reloadedDocs.forEach((doc) => {
      changedFiles.add(doc.metadata.path);
    });
    const changedDocs = this.popFiles(this.documentsByPath, changedFiles);

    reloadedDocs.forEach((doc) => {
      const path = doc.metadata.path;
      if (!this.documentsByPath.has(path)) this.documentsByPath.set(path, new Set());
      this.documentsByPath.get(path)?.add(doc);
    });

    const deletedDocs = this.popFiles(this.documentsByPath, this.filesToDelete);
    this.filesToDelete.clear();

    this.loadedDocuments = this.loadedDocuments.difference(changedDocs).union(reloadedDocs).difference(deletedDocs);
  }

  private popFiles(map: Map<string, Set<Document>>, paths: Set<string>): Set<Document> {
    let allDocs: Set<Document> = new Set();
    paths.forEach((path) => {
      const docs = map.get(path);
      if (docs) {
        allDocs = allDocs.union(docs);
        map.delete(path);
      }
    });
    return allDocs;
  }

  private setupVaultEvents() {
    let vault = VaultIndex.getVault(this.vaultName);
    vault.on("create", (file) => {
      this.filesToReload.add(file.path);
    });

    vault.on("modify", (file) => {
      this.filesToReload.add(file.path);
    });

    vault.on("rename", (file, oldPath) => {
      this.filesToDelete.add(oldPath);
      this.filesToReload.add(file.path);
    });

    vault.on("delete", (file) => {
      this.filesToDelete.add(file.path);
    });
  }

  private getDocumentPath(docPath?: string): string {
    const root = `/${this.vaultName}`;
    if (docPath) return join(root, docPath);
    return root;
  }
}
