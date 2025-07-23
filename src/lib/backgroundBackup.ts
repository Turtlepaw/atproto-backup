import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BackupAgent } from "./backup";
import { settingsManager } from "./settings";
import { toast } from "sonner";
import { warn, debug, trace, info, error } from "@tauri-apps/plugin-log";
import { getCurrentWindow } from "@tauri-apps/api/window";

export class BackgroundBackupService {
  private static instance: BackgroundBackupService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): BackgroundBackupService {
    if (!BackgroundBackupService.instance) {
      BackgroundBackupService.instance = new BackgroundBackupService();
    }
    return BackgroundBackupService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Listen for backup events from the background scheduler
    const unlisten = await listen("perform-backup", async () => {
      console.log("Background backup event received");
      info("Background backup event received");
      await this.performBackgroundBackup();
    });

    const window = getCurrentWindow();
    const unlistenwb = await window.listen("perform-backup", async () => {
      console.log("Background backup event received");
      await this.performBackgroundBackup();
    });

    console.log("Background backup service initialized");

    //Start the background scheduler
    try {
      await invoke("start_background_scheduler");
      console.log("Background backup scheduler started");
    } catch (error) {
      console.error("Failed to start background scheduler:", error);
    }

    this.isInitialized = true;
  }

  private async performBackgroundBackup(): Promise<void> {
    try {
      // Get the agent from the auth context
      // This is a bit tricky since we need to access the agent from the React context
      // For now, we'll emit an event that the main app can listen to
      window.dispatchEvent(new CustomEvent("background-backup-requested"));

      console.log("Background backup request dispatched");
    } catch (error) {
      console.error("Background backup failed:", error);
    }
  }

  async stop(): Promise<void> {
    try {
      await invoke("stop_background_scheduler");
      console.log("Background backup scheduler stopped");
    } catch (error) {
      console.error("Failed to stop background scheduler:", error);
    }
  }
}

// Export a function to handle background backup requests
export async function handleBackgroundBackup(agent: any): Promise<void> {
  try {
    console.log("Performing background backup...");

    const manager = new BackupAgent(agent);
    await manager.startBackup();

    // Update the last backup date
    await settingsManager.setLastBackupDate(new Date().toISOString());

    console.log("Background backup completed successfully");

    // Show a notification (if the app is minimized, this might not be visible)
    toast("Automatic backup completed", {
      description: "Your data has been backed up automatically",
    });
  } catch (error) {
    console.error("Background backup failed:", error);
    toast("Automatic backup failed", {
      description: "Check the console for details",
    });
  }
}
