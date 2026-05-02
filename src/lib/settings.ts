import { load, Store } from '@tauri-apps/plugin-store';

export interface AppSettings {
  backupFrequency: "daily" | "weekly";
  lastBackupDate?: string; // ISO string
}

const DEFAULT_SETTINGS: AppSettings = {
  backupFrequency: "daily",
};

class SettingsManager {
  private store: Store | null = null;

  private async getStore(): Promise<Store> {
    if (!this.store) {
      this.store = await load("settings.json", {
        autoSave: true, defaults: {
          accounts: [],
          settings: DEFAULT_SETTINGS,
        }
      });
    }
    return this.store;
  }

  async getAccounts(): Promise<string[]> {
    try {
      const store = await this.getStore();
      const accounts = (await store.get("accounts")) as string[] | null;
      return accounts || [];
    } catch (error) {
      console.error("Failed to load accounts:", error);
      return [];
    }
  }

  async addAccount(account: string): Promise<void> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts.includes(account)) {
        accounts.push(account);
        const store = await this.getStore();
        await store.set("accounts", accounts);
      }
    } catch (error) {
      console.error("Failed to add account:", error);
      throw error;
    }
  }

  async setAccounts(accounts: string[]): Promise<void> {
    try {
      const store = await this.getStore();
      await store.set("accounts", Array.from(new Set(accounts)));
    } catch (error) {
      console.error("Failed to set accounts:", error);
      throw error;
    }
  }

  async removeAccount(account: string): Promise<void> {
    try {
      const accounts = await this.getAccounts();
      const updatedAccounts = accounts.filter((acc) => acc !== account);
      const store = await this.getStore();
      await store.set("accounts", updatedAccounts);
    } catch (error) {
      console.error("Failed to remove account:", error);
      throw error;
    }
  }

  async getSettings(): Promise<AppSettings> {
    try {
      const store = await this.getStore();
      const settings = (await store.get("settings")) as AppSettings | null;
      return settings || DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Failed to load settings:", error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const store = await this.getStore();
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      await store.set("settings", newSettings);
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  }

  async updateBackupFrequency(frequency: "daily" | "weekly"): Promise<void> {
    await this.updateSettings({ backupFrequency: frequency });
  }

  async setLastBackupDate(date: string): Promise<void> {
    await this.updateSettings({ lastBackupDate: date });
  }

  async getLastBackupDate(): Promise<string | undefined> {
    const settings = await this.getSettings();
    return settings.lastBackupDate;
  }

  async getBackupFrequency(): Promise<"daily" | "weekly"> {
    const settings = await this.getSettings();
    return settings.backupFrequency;
  }
}

export const settingsManager = new SettingsManager();
