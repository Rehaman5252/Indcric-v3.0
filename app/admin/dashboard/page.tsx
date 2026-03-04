'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionFromStorage } from '@/lib/admin-auth';
import { 
  subscribeToDashboardMetrics, 
  type DashboardMetrics 
} from '@/lib/admin-dashboard-service';
import { 
  subscribeToSubmissionMetrics, 
  type SubmissionMetrics 
} from '@/lib/submission-service';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StatCard = ({ title, value, description }: { title: string; value: string | number; description: string }) => (
  <Card className="bg-card/50 hover:bg-card/80 transition">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    activeUsersToday: 0,
    activeUsersThisWeek: 0,
    activeUsersLastMonth: 0,
    perfectScores: 0,
    pendingSubmissions: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
    processedPayouts: 0,
  });

  const [submissionMetrics, setSubmissionMetrics] = useState<SubmissionMetrics>({
    total: 0,
    pending: 0,
    approved: 0,
    facts: 0,
    questions: 0,
  });

  useEffect(() => {
    const adminSession = getSessionFromStorage();
    if (!adminSession) {
      router.push('/admin/login');
      return;
    }
    setSession(adminSession);
    setLoading(false);

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const unsubscribe = subscribeToDashboardMetrics(setMetrics);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSubmissionMetrics(setSubmissionMetrics);
    return () => unsubscribe();
  }, []);

  if (loading || !session) return null;

  // ✅ Calculate pending facts and questions properly
  let pendingFactsCount = 0;
  let pendingQuestionsCount = 0;
  let approvedFactsCount = 0;
  let approvedQuestionsCount = 0;

  if (submissionMetrics.total > 0) {
    const factRatio = submissionMetrics.facts / submissionMetrics.total;
    const questionRatio = submissionMetrics.questions / submissionMetrics.total;

    pendingFactsCount = Math.round(submissionMetrics.pending * factRatio);
    pendingQuestionsCount = submissionMetrics.pending - pendingFactsCount;

    approvedFactsCount = Math.round(submissionMetrics.approved * factRatio);
    approvedQuestionsCount = submissionMetrics.approved - approvedFactsCount;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 rounded-2xl p-8 shadow-2xl text-black">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Welcome back, {session.displayName}! 👋</h1>
            <p className="text-lg font-semibold opacity-90">
              Logged in as <span className="uppercase font-black">{session.role.replace(/_/g, ' ')}</span>
            </p>
            <div className="flex items-center gap-2 mt-3 text-sm font-semibold">
              <Clock className="h-4 w-4" />
              {currentTime}
            </div>
          </div>
          <div className="text-6xl">🎯</div>
        </div>
      </div>

      {/* Real-Time Metrics */}
      <div>
        <h2 className="text-2xl font-black text-white mb-6">📊 Real-Time Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* ===== SUBMISSIONS (5 BOXES) ===== */}
          <StatCard
            title="📦 Total Submissions"
            value={submissionMetrics.total}
            description="All submissions combined"
          />
          <StatCard
            title="⏳ Pending Facts"
            value={pendingFactsCount}
            description="Awaiting approval"
          />
          <StatCard
            title="⏳ Pending Q&A"
            value={pendingQuestionsCount}
            description="Awaiting approval"
          />
          <StatCard
            title="✅ Approved Facts"
            value={approvedFactsCount}
            description="Published"
          />
          <StatCard
            title="✅ Approved Q&A"
            value={approvedQuestionsCount}
            description="Published"
          />

          {/* ===== USERS ===== */}
          <StatCard
            title="Total Users"
            value={metrics.totalUsers.toLocaleString()}
            description="All registered players"
          />
          <StatCard
            title="Active (Today)"
            value={metrics.activeUsersToday.toLocaleString()}
            description="Played quiz today"
          />
          <StatCard
            title="Active (This Week)"
            value={metrics.activeUsersThisWeek.toLocaleString()}
            description="Last 7 days"
          />
          <StatCard
            title="Active (Last Month)"
            value={metrics.activeUsersLastMonth.toLocaleString()}
            description="Last 30 days"
          />

          {/* ===== PERFORMANCE ===== */}
          <StatCard
            title="Perfect Scores"
            value={metrics.perfectScores.toLocaleString()}
            description={`Total: ₹${(metrics.perfectScores * 100).toLocaleString()}`}
          />
          <StatCard
            title="Total Payouts"
            value={`₹${metrics.totalPayouts.toLocaleString()}`}
            description="All payouts"
          />
          <StatCard
            title="Pending Payouts"
            value={`₹${metrics.pendingPayouts.toLocaleString()}`}
            description="To be processed"
          />
          <StatCard
            title="Processed Payouts"
            value={`₹${metrics.processedPayouts.toLocaleString()}`}
            description={`${metrics.totalPayouts > 0 ? Math.round((metrics.processedPayouts / metrics.totalPayouts) * 100) : 0}% completed`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-xs py-4 border-t border-gray-800">
        <p>indcric Admin Control Panel | Real-time Firestore sync ✅</p>
      </div>
    </div>
  );
}
