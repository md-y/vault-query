import VaultLoader from "./VaultLoader";
import type VaultQueryPlugin from "../obsidian/VaultQueryPlugin";
import VaultQueryVectorStore from "./VaultQueryVectorStore";

export default class QueryManager {
  private loader: VaultLoader;
  private store: VaultQueryVectorStore;
  private initJob?: Promise<void>;

  constructor(private plugin: VaultQueryPlugin) {
    this.loader = new VaultLoader(plugin.app.vault.getName());
    this.store = new VaultQueryVectorStore(plugin.modelAPI, this.loader);
  }

  init(): Promise<void> {
    if (!this.initJob) {
      this.initJob = new Promise(async (resolve) => {
        const store = await this.store.getUpdatedStore();
        console.log(store);
        // TODO: https://js.langchain.com/docs/tutorials/rag/
        resolve();
      });
    }
    return this.initJob;
  }
}
