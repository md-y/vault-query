import { VoyVectorStore } from "@langchain/community/vectorstores/voy";
import { Voy as VoyClient } from "voy-search";
import type { SupportedAPI } from "./ModelAPI";
import type ModelAPI from "./ModelAPI";
import type VaultLoader from "./VaultLoader";
import { Document } from "@langchain/core/documents";

export default class VaultQueryVectorStore {
  private client = new VoyClient();
  private currentStore?: VoyVectorStore;
  private currentStoreAPI?: SupportedAPI;
  private currentDocuments = new Set<Document>();

  constructor(private modelAPI: ModelAPI, private loader: VaultLoader) {}

  async getUpdatedStore(): Promise<VoyVectorStore> {
    const newDocs = await this.loader.loadDocuments();
    if (!this.currentStore || this.currentStoreAPI != this.modelAPI.currentAPI) {
      const embeddings = this.modelAPI.createEmbeddings();
      this.currentStore = new VoyVectorStore(this.client, embeddings);
      await this.currentStore.addDocuments(Array.from(newDocs));
    } else {
      const docsToAdd = newDocs.difference(this.currentDocuments);
      const docsToRemove = this.currentDocuments.difference(newDocs);

      if (docsToRemove.size > 0) {
        // TODO: Can we force it using the underlying client?
        await this.currentStore.delete({ deleteAll: true });
      }

      await this.currentStore.addDocuments(Array.from(docsToAdd));
    }
    this.currentDocuments = newDocs;
    return this.currentStore;
  }
}
