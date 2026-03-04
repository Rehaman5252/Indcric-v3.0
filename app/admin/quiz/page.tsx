// app/admin/quizzes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionFromStorage } from '@/lib/admin-auth';
import ReportedQuestionsManager from '@/app/components/admin/quizzes/ReportedQuestionsManager';
import { Plus, Calendar } from 'lucide-react';

export default function QuizzesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminSession = getSessionFromStorage();
    if (!adminSession) {
      router.push('/admin/login');
      return;
    }
    setSession(adminSession);
    setLoading(false);
  }, [router]);

  if (loading || !session) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white">
            ❓ Quizzes Management
          </h1>
          <p className="text-gray-400 mt-2">
            AI-powered quiz generation, scheduling, and analytics
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition">
            <Plus className="h-5 w-5" />
            Create Quiz
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition">
            <Calendar className="h-5 w-5" />
            Schedule
          </button>
        </div>
      </div>

      {/* SECTION 1: Reported Questions — Real-time from Firestore */}
      <ReportedQuestionsManager />
    </div>
  );
}
