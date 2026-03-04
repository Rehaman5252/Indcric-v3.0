'use client';

import type { CubeBrand } from '@/components/home/brandData';
import { useAuth } from '@/context/AuthProvider';
import { brandData } from '@/components/home/brandData';
import { useQuizStatus } from '@/context/QuizStatusProvider';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { memo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import ClientOnly from '@/components/ClientOnly';

const NewsStrip = dynamic(() => import('@/components/home/NewsStrip'), {
  loading: () => <Skeleton className="h-48 w-full" />,
});

const CricketFact = dynamic(() => import('@/components/home/CricketFact'), {
  loading: () => <Skeleton className="h-40 w-full" />,
});

const CricketSection = dynamic(
  () => import('@/components/cricket/CricketSection'),
  {
    loading: () => (
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-12 text-center border border-yellow-500/20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading Cricket Scores...</p>
      </div>
    ),
  }
);

const HomeClientContent = dynamic(
  () =>
    import('@/components/home/HomeClientContent').catch((e) => {
      console.error('Failed to load HomeClientContent chunk', e);
      return function ChunkLoadFallback() {
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Content</AlertTitle>
            <AlertDescription>
              There was a problem loading this feature. Please check your
              connection and try again.
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        );
      };
    }),
  {
    loading: () => <HomeContentSkeleton />,
    ssr: false,
  }
);

const StartQuizButton = dynamic(
  () => import('@/components/home/StartQuizButton'),
  {
    loading: () => <Skeleton className="h-12 w-full rounded-full" />,
  }
);

const HomeContentSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="text-center mb-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
    </div>
    <div className="flex justify-center items-center h-[200px]">
      <Skeleton className="w-48 h-48 rounded-lg" />
    </div>
    <Skeleton className="h-[124px] w-full rounded-2xl" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-[92px] w-full" />
      <Skeleton className="h-[92px] w-full" />
      <Skeleton className="h-[92px] w-full" />
      <Skeleton className="h-[92px] w-full" />
    </div>
    <Skeleton className="h-16 w-full rounded-full" />
  </div>
);

const MalpracticeWarning = memo(() => {
  const { profile } = useAuth();
  if (!profile) return null;

  const noBallCount = profile.noBallCount || 0;
  if (noBallCount <= 0 || noBallCount >= 3) return null;

  const today = new Date().setHours(0, 0, 0, 0);
  const lastNoBallDay = profile.lastNoBallTimestamp
    ? new Date(profile.lastNoBallTimestamp.seconds * 1000).setHours(0, 0, 0, 0)
    : null;

  if (lastNoBallDay !== today) return null;

  const warningsLeft = 3 - noBallCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Fair Play Warning!</AlertTitle>
        <AlertDescription>
          You have {noBallCount} No-Ball(s) today. {warningsLeft} more and
          you're Out for the Day! Please contact support to appeal.
        </AlertDescription>
      </Alert>
    </motion.div>
  );
});
MalpracticeWarning.displayName = 'MalpracticeWarning';

function HomePageClient() {
  const {
    user,
    isProfileComplete,
    lastAttemptInSlot,
    loading: authLoading,
  } = useAuth();
  const { isLoading: isQuizStatusLoading } = useQuizStatus();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedBrand, setSelectedBrand] = useState(brandData[0]);

  const hasPlayedInCurrentSlot = !!lastAttemptInSlot;

  const handleStartQuiz = useCallback(
    (brandToPlay?: CubeBrand) => {
      const brand = brandToPlay || selectedBrand;
      if (!user) {
        router.push(`/auth/login?from=/`);
        return;
      }

      if (hasPlayedInCurrentSlot && lastAttemptInSlot) {
        router.push(`/quiz/results?attemptId=${lastAttemptInSlot.slotId}`);
        toast({
          title: "You've already played this innings!",
          description: `Showing your results for the ${lastAttemptInSlot.format} quiz. You can only attempt one quiz per slot.`,
        });
        return;
      }

      if (!user.emailVerified) {
        toast({
          title: 'Email not verified',
          description:
            'Please verify your email address before playing a quiz.',
          variant: 'destructive',
        });
        return;
      }
      if (!isProfileComplete) {
        toast({
          title: 'Profile Incomplete',
          description:
            'Please complete your profile to start playing quizzes.',
          variant: 'destructive',
        });
        router.push('/profile');
        return;
      }

      router.push(
        `/quiz?brand=${encodeURIComponent(brand.brand)}&format=${encodeURIComponent(brand.format)}`
      );
    },
    [
      user,
      hasPlayedInCurrentSlot,
      lastAttemptInSlot,
      isProfileComplete,
      selectedBrand,
      router,
      toast,
    ]
  );

  if (authLoading) {
    return <HomeContentSkeleton />;
  }

  return (
    // ✅ ADDED: pb-32 to ensure content doesn't get cut off by navbar
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6 pb-32"
    >
      <MalpracticeWarning />

      <HomeClientContent
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        handleStartQuiz={handleStartQuiz}
      />

      <div className="mt-6">
        <StartQuizButton
          brandFormat={
            hasPlayedInCurrentSlot && lastAttemptInSlot
              ? lastAttemptInSlot.format
              : selectedBrand.format
          }
          onClick={() => handleStartQuiz()}
          isDisabled={isQuizStatusLoading}
          hasPlayed={hasPlayedInCurrentSlot}
        />
      </div>

      {/* Cricket Section - Gold & Black Theme */}
      <div className="mt-8 bg-gradient-to-br from-black via-gray-900 to-black rounded-2xl p-6 shadow-2xl border border-yellow-500/20">
        <ClientOnly>
          <CricketSection refreshInterval={30000} />
        </ClientOnly>
      </div>

      <div className="mt-8">
        <ClientOnly>
          <NewsStrip />
        </ClientOnly>
      </div>

      <div className="mt-8">
        <ClientOnly>
          <CricketFact format={selectedBrand.format} />
        </ClientOnly>
      </div>
    </motion.div>
  );
}

export default memo(HomePageClient);
