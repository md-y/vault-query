import type { App } from "obsidian";
import VaultLoader from "./VaultLoader";

export default class QueryManager {
  private loader: VaultLoader;

  private initJob?: Promise<void>;

  constructor(app: App) {
    this.loader = new VaultLoader(app.vault.getName());
  }

  init(): Promise<void> {
    if (!this.initJob) {
      this.initJob = new Promise(async (resolve) => {
        await this.loader.loadAll();
        resolve();
      });
    }
    return this.initJob;
  }
}
