// app/components/admin/quizzes/PoolQuestionsViewer.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  limit,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";

type PoolQuestion = {
  id: string;
  format: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  createdAt?: any;
};

const FORMATS = ["IPL", "Test", "T20I", "ODI", "WPL", "Mixed"] as const;

const PAGE_SIZE = 20;

export default function PoolQuestionsViewer() {
  const [format, setFormat] = useState<string>("IPL");
  const [questions, setQuestions] = useState<PoolQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadQuestions = async (selectedFormat: string, reset = false) => {
    if (!db) return;
    setLoading(true);
    setError(null);

    try {
      const baseQuery = query(
        collection(db, "globalQuestionPool"),
        where("format", "==", selectedFormat),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      const q = reset || !lastDoc
        ? baseQuery
        : query(
            collection(db, "globalQuestionPool"),
            where("format", "==", selectedFormat),
            orderBy("createdAt", "desc"),
            startAfter(lastDoc),
            limit(PAGE_SIZE)
          );

      const snapshot = await getDocs(q);

      const newQuestions: PoolQuestion[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          format: data.format,
          question: data.question,
          options: data.options || [],
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
          createdAt: data.createdAt,
        };
      });

      if (reset) {
        setQuestions(newQuestions);
      } else {
        setQuestions((prev) => [...prev, ...newQuestions]);
      }

      if (snapshot.docs.length === PAGE_SIZE) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(true);
      } else {
        setLastDoc(null);
        setHasMore(false);
      }
    } catch (err: any) {
      console.error("Failed to load pool questions:", err);
      setError(err?.message || "Failed to load pool questions");
    } finally {
      setLoading(false);
    }
  };

  // Load when format changes
  useEffect(() => {
    setLastDoc(null);
    setQuestions([]);
    loadQuestions(format, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  return (
    <div className="bg-gray-900 border border-yellow-600 border-opacity-20 rounded-2xl p-8 shadow-xl space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black text-white">
          Question Pool – View Questions
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-gray-300 text-sm">Format:</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="bg-gray-800 text-white text-sm px-3 py-1 rounded border border-gray-700"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 rounded-xl p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && questions.length === 0 ? (
        <div className="py-6 text-center text-gray-400 text-sm">
          Loading questions...
        </div>
      ) : questions.length === 0 ? (
        <div className="py-6 text-center text-gray-400 text-sm">
          No questions found for {format}.
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">
                  #{idx + 1} • {q.id}
                </span>
                <span className="text-xs text-gray-400">
                  Format: <span className="font-semibold text-gray-200">{q.format}</span>
                </span>
              </div>
              <p className="text-white font-semibold mb-2">
                {q.question}
              </p>
              <ul className="text-sm text-gray-200 space-y-1 mb-2">
                {q.options.map((opt, i) => (
                  <li key={i}>
                    <span className="font-mono mr-1">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-green-300 mb-1">
                Correct answer: <span className="font-semibold">{q.correctAnswer}</span>
              </p>
              {q.explanation && (
                <p className="text-xs text-gray-300">
                  Explanation: {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-400">
          Showing {questions.length} question{questions.length !== 1 ? "s" : ""} for {format}
        </span>
        {hasMore && !loading && (
          <button
            onClick={() => loadQuestions(format, false)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
