import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AtpSessionEvent,
  Agent,
  CredentialSession,
  AtpSessionData,
} from "@atproto/api";
import {
  BrowserOAuthClient,
  BrowserOAuthClientOptions,
  OAuthSession,
} from "@atproto/oauth-client-browser";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

type LoginMethod = "credential" | "oauth";

interface LoginPageProps {
  onLogin: (session: OAuthSession) => void;
  client: BrowserOAuthClient;
}

export default function LoginPage({
  onLogin,
  client: oauthClient,
}: LoginPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("credential");
  const processingOAuthRef = useRef(false);

  // Initialize OAuth client
  useEffect(() => {
    const initOAuthClient = async () => {
      try {
        // Set up deep link handler
        await onOpenUrl(async (urls) => {
          console.log("deep link received:", urls);
          if (!oauthClient || urls.length === 0) return;

          // Prevent duplicate processing
          if (processingOAuthRef.current) {
            console.log(
              "Already processing OAuth callback, ignoring duplicate"
            );
            return;
          }

          try {
            processingOAuthRef.current = true;
            // Get the first URL from the array and parse it
            const url = new URL(urls[0]);

            // Process the OAuth callback with the URLSearchParams directly
            const session = await oauthClient.callback(url.searchParams);
            console.log("OAuth callback successful!", session);
            onLogin(session.session);
            setLoading(false);
          } catch (err) {
            console.error("Failed to process OAuth callback:", err);
            setError("Failed to complete OAuth login");
          } finally {
            processingOAuthRef.current = false;
          }
        });
      } catch (err) {
        console.error("Failed to initialize OAuth client:", err);
      }
    };
    initOAuthClient();
  }, [onLogin]);

  const handleLogin = async () => {
    if (!oauthClient) {
      setError("OAuth client not initialized");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // For ATProto OAuth, we need to use the user's handle/identifier
      if (!identifier) {
        setError("Please enter your handle or identifier");
        return;
      }

      // Sign in using OAuth with popup
      const session = await oauthClient.signInPopup(identifier, {
        scope: "atproto transition:generic",
        ui_locales: "en",
        signal: new AbortController().signal,
      });

      console.log("OAuth login successful!", session);
      onLogin(session);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "OAuth login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login with your handle on the Atmosphere</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            className="w-full cursor-pointer"
            onClick={handleLogin}
            disabled={loading || identifier == null}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
