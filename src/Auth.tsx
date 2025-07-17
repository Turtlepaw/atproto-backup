import { Agent } from "@atproto/api";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { OAuthClient, type OAuthSession } from "@atproto/oauth-client";
import { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import { load, Store } from "@tauri-apps/plugin-store";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface StoredSession {
  did: string;
}

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  profile: ProfileViewDetailed | null;
  client: OAuthClient | null;
  login: (session: OAuthSession) => Promise<void>;
  logout: () => Promise<void>;
  agent: Agent | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileViewDetailed | null>(null);
  const [client, setClient] = useState<OAuthClient | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);

  // Initialize OAuth client
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const client = await BrowserOAuthClient.load({
          clientId: "https://atproto-backup.pages.dev/client_metadata.json",
          handleResolver: "https://bsky.social",
        });

        setClient(client);

        // Try to restore existing session from storage
        try {
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
            await login(session);
          } else {
            const store = await Store.load("store.json", { autoSave: true });
            const sub = (await store.get("session")) as string;
            if (sub) {
              const session = await client.restore(sub);
              await login(session);
              return;
            }
          }
        } catch (error) {
          console.error("Failed to restore session:", error);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const login = async (session: OAuthSession) => {
    try {
      const store = await Store.load("store.json", { autoSave: true });
      store.set("session", session.did);
      const agent = new Agent(session);
      setAgent(agent);
      setIsLoading(true);

      const actor = await agent.getProfile({ actor: session.did });
      setProfile(actor.data);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (client && profile) {
        // Revoke the session and clear storage
        await client.revoke(profile.did);
        const store = await Store.load("store.json", { autoSave: true });
        // probably unnecessary
        await store.clear();
        setProfile(null);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!profile,
        profile,
        client,
        login,
        logout,
        agent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
