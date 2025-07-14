"use client";

import { useEffect, Suspense } from "react";

function AuthCompleteContent() {
  useEffect(() => {
    // Get the raw search string from the URL
    const searchString = window.location.search;

    // Construct the redirect URL with the raw search string
    const redirectUrl = `atprotobackups://auth${searchString}`;
    console.log("Redirecting to:", redirectUrl); // Debug log

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
