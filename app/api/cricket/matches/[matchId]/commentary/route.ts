// app/api/cricket/matches/[matchId]/commentary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cricbuzzService } from '@/lib/cricbuzz';

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'matchId is required' },
        { status: 400 }
      );
    }

    console.log(`💬 Fetching commentary for match: ${matchId}`);

    const result = await cricbuzzService.getCommentary(matchId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Commentary API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch commentary',
      },
      { status: 500 }
    );
  }
}
