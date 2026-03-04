'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false);
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

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  return <QuizHistoryContent attempts={attempts} isLoading={isLoading} error={error} />;
}
