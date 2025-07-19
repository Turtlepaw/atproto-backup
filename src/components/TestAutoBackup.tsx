import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestAutoBackupScheduler } from "@/lib/testAutoBackup";
import { useAuth } from "@/Auth";
import { settingsManager } from "@/lib/settings";
import { toast } from "sonner";

export function TestAutoBackup() {
  const [isRunning, setIsRunning] = useState(false);
  const [scheduler, setScheduler] = useState<TestAutoBackupScheduler | null>(
    null
  );
  const [lastBackupDate, setLastBackupDate] = useState<string | undefined>();
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const { agent } = useAuth();

  const startTest = () => {
    if (!agent) {
      toast("No agent available");
      return;
    }

    const testScheduler = new TestAutoBackupScheduler(agent);
    testScheduler.start();
    setScheduler(testScheduler);
    setIsRunning(true);
    toast("🧪 Test auto-backup started! Check console for logs.");
  };

  const stopTest = () => {
    if (scheduler) {
      scheduler.stop();
      setScheduler(null);
      setIsRunning(false);
      toast("🧪 Test auto-backup stopped");
    }
  };

  const checkStatus = async () => {
    const lastBackup = await settingsManager.getLastBackupDate();
    const freq = await settingsManager.getBackupFrequency();
    setLastBackupDate(lastBackup);
    setFrequency(freq);
  };

  const clearLastBackup = async () => {
    await settingsManager.updateSettings({ lastBackupDate: undefined });
    await checkStatus();
    toast("🧪 Cleared last backup date");
  };

  return (
    <Card className="bg-card border-white/10 mb-4">
      <CardHeader>
        <CardTitle className="text-white">🧪 Test Auto-Backup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-white/80 text-sm">
            Current frequency: <span className="font-bold">{frequency}</span>
          </p>
          <p className="text-white/80 text-sm">
            Last backup:{" "}
            {lastBackupDate
              ? new Date(lastBackupDate).toLocaleString()
              : "None"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={startTest}
            disabled={isRunning}
            variant="outline"
            className="cursor-pointer"
          >
            Start Test (30s intervals)
          </Button>

          <Button
            onClick={stopTest}
            disabled={!isRunning}
            variant="outline"
            className="cursor-pointer"
          >
            Stop Test
          </Button>

          <Button
            onClick={checkStatus}
            variant="outline"
            className="cursor-pointer"
          >
            Check Status
          </Button>

          <Button
            onClick={clearLastBackup}
            variant="outline"
            className="cursor-pointer"
          >
            Clear Last Backup
          </Button>
        </div>

        <div className="text-xs text-white/60">
          <p>• Test uses 1 minute for "daily" and 2 minutes for "weekly"</p>
          <p>• Check browser console for detailed logs</p>
          <p>• Change frequency in Settings to test different intervals</p>
        </div>
      </CardContent>
    </Card>
  );
}
