import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'manabu-secret-key-change-me';

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const decoded: any = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      userId = decoded.userId;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { hearts } = await req.json();
    if (typeof hearts !== 'number' || hearts < 0 || hearts > 10) {
      return NextResponse.json({ error: 'Invalid hearts value' }, { status: 400 });
    }

    db.prepare('UPDATE users SET hearts = ? WHERE id = ?').run(hearts, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hearts sync error:', error);
    return NextResponse.json({ error: 'Failed to sync hearts' }, { status: 500 });
  }
}
