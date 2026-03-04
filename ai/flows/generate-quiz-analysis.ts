'use server';

import { googleAI_SDK, MODEL_NAME } from '@/ai/genkit';

interface QuizAnalysisInput {
  questions: Array<{
    question: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
  }>;
  score: number;
  totalQuestions: number;
  format: string;
}

interface QuizAnalysis {
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
}

export async function generateQuizAnalysis(input: QuizAnalysisInput): Promise<QuizAnalysis> {
  console.log(`[generateQuizAnalysis] 📊 Analyzing quiz performance: ${input.score}/${input.totalQuestions}`);
  
  try {
    const model = googleAI_SDK.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, // ✅ INCREASED from 800 to 2048
        responseMimeType: "application/json",
      },
    });

    const questionsText = input.questions
      .map((q, i) => `Q${i + 1}: ${q.question}\nYour answer: ${q.userAnswer}\nCorrect: ${q.isCorrect ? 'Yes' : 'No'}`)
      .join('\n\n');

    const percentage = Math.round((input.score / input.totalQuestions) * 100);

    // ✅ SHORTER, more focused prompt
    const prompt = `Analyze this ${input.format} cricket quiz performance (${input.score}/${input.totalQuestions} - ${percentage}%):

${questionsText}

Return ONLY this JSON structure with SHORT responses:
{
  "overallFeedback": "2 sentences max",
  "strengths": ["strength 1 (10 words max)", "strength 2 (10 words max)"],
  "areasForImprovement": ["area 1 (10 words max)", "area 2 (10 words max)"],
  "recommendations": ["tip 1 (12 words max)", "tip 2 (12 words max)", "tip 3 (12 words max)"]
}

Keep EVERY field SHORT. No extra text outside JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    console.log('[generateQuizAnalysis] 📄 Raw AI response:', text);
    console.log('[generateQuizAnalysis] 📏 Response length:', text.length);

    // Clean up common JSON issues
    let cleanedText = text;
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find JSON object - use greedy match to get complete JSON
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[generateQuizAnalysis] ❌ No JSON found. Full response:', text);
      throw new Error('No JSON found in AI response');
    }

    console.log('[generateQuizAnalysis] 🔍 Extracted JSON:', jsonMatch[0]);

    let analysis: QuizAnalysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[generateQuizAnalysis] ❌ JSON parse error:', parseError);
      console.error('[generateQuizAnalysis] 📄 Failed JSON:', jsonMatch[0]);
      throw new Error('Invalid JSON from AI');
    }

    // Validate response structure
    if (
      !analysis.overallFeedback || 
      !Array.isArray(analysis.strengths) || 
      !Array.isArray(analysis.areasForImprovement) || 
      !Array.isArray(analysis.recommendations)
    ) {
      console.error('[generateQuizAnalysis] ❌ Invalid structure:', analysis);
      throw new Error('Invalid analysis structure from AI');
    }

    // Ensure arrays have minimum content
    if (analysis.strengths.length === 0) {
      analysis.strengths = ['Good quiz completion', 'Consistent effort'];
    }
    if (analysis.areasForImprovement.length === 0) {
      analysis.areasForImprovement = ['Review incorrect answers', 'Study specific topics'];
    }
    if (analysis.recommendations.length === 0) {
      analysis.recommendations = [
        'Practice more quizzes',
        'Focus on weak areas',
        'Review cricket history'
      ];
    }

    console.log('[generateQuizAnalysis] ✅ Analysis generated successfully');
    return analysis;

  } catch (error: any) {
    console.error('[generateQuizAnalysis] ❌ Error:', error?.message || error);

    // Return fallback analysis
    const percentage = Math.round((input.score / input.totalQuestions) * 100);
    
    let feedbackMessage = '';
    let strengths: string[] = [];
    let improvements: string[] = [];
    let recommendations: string[] = [];

    if (percentage >= 80) {
      feedbackMessage = `Excellent work on the ${input.format} quiz! You scored ${input.score} out of ${input.totalQuestions}. Your cricket knowledge is impressive.`;
      strengths = [
        'Strong cricket knowledge demonstrated',
        'High accuracy on most questions',
      ];
      improvements = [
        'Minor gaps in specific areas',
        'Could improve on trickier questions',
      ];
      recommendations = [
        'Challenge yourself with advanced quizzes',
        'Study niche records and statistics',
        'Explore lesser-known cricket history',
      ];
    } else if (percentage >= 60) {
      feedbackMessage = `Good effort on the ${input.format} quiz! You scored ${input.score} out of ${input.totalQuestions}. With more practice, you'll improve significantly.`;
      strengths = [
        'Solid foundation in cricket basics',
        'Completed quiz with good engagement',
      ];
      improvements = [
        'Need deeper knowledge in some areas',
        'Review incorrect answers carefully',
      ];
      recommendations = [
        `Focus on ${input.format} format rules and history`,
        'Practice more quizzes regularly',
        'Study player statistics and records',
      ];
    } else {
      feedbackMessage = `Keep practicing! You scored ${input.score} out of ${input.totalQuestions} on the ${input.format} quiz. Every quiz helps you learn.`;
      strengths = [
        'Shows interest in learning cricket',
        'Completed the quiz attempt',
      ];
      improvements = [
        'Need to build foundational knowledge',
        'Review basic rules and history',
      ];
      recommendations = [
        'Start with easier quiz formats',
        'Watch matches and read about cricket',
        'Study one topic deeply before moving on',
      ];
    }

    return {
      overallFeedback: feedbackMessage,
      strengths,
      areasForImprovement: improvements,
      recommendations,
    };
  }
}
