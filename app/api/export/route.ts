import { NextResponse } from 'next/server';

export async function GET() {
  // In a real application, you'd fetch from a database
  // For now, this endpoint can be used to download results
  // Results are stored in localStorage on the client side
  
  return NextResponse.json({
    message: 'Export endpoint - implement database connection to fetch results',
    note: 'Results are currently stored in localStorage. Implement server-side storage for production.',
  });
}
