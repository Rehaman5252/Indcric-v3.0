// app/api/cricket/matches/[matchId]/details/route.ts
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
        { success: false, error: 'Match ID required' },
        { status: 400 }
      );
    }

    console.log(`\n🎯 Fetching complete details for match: ${matchId}`);

    // Fetch all data in parallel
    const [matchInfoResult, scorecardResult] = await Promise.all([
      cricbuzzService.getMatchInfo(matchId),
      cricbuzzService.getScorecard(matchId),
    ]);

    // Return combined data
    return NextResponse.json({
      success: true,
      data: {
        matchInfo: matchInfoResult.success ? matchInfoResult.data : null,
        scorecard: scorecardResult.success ? scorecardResult.data : null,
      },
      errors: {
        matchInfo: matchInfoResult.error || null,
        scorecard: scorecardResult.error || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Match details API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch match details',
      },
      { status: 500 }
    );
  }
}
