'use client';

import Link from 'next/link';
import ResetButton from './ResetButton';

export default function HeaderContent() {
  return (
    <div className="floating-header">
      <div className="floating-header-content">
        <div className="floating-header-text">AI Model Selection Experiment</div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ResetButton />
          <Link href="/dashboard" className="dashboard-link">
            Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

