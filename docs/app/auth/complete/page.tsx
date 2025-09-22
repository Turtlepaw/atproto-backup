"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, ExternalLink, LoaderCircle } from "lucide-react";
import React, { Suspense, useEffect } from "react";

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
  );
}

function AuthCompleteContent() {
  const [loading, setLoading] = React.useState(true);
  const [redirectUrl, setRedirectUrl] = React.useState("");

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Get all parameters from the URL
    const currentUrl = new URL(window.location.href);
    const params = new URLSearchParams(currentUrl.search);

    params.forEach((value, key) => {
      console.log(key, "=", value);
    });

    // Construct the redirect URL preserving all parameters
    const url = `atprotobackups://auth${
      currentUrl.search || "?" + currentUrl.hash.slice(1)
    }`;
    setRedirectUrl(url);

    // Open the URL in the system's default handler and close the window after a short delay
    window.location.href = url;

    // Close the window after a short delay to ensure the protocol handler is triggered
    setTimeout(() => {
      window.close();
      setLoading(false);
    }, 1500);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          Authentication Complete
        </h2>
        <p className="text-lg dark:text-white/80 text-black/80 flex items-center justify-center gap-2">
          {loading
            ? (
              <LoaderCircle className="animate-spin size-4 text-black/80 dark:text-white/80" />
            )
            : <CheckIcon className="size-4 text-black/80 dark:text-white/80" />}
          {loading
            ? "Redirecting you back to the application..."
            : "You may now close this window."}
        </p>
        <div className="mt-6">
          <a
            href={redirectUrl}
          >
            <Button variant="outline" className="cursor-pointer">
              Open App <ExternalLink className="ml-1" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoaderCircle className="animate-spin size-8 text-black/60 dark:text-white/60" />
    </div>
  );
}

export default function AuthComplete() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCompleteContent />
    </Suspense>
  );
}
