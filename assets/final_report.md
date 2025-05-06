# Final Report

Samuel Preston <br/>
CS 6320 Final Report <br/>
https://github.com/md-y/vault-query <br/>

This project is a RAG chatbot [Obsidian](https://obsidian.md/) plugin that is local-first. This means that it stores all data within Obsidian and only relies on an LLM API as an external dependency. To accomplish this, I had to write my own vector store implementation and dynamic document loading system.

I worked on this project alone, so I made all the contributions. These include:

- Created the Obsidian plugin framework. This involved creating a custom [Bun](https://bun.sh) build script, creating all the UI, and optimizing memory usage and performance.
- Created the custom document loader. This was done by creating a NodeJS-to-Obsidian translation layer via a custom Bun builder plugin. The loader is also able to dynamically update modified documents efficiently by listening to Obsidian file change events.
- To allow for the dynamic document loading, I made my own vector store implementation for [Voy](https://github.com/tantaraio/voy). LangChain has an implementation already, but it does not support deletions or saving/loading, nor do any of its browser vector stores. My implementation supports these operations.
- Added support for multiple backend APIs (mainly OLLama and OpenAI) via dependency injection.
- Wrote a custom Bun bundler plugin that supports bundling WebAssembly files, which Bun currently does not.

Based on these contributions, this is my self-scoring table:

- **(80 points) Significant exploration beyond baseline.** Beyond just using a model, I implemented an entire Obsidian plugin, a custom document loader system, a custom vector store, and a custom build system. The result is a fully working tool that can be used today, not just a proof-of-concept.
- **(30 points) Innovation or creativity.** I improved upon existing tools. I created a Voy vector store implementation that has more features than the existing LangChain implementation. In fact, it is the only browser vector store that supports deletions, saving, and loading. I also created a translation layer that actually allows the LangChain Obsidian loader to be used in Obsidian.
- **(10 points) Highlighted complexity**. I chose to make the plugin in a way that followed the spirit of Obsidian. This meant I limited reliance on external programs as much as possible, and I stored all data locally in the Obsidian vault. This required me to use a complex architecture with a custom document loading system and vector store implementation. I also optimized the performance as much as possible.
- **(10 points) Discussion of lessons learned and potential improvements**. I included this discussion below and on the presentation.
- **(10 points) Exceptional Diagrams/Repo** The repository is well-structured and includes an architectural diagram. I also use GitHub releases to distribute a compiled version of the plugin.

## Lessons Learns and Future Improvements

Lessons learned:

- I learned that researching the specific tools that I plan to use ahead of time is vital. I did not plan on making a custom vector store until I realized that no LangChain browser vector store supported saving/loading and deleting documents, which are all operations I needed. This added extra development time, but I did end up making an innovative tool.
- I learned how RAG works with LangChain in depth. This is because I had to optimize LangChain's process, so I learned how it processes embeddings and queries the LLM.
- I learned many new technologies. I learned how to use the Bun builder, how to make plugins for it, and how to use Voy. While solving problems related to these tools, I also learned how WASM files are bundled and how to dynamically swap dependencies using a build tool.

Future improvements:

- Currently, whether a document is embedded is determined only by tags, but there should also be ways to filter by folder and content. Similarly, tags and other filters should also be supported in queries to help the LLM narrow the document context.
- PDF and other files should also be supported. This shouldn't be too hard to add though since LangChain has loaders for these documents.
- I want to publish the plugin on the official Obsidian plugin hub. I actually want to use this program, so I will continue polishing it.
