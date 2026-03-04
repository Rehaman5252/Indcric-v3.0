'use client';

import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Gift,
  ExternalLink,
  WifiOff,
  ServerCrash,
  Trophy,
  Lock,
  Sparkles,
  Trash2,
  Clock,
} from 'lucide-react';
import Image from 'next/image';
import type { QuizAttempt } from '@/ai/schemas';
import { useAuth } from '@/context/AuthProvider';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { normalizeTimestamp } from '@/lib/dates';
import { EmptyState } from '../EmptyState';
import LoginPrompt from '../auth/LoginPrompt';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import GenericOffers from '@/components/rewards/GenericOffers';

const FORMAT_TO_AD_SLOT: Record<string, string> = {
  IPL: 'IPL',
  T20: 'T20',
  Test: 'Test',
  ODI: 'ODI',
  WPL: 'WPL',
  Mixed: 'Mixed',
};

interface AdData {
  id: string;
  companyName: string;
  mediaUrl: string;
  redirectUrl: string;
  adSlot: string;
}

interface RewardAd extends AdData {
  attemptId: string;
  format: string;
}

interface ScratchedCardState {
  scratchedAt: number;
}

// ✅ OPTIMIZATION 1: In-memory cache with 5-minute TTL
const adCache = new Map<string, { ad: AdData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const ScratchCardSkeleton = () => (
  <div className="w-full aspect-[3/4] p-1">
    <Skeleton className="w-full h-full rounded-xl bg-muted/50" />
  </div>
);

const RewardsSkeleton = () => (
  <div className="space-y-6">
    <section>
      <Carousel opts={{ align: 'start' }} className="w-full max-w-full">
        <CarouselContent className="-ml-2">
          {[...Array(3)].map((_, index) => (
            <CarouselItem
              key={index}
              className="pl-2 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
            >
              <ScratchCardSkeleton />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  </div>
);

const ErrorStateDisplay = ({ message }: { message: string }) => (
  <Alert variant="destructive" className="mt-4">
    {message.toLowerCase().includes('offline') ||
    message.toLowerCase().includes('network') ? (
      <WifiOff className="h-4 w-4" />
    ) : (
      <ServerCrash className="h-4 w-4" />
    )}
    <AlertTitle>Error Loading Rewards</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

const useSoundEffect = (soundPath: string, duration: number = 1000) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(soundPath);
    audioRef.current.volume = 0.6;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [soundPath]);

  const play = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn('Audio play failed:', err);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }, duration);
    }
  };

  return play;
};

const getDaysRemaining = (scratchedAt: number): number => {
  const now = Date.now();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const expiryTime = scratchedAt + sevenDaysInMs;
  const msRemaining = expiryTime - now;
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  return Math.max(0, daysRemaining);
};

const isCardExpired = (scratchedAt: number): boolean => {
  return getDaysRemaining(scratchedAt) <= 0;
};

const ScratchCard = memo(
  ({
    ad,
    onScratch,
    scratchState,
    onDelete,
    onExpired,
  }: {
    ad: RewardAd;
    onScratch: () => void;
    scratchState: ScratchedCardState | null;
    onDelete: () => void;
    onExpired: () => void;
  }) => {
    const playScratchSound = useSoundEffect('/scratch.mp3', 1000);
    const isScratched = !!scratchState;

    useEffect(() => {
      if (!isScratched) return;

      const checkExpiry = () => {
        if (isCardExpired(scratchState!.scratchedAt)) {
          onExpired();
        }
      };

      checkExpiry();
      const interval = setInterval(checkExpiry, 60000);
      return () => clearInterval(interval);
    }, [isScratched, scratchState, onExpired]);

    const daysRemaining = isScratched
      ? getDaysRemaining(scratchState!.scratchedAt)
      : 0;

    return (
      <div className="w-full aspect-[3/4] p-1 relative">
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all"
          aria-label="Delete scratch card"
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <Card
          className={cn(
            'p-0 overflow-hidden shadow-lg relative w-full h-full rounded-xl transition-all duration-500 border-2',
            isScratched
              ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 dark:from-amber-950 dark:via-yellow-950 dark:to-amber-900 border-amber-300 dark:border-amber-700'
              : 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 border-yellow-500 dark:border-yellow-600'
          )}
        >
          {!isScratched ? (
            <button
              type="button"
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-opacity hover:opacity-95 rounded-xl p-3 text-center group"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                playScratchSound();
                onScratch();
              }}
              aria-label={`Scratch to reveal reward from ${ad.companyName}`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 relative mb-2 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-white animate-pulse" />
              </div>
              <p className="font-bold text-sm sm:text-base text-white drop-shadow-lg">
                Scratch to Reveal
              </p>
              <p className="text-xs text-white/90 mt-1">Your Reward Awaits</p>
            </button>
          ) : (
            <div className="h-full flex flex-col items-center justify-between p-3 text-center">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-md overflow-hidden flex-shrink-0 mt-2">
                <Image
                  src={ad.mediaUrl}
                  alt={ad.companyName}
                  fill
                  sizes="(max-width: 640px) 56px, 64px"
                  className="object-contain p-2"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.png';
                  }}
                />
              </div>
              <div className="flex-grow flex flex-col items-center justify-center py-2">
                <Trophy className="h-7 w-7 sm:h-8 sm:w-8 mb-1 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-100 line-clamp-2">
                  {ad.companyName}
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Exclusive Partner Offer · {ad.format}
                </p>

                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    {daysRemaining === 0
                      ? 'Expires today'
                      : `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(ad.redirectUrl, '_blank', 'noopener,noreferrer');
                }}
                className="mt-2 bg-amber-600 hover:bg-amber-700 text-white w-full shadow-lg text-xs py-2 h-8"
                size="sm"
                type="button"
              >
                Claim Now
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }
);
ScratchCard.displayName = 'ScratchCard';

function RewardsContentComponent() {
  const { user, quizHistory, loading: authLoading } = useAuth();
  const [scratchedCards, setScratchedCards] = useState<
    Record<string, ScratchedCardState>
  >({});
  const [rewardAds, setRewardAds] = useState<RewardAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);

  const { sortedAttempts, totalAttempts, formatCounts } = useMemo(() => {
    if (!user || !quizHistory?.data || quizHistory.data.length === 0) {
      return {
        sortedAttempts: [] as QuizAttempt[],
        totalAttempts: 0,
        formatCounts: {} as Record<string, number>,
      };
    }

    const sorted = [...quizHistory.data].sort((a: QuizAttempt, b: QuizAttempt) => {
      const timeA = normalizeTimestamp(a.timestamp)?.getTime() || 0;
      const timeB = normalizeTimestamp(b.timestamp)?.getTime() || 0;
      return timeB - timeA;
    });

    const counts: Record<string, number> = {};
    sorted.forEach((attempt) => {
      const fmt = attempt.format || 'Unknown';
      counts[fmt] = (counts[fmt] || 0) + 1;
    });

    return {
      sortedAttempts: sorted,
      totalAttempts: sorted.length,
      formatCounts: counts,
    };
  }, [quizHistory.data, user]);

  // ✅ OPTIMIZATION 2: Fetch ALL ads in ONE parallel batch query
  useEffect(() => {
    const fetchRewardAds = async () => {
      if (!user) {
        setRewardAds([]);
        setAdsLoading(false);
        return;
      }

      if (!sortedAttempts.length) {
        setRewardAds([]);
        setAdsLoading(false);
        return;
      }

      setAdsLoading(true);
      const startTime = Date.now();

      try {
        // ✅ Step 1: Get unique formats needed
        const uniqueFormats = Array.from(
          new Set(
            sortedAttempts
              .map((a) => a.format)
              .filter((f) => f && FORMAT_TO_AD_SLOT[f])
          )
        );

        console.log(`[Rewards] Fetching ads for ${uniqueFormats.length} unique formats`);

        // ✅ Step 2: Fetch ALL ads for all formats in PARALLEL (one query)
        const adsQuery = query(
          collection(db, 'ads'),
          where('isActive', '==', true)
        );

        const snapshot = await getDocs(adsQuery);
        const allAds = new Map<string, AdData>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Omit<AdData, 'id'>;
          if (data.adSlot && FORMAT_TO_AD_SLOT[data.adSlot]) {
            allAds.set(data.adSlot, {
              id: doc.id,
              ...data,
            });
            // ✅ Update cache
            adCache.set(data.adSlot, { ad: { id: doc.id, ...data }, timestamp: Date.now() });
          }
        });

        console.log(`[Rewards] Fetched ${allAds.size} ads in ${Date.now() - startTime}ms`);

        // ✅ Step 3: Map attempts to ads
        const fetchedAds: RewardAd[] = [];

        sortedAttempts.forEach((attempt) => {
          const format = attempt.format;
          if (!format) return;

          const adSlot = FORMAT_TO_AD_SLOT[format];
          if (!adSlot) return;

          const ad = allAds.get(adSlot);
          if (!ad) return;

          const attemptTime = normalizeTimestamp(attempt.timestamp)?.getTime() || 0;
          const attemptId = `${attempt.userId}-${attempt.slotId}-${format}-${attemptTime}`;

          fetchedAds.push({
            ...ad,
            attemptId,
            format,
          });
        });

        setRewardAds(fetchedAds);
        console.log(`[Rewards] Mapped ${fetchedAds.length} reward cards in ${Date.now() - startTime}ms`);
      } catch (e) {
        console.error('[Rewards] Error fetching ads:', e);
        setRewardAds([]);
      } finally {
        setAdsLoading(false);
      }
    };

    fetchRewardAds();
  }, [user, sortedAttempts]);

  // ✅ Load scratch state from localStorage
  useEffect(() => {
    if (!user || typeof window === 'undefined' || rewardAds.length === 0) return;

    const initial: Record<string, ScratchedCardState> = {};
    rewardAds.forEach((ad) => {
      const key = `indcric-scratch-${user.uid}-${ad.attemptId}`;
      const saved = window.localStorage.getItem(key);
      if (saved) {
        try {
          const state = JSON.parse(saved) as ScratchedCardState;
          if (!isCardExpired(state.scratchedAt)) {
            initial[ad.attemptId] = state;
          } else {
            window.localStorage.removeItem(key);
          }
        } catch (e) {
          console.warn('Failed to parse scratch state:', e);
        }
      }
    });
    setScratchedCards(initial);
  }, [rewardAds, user]);

  const handleScratch = (attemptId: string) => {
    const state: ScratchedCardState = { scratchedAt: Date.now() };
    setScratchedCards((prev) => ({ ...prev, [attemptId]: state }));
    if (typeof window !== 'undefined' && user) {
      const key = `indcric-scratch-${user.uid}-${attemptId}`;
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  };

  const handleDelete = (attemptId: string) => {
    setRewardAds((prev) => prev.filter((ad) => ad.attemptId !== attemptId));

    if (typeof window !== 'undefined' && user) {
      const key = `indcric-scratch-${user.uid}-${attemptId}`;
      window.localStorage.removeItem(key);
    }

    setScratchedCards((prev) => {
      const next = { ...prev };
      delete next[attemptId];
      return next;
    });
  };

  const handleCardExpired = (attemptId: string) => {
    handleDelete(attemptId);
  };

  const RewardCardsContent = useMemo(() => {
    if (authLoading || adsLoading) return <RewardsSkeleton />;
    if (quizHistory.error)
      return <ErrorStateDisplay message={quizHistory.error} />;

    if (!user) {
      return (
        <div className="pt-8">
          <LoginPrompt
            icon={Lock}
            title="Unlock Your Rewards"
            description="Your scratch cards are waiting! Sign in to reveal exclusive partner offers."
          />
        </div>
      );
    }

    if (rewardAds.length === 0) {
      return (
        <EmptyState
          Icon={Gift}
          title="No Rewards Yet"
          description="Play a quiz to unlock your first scratch card!"
        />
      );
    }

    return (
      <div className="relative pb-6">
        <div className="mb-3 text-sm text-muted-foreground flex flex-col gap-1">
          <span>
            Total quizzes played:{' '}
            <span className="font-semibold">{totalAttempts}</span> · Scratch cards
            shown: <span className="font-semibold">{rewardAds.length}</span>
          </span>
          <span>
            Formats:{' '}
            {Object.entries(formatCounts)
              .map(([fmt, cnt]) => `${fmt} x${cnt}`)
              .join(' | ')}
          </span>
        </div>

        <Carousel
          opts={{
            align: 'start',
            dragFree: true,
            containScroll: 'trimSnaps',
          }}
          className="w-full max-w-full overflow-x-visible"
        >
          <CarouselContent className="-ml-2">
            {rewardAds.map((ad) => (
              <CarouselItem
                key={ad.attemptId}
                className="pl-2 basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
              >
                <ScratchCard
                  ad={ad}
                  scratchState={scratchedCards[ad.attemptId] || null}
                  onScratch={() => handleScratch(ad.attemptId)}
                  onDelete={() => handleDelete(ad.attemptId)}
                  onExpired={() => handleCardExpired(ad.attemptId)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 hidden sm:flex" />
          <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 hidden sm:flex" />

          <div className="sm:hidden flex justify-center mt-4 gap-2">
            <CarouselPrevious className="relative static" />
            <CarouselNext className="relative static" />
          </div>
        </Carousel>
      </div>
    );
  }, [
    authLoading,
    adsLoading,
    quizHistory.error,
    user,
    rewardAds,
    scratchedCards,
    totalAttempts,
    formatCounts,
  ]);

  return (
    <section className="space-y-8">
      <div id="rewards-awards" className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          🎁 Man of the Match Awards
        </h2>
        <p className="text-sm text-muted-foreground">
          A special award for every match you play. Claim your prize!
        </p>

        <Card className="border-amber-900/40 bg-black/40 p-4">
          <div id="rewards-empty">{RewardCardsContent}</div>
        </Card>
      </div>

      <div id="rewards-partners" className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          💼 Partner Offers
        </h3>
        <p className="text-sm text-muted-foreground">
          Exclusive deals from our partners. Use your rewards here!
        </p>

        <GenericOffers />
      </div>
    </section>
  );
}

const RewardsContent = memo(RewardsContentComponent);
export default RewardsContent;
