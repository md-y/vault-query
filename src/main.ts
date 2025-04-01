import { Plugin } from "obsidian";
import QueryModal from "./ui/queryModal";

interface VaultQuerySettings {}

const DEFAULT_SETTINGS: VaultQuerySettings = {};

export default class VaultQueryPlugin extends Plugin {
  settings: VaultQuerySettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    // Load settings
    let newSettings = (await this.loadData()) as VaultQuerySettings;
    this.settings = { ...this.settings, ...newSettings };

    this.addCommand({
      id: "query-vault",
      name: "Query Vault",
      callback: () => {
        new QueryModal(this.app).open();
      },
    });
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
