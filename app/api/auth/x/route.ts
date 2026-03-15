import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

const X_CLIENT_ID = process.env.X_CLIENT_ID || '';
const REDIRECT_URI = process.env.X_REDIRECT_URI || 'https://manabu.artiestudio.org/api/auth/x/callback';

export async function GET(_req: NextRequest) {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const state = randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: X_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const res = NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?${params}`
  );

  // Store PKCE verifier and state in short-lived cookies for the callback
  res.cookies.set('x_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  res.cookies.set('x_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return res;
}
