import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type VaultQueryPlugin from "../obsidian/VaultQueryPlugin";
import type { Embeddings } from "@langchain/core/embeddings";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";

export enum SupportedAPI {
  OLLAMA_LOCAL,
}

type APIFactory = {
  createModel(plugin: VaultQueryPlugin): BaseChatModel;
  createEmbeddings(plugin: VaultQueryPlugin): Embeddings;
};

const factories: Record<SupportedAPI, APIFactory> = {
  [SupportedAPI.OLLAMA_LOCAL]: {
    createModel: (plugin) => new ChatOllama({ model: plugin.settings.model }),
    createEmbeddings: (plugin) => new OllamaEmbeddings({ model: plugin.settings.model }),
  },
};

export default class ModelAPI {
  constructor(private plugin: VaultQueryPlugin) {}

  get currentAPI(): SupportedAPI {
    return this.plugin.settings.modelAPI;
  }

  createModel(): BaseChatModel {
    return factories[this.currentAPI].createModel(this.plugin);
  }

  createEmbeddings(): Embeddings {
    return factories[this.currentAPI].createEmbeddings(this.plugin);
  }
}
