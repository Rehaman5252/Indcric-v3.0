
"use client";

import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { WifiOff, ServerCrash, Trophy, Star, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn, mapFirestoreError } from '@/lib/utils';
import type { AllTimePlayer } from './leaderboardTypes';
import { Button } from '../ui/button';

const RankIcon = memo(({ rank }: { rank?: number }) => {
  if (!rank) return <span aria-label="Unranked" className="text-lg font-bold text-muted-foreground">--</span>;
  if (rank === 1) return <span aria-label="Rank 1" className="text-2xl">🥇</span>;
  if (rank === 2) return <span aria-label="Rank 2" className="text-2xl">🥈</span>;
  if (rank === 3) return <span aria-label="Rank 3" className="text-2xl">🥉</span>;
  return <span aria-label={`Rank ${rank}`} className="text-lg font-bold text-muted-foreground">{rank}</span>;
});
RankIcon.displayName = 'RankIcon';

const LeaderboardItem = memo(({ player, isCurrentUser }: { player: AllTimePlayer, isCurrentUser?: boolean }) => (
  <div className={cn("flex items-center p-2 rounded-lg transition-colors", isCurrentUser ? 'bg-primary/10' : 'hover:bg-muted/50')}>
    <div className="w-8 text-center"><RankIcon rank={player.rank} /></div>
    <Avatar className="h-10 w-10 mx-4">
      <AvatarImage src={player.avatar ?? `https://placehold.co/40x40.png`} alt={player.name ?? 'Player'} />
      <AvatarFallback>{player.name?.charAt(0) ?? 'A'}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <p className="font-semibold text-foreground">{player.name ?? 'Anonymous'}</p>
      <p className="text-xs text-muted-foreground">Played: {player.quizzesPlayed ?? 0} | Total Score: {player.totalScore ?? 0}</p>
    </div>
    <div className="text-right flex items-center gap-1">
      <p className="font-bold text-primary">{player.perfectScores ?? 0}</p>
      <Star className="h-4 w-4 text-primary" />
    </div>
  </div>
));
LeaderboardItem.displayName = 'LeaderboardItem';

const LeaderboardItemSkeleton = () => (
  <div className="flex items-center p-2 rounded-lg animate-pulse">
    <Skeleton className="w-8 h-8 rounded-full" />
    <Skeleton className="h-10 w-10 mx-4 rounded-full" />
    <div className='flex-1 space-y-2'>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-4 w-12" />
  </div>
);

const EmptyState = () => (
  <Card className="bg-card/80 text-center mt-4">
    <CardContent className="p-6">
      <Trophy className="h-10 w-10 mx-auto text-primary/50 mb-4" />
      <p className="font-semibold text-lg text-foreground">The Honours Board is Awaiting Its First Legend 🏆</p>
      <p className="text-sm text-muted-foreground">Score a perfect 5/5 to etch your name in history!</p>
    </CardContent>
  </Card>
);

const ErrorState = ({ message, title, onRetry }: { message: string, title: string, onRetry?: () => void }) => (
    <Alert variant="destructive" className="m-4">
      {(message || '').includes("offline") ? <WifiOff className="h-4 w-4" /> : <ServerCrash className="h-4 w-4" />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mb-4">{message || 'An unexpected error occurred.'}</AlertDescription>
      {onRetry && <Button onClick={onRetry} variant="secondary" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}
    </Alert>
);

const AllTimeLeaderboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<AllTimePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; userMessage: string } | null>(null);

  const lastGoodRef = useRef<AllTimePlayer[]>([]);
  
  const startListener = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (!db) {
      setError({ userMessage: "Database not available." });
      setIsLoading(false);
      return () => {};
    }

    const usersCollection = collection(db, 'users');
    const q = query(
      usersCollection,
      orderBy('totalScore', 'desc'),
      orderBy('perfectScores', 'desc'),
      orderBy('quizzesPlayed', 'asc'),
      orderBy('name', 'asc'),
      limit(20)
    );

    let isMounted = true;
    const unsubscribe = onSnapshot(q, (qsnap) => {
      if (!isMounted) return;
      const data = qsnap.docs
        .filter(doc => (doc.data().quizzesPlayed ?? 0) > 0)
        .map((doc, idx) => {
          const d = doc.data();
          return {
            uid: doc.id,
            name: d.name ?? 'Anonymous Player',
            avatar: d.photoURL ?? undefined,
            perfectScores: d.perfectScores ?? 0,
            totalScore: d.totalScore ?? 0,
            quizzesPlayed: d.quizzesPlayed ?? 0,
            isCurrentUser: user?.uid === doc.id,
            rank: idx + 1
          } as AllTimePlayer;
        });

        setPlayers(data);
        lastGoodRef.current = data;
        setError(null);
        setIsLoading(false);
    }, (err) => {
      if (!isMounted) return;
      console.error("AllTime onSnapshot error:", err);
      const mapped = mapFirestoreError(err);
      setError(mapped);
      setIsLoading(false);
      // Fallback to cache
      setPlayers(lastGoodRef.current);
    });

    return () => {
        isMounted = false;
        try {
            unsubscribe();
        } catch(e) {
            console.warn("Error unsubscribing from AllTimeLeaderboard", e);
        }
    };
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    
    const unsubscribe = startListener();
    
    return () => {
      if (unsubscribe) {
          try {
              unsubscribe();
          } catch (e) {
              console.warn("Failed to unsubscribe from AllTimeLeaderboard listener", e);
          }
      }
    };
  }, [authLoading, startListener]);

  const contentList = useMemo(() => {
    const dataToShow = players;
    
    if (isLoading && dataToShow.length === 0) {
      return Array.from({ length: 10 }).map((_, i) => <LeaderboardItemSkeleton key={`skel-alltime-${i}`} />);
    }
    
    if (dataToShow.length === 0 && !error) return <EmptyState />;

    if (error && dataToShow.length === 0) {
      return <ErrorState title="Error Loading Leaderboard" message={error.userMessage} onRetry={startListener} />;
    }

    return dataToShow.map(player => <LeaderboardItem key={player.uid} player={player} isCurrentUser={user?.uid === player.uid} />);
  }, [isLoading, authLoading, players, user, error, startListener]);

  const isIndexError = error?.code === 'INDEX_REQUIRED';

  return (
    <Card className="bg-card/80 shadow-lg">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2">
            <CardTitle>All-Time Honours Board</CardTitle>
            {isIndexError && (
                <Button size="sm" variant="ghost" onClick={startListener} className="text-muted-foreground hover:text-primary">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            )}
        </div>
        <CardDescription>Based on Total Score and Perfect Scores</CardDescription>
      </CardHeader>

      {error && players.length > 0 && (
        <Alert variant="destructive" className="mx-4 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Sync Issue</AlertTitle>
            <AlertDescription>{error.userMessage}</AlertDescription>
        </Alert>
      )}

      <CardContent className="p-2 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">{contentList}</div>
      </CardContent>
    </Card>
  );
};
export default memo(AllTimeLeaderboard);
