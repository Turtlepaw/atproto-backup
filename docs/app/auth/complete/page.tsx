"use client";

import { useEffect, Suspense } from "react";

function AuthCompleteContent() {
  useEffect(() => {
    // Debug logging
    console.log("Current URL:", window.location.href);
    console.log("Search string:", window.location.search);
    console.log("Hash:", window.location.hash);

    // Get all parameters from the URL
    const currentUrl = new URL(window.location.href);
    const params = new URLSearchParams(currentUrl.search);

    // Debug log all parameters
    console.log("All parameters:");
    params.forEach((value, key) => {
      console.log(key, "=", value);
    });

    // Construct the redirect URL preserving all parameters
    const redirectUrl = `atprotobackups://auth${
      currentUrl.search || "?" + currentUrl.hash.slice(1)
    }`;
    console.log("Redirecting to:", redirectUrl);

    // Open the URL in the system's default handler
    window.location.href = redirectUrl;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Authentication Complete
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Redirecting you back to the application...
          </p>
          <pre
            id="debug"
            className="mt-4 text-left text-xs text-gray-500 bg-gray-100 p-2 rounded"
          >
            Checking URL parameters...
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function AuthComplete() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Loading...
              </h2>
            </div>
          </div>
        </div>
      }
    >
      <AuthCompleteContent />
    </Suspense>
  );
}
