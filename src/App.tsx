import { useState, useEffect } from "react";
import "./App.css";
import { Button } from "./components/ui/button";
import LoginPage from "./routes/Login";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LoaderCircleIcon } from "lucide-react";
import { initializeLocalStorage } from "./localstorage_ployfill";
import { Home } from "./routes/Home";
import { ThemeProvider } from "./theme-provider";
import { toast, Toaster } from "sonner";
import { ScrollArea } from "./components/ui/scroll-area";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  BackgroundBackupService,
  handleBackgroundBackup,
} from "./lib/backgroundBackup";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "./components/ui/progress";
import { MarkdownRenderer } from "./components/ui/markdown-renderer";
import { AccountsProvider, useAccounts } from "./Accounts";

function ToolbarButton({
  children,
  onClick,
  destructive = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button onClick={onClick} className={`cursor-pointer flex items-center justify-center ${destructive ? "hover:bg-red-500 transition-colors" : "hover:bg-white/10"}`}>
      <div className="p-3 opacity-80 [&>*]:w-4 [&>*]:h-4">{children}</div>
    </button>
  );
}


function AppContent() {
  // const { isLoading, isAuthenticated, profile, client, login, logout, agent } =
  //   useAuth();
  const { accounts, isLoading } = useAccounts();
  const appWindow = getCurrentWindow();

  const [isLocalStorageReady, setIsLocalStorageReady] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      try {
        await initializeLocalStorage();
        setIsLocalStorageReady(true);
      } catch (error) {
        console.error("Failed to initialize localStorage:", error);
        setIsLocalStorageReady(true); // Continue anyway
      }
    };

    initStorage();
  }, []);

  // Background backup service initialization
  useEffect(() => {
    if (accounts.length === 0) return;

    const backgroundService = BackgroundBackupService.getInstance();
    backgroundService.initialize();

    // Listen for background backup requests
    const handleBackgroundBackupRequest = () => {
      handleBackgroundBackup();
    };

    window.addEventListener(
      "background-backup-requested",
      handleBackgroundBackupRequest
    );

    return () => {
      window.removeEventListener(
        "background-backup-requested",
        handleBackgroundBackupRequest
      );
      backgroundService.stop();
    };
  }, [accounts]);

  useEffect(() => {
    const checkUpdates = async () => {
      const update = await check();
      if (update) {
        console.log(
          `found update ${update.version} from ${update.date} with notes ${update.body}`
        );
        setUpdate(update);
      } else {
        console.log("no updates");
      }
    };

    checkUpdates();
    const unlistenVisible = appWindow.listen("tauri://focus", () => {
      checkUpdates();
    });

    return () => {
      // Cleanup listeners
      unlistenVisible.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <>
      <div className="titlebar hide-scroll" data-tauri-drag-region>
        <div className="title ml-4 text-sm opacity-90">ATProto Backup</div>
        <div className="ml-auto flex">
          <ToolbarButton
            onClick={() => {
              appWindow.minimize();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M19 13H5v-2h14z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              appWindow.toggleMaximize();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M4 4h16v16H4zm2 4v10h12V8z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              appWindow.hide();
            }}
            destructive
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M13.46 12L19 17.54V19h-1.46L12 13.46L6.46 19H5v-1.46L10.54 12L5 6.46V5h1.46L12 10.54L17.54 5H19v1.46z"
              />
            </svg>
          </ToolbarButton>
        </div>
      </div>
      <div className="flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto custom-scroll">
          <Dialog
            open={update != null}
            onOpenChange={(it) => {
              if (it == false) setUpdate(null);
            }}
          >
            {/* <DialogTrigger>Open</DialogTrigger> */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  New update available ({update?.currentVersion} ➜{" "}
                  {update?.version})
                </DialogTitle>
                <DialogDescription>
                  <MarkdownRenderer
                    children={update?.body ?? "No details provided"}
                  />
                </DialogDescription>
                <DialogFooter className="mt-4">
                  {downloadProgress == null ? (
                    <>
                      <DialogClose asChild className="cursor-pointer">
                        <Button variant="outline">Skip</Button>
                      </DialogClose>
                      <Button
                        className="cursor-pointer"
                        onClick={async () => {
                          if (update == null) toast("Failed: update not found");
                          toast("Downloading new update...");
                          let downloaded = 0;
                          let contentLength = 0;
                          // alternatively we could also call update.download() and update.install() separately
                          await update!!.downloadAndInstall((event) => {
                            switch (event.event) {
                              case "Started":
                                //@ts-expect-error
                                contentLength = event.data.contentLength;
                                setDownloadProgress(0);
                                console.log(
                                  `started downloading ${event.data.contentLength} bytes`
                                );
                                break;
                              case "Progress":
                                downloaded += event.data.chunkLength;
                                setDownloadProgress(downloaded / contentLength);
                                console.log(
                                  `downloaded ${downloaded} from ${contentLength}`
                                );
                                break;
                              case "Finished":
                                setDownloadProgress(100);
                                console.log("download finished");
                                break;
                            }
                          });

                          toast("Update ready, restarting...");
                          await relaunch();
                        }}
                      >
                        Download
                      </Button>
                    </>
                  ) : (
                    <Progress value={downloadProgress} className="w-full" />
                  )}
                </DialogFooter>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <ScrollArea>
            {isLoading || !isLocalStorageReady ? (
              <div className="fixed inset-0 flex items-center justify-center">
                <LoaderCircleIcon className="animate-spin text-white/80" />
              </div>
            ) : accounts.length > 0 ? (
              <Home />
            ) : (
              <LoginPage />
            )}
          </ScrollArea>

          <Toaster />
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AccountsProvider>
        <AppContent />
      </AccountsProvider>
    </ThemeProvider>
  );
}

export default App;
