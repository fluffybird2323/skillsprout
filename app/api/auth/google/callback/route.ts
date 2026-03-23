import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://manabu.artiestudio.org/api/auth/google/callback';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://manabu.artiestudio.org';
const JWT_SECRET = process.env.JWT_SECRET || 'manabu-secret-key-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'manabu-refresh-secret-change-me';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}?auth_error=google_denied`);
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Google OAuth callback: credentials not set');
    return NextResponse.redirect(`${APP_URL}?auth_error=server`);
  }

  try {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) {
      return NextResponse.redirect(`${APP_URL}?auth_error=google_token`);
    }

    client.setCredentials(tokens);

    // Fetch user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json();

    if (!userInfoRes.ok || !googleUser.email) {
      return NextResponse.redirect(`${APP_URL}?auth_error=google_userinfo`);
    }

    const { id: googleId, email, name } = googleUser;

    // Look up by google_id first, then fall back to email (links existing accounts)
    let userRow: any = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);

    if (!userRow) {
      userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (userRow) {
        db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, userRow.id);
        userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userRow.id);
      } else {
        const id = uuidv4();
        db.prepare(`
          INSERT INTO users (id, email, full_name, password_hash, emoji, google_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, email, name || email.split('@')[0], 'GOOGLE_OAUTH', '👤', googleId);
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
      google_token: token,
      google_refresh: refreshToken,
      google_user: encodeURIComponent(JSON.stringify(user)),
    });

    return NextResponse.redirect(`${APP_URL}?${params}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${APP_URL}?auth_error=server`);
  }
}
