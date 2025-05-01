import ModelAPI, { SupportedAPI } from "../backend/ModelAPI";
import QueryManager from "../backend/QueryManager";
import VaultIndex from "../backend/VaultIndex";
import QueryModal from "./QueryModal";
import { App, Plugin, type PluginManifest } from "obsidian";

export interface VaultQuerySettings {
  modelAPI: SupportedAPI;
  model: string;
}

const DEFAULT_SETTINGS: VaultQuerySettings = {
  modelAPI: SupportedAPI.OLLAMA_LOCAL,
  model: "tinyllama:latest",
};

export default class VaultQueryPlugin extends Plugin {
  public settings: VaultQuerySettings = DEFAULT_SETTINGS;
  public queryManager: QueryManager;
  public modelAPI: ModelAPI;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    VaultIndex.addVault(this.app.vault);
    this.modelAPI = new ModelAPI(this);
    this.queryManager = new QueryManager(this);
  }

  async onload(): Promise<void> {
    const newSettings = (await this.loadData()) as VaultQuerySettings;
    this.settings = { ...this.settings, ...newSettings };

    this.addCommand({
      id: "query-vault",
      name: "Query Vault",
      callback: () => {
        new QueryModal(this.app, this.queryManager).open();
      },
    });
  }

  async onunload(): Promise<void> {
    VaultIndex.removeVault(this.app.vault);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
