import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'manabu-secret-key-change-me';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, emoji } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const userEmoji = emoji || '👤';

    db.prepare(`
      INSERT INTO users (id, email, full_name, password_hash, emoji)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, email, fullName, passwordHash, userEmoji);

    const user = {
      id,
      email,
      fullName,
      emoji: userEmoji,
      xp: 0,
      streak: 0,
      hearts: 5
    };

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
