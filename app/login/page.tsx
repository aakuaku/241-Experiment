'use client';

import { useState, useEffect } from 'react';
import SignInSheet from '@/components/SignInSheet';

export default function LoginPage() {
  const [showSignIn, setShowSignIn] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('admin-authenticated');
    if (authStatus === 'true') {
      // Already authenticated, redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, []);

  const handleSignIn = async (password: string): Promise<boolean> => {
    try {
      // Check password via API
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          localStorage.setItem('admin-authenticated', 'true');
          // Redirect to dashboard after successful login
          window.location.href = '/dashboard';
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  };

  return (
    <>
      <SignInSheet
        isOpen={showSignIn}
        onClose={() => {
          // Redirect to home if they want to leave
          window.location.href = '/';
        }}
        onSignIn={handleSignIn}
      />
      <main>
        <div className="container">
          <h1>Admin Login</h1>
          <p>Please sign in to access the admin dashboard.</p>
        </div>
      </main>
    </>
  );
}

