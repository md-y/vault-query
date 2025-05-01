import { type Vault } from "obsidian";

export default class VaultIndex {
  private static vaults: Record<string, Vault> = {};

  static addVault(vault: Vault) {
    const name = vault.getName();
    if (name in this.vaults) {
      throw new Error(`Vault "${name}" is already added`);
    }
    this.vaults[name] = vault;
  }

  static removeVault(vault: Vault) {
    delete this.vaults[vault.getName()];
  }

  static getVault(name: string): Vault {
    if (!(name in this.vaults)) {
      throw new Error(`Could not find vault: "${name}"`);
    }
    return this.vaults[name]!;
  }
}
