import { NextResponse } from 'next/server';
import { cricbuzzService } from '@/lib/cricbuzz';

export async function GET() {
  try {
    const result = await cricbuzzService.getTeams();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ 
      success: true, 
      data: [],
      error: 'Failed to fetch teams' 
    });
  }
}
