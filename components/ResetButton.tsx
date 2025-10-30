'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = () => {
    // Clear all localStorage
    localStorage.removeItem('experiment-state');
    localStorage.removeItem('experiment-results');
    
    // Redirect to home page and reload to reset state
    router.push('/');
    window.location.reload();
  };

  if (showConfirm) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={handleReset}
          style={{ 
            fontSize: '1rem', 
            fontWeight: 500, 
            padding: '0.5rem 1rem', 
            borderRadius: '6px',
            color: '#4a90e2',
            background: '#ffffff',
            border: '1px solid #ddd',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
        >
          Confirm Reset
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          style={{ 
            fontSize: '1rem', 
            fontWeight: 500, 
            padding: '0.5rem 1rem', 
            borderRadius: '6px',
            color: '#4a90e2',
            background: '#ffffff',
            border: '1px solid #ddd',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      style={{ 
        fontSize: '1rem', 
        fontWeight: 500, 
        padding: '0.5rem 1rem', 
        borderRadius: '6px',
        color: '#4a90e2',
        background: '#ffffff',
        border: '1px solid #ddd',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        lineHeight: '1.5',
        fontFamily: 'inherit',
        display: 'inline-block'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
    >
      Reset Experiment
    </button>
  );
}

