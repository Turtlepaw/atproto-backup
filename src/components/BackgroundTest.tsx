import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

export function BackgroundTest() {
  const [isListening, setIsListening] = useState(false);

  const startListening = async () => {
    try {
      await listen("perform-backup", () => {
        toast("🎯 Background backup event received!");
        console.log("Background backup event received");
      });
      setIsListening(true);
      toast("🎯 Listening for background backup events");
    } catch (error) {
      console.error("Failed to start listening:", error);
      toast("Failed to start listening");
    }
  };

  const testBackgroundScheduler = async () => {
    try {
      await invoke("start_background_scheduler");
      toast("🎯 Background scheduler started");
    } catch (error) {
      console.error("Failed to start background scheduler:", error);
      toast("Failed to start background scheduler");
    }
  };

  const testEmitEvent = async () => {
    try {
      // This will trigger the background backup
      await invoke("emit", { event: "perform-backup", payload: null });
      toast("🎯 Test backup event emitted");
    } catch (error) {
      console.error("Failed to emit event:", error);
      toast("Failed to emit event");
    }
  };

  return (
    <Card className="bg-card border-white/10 mb-4">
      <CardHeader>
        <CardTitle className="text-white">🎯 Background Backup Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={startListening}
            disabled={isListening}
            variant="outline"
            className="cursor-pointer"
          >
            {isListening ? "Listening..." : "Start Listening"}
          </Button>

          <Button
            onClick={testBackgroundScheduler}
            variant="outline"
            className="cursor-pointer"
          >
            Start Scheduler
          </Button>

          <Button
            onClick={testEmitEvent}
            variant="outline"
            className="cursor-pointer"
          >
            Test Event
          </Button>
        </div>

        <div className="text-xs text-white/60">
          <p>• Click "Start Listening" to listen for backup events</p>
          <p>• Click "Start Scheduler" to start background scheduler</p>
          <p>• Click "Test Event" to manually trigger a backup event</p>
          <p>• Check browser console for detailed logs</p>
        </div>
      </CardContent>
    </Card>
  );
}
