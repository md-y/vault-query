import { PluginSettingTab, Setting } from "obsidian";
import type VaultQueryPlugin from "./VaultQueryPlugin";
import { SupportedAPI } from "../backend/ModelAPI";

type OptionalFields = {
  url: boolean;
  key: boolean;
};

const enabledOptionalFields: Record<SupportedAPI, OptionalFields> = {
  [SupportedAPI.OLLAMA]: { url: true, key: false },
  [SupportedAPI.OPENAI]: { url: false, key: true },
};

export interface VaultQuerySettings {
  modelAPI: SupportedAPI;
  model: string;
  baseURL: string;
  apiKey: string;
  embedBatchSize: number;
  documentsPerQuery: number;
}

export default class VaultQuerySettingsTab extends PluginSettingTab {
  constructor(private plugin: VaultQueryPlugin) {
    super(plugin.app, plugin);
  }

  get settings() {
    return this.plugin.settings;
  }

  display(): void {
    const container = this.containerEl;
    const enabledFields = enabledOptionalFields[this.settings.modelAPI];

    container.empty();

    new Setting(container)
      .setName("API")
      .setDesc("(Warning: Changing this will reset the stored vector data)")
      .addDropdown((dropdown) => {
        const options: Record<SupportedAPI, string> = {
          [SupportedAPI.OPENAI]: "Open AI",
          [SupportedAPI.OLLAMA]: "OLlama",
        };
        dropdown
          .addOptions(options)
          .setValue(this.settings.modelAPI.toString())
          .onChange((value) => {
            this.plugin.updateSettings({ modelAPI: parseInt(value) as SupportedAPI });
            this.display();
          });
      });

    new Setting(container)
      .setName("Model")
      .setDesc("(Required) The language model to be used by the API")
      .addText((text) => {
        text.setValue(this.settings.model).onChange((value) => {
          this.plugin.updateSettings({ model: value });
        });
      });

    new Setting(container)
      .setName("Embed Batch Size")
      .setDesc("(Required) Number of documents to embed per request")
      .addText((text) => {
        text.setValue(this.settings.embedBatchSize.toString()).onChange((value) => {
          this.plugin.updateSettings({ embedBatchSize: Math.abs(parseInt(value)) || 1 });
        });
        text.inputEl.type = "number";
      });

    new Setting(container)
      .setName("Documents Per Query")
      .setDesc("(Required) Number of documents to include per query")
      .addText((text) => {
        text.setValue(this.settings.documentsPerQuery.toString()).onChange((value) => {
          this.plugin.updateSettings({ documentsPerQuery: Math.abs(parseInt(value)) || 1 });
        });
        text.inputEl.type = "number";
      });

    if (enabledFields.url) {
      new Setting(container)
        .setName("API URL")
        .setDesc("(Optional)")
        .addText((text) => {
          text.setValue(this.settings.baseURL).onChange((value) => {
            this.plugin.updateSettings({ baseURL: value });
          });
          text.inputEl.addClass("full-width");
        });
    }

    if (enabledFields.key) {
      new Setting(container)
        .setName("API Key")
        .setDesc("(Optional)")
        .addText((text) => {
          text.setValue(this.settings.apiKey).onChange((value) => {
            this.plugin.updateSettings({ apiKey: value });
          });
          text.inputEl.addClass("full-width");
        });
    }
  }
}
