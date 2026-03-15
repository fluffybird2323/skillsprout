import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const X_CLIENT_ID = process.env.X_CLIENT_ID || '';
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.X_REDIRECT_URI || 'https://manabu.artiestudio.org/api/auth/x/callback';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://manabu.artiestudio.org';

const JWT_SECRET = process.env.JWT_SECRET || 'manabu-secret-key-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'manabu-refresh-secret-change-me';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}?auth_error=x_denied`);
  }

  // Verify CSRF state
  const savedState = req.cookies.get('x_oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}?auth_error=x_state_mismatch`);
  }

  const codeVerifier = req.cookies.get('x_code_verifier')?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(`${APP_URL}?auth_error=x_verifier_missing`);
  }

  try {
    // Exchange code for access token
    const credentials = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('X token exchange failed:', tokenData);
      return NextResponse.redirect(`${APP_URL}?auth_error=x_token`);
    }

    // Fetch user info from X
    const userInfoRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=name,username',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const userInfoData = await userInfoRes.json();

    if (!userInfoRes.ok || !userInfoData.data) {
      return NextResponse.redirect(`${APP_URL}?auth_error=x_userinfo`);
    }

    const { id: xId, name, username } = userInfoData.data;
    // X doesn't return email without elevated access — use a placeholder
    const email = `x_${xId}@x.manabu.local`;

    // Look up by x_id first, then fall back to email
    let userRow: any = db.prepare('SELECT * FROM users WHERE x_id = ?').get(xId);

    if (!userRow) {
      userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (userRow) {
        db.prepare('UPDATE users SET x_id = ? WHERE id = ?').run(xId, userRow.id);
        userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userRow.id);
      } else {
        const id = uuidv4();
        db.prepare(`
          INSERT INTO users (id, email, full_name, password_hash, emoji, x_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, email, name || username, 'X_OAUTH', '👤', xId);
        userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      }
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      emoji: userRow.emoji,
      xp: userRow.xp,
      streak: userRow.streak,
      hearts: userRow.hearts,
    };

    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '365d' });

    const params = new URLSearchParams({
      x_token: token,
      x_refresh: refreshToken,
      x_user: encodeURIComponent(JSON.stringify(user)),
    });

    const res = NextResponse.redirect(`${APP_URL}?${params}`);
    // Clear PKCE cookies
    res.cookies.delete('x_code_verifier');
    res.cookies.delete('x_oauth_state');
    return res;
  } catch (err) {
    console.error('X OAuth callback error:', err);
    return NextResponse.redirect(`${APP_URL}?auth_error=server`);
  }
}
