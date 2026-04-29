import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { settingsManager } from "./lib/settings";

interface AccountsContextType {
  isLoading: boolean;
  accounts: string[];
  profiles: Map<string, ProfileViewDetailed>;
  addAccount: (account: string) => Promise<void>;
  removeAccount: (account: string) => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | null>(null);

export async function resolveHandle(handle: string): Promise<string> {
  if (handle.startsWith("did:")) {
    return handle;
  }

  const result = await fetch(
    `https://slingshot.microcosm.blue/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`
  );
  if (!result.ok) {
    throw new Error("Failed to resolve handle");
  }
  const data = await result.json();
  return data.did;
}

export async function normalizeAccountIdentifier(
  account: string
): Promise<string> {
  return resolveHandle(account.trim());
}

export async function getPdsUrl(did: string): Promise<string> {
  let resolvedDid = did;
  if (!did.startsWith("did:")) {
    resolvedDid = await resolveHandle(did);
  }
  const result = await fetch(
    `https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveService?did=${resolvedDid}&id=%23atproto_pds`
  )

  if (!result.ok) {
    return "https://bsky.social";
  }

  const data = await result.json();
  return (data?.endpoint as string | undefined) || "https://bsky.social";
}

async function fetchPublicProfile(did: string): Promise<ProfileViewDetailed> {
  const response = await fetch(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to load profile for ${did}`);
  }

  return (await response.json()) as ProfileViewDetailed;
}

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileViewDetailed>>(new Map());

  // Initialize OAuth client
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const storedAccounts = await settingsManager.getAccounts();
        const normalizedAccounts = Array.from(
          new Set(
            await Promise.all(
              storedAccounts.map((account) => normalizeAccountIdentifier(account))
            )
          )
        );

        if (
          normalizedAccounts.length !== storedAccounts.length ||
          normalizedAccounts.some((account, index) => account !== storedAccounts[index])
        ) {
          await settingsManager.setAccounts(normalizedAccounts);
        }

        setAccounts(normalizedAccounts);
        setProfiles(new Map());

        for (const account of normalizedAccounts) {
          try {
            const profile = await fetchPublicProfile(account);
            setProfiles((prev) => new Map(prev).set(account, profile));
          } catch (profileError) {
            console.error(`Failed to load profile for ${account}:`, profileError);
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);


  return (
    <AccountsContext.Provider
      value={{
        isLoading,
        accounts,
        profiles,
        addAccount: async (did) => {
          const normalizedAccount = await normalizeAccountIdentifier(did);
          const currentAccounts = await settingsManager.getAccounts();
          const nextAccounts = Array.from(
            new Set([...currentAccounts, normalizedAccount])
          );

          await settingsManager.setAccounts(nextAccounts);
          setAccounts(nextAccounts);

          try {
            const profile = await fetchPublicProfile(normalizedAccount);
            setProfiles((prev) => new Map(prev).set(normalizedAccount, profile));
          } catch (profileError) {
            console.error(
              `Failed to load profile for ${normalizedAccount}:`,
              profileError
            );
          }
        },
        removeAccount: async (did) => {
          const normalizedAccount = await normalizeAccountIdentifier(did);
          const currentAccounts = await settingsManager.getAccounts();
          const nextAccounts = currentAccounts.filter(
            (account) => account !== normalizedAccount
          );

          await settingsManager.setAccounts(nextAccounts);
          setAccounts(nextAccounts);
          setProfiles((prev) => {
            const nextProfiles = new Map(prev);
            nextProfiles.delete(normalizedAccount);
            return nextProfiles;
          });
        }

      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}
export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within an AccountsProvider");
  }
  return context;
}