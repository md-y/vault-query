import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type VaultQueryPlugin from "../obsidian/VaultQueryPlugin";
import type { Embeddings } from "@langchain/core/embeddings";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

export enum SupportedAPI {
  OLLAMA,
  OPENAI,
}

type APIFactory = {
  createModel(plugin: VaultQueryPlugin): BaseChatModel;
  createEmbeddings(plugin: VaultQueryPlugin): Embeddings;
};

const factories: Record<SupportedAPI, APIFactory> = {
  [SupportedAPI.OLLAMA]: {
    createModel: (plugin) => new ChatOllama({ model: plugin.settings.model, baseUrl: plugin.settings.baseURL }),
    createEmbeddings: (plugin) =>
      new OllamaEmbeddings({ model: plugin.settings.model, baseUrl: plugin.settings.baseURL }),
  },
  [SupportedAPI.OPENAI]: {
    createModel: (plugin) => new ChatOpenAI({ model: plugin.settings.model, apiKey: plugin.settings.apiKey }),
    createEmbeddings: (plugin) =>
      new OpenAIEmbeddings({ model: plugin.settings.model, apiKey: plugin.settings.apiKey }),
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
