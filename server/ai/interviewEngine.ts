import { ai } from "./aiClient";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function runInterview(messages: ChatMessage[]) {
  try {
    // 🛑 If empty conversation
    if (!messages || messages.length === 0) {
      messages = [
        { role: "user", content: "Ask the first interview question." },
      ];
    }

    const completion = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional technical interviewer. Ask one interview question at a time. Keep responses short and professional.",
        },
        ...messages,
      ],
      temperature: 0.7,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Tell me about yourself.";

    return {
      question: reply,
      score: Math.floor(Math.random() * 10) + 1,
      feedback: "Good attempt. Keep improving clarity and structure.",
    };
  } catch (error) {
    console.error("❌ OpenAI Interview Error:", error);

    return {
      question: "Tell me about yourself.",
      score: 5,
      feedback: "AI temporarily unavailable. Please try again.",
    };
  }
}
