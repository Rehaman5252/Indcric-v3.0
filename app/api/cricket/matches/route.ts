import { NextRequest, NextResponse } from 'next/server';
import { cricbuzzService } from '@/lib/cricbuzz';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'live' | 'upcoming' | 'recent' || 'live';

    console.log(`\n🎯 API Route: /api/cricket/matches?type=${type}`);

    let result;
    
    switch (type) {
      case 'upcoming':
        result = await cricbuzzService.getUpcomingMatches();
        break;
      case 'recent':
        result = await cricbuzzService.getRecentMatches();
        break;
      default:
        result = await cricbuzzService.getLiveMatches();
    }

    console.log(`✅ API Result: ${result.data?.length || 0} matches\n`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ API Route error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
