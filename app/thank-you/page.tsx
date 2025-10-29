'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const participantId = searchParams.get('participantId');

  return (
    <main>
      <div className="container">
        <div className="thank-you">
          <h1>Thank You for Participating!</h1>
          <p style={{ fontSize: '1.1rem', margin: '1.5rem 0' }}>
            Your response has been recorded and will contribute to our research.
          </p>
          
          {participantId && (
            <div style={{ margin: '1.5rem 0' }}>
              <p>Your participant ID:</p>
              <p className="participant-id">{participantId}</p>
            </div>
          )}

          <div className="info-box" style={{ margin: '2rem auto', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>About This Research</h2>
            <p>
              This experiment investigates how brand reputation and benchmark visibility 
              influence developers' model selection behavior. Your participation helps us 
              understand decision-making patterns in the AI development community.
            </p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <p style={{ color: '#666' }}>
              You may now close this window.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ThankYou() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}
