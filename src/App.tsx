import { useState, useEffect } from "react";
import "./App.css";
import { Button } from "./components/ui/button";
import LoginPage from "./routes/Login";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LoaderCircleIcon } from "lucide-react";
import { AuthProvider, useAuth } from "./Auth";
import { initializeLocalStorage } from "./localstorage_ployfill";
import { Home } from "./routes/Home";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "sonner";
import { ScrollArea } from "./components/ui/scroll-area";
import { BackupManager } from "./lib/backup";
import { settingsManager } from "./lib/settings";

function AppContent() {
  const { isLoading, isAuthenticated, profile, client, login, logout, agent } =
    useAuth();
  const appWindow = getCurrentWindow();

  const [isLocalStorageReady, setIsLocalStorageReady] = useState(false);

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

  // Auto-backup functionality
  useEffect(() => {
    if (!isAuthenticated || !agent) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkAndPerformBackup = async () => {
      try {
        const lastBackupDate = await settingsManager.getLastBackupDate();
        const frequency = await settingsManager.getBackupFrequency();

        if (!lastBackupDate) {
          // No previous backup, so we should do one
          await performBackup();
          return;
        }

        const lastBackup = new Date(lastBackupDate);
        const now = new Date();
        const timeDiff = now.getTime() - lastBackup.getTime();

        if (frequency === "daily") {
          // Check if 24 hours have passed
          const oneDay = 24 * 60 * 60 * 1000;
          if (timeDiff >= oneDay) {
            await performBackup();
          }
        } else if (frequency === "weekly") {
          // Check if 7 days have passed
          const oneWeek = 7 * 24 * 60 * 60 * 1000;
          if (timeDiff >= oneWeek) {
            await performBackup();
          }
        }
      } catch (error) {
        console.error("Error in automatic backup check:", error);
      }
    };

    const performBackup = async () => {
      try {
        console.log("Automatic backup due, starting backup...");
        const manager = new BackupManager(agent);
        await manager.startBackup();

        // Update the last backup date
        await settingsManager.setLastBackupDate(new Date().toISOString());

        console.log("Automatic backup completed successfully");
      } catch (error) {
        console.error("Automatic backup failed:", error);
      }
    };

    // Check immediately when authenticated
    checkAndPerformBackup();

    // Set up interval to check every hour
    intervalId = setInterval(checkAndPerformBackup, 60 * 60 * 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, agent]);

  return (
    <main className="bg-background dark min-h-screen flex flex-col">
      <div className="titlebar" data-tauri-drag-region>
        <div className="controls">
          <Button
            variant="ghost"
            id="titlebar-minimize"
            title="minimize"
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
          </Button>
          <Button
            id="titlebar-maximize"
            title="maximize"
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
          </Button>
          <Button
            id="titlebar-close"
            title="close"
            onClick={() => {
              appWindow.close();
            }}
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
          </Button>
        </div>
      </div>

      <ScrollArea>
        {isLoading || !isLocalStorageReady ? (
          <div className="fixed inset-0 flex items-center justify-center">
            <LoaderCircleIcon className="animate-spin text-white/80" />
          </div>
        ) : isAuthenticated ? (
          <Home profile={profile!!} onLogout={logout} />
        ) : (
          <LoginPage onLogin={login} client={client} />
        )}
      </ScrollArea>

      <Toaster />
    </main>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
