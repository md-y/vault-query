import type { Document } from "@langchain/core/documents";
import { ObsidianLoader } from "@langchain/community/document_loaders/fs/obsidian";
import { MarkdownTextSplitter } from "@langchain/textsplitters";

const DEFAULT_FORBIDDEN_TAGS = ["excalidraw"];

export default class VaultLoader {
  private obsidianLoader: ObsidianLoader;
  private textSplitter: MarkdownTextSplitter;
  private docs: Document[] = [];

  private loadJob?: Promise<Document[]>;

  constructor(
    vaultName: string,
    private forbiddenTags = DEFAULT_FORBIDDEN_TAGS
  ) {
    this.obsidianLoader = new ObsidianLoader(`/${vaultName}`);
    this.textSplitter = new MarkdownTextSplitter();
  }

  loadAll(): Promise<Document[]> {
    if (!this.loadJob) {
      this.loadJob = new Promise(async (resolve) => {
        let loadedDocs = await this.obsidianLoader.load();
        loadedDocs = this.filterDocuments(loadedDocs);
        this.docs = await this.textSplitter.splitDocuments(loadedDocs);
        resolve(this.docs);
      });
    }
    return this.loadJob;
  }

  get documents() {
    return this.docs;
  }

  private filterDocuments(docs: Document[]): Document[] {
    return docs.filter((doc) => {
      const tagsStr: string = doc.metadata.tags ?? "";
      const tags = tagsStr.split(",");
      const hasForbidden = tags.some((t) => this.forbiddenTags.includes(t));
      return !hasForbidden;
    });
  }
}
