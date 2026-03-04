/**
 * @fileOverview AI configuration using Google Generative AI SDK directly
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.error("❌ CRITICAL: No Google AI API key found!");
  throw new Error("Missing GOOGLE_AI_API_KEY environment variable");
}

console.log("✅ Genkit: API Key found");

// Initialize Google Generative AI SDK directly
export const googleAI_SDK = new GoogleGenerativeAI(apiKey);

// ✅ CRITICAL: Use Flash-Lite for 2-3x faster generation
export const MODEL_NAME = 'gemini-2.5-flash-lite';

// Configure Genkit AI (for other features, not for model)
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});

console.log(`✅ Google AI SDK configured successfully with ${MODEL_NAME} model`);

// Export a helper function to get model instance
export function getModel() {
  return googleAI_SDK.getGenerativeModel({ model: MODEL_NAME });
}
