import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Zap,
  Calendar,
  ChevronDown,
  FolderOpen,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { openPath } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { settingsManager } from "@/lib/settings";
import { checkDocumentDir, getDefaultBackupDir } from "@/lib/paths";
import { toast } from "sonner";

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [autostart, setAutostart] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState<"daily" | "weekly">(
    "daily"
  );
  const [backupDir, setBackupDir] = useState<string>("");
  const [isCustomDir, setIsCustomDir] = useState(false);
  const [docDirError, setDocDirError] = useState<string | null>(null);
  const [isSelectingDir, setIsSelectingDir] = useState(false);

  const loadDirectoryInfo = async () => {
    try {
      const custom = await settingsManager.getBackupDirectory();
      if (custom && custom.trim() !== "") {
        setBackupDir(custom.trim());
        setIsCustomDir(true);
        setDocDirError(null);
      } else {
        setIsCustomDir(false);
        const { exists, error } = await checkDocumentDir();
        if (!exists) {
          setDocDirError(error || "Document directory does not exist.");
          setBackupDir("");
        } else {
          setDocDirError(null);
          try {
            const defaultDir = await getDefaultBackupDir();
            setBackupDir(defaultDir);
          } catch (err: any) {
            setDocDirError(err.message || "Document directory does not exist.");
            setBackupDir("");
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load backup directory info:", err);
    }
  };

  useEffect(() => {
    (async () => {
      setAutostart(await isEnabled());
      // Load saved backup frequency
      const frequency = await settingsManager.getBackupFrequency();
      setBackupFrequency(frequency);
      await loadDirectoryInfo();
    })();
  }, []);

  const handleBackupFrequencyChange = async (frequency: "daily" | "weekly") => {
    setBackupFrequency(frequency);
    await settingsManager.updateBackupFrequency(frequency);
  };

  const handleSelectDirectory = async () => {
    try {
      setIsSelectingDir(true);
      const selected = await invoke<string | null>("select_backup_directory", {
        defaultPath: backupDir || undefined,
      });

      if (selected) {
        await settingsManager.setBackupDirectory(selected);
        toast.success("Backup directory updated");
        await loadDirectoryInfo();
      }
    } catch (err: any) {
      console.error("Failed to select directory:", err);
      toast.error("Failed to select directory: " + (err.message || String(err)));
    } finally {
      setIsSelectingDir(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      await settingsManager.setBackupDirectory(undefined);
      toast.success("Reset backup directory to default");
      await loadDirectoryInfo();
    } catch (err: any) {
      console.error("Failed to reset directory:", err);
      toast.error("Failed to reset directory: " + (err.message || String(err)));
    }
  };

  return (
    <div className="p-4 mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-white/80 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="space-y-4">
        {/* Autostart Setting */}
        <Card className="bg-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <Label htmlFor="autostart" className="cursor-pointer">
                Autostart the app
              </Label>
              <Switch
                id="autostart"
                checked={autostart}
                onCheckedChange={async (checked) => {
                  if (checked) enable();
                  else disable();
                  setAutostart(await isEnabled());
                }}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings */}
        <Card className="bg-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Backup Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-white font-medium mb-3">Backup Frequency</p>
              <div className="space-y-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="capitalize cursor-pointer"
                    >
                      {backupFrequency} <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 ml-7">
                    <DropdownMenuLabel>Backup Frequency</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={backupFrequency}
                      onValueChange={(val) =>
                        handleBackupFrequencyChange(val as "daily" | "weekly")
                      }
                    >
                      <DropdownMenuRadioItem value="daily">
                        Daily
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="weekly">
                        Weekly
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">Backup Location</p>
                  <Badge
                    variant={isCustomDir ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {isCustomDir ? "Custom" : "Default"}
                  </Badge>
                </div>
              </div>

              {docDirError && !isCustomDir && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{docDirError}</p>
                    <p className="text-xs text-red-300/80 mt-0.5">
                      Please select where to save backups using the button below.
                    </p>
                  </div>
                </div>
              )}

              {backupDir ? (
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/80 break-all mb-3">
                  {backupDir}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleSelectDirectory}
                  disabled={isSelectingDir}
                  className="cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  {isSelectingDir ? "Selecting..." : "Choose Folder"}
                </Button>

                {isCustomDir && (
                  <Button
                    variant="ghost"
                    onClick={handleResetToDefault}
                    className="cursor-pointer text-white/70 hover:text-white"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                )}

                {backupDir && !docDirError && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await openPath(backupDir);
                      } catch (err: any) {
                        toast.error(
                          "Could not open folder: " +
                            (err.message || String(err))
                        );
                      }
                    }}
                    className="cursor-pointer text-white/70 hover:text-white ml-auto"
                  >
                    Open Folder
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
