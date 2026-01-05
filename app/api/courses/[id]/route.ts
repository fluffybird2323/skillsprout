import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseRow: any = db.prepare('SELECT data, generated_by_name FROM courses WHERE id = ?').get(params.id);
    
    if (!courseRow) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = JSON.parse(courseRow.data);
    return NextResponse.json({ 
      course,
      generatedByName: courseRow.generated_by_name 
    });
  } catch (error) {
    console.error('Failed to fetch shared course:', error);
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}
