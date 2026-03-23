import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://manabu.artiestudio.org/api/auth/google/callback'
);

export async function GET(_req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Google OAuth: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
    return NextResponse.json({ error: 'OAuth not configured' }, { status: 500 });
  }

  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    prompt: 'select_account',
  });

  return NextResponse.redirect(url);
}
