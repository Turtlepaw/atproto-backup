import { Button } from "@/components/ui/button";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openPath } from "@tauri-apps/plugin-opener";
import { createBackupDir, getBackupDir } from "@/lib/paths";
import { useEffect, useState, useRef } from "react";
import {
  History,
  LoaderCircleIcon,
  ChevronDown,
  FolderOpen,
  Database,
  FileText,
  HardDrive,
  Package,
  Heart,
  Users,
  User,
  Settings as SettingsIcon,
} from "lucide-react";
import { BackupManager, Metadata } from "@/lib/backup";
import { useAuth } from "@/Auth";
import { toast } from "sonner";
import { settingsManager } from "@/lib/settings";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Settings from "./Settings";

export function Home({
  profile,
  onLogout,
}: {
  profile: ProfileViewDetailed;
  onLogout: () => void;
}) {
  const [isDirLoading, setDirLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const handleBackupComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="p-4 mt-10">
      <div className="flex justify-between items-center mb-4">
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex flex-row items-center gap-2 cursor-pointer p-2 rounded-md transition-colors hover:bg-white/10">
                <Avatar>
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback>
                    {profile.displayName ?? profile.handle}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white">
                  {profile.displayName ?? `@${profile.handle}`}
                </span>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="ml-3">
              <DropdownMenuItem
                onClick={onLogout}
                className="cursor-pointer text-red-500"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="text-white/80 hover:text-white"
        >
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-card rounded-lg p-4 mb-4">
        <p className="mb-2 text-white">Backups</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={async () => {
              try {
                setDirLoading(true);
                await createBackupDir();
                const appDataDirPath = await getBackupDir();
                openPath(appDataDirPath);
              } finally {
                setDirLoading(false);
              }
            }}
            disabled={isDirLoading}
          >
            {isDirLoading ? (
              <LoaderCircleIcon className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <FolderOpen className="w-4 h-4 mr-2" />
            )}
            Open backups
          </Button>

          <StartBackup onBackupComplete={handleBackupComplete} />
        </div>
      </div>

      <Backups refreshTrigger={refreshTrigger} />
    </div>
  );
}

function StartBackup({ onBackupComplete }: { onBackupComplete: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const { agent } = useAuth();

  return (
    <Button
      variant="outline"
      className="cursor-pointer"
      onClick={async () => {
        try {
          setIsLoading(true);
          if (agent == null) {
            toast("Agent not initialized, try to reload the app.");
            return;
          }
          const manager = new BackupManager(agent!!);
          await manager.startBackup();
          await settingsManager.setLastBackupDate(new Date().toISOString());
          toast("Backup complete!");
          onBackupComplete(); // Trigger refresh
        } catch (err: any) {
          toast(err.toString());
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }}
      disabled={isLoading}
    >
      {isLoading ? (
        <LoaderCircleIcon className="animate-spin text-white/80" />
      ) : (
        <span>Backup now</span>
      )}
    </Button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function getRecordTypeIcon(type: string) {
  if (type.includes("post")) return <FileText className="w-4 h-4" />;
  if (type.includes("like")) return <Heart className="w-4 h-4" />;
  if (type.includes("follow")) return <Users className="w-4 h-4" />;
  if (type.includes("profile")) return <User className="w-4 h-4" />;
  return <Package className="w-4 h-4" />;
}

function Backups({ refreshTrigger }: { refreshTrigger: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<Metadata[]>([]);
  const [showCollections, setShowCollections] = useState<
    Record<string, boolean>
  >({});
  const { agent } = useAuth();
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadBackups = async () => {
    if (agent == null) {
      return;
    }
    setIsLoading(true);
    try {
      const manager = new BackupManager(agent);
      const backupsList = await manager.getBackups();
      // Sort backups by timestamp (newest first)
      const sortedBackups = backupsList.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setBackups(sortedBackups);
    } catch (err: any) {
      toast(err.toString());
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, [agent, refreshTrigger]); // Add refreshTrigger to dependencies

  //@ts-expect-error
  const units: Record<Intl.RelativeTimeFormatUnit, number> = {
    year: 24 * 60 * 60 * 1000 * 365,
    month: (24 * 60 * 60 * 1000 * 365) / 12,
    day: 24 * 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    minute: 60 * 1000,
    second: 1000,
  };

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const getRelativeTime = (d1: Date, d2 = new Date()) => {
    const elapsed = d1.getTime() - d2.getTime();
    for (const u in units) {
      if (Math.abs(elapsed) > units[u as keyof typeof units] || u == "second") {
        return rtf.format(
          Math.round(elapsed / units[u as keyof typeof units]),
          u as Intl.RelativeTimeFormatUnit
        );
      }
    }
  };

  const getTotalRecords = (backup: Metadata) => {
    return Object.values(backup.stats?.recordTypes || {}).reduce(
      (sum, count) => sum + count,
      0
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5" />
          <p className="text-white text-lg font-semibold">Previous backups</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <LoaderCircleIcon className="w-6 h-6 animate-spin text-white/80" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5" />
        <p className="text-white text-lg font-semibold">Previous backups</p>
      </div>

      {backups.length === 0 ? (
        <div className="text-muted-foreground text-sm">No backups found.</div>
      ) : (
        <div className="space-y-4">
          {backups.map((backup, index) => {
            const expanded = !!showCollections[backup.filePath];
            const totalRecords = getTotalRecords(backup);
            const recordTypes = Object.entries(backup.stats?.recordTypes || {});

            return (
              <div
                key={backup.filePath}
                className="rounded-lg border border-white/10 shadow-sm"
              >
                <div
                  className="cursor-pointer select-none hover:bg-white/5 transition-colors p-4 rounded-lg"
                  onClick={() =>
                    setShowCollections((prev) => ({
                      ...prev,
                      [backup.filePath]: !prev[backup.filePath],
                    }))
                  }
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {index === 0 && <Badge variant="default">Newest</Badge>}
                      <div className="flex items-center gap-2 text-white/80">
                        <span>
                          {getRelativeTime(new Date(backup.timestamp))} (
                          {new Date(backup.timestamp).toLocaleString()})
                        </span>
                        <span>•</span>
                        <span>{formatBytes(backup.stats?.fileSize || 0)}</span>
                        <span>•</span>
                        <span className="font-semibold text-white/90">
                          {backup.stats?.collections.length || 0} collections
                        </span>
                      </div>
                    </div>
                    <div
                      className={`transition-transform duration-300 ${
                        expanded ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white/60 text-xs">Records</p>
                        <p className="text-white font-semibold">
                          {totalRecords.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                      <Package className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="text-white/60 text-xs">Collections</p>
                        <p className="text-white font-semibold">
                          {backup.stats.collections.length.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                      <Database className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-white/60 text-xs">Blocks</p>
                        <p className="text-white font-semibold">
                          {backup.stats?.totalBlocks?.toLocaleString() || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5">
                      <HardDrive className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-white/60 text-xs">File Size</p>
                        <p className="text-white font-semibold">
                          {formatBytes(backup.stats?.fileSize || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  ref={(el) => {
                    contentRefs.current[backup.filePath] = el;
                  }}
                  style={{
                    maxHeight:
                      expanded && contentRefs.current[backup.filePath]
                        ? `${
                            contentRefs.current[backup.filePath]!.scrollHeight
                          }px`
                        : 0,
                    opacity: expanded ? 1 : 0,
                    transition:
                      "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s",
                    overflow: "hidden",
                  }}
                >
                  <div className="border-t border-white/10 mx-4 mt-4" />
                  <div className="pt-4 p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Record Types
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recordTypes.map(([type, count]) => {
                        const percentage =
                          totalRecords > 0 ? (count / totalRecords) * 100 : 0;
                        return (
                          <div
                            key={type}
                            className="p-3 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getRecordTypeIcon(type)}
                                <span className="text-white/80 text-sm font-medium">
                                  {type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-semibold">
                                  {count.toLocaleString()}
                                </span>
                                <span className="text-white/60 text-xs">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
