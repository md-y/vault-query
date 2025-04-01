# Vault Query

[Obsidian](https://obsidian.md/) plugin to query your vault using [LangChain](https://langchain.com/).

#### Setup

Make sure that [Bun](https://bun.sh/) is installed.

```bash
git clone https://github.com/md-y/vault-query
bun install
```

If you have Obsidian installed, make sure you add your vault path to `.env`:

```bash
OBSIDIAN_PLUGIN_DIR="[VAULT DIR]/.obsidian/plugins"
```

#### Building

To build the plugin:

```bash
bun run build
```

To automatically build and copy files to your Obsidian vault, run:

```bash
bun run activate
```

To cleanup the plugin from the Obsidian plugin folder, run:

```bash
bun run deactivate
```
