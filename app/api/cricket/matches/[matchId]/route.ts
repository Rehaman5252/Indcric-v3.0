import { NextRequest, NextResponse } from 'next/server';

async function fetchFromRapidAPI(endpoint: string): Promise<any> {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = 'cricbuzz-cricket.p.rapidapi.com';

  if (!apiKey) {
    throw new Error('Missing API configuration');
  }

  const response = await fetch(`https://${apiHost}${endpoint}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': apiHost,
      'x-rapidapi-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`RapidAPI error: ${response.status}`);
  }

  return await response.json();
}

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

    const data = await fetchFromRapidAPI(`/mcenter/v1/${matchId}`);

    return NextResponse.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cricket API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch match details',
      },
      { status: 500 }
    );
  }
}
