import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing");
}

export const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
