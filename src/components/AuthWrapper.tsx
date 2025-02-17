'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import SignInWithGoogle from './SignInWithGoogle';
import V2ALogo from '@/app/components/V2ALogo';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">
          <div className="h-14 w-56 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Show login screen
  if (!auth || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <V2ALogo className="h-14 w-56 mx-auto mb-8" />
            <h2 className="text-2xl font-georgia text-v2a-blue mb-2">Welcome to TuConsultor V2A</h2>
            <p className="text-gray-600 font-calibri mb-8">
              Sign in to start creating consultant-quality slides with AI assistance
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <SignInWithGoogle />
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>By signing in, you agree to our</p>
              <div className="mt-1 space-x-1">
                <a href="#" className="text-v2a-blue hover:underline">Terms of Service</a>
                <span>and</span>
                <a href="#" className="text-v2a-blue hover:underline">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 