import { App, Component, MarkdownRenderer, Modal, TextComponent } from "obsidian";
import type VaultQueryPlugin from "./VaultQueryPlugin";
import type { Document } from "langchain/document";

export default class QueryModal extends Modal {
  private isOpen = false;

  private promptContainer?: HTMLElement;
  private loadingContainer?: HTMLElement;
  private answerContainer?: HTMLElement;
  private answerComponent?: Component;

  constructor(app: App, private plugin: VaultQueryPlugin) {
    super(app);
  }

  onOpen(): void {
    this.isOpen = true;
    this.titleEl.textContent = `Querying "${this.app.vault.getName()}"`;

    this.contentEl.empty();
    this.promptContainer = this.contentEl.createDiv();
    this.loadingContainer = this.contentEl.createDiv();
    this.answerContainer = this.contentEl.createDiv();

    let updateIndexJob: Promise<void>;

    const promptComponent = new TextComponent(this.promptContainer);
    promptComponent.setPlaceholder("Enter your question");
    promptComponent.inputEl.addClass("full-width");
    promptComponent.inputEl.addEventListener("keydown", async ({ key }) => {
      if (key !== "Enter" || promptComponent.inputEl.disabled) return;
      promptComponent.inputEl.disabled = true;
      await updateIndexJob;
      await this.askQuery(promptComponent.inputEl.value);
      promptComponent.inputEl.disabled = false;
      promptComponent.setValue("");
    });

    updateIndexJob = this.updateIndex();
  }

  onClose(): void {
    this.isOpen = false;
    this.containerEl.empty();
    this.answerComponent?.unload();
  }

  private setLoadingStatus(status?: string) {
    this.loadingContainer ??= this.contentEl.createDiv();

    if (this.loadingContainer.children.length === 0) {
      const bar = this.loadingContainer.createDiv();
      bar.addClass("progress-bar");
      const barValue = bar.createDiv();
      barValue.addClass("progress-bar-value");
      this.loadingContainer.createEl("p");
    }

    if (status) {
      this.loadingContainer.style.display = "block";
      let element = this.loadingContainer.getElementsByTagName("p").item(0);
      if (!element) element = this.loadingContainer.createEl("p");
      element.textContent = status;
    } else {
      this.loadingContainer.style.display = "none";
    }
  }

  private async updateIndex() {
    let stopUpdate = false;

    this.setLoadingStatus("Reloading index...");
    this.loadingContainer ??= this.contentEl.createDiv();
    const button = this.loadingContainer.createEl("button", { text: "Skip" });
    button.onClickEvent(() => {
      stopUpdate = true;
      button.textContent = "Skipping...";
      button.disabled = true;
    });

    for await (const [loadedCount, remainingCount] of this.plugin.vaultLoader.update()) {
      this.setLoadingStatus(`Loaded ${loadedCount} files, ${remainingCount} left to go`);
      if (!this.isOpen || stopUpdate) break;
    }
    button.remove();
    this.setLoadingStatus();
  }

  private async askQuery(question: string) {
    this.answerContainer ??= this.contentEl.createDiv();

    if (this.answerComponent) {
      this.answerComponent.unload();
      this.answerComponent = undefined;
      this.answerContainer.empty();
    }

    this.setLoadingStatus("Parsing query...");
    const res = await this.plugin.queryManager.query(question);
    this.setLoadingStatus();

    this.answerContainer ??= this.contentEl.createDiv();
    this.answerComponent = new Component();
    MarkdownRenderer.render(
      this.plugin.app,
      this.getMarkdown(res.answer, res.context),
      this.answerContainer,
      "",
      this.answerComponent
    );
  }

  private getMarkdown(answer: string, context: Document[]) {
    let markdown = "";

    const sources = new Set(context.map((c) => c.metadata.source).filter((c) => c != undefined));
    markdown += "> [!quote]- Sources\n";
    sources.forEach((s) => (markdown += `> [[${s}]]\n`));
    markdown += "\n";

    markdown += answer;
    return markdown;
  }
}
