'use server';

import { googleAI_SDK, MODEL_NAME } from '@/ai/genkit';
import { QuizData, QuizQuestion } from '@/ai/schemas';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  doc,
  updateDoc,
  getCountFromServer,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

// ========== TYPES ==========

export interface BulkGenerationResult {
  format: string;
  requested: number;
  generated: number;
  saved: number;
  errors: string[];
}

export interface DailyBatchResult {
  totalGenerated: number;
  totalSaved: number;
  totalErrors: number;
  results: BulkGenerationResult[];
  startedAt: string;
  completedAt: string;
}

export interface PoolStats {
  format: string;
  total: number;
  available: number; // not retired
  retired: number;
  lastGenerated: string | null;
}

// ========== CONSTANTS ==========

const ALL_FORMATS = ['IPL', 'Test', 'T20I', 'ODI', 'WPL', 'Mixed'] as const;
const QUESTIONS_PER_FORMAT = 10; // 10 questions per format per daily batch
const BATCH_SIZE = 5; // Gemini generates 5 at a time (matches your schema)
const COLLECTION_NAME = 'globalQuestionPool';

// ========== BULK GENERATION (Admin Use) ==========

/**
 * Builds a prompt specifically for bulk generation.
 * Different from the live quiz prompt — no "avoid" list needed,
 * and explicitly asks for unique, diverse questions.
 */
function buildBulkPrompt(format: string, batchNumber: number): string {
  return `Generate 5 expert-level cricket quiz questions for "${format}" format in JSON.

**REQUIREMENTS:**
1. Cover these 5 categories (one per question): Score/Match, Player Performance, Venues, Tournaments, Strategy/Rules
2. Each question must be VERY challenging with obscure stats/records
3. 4 plausible options per question — all options should be realistic
4. correctAnswer must EXACTLY match one option
5. This is batch #${batchNumber} — make questions completely DIFFERENT from typical quiz banks
6. Focus on lesser-known facts, unusual records, and surprising statistics

**JSON FORMAT:**
\`\`\`json
{
  "questions": [
    {
      "id": "q_bulk_${Date.now()}_${batchNumber}_1",
      "format": "${format}",
      "question": "Question text?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1",
      "explanation": "Why this is correct"
    }
  ]
}
\`\`\`

Generate NOW. Return ONLY valid JSON with exactly 5 questions.`;
}

/**
 * Generates one batch of 5 questions for a given format using Gemini.
 * Returns validated questions or throws on failure.
 */
async function generateOneBatch(format: string, batchNumber: number): Promise<QuizQuestion[]> {
  const model = googleAI_SDK.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.8,    // Slightly higher for more variety in bulk
      topK: 30,
      topP: 0.92,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildBulkPrompt(format, batchNumber);
  
  // 25 second timeout for bulk (more lenient than live)
  const generationPromise = model.generateContent(prompt);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Bulk generation timeout for ${format} batch ${batchNumber}`)), 25000)
  );

  const result = await Promise.race([generationPromise, timeoutPromise]);
  const response = await result.response;
  const text = response.text().trim();

  let parsedData;
  try {
    parsedData = JSON.parse(text);
  } catch {
    const cleanText = text.replace(/^```(?:json)?\s*\n?/gi, '').replace(/\n?```\s*$/gi, '').trim();
    parsedData = JSON.parse(cleanText);
  }

  const validation = QuizData.safeParse(parsedData);
  if (!validation.success) {
    throw new Error(`Validation failed for ${format} batch ${batchNumber}: ${validation.error.message}`);
  }

  return validation.data.questions;
}

/**
 * Saves a single question to globalQuestionPool in Firestore.
 * Adds metadata fields: format, usageCount, isRetired, createdAt, source.
 */
async function saveQuestionToPool(question: QuizQuestion, format: string): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  const docRef = await addDoc(collection(db!, COLLECTION_NAME), {
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    format: format,
    usageCount: 0,
    isRetired: false,
    createdAt: Timestamp.now(),
    source: 'bulk-ai',
    aiModel: MODEL_NAME,
  });

  return docRef.id;
}

/**
 * Generates 10 questions for a single format (2 batches of 5).
 * Saves each question to Firestore individually.
 * Returns a detailed result object.
 */
export async function generateForFormat(format: string): Promise<BulkGenerationResult> {
  const result: BulkGenerationResult = {
    format,
    requested: QUESTIONS_PER_FORMAT,
    generated: 0,
    saved: 0,
    errors: [],
  };

  const batchCount = Math.ceil(QUESTIONS_PER_FORMAT / BATCH_SIZE); // 10/5 = 2 batches

  for (let i = 0; i < batchCount; i++) {
    try {
      console.log(`[bulk] Generating ${format} batch ${i + 1}/${batchCount}...`);
      const questions = await generateOneBatch(format, i + 1);
      result.generated += questions.length;

      // Save each question to Firestore
      for (const question of questions) {
        try {
          await saveQuestionToPool(question, format);
          result.saved++;
        } catch (saveError: any) {
          result.errors.push(`Save failed: ${saveError.message}`);
        }
      }

      console.log(`[bulk] ✅ ${format} batch ${i + 1}: ${questions.length} generated, ${result.saved} total saved`);
    } catch (batchError: any) {
      const errorMsg = `${format} batch ${i + 1} failed: ${batchError.message}`;
      result.errors.push(errorMsg);
      console.error(`[bulk] ❌ ${errorMsg}`);
    }
  }

  return result;
}

/**
 * MAIN FUNCTION: Generates the full daily batch — 10 questions × 6 formats = 60 questions.
 * Called from the admin UI when "Generate Daily Batch" is clicked.
 */
export async function generateDailyBatch(): Promise<DailyBatchResult> {
  const startedAt = new Date().toISOString();
  const results: BulkGenerationResult[] = [];
  let totalGenerated = 0;
  let totalSaved = 0;
  let totalErrors = 0;

  console.log(`[bulk] ========== STARTING DAILY BATCH ==========`);
  console.log(`[bulk] Formats: ${ALL_FORMATS.join(', ')}`);
  console.log(`[bulk] Questions per format: ${QUESTIONS_PER_FORMAT}`);
  console.log(`[bulk] Expected total: ${ALL_FORMATS.length * QUESTIONS_PER_FORMAT}`);

  for (const format of ALL_FORMATS) {
    const formatResult = await generateForFormat(format);
    results.push(formatResult);
    totalGenerated += formatResult.generated;
    totalSaved += formatResult.saved;
    totalErrors += formatResult.errors.length;
  }

  const completedAt = new Date().toISOString();

  console.log(`[bulk] ========== DAILY BATCH COMPLETE ==========`);
  console.log(`[bulk] Generated: ${totalGenerated}, Saved: ${totalSaved}, Errors: ${totalErrors}`);

  return {
    totalGenerated,
    totalSaved,
    totalErrors,
    results,
    startedAt,
    completedAt,
  };
}

/**
 * Generates for a single specific format (used by "Generate for IPL only" button).
 */
export async function generateForSingleFormat(format: string): Promise<BulkGenerationResult> {
  console.log(`[bulk] Generating ${QUESTIONS_PER_FORMAT} questions for ${format} only...`);
  return generateForFormat(format);
}

// ========== POOL STATS (Admin Dashboard) ==========

/**
 * Gets question count statistics for each format in the pool.
 * Used by the admin dashboard to show pool health.
 */
export async function getPoolStats(): Promise<PoolStats[]> {
  if (!db) return [];

  const stats: PoolStats[] = [];

  for (const format of ALL_FORMATS) {
    try {
      // Count total questions for this format
      const totalQuery = query(
        collection(db!, COLLECTION_NAME),
        where('format', '==', format)
      );
      const totalSnapshot = await getCountFromServer(totalQuery);
      const total = totalSnapshot.data().count;

      // Count available (not retired) questions
      const availableQuery = query(
        collection(db!, COLLECTION_NAME),
        where('format', '==', format),
        where('isRetired', '==', false)
      );
      const availableSnapshot = await getCountFromServer(availableQuery);
      const available = availableSnapshot.data().count;

      stats.push({
        format,
        total,
        available,
        retired: total - available,
        lastGenerated: null, // Can be enhanced later
      });
    } catch (error) {
      console.error(`[pool-stats] Error for ${format}:`, error);
      stats.push({ format, total: 0, available: 0, retired: 0, lastGenerated: null });
    }
  }

  return stats;
}

// ========== FALLBACK FETCHER (Used During Live Quiz) ==========

/**
 * Fetches 5 random questions from globalQuestionPool for a given format.
 * Filters out questions the user has already seen.
 * This replaces the hardcoded fallbackQuiz when AI fails.
 */
export async function getFallbackQuestionsFromPool(
  format: string,
  userId: string
): Promise<QuizQuestion[] | null> {
  if (!db) return null;

  try {
    console.log(`[fallback] Fetching pool questions for ${format}, user ${userId}...`);

    // Step 1: Get user's question history (which questions they've already seen)
    let seenQuestions = new Set<string>();
    try {
      const historyRef = collection(db!, 'users', userId, 'quizAttempts');
      const historyQuery = query(historyRef, orderBy('timestamp', 'desc'), limit(10));
      const historySnapshot = await getDocs(historyQuery);

      historySnapshot.forEach((doc) => {
        const attempt = doc.data();
        if (attempt.questions) {
          attempt.questions.forEach((q: any) => {
            if (q?.question) seenQuestions.add(q.question);
          });
        }
      });
    } catch (historyError) {
      console.warn('[fallback] Could not fetch history, proceeding without filter:', historyError);
    }

    console.log(`[fallback] User has seen ${seenQuestions.size} questions`);

    // Step 2: Fetch available questions from pool for this format
    const poolQuery = query(
      collection(db!, COLLECTION_NAME),
      where('format', '==', format),
      where('isRetired', '==', false),
      limit(30) // Fetch extra to filter out seen ones
    );
    const poolSnapshot = await getDocs(poolQuery);

    if (poolSnapshot.empty) {
      console.warn(`[fallback] No questions in pool for format ${format}`);
      return null;
    }

    // Step 3: Filter out seen questions and pick 5 random ones
    const availableQuestions: QuizQuestion[] = [];
    poolSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!seenQuestions.has(data.question)) {
        availableQuestions.push({
          id: doc.id,
          question: data.question,
          options: data.options,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
        });
      }
    });

    if (availableQuestions.length < 5) {
      console.warn(`[fallback] Only ${availableQuestions.length} unseen questions available for ${format}`);
      // If less than 5 unseen, include some seen ones too
      if (availableQuestions.length < 5) {
        poolSnapshot.forEach((doc) => {
          if (availableQuestions.length >= 5) return;
          const data = doc.data();
          if (seenQuestions.has(data.question)) {
            availableQuestions.push({
              id: doc.id,
              question: data.question,
              options: data.options,
              correctAnswer: data.correctAnswer,
              explanation: data.explanation,
            });
          }
        });
      }
    }

    if (availableQuestions.length === 0) {
      console.error(`[fallback] Zero questions available for ${format}`);
      return null;
    }

    // Step 4: Shuffle and pick 5
    const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);

    // Step 5: Increment usageCount for each selected question
    for (const q of selected) {
      try {
        const qRef = doc(db!, COLLECTION_NAME, q.id);
        await updateDoc(qRef, { usageCount: (q as any).usageCount ? (q as any).usageCount + 1 : 1 });
      } catch {
        // Non-critical — don't fail the quiz over a counter update
      }
    }

    console.log(`[fallback] ✅ Returning ${selected.length} pool questions for ${format}`);
    return selected;
  } catch (error) {
    console.error('[fallback] Pool fetch failed:', error);
    return null;
  }
}
