import type { DocumentInterface } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Voy, type Resource, type EmbeddedResource } from "voy-search";
import type VaultQueryPlugin from "../main";

type DeleteOptions = {
  deletePaths?: string[];
  keepPaths?: string[];
  clear?: boolean;
};

type ResourcesList = Map<string, Resource[]>;
type SerializedResourceList = ReturnType<ReturnType<ResourcesList["entries"]>["toArray"]>;

export default class ObsidianVectorStore extends VectorStore {
  private client = new Voy();
  private resources: ResourcesList = new Map();

  constructor(private plugin: VaultQueryPlugin, public embeddings: EmbeddingsInterface) {
    super(embeddings, {});
  }

  static async load(plugin: VaultQueryPlugin, embeddings: EmbeddingsInterface): Promise<ObsidianVectorStore> {
    const data = await plugin.loadStoreData();
    const instance = new this(plugin, embeddings);
    if (!data) return instance;

    const newClient = Voy.deserialize(data.voy);
    instance.client = newClient;
    const resources = JSON.parse(data.resources) as SerializedResourceList;
    instance.resources = new Map(resources);
    return instance;
  }

  async save() {
    const str = this.client.serialize();
    await this.plugin.updateStoreData({
      modelAPI: this.plugin.modelAPI.currentAPI,
      voy: str,
      resources: JSON.stringify(this.resources.entries().toArray()),
    });
  }

  addVectors(vectors: number[][], documents: DocumentInterface[]) {
    if (vectors.length != documents.length) {
      throw new Error("Number of document embeddings is different than the number of documents.");
    }

    const newEmbeddings = new Map<string, EmbeddedResource[]>();
    documents.forEach((doc, i) => {
      const path = doc.metadata.path ?? "/";
      if (!newEmbeddings.has(path)) newEmbeddings.set(path, []);
      if (!doc.id) throw new Error("Document must have ID");
      newEmbeddings.get(path)!.push({
        id: doc.id,
        embeddings: vectors[i] as number[],
        title: doc.metadata.source ?? "",
        url: path,
      });
    });

    newEmbeddings.entries().forEach(([path, embeddings]) => {
      const res: Resource = { embeddings };
      if (this.client.size() == 0) {
        this.client.index(res);
      } else {
        this.client.add(res);
      }
      if (!this.resources.has(path)) this.resources.set(path, []);
      this.resources.get(path)!.push(res);
    });

    return Promise.resolve();
  }

  async addDocuments(documents: DocumentInterface[]) {
    const texts = documents.map(({ pageContent }) => pageContent);
    const results = await this.embeddings.embedDocuments(texts);
    await this.addVectors(results, documents);
  }

  async similaritySearchVectorWithScore(query: number[], k: number): Promise<[DocumentInterface, number][]> {
    let maxK = 0;
    for (const resList of this.resources.values()) {
      for (const res of resList) {
        maxK += res.embeddings.length;
        if (maxK >= k) {
          maxK = k;
          break;
        }
      }
    }

    await this.plugin.vaultLoader.syncStoreAndQueue();

    const { neighbors } = this.client.search(new Float32Array(query), maxK);
    const paths = new Set(neighbors.map((n) => n.url));
    const neighborIndexes = new Map(neighbors.map((n, idx) => [n.id, idx]));

    const allDocs = new Map(
      await Promise.all(
        Array.from(paths).map(
          async (path) => [path, await this.plugin.vaultLoader.loadFiles(path)] as [string, DocumentInterface[]]
        )
      )
    );

    const results: [DocumentInterface, number][] = [];

    for (const path of paths) {
      const docs = allDocs.get(path);
      if (!docs) throw new Error(`Could not get documents for ${path}`);
      for (const doc of docs) {
        if (!doc.id) throw new Error(`A document does not have an ID for path: ${path}`);
        const idx = neighborIndexes.get(doc.id);
        if (idx == undefined) continue;
        results.push([doc, idx]);
      }
    }

    return results;
  }

  delete(params: DeleteOptions) {
    if (params.clear) {
      this.client.clear();
      this.resources.clear();
      return Promise.resolve();
    }

    let deletePaths = new Set(params.deletePaths ?? []);

    if (params.keepPaths) {
      const allPaths = new Set(this.resources.keys());
      const oldPaths = allPaths.difference(new Set(params.keepPaths));
      deletePaths = deletePaths.union(oldPaths);
      console.log("Deleting", oldPaths.size, "deleted files");
    }

    const resourcesToDelete = this.resources.keys().filter((path) => deletePaths.has(path));
    resourcesToDelete.forEach((path) => {
      const res = this.resources.get(path);
      if (!res) return;
      this.resources.delete(path);
      res.forEach((r) => this.client.remove(r));
    });
    return Promise.resolve();
  }

  getLoadedDocumentIDsByPath(path: string): Set<string> {
    const resList = this.resources.get(path);
    if (!resList) return new Set();
    return new Set(resList.flatMap((res) => res.embeddings.map((e) => e.id)));
  }

  _vectorstoreType(): string {
    return "obsidian";
  }
}
