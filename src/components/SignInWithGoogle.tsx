"use client";

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import Image from 'next/image';

export default function SignInWithGoogle() {
  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
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
  );
}
