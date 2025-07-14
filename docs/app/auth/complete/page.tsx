"use client";

import { useEffect, Suspense } from "react";

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
  );
}

function AuthCompleteContent() {
  useEffect(() => {
    // Get all parameters from the URL
    const currentUrl = new URL(window.location.href);
    const params = new URLSearchParams(currentUrl.search);

    params.forEach((value, key) => {
      console.log(key, "=", value);
    });

    // Construct the redirect URL preserving all parameters
    const redirectUrl = `atprotobackups://auth${
      currentUrl.search || "?" + currentUrl.hash.slice(1)
    }`;

    // Open the URL in the system's default handler and close the window after a short delay
    window.location.href = redirectUrl;

    // Close the window after a short delay to ensure the protocol handler is triggered
    setTimeout(() => {
      window.close();
      // Fallback message if window.close() fails (some browsers prevent it)
      document.body.innerHTML =
        '<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50"><div class="max-w-md w-full p-8 text-center"><p class="text-lg text-gray-600">Authentication complete! You can close this window.</p></div></div>';
    }, 1500);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Authentication Complete
          </h2>
          <p className="text-lg text-gray-600">
            Redirecting you back to the application...
          </p>
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full animate-progress"
              style={{
                animation: "progress 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Loading...
          </h2>
        </div>
      </div>
    </div>
  );
}

export default function AuthComplete() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <style jsx global>{`
        @keyframes progress {
          0% {
            width: 0%;
          }
          50% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
      <AuthCompleteContent />
    </Suspense>
  );
}
