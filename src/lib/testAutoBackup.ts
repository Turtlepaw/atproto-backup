import { Agent } from "@atproto/api";
import { BackupAgent } from "./backup";
import { settingsManager } from "./settings";

export class TestAutoBackupScheduler {
  private agent: Agent;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    // Check every 30 seconds for testing (instead of 1 hour)
    this.intervalId = setInterval(() => {
      this.checkAndPerformBackup();
    }, 30 * 1000); // 30 seconds

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
        console.log("🧪 TEST: Automatic backup due, starting backup...");
        await this.performBackup();
      } else {
        console.log("🧪 TEST: No backup needed yet");
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
        console.log("🧪 TEST: No previous backup, should do one");
        return true;
      }

      const lastBackup = new Date(lastBackupDate);
      const now = new Date();
      const timeDiff = now.getTime() - lastBackup.getTime();

      // For testing: use shorter intervals
      if (frequency === "daily") {
        // Test with 1 minute instead of 24 hours
        const oneMinute = 60 * 1000;
        const shouldBackup = timeDiff >= oneMinute;
        console.log(
          `🧪 TEST: Daily backup check - ${timeDiff}ms since last backup, need ${oneMinute}ms`
        );
        return shouldBackup;
      } else if (frequency === "weekly") {
        // Test with 2 minutes instead of 7 days
        const twoMinutes = 2 * 60 * 1000;
        const shouldBackup = timeDiff >= twoMinutes;
        console.log(
          `🧪 TEST: Weekly backup check - ${timeDiff}ms since last backup, need ${twoMinutes}ms`
        );
        return shouldBackup;
      }

      return false;
    } catch (error) {
      console.error("Error checking if backup is due:", error);
      return false;
    }
  }

  private async performBackup(): Promise<void> {
    try {
      console.log("🧪 TEST: Starting automatic backup...");
      const manager = new BackupAgent(this.agent);
      await manager.startBackup();

      // Update the last backup date
      await settingsManager.setLastBackupDate(new Date().toISOString());

      console.log("🧪 TEST: Automatic backup completed successfully");
    } catch (error) {
      console.error("🧪 TEST: Automatic backup failed:", error);
    }
  }
}
