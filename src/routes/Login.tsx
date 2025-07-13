import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AtpSessionEvent, Agent, CredentialSession } from "@atproto/api";
import {
  BrowserOAuthClient,
  BrowserOAuthClientOptions,
} from "@atproto/oauth-client-browser";

type LoginMethod = "credential" | "oauth";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("credential");
  const [oauthClient, setOauthClient] = useState<BrowserOAuthClient | null>(
    null
  );

  // Initialize OAuth client
  useEffect(() => {
    const initOAuthClient = async () => {
      try {
        const client = new BrowserOAuthClient({
          clientMetadata: {
            client_id: "http://localhost:3000", // Replace with your actual client ID
            redirect_uris: ["http://localhost:3000/callback"], // Replace with your redirect URI
            client_name: "ATProto Backup App",
            client_uri: "http://localhost:3000",
            scope: "atproto",
          },
        });
        setOauthClient(client);
      } catch (err) {
        console.error("Failed to initialize OAuth client:", err);
      }
    };
    initOAuthClient();
  }, []);

  const handleCredentialLogin = async () => {
    setLoading(true);
    setError("");
    const agent = new Agent(new CredentialSession());

    try {
      const result = await agent.login({ identifier, password });
      console.log("Credential login successful!", result);
      // Store session, redirect, etc.
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Credential login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async () => {
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
        scope: "atproto",
      });

      console.log("OAuth login successful!", session);
      // Store session, redirect, etc.
    } catch (err: any) {
      console.error(err);
      setError(err.message || "OAuth login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthRedirect = async () => {
    if (!oauthClient) {
      setError("OAuth client not initialized");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!identifier) {
        setError("Please enter your handle or identifier");
        return;
      }

      // Sign in using OAuth with redirect
      await oauthClient.signInRedirect(identifier, {
        scope: "atproto",
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "OAuth redirect failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth callback on page load
  useEffect(() => {
    const handleCallback = async () => {
      if (!oauthClient) return;

      try {
        const result = await oauthClient.signInCallback();
        if (result) {
          console.log("OAuth callback successful!", result);
          // Handle successful login
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        setError("OAuth callback failed");
      }
    };

    handleCallback();
  }, [oauthClient]);

  const handleLogin = () => {
    if (loginMethod === "credential") {
      handleCredentialLogin();
    } else {
      handleOAuthLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login to Bluesky</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
