import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Course } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Clean up expired courses (older than 7 days)
    try {
      db.prepare("DELETE FROM courses WHERE created_at < datetime('now', '-7 days')").run();
    } catch (cleanupError) {
      console.error('Failed to cleanup expired courses:', cleanupError);
    }

    let rows;
    if (topic) {
      const stmt = db.prepare("SELECT data FROM courses WHERE topic LIKE ? AND created_at >= datetime('now', '-7 days') ORDER BY created_at DESC LIMIT ?");
      rows = stmt.all(`%${topic}%`, limit);
    } else {
      const stmt = db.prepare("SELECT data FROM courses WHERE created_at >= datetime('now', '-7 days') ORDER BY created_at DESC LIMIT ?");
      rows = stmt.all(limit);
    }

    const courses = rows.map((row: any) => JSON.parse(row.data));
    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { course, userId, generatedByName, isPublic } = body;

    if (!course?.id || !course?.topic) {
      return NextResponse.json({ error: 'Invalid course data' }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO courses (id, user_id, topic, depth, icon, data, generated_by_name, is_public, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        user_id = COALESCE(excluded.user_id, user_id),
        topic = excluded.topic,
        depth = excluded.depth,
        icon = excluded.icon,
        data = excluded.data,
        generated_by_name = COALESCE(excluded.generated_by_name, generated_by_name),
        is_public = COALESCE(excluded.is_public, is_public),
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      course.id,
      userId || null,
      course.topic,
      course.depth,
      course.icon || '',
      JSON.stringify(course),
      generatedByName || null,
      isPublic ? 1 : 0
    );

    return NextResponse.json({ success: true, id: course.id });
  } catch (error) {
    console.error('Failed to save course:', error);
    return NextResponse.json({ error: 'Failed to save course' }, { status: 500 });
  }
}
