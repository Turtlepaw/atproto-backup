import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import { OAuthClient, type OAuthSession } from "@atproto/oauth-client";
import { SquareArrowOutUpRight } from "lucide-react";
import { enable } from "@tauri-apps/plugin-autostart";

interface LoginPageProps {
  onLogin: (session: OAuthSession) => void;
  client: OAuthClient | null;
}

export default function LoginPage({
  onLogin,
  client: oauthClient,
}: LoginPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const processingOAuthRef = useRef(false);

  // Initialize OAuth client
  useEffect(() => {
    const initOAuthClient = async () => {
      try {
        console.log("waiting for deep links");
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

            console.log("OAuth callback URL:", url.searchParams.entries);
            // Process the OAuth callback with the URLSearchParams directly
            const session = await oauthClient.callback(url.searchParams);
            console.log("OAuth callback successful!", session);
            enable();
            onLogin(session.session);
            setLoading(false);
          } catch (err) {
            console.error("Failed to process OAuth callback:", err);
            setError("Failed to complete OAuth login");
            setLoading(false);
          } finally {
            processingOAuthRef.current = false;
          }
        });
      } catch (err) {
        console.error("Failed to initialize OAuth client:", err);
      }
    };
    initOAuthClient();
  }, [onLogin, oauthClient]);

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

      const url = await oauthClient.authorize(identifier, {
        scope: "atproto transition:generic",
        ui_locales: "en",
        signal: new AbortController().signal,
      });

      await openUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "OAuth login failed");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background px-4 relative"
      style={{
        backgroundImage: "url(/milky_way.jpg)",
        backgroundSize: "300%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Card className="w-full max-w-sm bg-black/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="cursor-default">
            Login with your handle on the Atmosphere
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="example.bsky.social"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            className="w-full cursor-pointer"
            onClick={handleLogin}
            disabled={loading || !identifier || !oauthClient}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </CardContent>
      </Card>
      <div
        className="absolute left-0 bottom-0 m-4 text-xs text-white/60 flex flex-row items-center gap-1"
        style={{ pointerEvents: "auto" }}
      >
        <button
          type="button"
          className="gap-2 p-0 bg-transparent border-none text-inherit hover:underline flex items-center cursor-pointer"
          onClick={() =>
            openUrl(
              "https://commons.wikimedia.org/wiki/File:Bontecou_Lake_Milky_Way_panorama.jpg"
            )
          }
          tabIndex={0}
          aria-label="Open image in browser"
        >
          <span>Image by Juliancolton, CC BY-SA 4.0</span>
          <SquareArrowOutUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
