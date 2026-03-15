import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'manabu-secret-key-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'manabu-refresh-secret-change-me';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    if (decoded.type !== 'refresh') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }

    const { userId } = decoded;
    const newToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    const newRefreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '365d' });

    return NextResponse.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
