import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'manabu-secret-key-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'manabu-refresh-secret-change-me';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userRow: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!userRow) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      emoji: userRow.emoji,
      xp: userRow.xp,
      streak: userRow.streak,
      hearts: userRow.hearts
    };

    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '365d' });

    return NextResponse.json({ user, token, refreshToken });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
