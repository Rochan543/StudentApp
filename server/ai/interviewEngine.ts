import OpenAI from "openai";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runInterview(messages: ChatMessage[]) {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });

  const text = completion.choices[0].message.content || "";

  return {
    question: text,
    score: Math.floor(Math.random() * 10) + 1,
    feedback: "Good attempt",
  };
}
