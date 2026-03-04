// app/admin/quizzes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionFromStorage } from "@/lib/admin-auth";
import ReportedQuestionsManager from "@/app/components/admin/quizzes/ReportedQuestionsManager";
import PoolQuestionsViewer from "@/app/components/admin/quizzes/PoolQuestionsViewer";
import {
  generateDailyBatch,
  generateForSingleFormat,
  getPoolStats,
} from "@/lib/bulk-question-service";
import type {
  DailyBatchResult,
  BulkGenerationResult,
  PoolStats,
} from "@/lib/bulk-question-service";
import {
  Zap,
  Loader2,
  CheckCircle,
  XCircle,
  Database,
  RefreshCw,
  AlertTriangle,
  Brain,
} from "lucide-react";

const ALL_FORMATS = ["IPL", "Test", "T20I", "ODI", "WPL", "Mixed"] as const;

export default function QuizzesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pool stats
  const [poolStats, setPoolStats] = useState<PoolStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<DailyBatchResult | null>(null);
  const [singleResult, setSingleResult] =
    useState<BulkGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const adminSession = getSessionFromStorage();
    if (!adminSession) {
      router.push("/admin/login");
      return;
    }
    setSession(adminSession);
    setLoading(false);
    loadPoolStats();
  }, [router]);

  const loadPoolStats = async () => {
    setLoadingStats(true);
    try {
      const stats = await getPoolStats();
      setPoolStats(stats);
    } catch (err) {
      console.error("Failed to load pool stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleGenerateDailyBatch = async () => {
    setIsGenerating(true);
    setBatchResult(null);
    setSingleResult(null);
    setError(null);
    setGeneratingFormat(null);

    try {
      const result = await generateDailyBatch();
      setBatchResult(result);
      await loadPoolStats();
    } catch (err: any) {
      setError(err?.message || "Daily batch generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSingleFormat = async (format: string) => {
    setIsGenerating(true);
    setBatchResult(null);
    setSingleResult(null);
    setError(null);
    setGeneratingFormat(format);

    try {
      const result = await generateForSingleFormat(format);
      setSingleResult(result);
      await loadPoolStats();
    } catch (err: any) {
      setError(err?.message || "Generation failed for " + format);
    } finally {
      setIsGenerating(false);
      setGeneratingFormat(null);
    }
  };

  const getPoolColor = (available: number): string => {
    if (available >= 50) return "from-green-600 to-green-700";
    if (available >= 20) return "from-yellow-600 to-yellow-700";
    return "from-red-600 to-red-700";
  };

  const getPoolLabel = (available: number): string => {
    if (available >= 50) return "Healthy";
    if (available >= 20) return "Low";
    return "Critical";
  };

  if (loading || !session) return null;

  const totalQuestions = poolStats.reduce((sum, s) => sum + s.total, 0);
  const totalAvailable = poolStats.reduce((sum, s) => sum + s.available, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white">❓ Quizzes Management</h1>
        <p className="text-gray-400 mt-2">
          Manage reported questions, question pool &amp; bulk generation
        </p>
      </div>

      {/* SECTION 1: REPORTED QUESTIONS */}
      <ReportedQuestionsManager />

      {/* SECTION 2: QUESTION POOL STATS */}

      {/* Total Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 shadow-xl border border-opacity-20 border-white">
          <p className="text-white text-sm font-semibold opacity-90">
            Total Questions
          </p>
          <p className="text-gray-200 text-xs mt-1">All formats combined</p>
          <p className="text-4xl font-black text-white mt-2">
            {totalQuestions.toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 shadow-xl border border-opacity-20 border-white">
          <p className="text-white text-sm font-semibold opacity-90">
            Available (Active)
          </p>
          <p className="text-gray-200 text-xs mt-1">Not retired</p>
          <p className="text-4xl font-black text-white mt-2">
            {totalAvailable.toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl border border-opacity-20 border-white">
          <p className="text-white text-sm font-semibold opacity-90">
            Formats Covered
          </p>
          <p className="text-gray-200 text-xs mt-1">With questions in pool</p>
          <p className="text-4xl font-black text-white mt-2">
            {poolStats.filter((s) => s.total > 0).length} / {ALL_FORMATS.length}
          </p>
        </div>
      </div>

      {/* Pool Stats Per Format */}
      <div className="bg-gray-900 border border-yellow-600 border-opacity-20 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-black text-white">
              Question Pool — Per Format
            </h2>
          </div>
          <button
            onClick={loadPoolStats}
            disabled={loadingStats}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw
              className={"h-4 w-4" + (loadingStats ? " animate-spin" : "")}
            />
            Refresh
          </button>
        </div>

        {loadingStats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
            <span className="text-gray-400 ml-3">Loading pool stats...</span>
          </div>
        ) : poolStats.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-white font-bold text-lg">Pool is Empty</p>
            <p className="text-gray-400 mt-2">
              Click &quot;Generate Daily Batch&quot; below to fill the pool with
              questions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {poolStats.map((stat) => (
              <div
                key={stat.format}
                className={
                  "bg-gradient-to-br " +
                  getPoolColor(stat.available) +
                  " rounded-xl p-5 shadow-lg border border-opacity-20 border-white"
                }
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white font-bold text-lg">{stat.format}</p>
                  <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-white text-xs font-bold">
                    {getPoolLabel(stat.available)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white opacity-80">Total</span>
                    <span className="text-white font-bold">{stat.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white opacity-80">Available</span>
                    <span className="text-white font-bold">
                      {stat.available}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white opacity-80">Retired</span>
                    <span className="text-white font-bold">
                      {stat.retired}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateSingleFormat(stat.format)}
                  disabled={isGenerating}
                  className="mt-3 w-full px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingFormat === stat.format ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" /> Generate 10 More
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: BULK GENERATOR */}
      <div className="bg-gray-900 border border-yellow-600 border-opacity-20 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-black text-white">
            AI Bulk Question Generator
          </h2>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <p className="text-white font-semibold mb-2">
            Daily Batch = 60 Questions
          </p>
          <p className="text-gray-400 text-sm">
            Generates 10 questions for each format: IPL, Test, T20I, ODI, WPL,
            Mixed. Each question is validated by Zod schema and saved to
            Firestore&apos;s globalQuestionPool. Takes about 2-3 minutes.
          </p>
        </div>

        <button
          onClick={handleGenerateDailyBatch}
          disabled={isGenerating}
          className="w-full px-6 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black rounded-xl transition text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isGenerating && !generatingFormat ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              Generating 60 Questions... Please wait (2-3 minutes)
            </>
          ) : (
            <>
              <Zap className="h-6 w-6" />
              Generate Daily Batch (60 Questions)
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-900 border border-red-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-200">
              <XCircle className="h-5 w-5" />
              <p className="font-bold">Error</p>
            </div>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Daily Batch Results */}
        {batchResult && (
          <div className="mt-6 space-y-4">
            <div className="bg-green-900 border border-green-700 rounded-xl p-6">
              <div className="flex items-center gap-2 text-green-200 mb-3">
                <CheckCircle className="h-6 w-6" />
                <p className="font-black text-lg">Daily Batch Complete!</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-green-400 text-3xl font-black">
                    {batchResult.totalGenerated}
                  </p>
                  <p className="text-green-200 text-xs">Generated</p>
                </div>
                <div>
                  <p className="text-green-400 text-3xl font-black">
                    {batchResult.totalSaved}
                  </p>
                  <p className="text-green-200 text-xs">Saved to Firebase</p>
                </div>
                <div>
                  <p
                    className={
                      "text-3xl font-black " +
                      (batchResult.totalErrors > 0
                        ? "text-red-400"
                        : "text-green-400")
                    }
                  >
                    {batchResult.totalErrors}
                  </p>
                  <p className="text-green-200 text-xs">Errors</p>
                </div>
              </div>
            </div>

            {/* Per-Format Breakdown */}
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-white font-bold mb-3">Per-Format Breakdown</p>
              <div className="space-y-2">
                {batchResult.results.map((r) => (
                  <div
                    key={r.format}
                    className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-2"
                  >
                    <span className="text-white font-semibold">{r.format}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-400">
                        {"✅ " + r.saved + " saved"}
                      </span>
                      {r.errors.length > 0 && (
                        <span className="text-red-400">
                          {"❌ " + r.errors.length + " errors"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Single Format Result */}
        {singleResult && (
          <div className="mt-6 bg-blue-900 border border-blue-700 rounded-xl p-6">
            <div className="flex items-center gap-2 text-blue-200 mb-2">
              <CheckCircle className="h-5 w-5" />
              <p className="font-bold">
                {singleResult.format} Generation Complete
              </p>
            </div>
            <p className="text-blue-300 text-sm">
              {"Generated: " +
                singleResult.generated +
                " | Saved: " +
                singleResult.saved +
                " | Errors: " +
                singleResult.errors.length}
            </p>
          </div>
        )}
      </div>

      {/* SECTION 4: VIEW POOL QUESTIONS */}
      <PoolQuestionsViewer />

      {/* Footer */}
      <div className="text-center text-gray-500 text-xs py-4 border-t border-gray-800">
        <p>
          {"AI Provider: Gemini (gemini-2.5-flash-lite) | Pool: " +
            totalAvailable +
            " available questions"}
        </p>
      </div>
    </div>
  );
}
