import QueryManager from "../backend/QueryManager";
import ShimData from "../shims/ShimData";
import QueryModal from "./QueryModal";
import { App, Plugin, type PluginManifest } from "obsidian";

interface VaultQuerySettings {}

const DEFAULT_SETTINGS: VaultQuerySettings = {};

export default class VaultQueryPlugin extends Plugin {
  private settings: VaultQuerySettings = DEFAULT_SETTINGS;

  private queryManager: QueryManager;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.queryManager = new QueryManager(app);
  }

  async onload(): Promise<void> {
    let newSettings = (await this.loadData()) as VaultQuerySettings;
    this.settings = { ...this.settings, ...newSettings };

    ShimData.addVault(this.app.vault);

    this.addCommand({
      id: "query-vault",
      name: "Query Vault",
      callback: () => {
        new QueryModal(this.app, this.queryManager).open();
      },
    });
  }

  async onunload(): Promise<void> {
    ShimData.removeVault(this.app.vault);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
