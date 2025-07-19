import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

export class BackgroundTestService {
  static async testBackgroundBackup() {
    try {
      // Test the background scheduler
      await invoke("start_background_scheduler");
      toast("Background scheduler started");

      // Listen for backup events
      await listen("perform-backup", () => {
        toast("Background backup event received!");
        console.log("Background backup event received");
      });

      console.log("Background test service initialized");
    } catch (error) {
      console.error("Background test failed:", error);
      toast("Background test failed");
    }
  }

  static async triggerTestBackup() {
    try {
      // Emit a test backup event
      await invoke("emit", { event: "perform-backup", payload: null });
      toast("Test backup event triggered");
    } catch (error) {
      console.error("Failed to trigger test backup:", error);
      toast("Failed to trigger test backup");
    }
  }
}
