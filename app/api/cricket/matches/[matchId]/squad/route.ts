// app/api/cricket/matches/[matchId]/squad/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cricbuzzService } from '@/lib/cricbuzz';

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const { searchParams } = new URL(request.url);
    const team1Id = searchParams.get('team1Id');
    const team2Id = searchParams.get('team2Id');

    if (!matchId || !team1Id || !team2Id) {
      return NextResponse.json(
        { success: false, error: 'matchId, team1Id & team2Id are required' },
        { status: 400 }
      );
    }

    console.log(`🎯 Fetching squads for match ${matchId}: Team1=${team1Id}, Team2=${team2Id}`);

    const [team1Res, team2Res] = await Promise.all([
      cricbuzzService.getTeamSquad(matchId, team1Id),
      cricbuzzService.getTeamSquad(matchId, team2Id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        team1: team1Res.success ? team1Res.data : null,
        team2: team2Res.success ? team2Res.data : null,
      },
      errors: {
        team1: team1Res.error ?? null,
        team2: team2Res.error ?? null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Squad API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch squads',
      },
      { status: 500 }
    );
  }
}
