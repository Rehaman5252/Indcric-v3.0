'use server';

import { googleAI_SDK, MODEL_NAME } from '@/ai/genkit';
import { z } from 'zod';
import { QuizData } from '@/ai/schemas';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const GenerateQuizInputSchema = z.object({
  format: z.string().describe('The cricket format for the quiz'),
  userId: z.string().describe('The ID of the user requesting the quiz'),
});
type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const getRecentQuestions = async (userId: string): Promise<string[]> => {
  if (!db) return [];

  try {
    const q = query(
      collection(db, 'users', userId, 'quizAttempts'),
      orderBy('timestamp', 'desc'),
      limit(3)
    );
    const querySnapshot = await getDocs(q);
    const seenQuestions = new Set<string>();

    querySnapshot.forEach((doc) => {
      const attempt = doc.data();
      if (attempt.questions) {
        attempt.questions.forEach((question: any) => {
          if (question?.question) {
            seenQuestions.add(question.question);
          }
        });
      }
    });
    return Array.from(seenQuestions).slice(0, 10);
  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.error('[getRecentQuestions] Error:', error);
    }
    return [];
  }
};

function buildPrompt(format: string, seenQuestions: string[]): string {
  const avoidSection =
    seenQuestions.length > 0
      ? '\n\nAVOID these recently used questions:\n' +
        seenQuestions
          .slice(0, 5)
          .map((q) => '- ' + q)
          .join('\n')
      : '';

  return (
    'Generate 5 expert-level cricket quiz questions for "' +
    format +
    '" format in JSON.\n\n' +
    '**REQUIREMENTS:**\n' +
    '1. Cover these 5 categories (one per question): Score/Match, Player Performance, Venues, Tournaments, Strategy/Rules\n' +
    '2. Each question must be VERY challenging with obscure stats/records\n' +
    '3. 4 plausible options per question\n' +
    '4. correctAnswer must EXACTLY match one option' +
    avoidSection +
    '\n\n' +
    '**JSON FORMAT:**\n' +
    '```json\n' +
    '{\n' +
    '  "questions": [\n' +
    '    {\n' +
    '      "id": "q_' +
    Date.now() +
    '_1",\n' +
    '      "format": "' +
    format +
    '",\n' +
    '      "category": "score|player_performance|venue|tournament_or_special_day|strategy_or_rules",\n' +
    '      "question": "Question text?",\n' +
    '      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],\n' +
    '      "correctAnswer": "Option 1",\n' +
    '      "hint": "Brief hint",\n' +
    '      "explanation": "Why this is correct and others wrong"\n' +
    '    }\n' +
    '  ]\n' +
    '}\n' +
    '```\n\n' +
    'Generate NOW. Return ONLY valid JSON with 5 questions.'
  );
}

export async function generateQuizFlow(
  input: GenerateQuizInput
): Promise<z.infer<typeof QuizData>> {
  const startTime = Date.now();
  console.log('[generateQuizFlow] Starting for format:', input.format);

  try {
    const [seenQuestions] = await Promise.all([
      getRecentQuestions(input.userId),
      Promise.resolve(),
    ]);

    console.log(
      '[generateQuizFlow] Found ' +
        seenQuestions.length +
        ' recent questions (' +
        (Date.now() - startTime) +
        'ms)'
    );

    const model = googleAI_SDK.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const prompt = buildPrompt(input.format, seenQuestions);
    console.log('[generateQuizFlow] Prompt length:', prompt.length, 'chars');
    console.log('[generateQuizFlow] Calling', MODEL_NAME, '...');

    const generationPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('AI generation timeout after 20s')),
        20000
      )
    );

    const result = await Promise.race([generationPromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text().trim();

    const aiTime = Date.now() - startTime;
    console.log(
      '[generateQuizFlow] AI response received in ' +
        aiTime +
        'ms (' +
        text.length +
        ' chars)'
    );

    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (parseError) {
      const cleanText = text
        .replace(/^```(?:json)?\s*\n?/gi, '')
        .replace(/\n?```\s*$/gi, '')
        .trim();
      parsedData = JSON.parse(cleanText);
    }

    const validation = QuizData.safeParse(parsedData);

    if (!validation.success) {
      console.error(
        '[generateQuizFlow] Validation failed:',
        validation.error.format()
      );
      throw new Error('Invalid quiz structure from AI');
    }

    const questionCount = validation.data.questions.length;

    if (questionCount < 4) {
      throw new Error('Incomplete quiz: got ' + questionCount + ' questions');
    }

    if (questionCount === 4) {
      console.warn(
        '[generateQuizFlow] Got 4 questions instead of 5 (acceptable)'
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(
      '[generateQuizFlow] SUCCESS in ' +
        totalTime +
        'ms: Generated ' +
        questionCount +
        ' questions'
    );

    return validation.data;
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(
      '[generateQuizFlow] Failed after ' + totalTime + 'ms:',
      error?.message
    );

    // Single fast retry with shorter prompt
    if (totalTime < 25000) {
      console.log(
        '[generateQuizFlow] Quick retry with simplified prompt...'
      );

      try {
        const model = googleAI_SDK.getGenerativeModel({
          model: MODEL_NAME,
          generationConfig: {
            temperature: 0.6,
            topK: 10,
            topP: 0.85,
            maxOutputTokens: 3072,
            responseMimeType: 'application/json',
          },
        });

        const shortPrompt =
          'Generate 5 expert cricket quiz questions for "' +
          input.format +
          '" in JSON format.\n' +
          'Categories: score, player_performance, venue, tournament, strategy.\n' +
          'Return valid JSON with questions array. Each: id, format, category, question, options[4], correctAnswer, hint, explanation.';

        const result = await model.generateContent(shortPrompt);
        const response = await result.response;
        const text = response.text().trim();
        const parsedData = JSON.parse(
          text
            .replace(/^```(?:json)?\s*\n?/gi, '')
            .replace(/\n?```\s*$/gi, '')
            .trim()
        );

        const validation = QuizData.safeParse(parsedData);
        if (validation.success && validation.data.questions.length >= 4) {
          console.log('[generateQuizFlow] Retry succeeded!');
          return validation.data;
        }
      } catch (retryError) {
        console.error(
          '[generateQuizFlow] Retry also failed:',
          retryError
        );
      }
    }

    // Smart fallback instead of throwing error
    console.log(
      '[generateQuizFlow] AI completely failed. Attempting smart fallback from pool...'
    );
    try {
      const { getSmartFallback } = await import('@/ai/fallback-quiz');
      const fallbackData = await getSmartFallback(
        input.format,
        input.userId
      );
      console.log(
        '[generateQuizFlow] Smart fallback returned ' +
          fallbackData.questions.length +
          ' questions'
      );
      return fallbackData;
    } catch (fallbackError) {
      console.error(
        '[generateQuizFlow] Even smart fallback failed:',
        fallbackError
      );
      // Last resort: hardcoded
      const { fallbackQuiz } = await import('@/ai/fallback-quiz');
      return fallbackQuiz;
    }
  }
}
