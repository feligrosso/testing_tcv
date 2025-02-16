"use client";

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import Image from 'next/image';
import { useState } from 'react';

export default function SignInWithGoogle() {
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!auth) {
      setError("Authentication is not initialized. Please try again later.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setError(null);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  return (
    <div>
      <button
        onClick={handleSignIn}
        className="flex items-center justify-center gap-2 w-full bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Image
          src="/images/google-logo.png"
          alt="Google Logo"
          width={20}
          height={20}
        />
        <span className="font-calibri">Sign in with Google</span>
      </button>
      
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
