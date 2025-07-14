import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { Button } from "./components/ui/button";
import LoginPage from "./routes/Login";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Agent,
  AtpAgent,
  type AtpSessionData,
  type AtpSessionEvent,
} from "@atproto/api";
import {
  BrowserOAuthClient,
  OAuthSession,
} from "@atproto/oauth-client-browser";
import { LoaderIcon } from "lucide-react";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";

function LoggedInScreen({
  session,
  onLogout,
  agent,
}: {
  session: OAuthSession;
  onLogout: () => void;
  agent: Agent;
}) {
  const [userData, setUserData] = useState<ProfileViewDetailed | null>(null);

  useEffect(() => {
    (async () => {
      const sessionData = await agent.getProfile({ actor: agent.assertDid });
      setUserData(sessionData.data);
    })();
  }, [agent]);

  return (
    <div className="p-4 mt-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome!</h1>
        <Button onClick={onLogout}>Logout</Button>
      </div>
      <div className="bg-card rounded-lg p-4">
        <p className="mb-2 text-white">
          Logged in as: <span className="font-mono">@{userData?.handle}</span>
        </p>
        <p className="text-sm text-muted-foreground"></p>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<OAuthSession | null>(null);
  const appWindow = getCurrentWindow();
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    (async () => {
      const client = await BrowserOAuthClient.load({
        clientId: "https://atproto-backup.pages.dev/client_metadata.json",
        handleResolver: "https://bsky.social",
      });

      //@ts-expect-error
      const result: undefined | { session: OAuthSession; state?: string } =
        await client.init();

      if (result) {
        const { session, state } = result;
        if (state != null) {
          console.log(
            `${session.sub} was successfully authenticated (state: ${state})`
          );
        } else {
          console.log(`${session.sub} was restored (last active session)`);
        }
        setSession(session);
        setAgent(new Agent(session));
      }
      setClient(client);
    })();
  }, []);

  const handleLogin = (newSession: OAuthSession) => {
    setSession(newSession);
    setAgent(new Agent(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    setAgent(null);
  };

  return (
    <main className="dark bg-background min-h-screen flex flex-col">
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

      {client ? (
        <>
          {session && agent ? (
            <LoggedInScreen
              session={session}
              onLogout={handleLogout}
              agent={agent}
            />
          ) : (
            <LoginPage onLogin={handleLogin} client={client} />
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <LoaderIcon className="animate-spin" />
        </div>
      )}
    </main>
  );
}

export default App;
