import { Agent } from "@atproto/api";
import { BackupManager } from "./backup";
import { settingsManager } from "./settings";

export class AutoBackupScheduler {
  private agent: Agent;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    // Check every hour if a backup is needed
    this.intervalId = setInterval(() => {
      this.checkAndPerformBackup();
    }, 60 * 60 * 1000); // 1 hour

    // Also check immediately when starting
    this.checkAndPerformBackup();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async checkAndPerformBackup(): Promise<void> {
    try {
      const shouldBackup = await this.shouldPerformBackup();

      if (shouldBackup) {
        console.log("Automatic backup due, starting backup...");
        await this.performBackup();
      }
    } catch (error) {
      console.error("Error in automatic backup check:", error);
    }
  }

  private async shouldPerformBackup(): Promise<boolean> {
    try {
      const lastBackupDate = await settingsManager.getLastBackupDate();
      const frequency = await settingsManager.getBackupFrequency();

      if (!lastBackupDate) {
        // No previous backup, so we should do one
        return true;
      }

      const lastBackup = new Date(lastBackupDate);
      const now = new Date();
      const timeDiff = now.getTime() - lastBackup.getTime();

      if (frequency === "daily") {
        // Check if 24 hours have passed
        const oneDay = 24 * 60 * 60 * 1000;
        return timeDiff >= oneDay;
      } else if (frequency === "weekly") {
        // Check if 7 days have passed
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return timeDiff >= oneWeek;
      }

      return false;
    } catch (error) {
      console.error("Error checking if backup is due:", error);
      return false;
    }
  }

  private async performBackup(): Promise<void> {
    try {
      const manager = new BackupManager(this.agent);
      await manager.startBackup();

      // Update the last backup date
      await settingsManager.setLastBackupDate(new Date().toISOString());

      console.log("Automatic backup completed successfully");
    } catch (error) {
      console.error("Automatic backup failed:", error);
    }
  }
}
