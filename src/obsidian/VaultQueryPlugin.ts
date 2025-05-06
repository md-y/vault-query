import ModelAPI, { SupportedAPI } from "../backend/ModelAPI";
import QueryManager from "../backend/QueryManager";
import VaultIndex from "../backend/VaultIndex";
import VaultLoader from "../backend/VaultLoader";
import QueryModal from "./QueryModal";
import { App, Plugin, type PluginManifest } from "obsidian";
import VaultQuerySettingsTab, { type VaultQuerySettings } from "./VaultQuerySettingsTab";

interface PluginData {
  settings: VaultQuerySettings;
  store: null | StoreData;
}

interface StoreData {
  modelAPI: SupportedAPI;
  voy: string;
  resources: string;
}

const DEFAULT_PLUGIN_DATA: PluginData = {
  settings: {
    modelAPI: SupportedAPI.OPENAI,
    model: "",
    baseURL: "",
    apiKey: "",
    embedBatchSize: 10,
    documentsPerQuery: 8,
  },
  store: null,
};

export default class VaultQueryPlugin extends Plugin {
  public queryManager: QueryManager;
  public vaultLoader: VaultLoader;
  public modelAPI: ModelAPI;

  private pluginData: PluginData = DEFAULT_PLUGIN_DATA;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    VaultIndex.addVault(this.app.vault);
    this.modelAPI = new ModelAPI(this);
    this.vaultLoader = new VaultLoader(this);
    this.queryManager = new QueryManager(this);
  }

  public get settings() {
    return this.pluginData.settings;
  }

  public get savedStoreAPI(): SupportedAPI | null {
    return this.pluginData.store?.modelAPI ?? null;
  }

  async onload(): Promise<void> {
    await this.loadPluginData();

    this.addSettingTab(new VaultQuerySettingsTab(this));

    this.addCommand({
      id: "query-vault",
      name: "Query Vault",
      callback: () => {
        new QueryModal(this.app, this).open();
      },
    });
  }

  async onunload(): Promise<void> {
    VaultIndex.removeVault(this.app.vault);
  }

  private async savePluginData() {
    await this.saveData(this.pluginData);
  }

  private async loadPluginData() {
    const loadedData = (await this.loadData()) ?? {};
    this.pluginData = {
      settings: { ...DEFAULT_PLUGIN_DATA.settings, ...loadedData.settings },
      store: loadedData.store ?? DEFAULT_PLUGIN_DATA.store,
    };
  }

  async updateSettings(newSettings: Partial<VaultQuerySettings>) {
    this.pluginData.settings = { ...this.pluginData.settings, ...newSettings };
    await this.savePluginData();
  }

  async updateStoreData(data: StoreData) {
    this.pluginData.store = data;
    await this.savePluginData();
  }

  async loadStoreData() {
    await this.loadPluginData();
    return this.pluginData.store;
  }

  async onExternalSettingsChange() {
    await this.loadPluginData();
  }
}
