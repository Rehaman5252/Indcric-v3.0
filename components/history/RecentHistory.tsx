'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore';
import QuizHistoryContent from './QuizHistoryContent';
import type { QuizAttempt } from '@/ai/schemas';
import { mapFirestoreError } from '@/lib/utils';

export default function RecentHistory() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    if (!user?.uid) {
      setAttempts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let unsubscribe: Unsubscribe | null = null;

    try {
      const q = query(
        collection(db, 'users', user.uid, 'quizAttempts'),
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            ...doc.data(),
            slotId: doc.id,
          } as QuizAttempt));
          setAttempts(data);
          setIsLoading(false);
        },
        (err) => {
          console.error('Recent history error:', err);
          setError(mapFirestoreError(err).userMessage || 'Failed to load recent history');
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up recent history listener:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // If not signed in — show full-width centered layout (no card)
  if (!user?.uid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-250px)] px-4 text-center"
      >
        {/* Lucide History Icon */}
        <div className="relative mx-auto mb-6 w-16 h-16 rounded-full bg-[#081221] flex items-center justify-center shadow-inner">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F6C23A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-history"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-semibold text-white mb-3">
          Review Your Recent Innings
        </h2>

        {/* Subtext */}
        <p className="max-w-xl text-base text-slate-300 mb-8 leading-relaxed">
          Sign in to analyze your most recent performance and learn from your mistakes.
        </p>

        {/* Button */}
        <button
          onClick={() => router.push('/auth/login?')}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-yellow-400 text-slate-900 font-medium shadow-md hover:brightness-95 transition-all duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.7}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4 4m-4-4l4-4m9 8h3a2 2 0 002-2v-3a2 2 0 00-2-2h-3" />
          </svg>
          Sign In / Sign Up
        </button>
      </motion.div>
    );
  }

  // Signed-in view remains the same
  return <QuizHistoryContent attempts={attempts} isLoading={isLoading} error={error} />;
}