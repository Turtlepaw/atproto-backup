import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Zap, Calendar, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { settingsManager } from "@/lib/settings";

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [autostart, setAutostart] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState<"daily" | "weekly">(
    "daily"
  );

  useEffect(() => {
    (async () => {
      setAutostart(await isEnabled());
      // Load saved backup frequency
      const frequency = await settingsManager.getBackupFrequency();
      setBackupFrequency(frequency);
    })();
  }, []);

  const handleBackupFrequencyChange = async (frequency: "daily" | "weekly") => {
    setBackupFrequency(frequency);
    await settingsManager.updateBackupFrequency(frequency);
  };

  return (
    <div className="p-4 mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-white/80 hover:text-white"
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
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
