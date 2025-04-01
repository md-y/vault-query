import { Modal } from "obsidian";

export default class QueryModal extends Modal {
  onOpen(): void {
    this.contentEl.setText("Hello World!");
  }

  onClose(): void {
    this.containerEl.empty();
  }
}
