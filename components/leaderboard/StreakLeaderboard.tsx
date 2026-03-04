
"use client";

import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc, getCountFromServer, where, Unsubscribe } from 'firebase/firestore';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { WifiOff, ServerCrash, Trophy, Flame, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn, mapFirestoreError } from '@/lib/utils';
import type { StreakPlayer } from './leaderboardTypes';
import { Button } from '../ui/button';

const RankIcon = memo(({ rank }: { rank?: number }) => {
  if (!rank) return <span aria-label="Unranked" className="text-lg font-bold text-muted-foreground">--</span>;
  if (rank === 1) return <span aria-label="Rank 1" className="text-2xl">🥇</span>;
  if (rank === 2) return <span aria-label="Rank 2" className="text-2xl">🥈</span>;
  if (rank === 3) return <span aria-label="Rank 3" className="text-2xl">🥉</span>;
  return <span aria-label={`Rank ${rank}`} className="text-lg font-bold text-muted-foreground">{rank}</span>;
});
RankIcon.displayName = 'RankIcon';

const LeaderboardItem = memo(({ player, isCurrentUser = false }: { player: StreakPlayer, isCurrentUser?: boolean }) => (
  <div className={cn("flex items-center p-2 rounded-lg transition-colors", isCurrentUser ? 'bg-primary/10' : 'hover:bg-muted/50')}>
    <div className="w-8 text-center"><RankIcon rank={player.rank} /></div>
    <Avatar className="h-10 w-10 mx-4">
      <AvatarImage src={player.avatar || `https://placehold.co/40x40.png`} alt={player.name} />
      <AvatarFallback>{player.name?.charAt(0) ?? 'A'}</AvatarFallback>
    </Avatar>
    <p className="font-semibold text-foreground flex-1">{player.name ?? 'Anonymous'}</p>
    <div className="text-right flex items-center gap-1">
      <p className="font-bold text-accent">{player.currentStreak}</p>
      <Flame className="h-4 w-4 text-accent" />
    </div>
  </div>
));
LeaderboardItem.displayName = 'LeaderboardItem';

const LeaderboardItemSkeleton = () => (
  <div className="flex items-center p-2 rounded-lg animate-pulse">
    <Skeleton className="w-8 h-8 rounded-full" />
    <Skeleton className="h-10 w-10 mx-4 rounded-full" />
    <Skeleton className="h-4 flex-1" />
    <Skeleton className="h-4 w-12" />
  </div>
);

const ErrorState = ({ message, title, onRetry }: { message: string, title: string, onRetry: () => void }) => (
    <Alert variant="destructive" className="m-4">
      {(message || '').includes("offline") ? <WifiOff className="h-4 w-4" /> : <ServerCrash className="h-4 w-4" />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mb-4">{message || 'An unexpected error occurred.'}</AlertDescription>
      <Button onClick={onRetry} variant="secondary" size="sm"><RefreshCw className="mr-2 h-4 w-4"/>Retry</Button>
    </Alert>
);

const EmptyState = () => (
  <Card className="bg-card/80 text-center mt-4">
    <CardContent className="p-6">
      <Trophy className="h-10 w-10 mx-auto text-accent/50 mb-4" />
      <p className="font-semibold text-lg text-foreground">The Consistency Chart is Empty</p>
      <p className="text-sm text-muted-foreground">Play daily to build your streak and claim the top spot!</p>
    </CardContent>
  </Card>
);

const calculateUserRank = async (streak: number, name: string) : Promise<number> => {
  if (!db) return 999;
  const usersCollection = collection(db, 'users');
  try {
    const higherStreakQuery = query(usersCollection, where('currentStreak', '>', streak));
    const tieBreakerQuery = query(usersCollection, where('currentStreak', '==', streak), where('name', '<', name || ''));
    const [higherSnapshot, tieSnapshot] = await Promise.all([getCountFromServer(higherStreakQuery), getCountFromServer(tieBreakerQuery)]);
    return higherSnapshot.data().count + tieSnapshot.data().count + 1;
  } catch (e) {
    console.error("Rank calculation failed:", e);
    return 999;
  }
};

const StreakLeaderboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<StreakPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; userMessage: string } | null>(null);

  const lastGoodRef = useRef<StreakPlayer[]>([]);

  const startListener = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (!db) {
        setError({ userMessage: "Database not available." });
        setIsLoading(false);
        return () => {};
    }

    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, orderBy('currentStreak', 'desc'), orderBy('name', 'asc'), limit(20));
    
    let isMounted = true;
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      if(!isMounted) return;
      try {
        let playersData = querySnapshot.docs
          .filter(doc => (doc.data().currentStreak || 0) > 0)
          .map((doc, index) => {
            const data = doc.data();
            return {
              uid: doc.id,
              name: data.name || 'Anonymous Player',
              avatar: data.photoURL,
              currentStreak: data.currentStreak || 0,
              isCurrentUser: user?.uid === doc.id,
              rank: index + 1
            } as StreakPlayer;
          });

        if (user && !playersData.some(p => p.uid === user.uid)) {
           try {
                const userDocRef = doc(db!, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const streak = data.currentStreak || 0;
                    if (streak > 0) {
                        const userRank = await calculateUserRank(streak, data.name || 'Anonymous Player');
                        const currentUserData: StreakPlayer = {
                            uid: user.uid,
                            name: data.name || 'You',
                            avatar: data.photoURL,
                            currentStreak: streak,
                            rank: userRank,
                            isCurrentUser: true,
                        };
                        if (isMounted) playersData.push(currentUserData);
                    }
                }
           } catch (e) {
                if (isMounted) console.error("Error fetching current user for streak board", e);
           }
        }
        
        if (isMounted) {
            const sortedPlayers = playersData.sort((a,b) => (a.rank || 999) - (b.rank || 999));
            setPlayers(sortedPlayers);
            lastGoodRef.current = sortedPlayers;
            setError(null);
            setIsLoading(false);
        }
      } catch (e) {
        if (isMounted) {
            console.error("Snapshot processing error:", e);
            setError({ userMessage: "Error processing leaderboard data." });
            setIsLoading(false);
        }
      }
    }, (err: any) => {
      if(!isMounted) return;
      console.error("Streak leaderboard snapshot error:", err);
      setError(mapFirestoreError(err));
      setIsLoading(false);
      setPlayers(lastGoodRef.current); // fallback to cache
    });

    return () => {
        isMounted = false;
        try {
            unsubscribe();
        } catch(e) {
            console.warn("Error unsubscribing from StreakLeaderboard", e);
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
                console.warn("Failed to unsubscribe from StreakLeaderboard listener", e);
            }
        }
    };
  }, [authLoading, startListener]);


  const content = useMemo(() => {
    const dataToRender = players;
    
    if (isLoading && dataToRender.length === 0) {
      return Array.from({ length: 10 }).map((_, i) => <LeaderboardItemSkeleton key={`skel-streak-${i}`} />);
    }
    
    if (error && dataToRender.length === 0) {
        return <ErrorState
            title={"Error Loading Leaderboard"}
            message={error.userMessage}
            onRetry={startListener}
        />;
    }
    
    if (dataToRender.length === 0) return <EmptyState />;
    
    const currentUserInList = dataToRender.find(p => p.isCurrentUser);

    return (
      <>
        {dataToRender.filter(p => !p.isCurrentUser).map(player => <LeaderboardItem key={player.uid} player={player} />)}
        {currentUserInList && (
          <>
            <div className="border-t my-2 text-center text-sm text-muted-foreground pt-2">Your Rank</div>
            <LeaderboardItem player={currentUserInList} isCurrentUser />
          </>
        )}
      </>
    );
  }, [isLoading, authLoading, error, players, user, startListener]);

  const isIndexError = error?.code === 'INDEX_REQUIRED';

  return (
    <Card className="bg-card/80 shadow-lg mt-4">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2">
            <CardTitle>Daily Streak Champions</CardTitle>
            {isIndexError && (
                <Button size="sm" variant="ghost" onClick={startListener} className="text-muted-foreground hover:text-primary">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            )}
        </div>
        <CardDescription>The most consistent players on the pitch.</CardDescription>
      </CardHeader>
      
      {error && players.length > 0 && (
          <Alert variant="destructive" className="mx-4 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Sync Issue</AlertTitle>
            <AlertDescription>{error.userMessage}</AlertDescription>
          </Alert>
      )}

      <CardContent className="p-2 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">{content}</div>
      </CardContent>
    </Card>
  );
};
export default memo(StreakLeaderboard);
