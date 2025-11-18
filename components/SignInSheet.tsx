'use client';

import { useState, useEffect } from 'react';

interface SignInSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (password: string) => Promise<boolean>;
}

export default function SignInSheet({ isOpen, onClose, onSignIn }: SignInSheetProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await onSignIn(password);
      if (success) {
        setPassword('');
        // Don't call onClose here - let the parent handle redirect
        // onClose will be called by the parent component after redirect
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="signin-sheet-backdrop"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="signin-sheet">
        <div className="signin-sheet-content">
          {/* Handle bar */}
          <div className="signin-sheet-handle" onClick={onClose}>
            <div className="signin-sheet-handle-bar" />
          </div>

          {/* Header */}
          <div className="signin-sheet-header">
            <h2>Admin Sign In</h2>
            <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Enter your password to access the admin dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="signin-sheet-form">
            <div className="signin-sheet-field">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '3rem',
                    fontSize: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    opacity: isLoading ? 0.5 : 1,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                color: '#c33',
                fontSize: '0.9rem',
                marginTop: '1rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="signin-sheet-button"
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: isLoading || !password.trim() ? '#ccc' : '#4a90e2',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading || !password.trim() ? 'not-allowed' : 'pointer',
                marginTop: '1.5rem',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && password.trim()) {
                  e.currentTarget.style.backgroundColor = '#357abd';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && password.trim()) {
                  e.currentTarget.style.backgroundColor = '#4a90e2';
                }
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

