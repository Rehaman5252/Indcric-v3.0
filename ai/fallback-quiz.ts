import { QuizData } from './schemas';
import { getFallbackQuestionsFromPool } from '@/lib/bulk-question-service';

// ========== HARDCODED LAST-RESORT FALLBACK ==========
// Only used if BOTH AI fails AND globalQuestionPool is empty/unavailable.

const hardcodedFallback: QuizData = {
  questions: [
    {
      id: 'fb1',
      question: "Who is known as the 'Little Master' in cricket?",
      options: ['Sachin Tendulkar', 'Virat Kohli', 'Ricky Ponting', 'Brian Lara'],
      correctAnswer: 'Sachin Tendulkar',
      explanation: 'Sachin Tendulkar is widely regarded as one of the greatest batsmen and is famously nicknamed the "Little Master".',
    },
    {
      id: 'fb2',
      question: 'How many players are there on a cricket team?',
      options: ['10', '11', '12', '9'],
      correctAnswer: '11',
      explanation: 'A standard cricket team consists of 11 players on the field at one time.',
    },
    {
      id: 'fb3',
      question: 'What does "LBW" stand for?',
      options: ['Leg Before Wicket', 'Long Ball Wide', 'Leg Behind Wicket', 'Lost Ball Wicket'],
      correctAnswer: 'Leg Before Wicket',
      explanation: 'LBW is a common way for a batsman to be dismissed.',
    },
    {
      id: 'fb4',
      question: 'Which country won the first-ever Cricket World Cup in 1975?',
      options: ['Australia', 'India', 'England', 'West Indies'],
      correctAnswer: 'West Indies',
      explanation: 'West Indies, led by Clive Lloyd, defeated Australia in the final to win the inaugural tournament.',
    },
    {
      id: 'fb5',
      question: 'What is the maximum number of overs in a T20 match for one side?',
      options: ['50', '20', '40', '10'],
      correctAnswer: '20',
      explanation: 'T20 (Twenty20) cricket is a shortened format where each team bats for a maximum of 20 overs.',
    },
  ],
};

/**
 * Smart fallback: tries globalQuestionPool first, then hardcoded questions.
 * 
 * Called when generateQuizFlow fails.
 * 
 * FLOW:
 * 1. Try globalQuestionPool → 5 format-specific unseen questions
 * 2. If pool empty/fails → return hardcoded generic questions
 */
export async function getSmartFallback(format: string, userId: string): Promise<QuizData> {
  try {
    const poolQuestions = await getFallbackQuestionsFromPool(format, userId);
    
    if (poolQuestions && poolQuestions.length >= 4) {
      console.log(`[smart-fallback] ✅ Using ${poolQuestions.length} questions from globalQuestionPool`);
      return { questions: poolQuestions.slice(0, 5) };
    }
  } catch (error) {
    console.error('[smart-fallback] Pool fetch failed, using hardcoded:', error);
  }

  console.warn('[smart-fallback] ⚠️ Using hardcoded fallback (pool empty or failed)');
  return hardcodedFallback;
}

// Keep backward compatibility — export hardcoded as default
export const fallbackQuiz = hardcodedFallback;

