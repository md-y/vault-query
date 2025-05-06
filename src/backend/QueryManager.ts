import type { ChatPromptTemplate } from "@langchain/core/prompts";
import type VaultQueryPlugin from "../obsidian/VaultQueryPlugin";
import { pull } from "langchain/hub";
import { Annotation, StateGraph } from "@langchain/langgraph";
import type { Document } from "langchain/document";
import { z } from "zod";

export default class QueryManager {
  private graph?: Awaited<ReturnType<typeof this.createGraph>>;

  constructor(private plugin: VaultQueryPlugin) {}

  async query(question: string) {
    if (!this.graph) this.graph = await this.createGraph();
    const result = await this.graph.invoke({
      question,
    });
    return { ...result };
  }

  private async createGraph() {
    const promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");

    const inputAnnotation = Annotation.Root({
      question: Annotation<string>,
    });

    const stateAnnotation = Annotation.Root({
      question: Annotation<string>,
      context: Annotation<Document[]>,
      reasoning: Annotation<string>,
      answer: Annotation<string>,
    });

    const retrieve = async (state: typeof inputAnnotation.State) => {
      const store = this.plugin.vaultLoader.vectorStore;
      if (!store) throw new Error("The vault loader must be updated at least once before querying");
      const retrievedDocs = await store.similaritySearch(state.question, this.plugin.settings.documentsPerQuery);
      return { context: retrievedDocs };
    };

    const generate = async (state: typeof stateAnnotation.State) => {
      const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
      const messages = await promptTemplate.invoke({ question: state.question, context: docsContent });
      const model = this.plugin.modelAPI.createModel();
      const structuredModel = model.withStructuredOutput(
        z.object({
          answer: z.string().describe("The final answer to the user's question."),
        })
      );
      const response = await structuredModel.invoke(messages);
      return response;
    };

    return new StateGraph(stateAnnotation)
      .addNode("retrieve", retrieve)
      .addNode("generate", generate)
      .addEdge("__start__", "retrieve")
      .addEdge("retrieve", "generate")
      .addEdge("generate", "__end__")
      .compile();
  }
}
