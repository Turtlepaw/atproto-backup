import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SquareArrowOutUpRight } from "lucide-react";
import { normalizeAccountIdentifier, useAccounts } from "@/Accounts";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { addAccount } = useAccounts();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const account = await normalizeAccountIdentifier(identifier);
      await addAccount(account);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
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
            Add your Atmosphere account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            className="w-full cursor-pointer"
            onClick={handleLogin}
            disabled={loading || !identifier}
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
