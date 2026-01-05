import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'manabu-secret-key-change-me';

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

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
