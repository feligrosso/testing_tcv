"use client";

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { useState } from 'react';

export default function SignInWithGoogle() {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setDebugInfo(null);

    if (!auth) {
      setError("Authentication is not initialized. Please try again later.");
      setDebugInfo("Auth object is undefined. Check Firebase initialization.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      // Add additional OAuth scopes if needed
      provider.addScope('email');
      provider.addScope('profile');
      
      // Log the current domain
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
      console.log('Current domain:', currentDomain);
      
      await signInWithPopup(auth, provider);
      setError(null);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      
      // Create detailed debug info
      const debugDetails = [
        `Error code: ${error.code || 'unknown'}`,
        `Error message: ${error.message || 'no message'}`,
        `Domain: ${typeof window !== 'undefined' ? window.location.hostname : 'unknown'}`,
        `Firebase initialized: ${!!auth}`,
      ].join('\n');
      
      setDebugInfo(debugDetails);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-blocked') {
        setError("The sign-in popup was blocked. Please allow popups for this site and try again.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError("The sign-in popup was closed. Please try again.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setError(`This domain is not authorized for Google sign-in. Please add "${typeof window !== 'undefined' ? window.location.hostname : 'this domain'}" to the authorized domains in Firebase Console.`);
      } else if (error.code === 'auth/cancelled-popup-request') {
        // This is a common case when user clicks multiple times, we can ignore it
        return;
      } else if (error.code === 'auth/internal-error') {
        setError("An internal error occurred. Please check if third-party cookies are enabled in your browser.");
      } else {
        setError(`Failed to sign in with Google: ${error.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div>
      <button
        onClick={handleSignIn}
        className="flex items-center justify-center gap-3 w-full bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
          </g>
        </svg>
        <span className="font-calibri">Sign in with Google</span>
      </button>
      
      {(error || debugInfo) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          {debugInfo && (
            <details className="mt-2">
              <summary className="text-xs text-gray-600 cursor-pointer">Debug Information</summary>
              <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">{debugInfo}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
