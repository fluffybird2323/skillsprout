import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'manabu-secret-key-change-me';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;
    
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { courseId, progressData } = await req.json();

    if (!courseId || !progressData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO user_progress (user_id, course_id, progress_data, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, course_id) DO UPDATE SET
        progress_data = excluded.progress_data,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(userId, courseId, JSON.stringify(progressData));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Progress sync error:', error);
    return NextResponse.json({ error: 'Failed to sync progress' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;
    
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (courseId) {
      const row: any = db.prepare('SELECT progress_data FROM user_progress WHERE user_id = ? AND course_id = ?')
        .get(userId, courseId);
      return NextResponse.json({ progress: row ? JSON.parse(row.progress_data) : null });
    } else {
      const rows = db.prepare('SELECT course_id, progress_data FROM user_progress WHERE user_id = ?')
        .all(userId);
      const progressMap = rows.reduce((acc: any, row: any) => {
        acc[row.course_id] = JSON.parse(row.progress_data);
        return acc;
      }, {});
      return NextResponse.json({ progress: progressMap });
    }
  } catch (error) {
    console.error('Progress fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}
