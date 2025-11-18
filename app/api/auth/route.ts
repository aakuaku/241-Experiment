import { NextRequest, NextResponse } from 'next/server';

// Admin password - should be set in environment variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '241-experiment123';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { authenticated: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Simple password check
    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ authenticated: true }, { status: 200 });
    } else {
      return NextResponse.json(
        { authenticated: false, error: 'Incorrect password' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

