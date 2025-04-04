import { App, Modal } from "obsidian";
import type QueryManager from "../backend/QueryManager";

export default class QueryModal extends Modal {
  constructor(app: App, private queryManager: QueryManager) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.setText("Loading Documents...");
    this.queryManager.init().then(() => this.onQueryReady());
  }

  onClose(): void {
    this.containerEl.empty();
  }

  onQueryReady(): void {
    this.contentEl.setText("Ready");
  }
}
