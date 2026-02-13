import { Request, Response } from "express";
import { storage } from "../storage";
import { runInterview, ChatMessage } from "./interviewEngine";

export async function startInterview(req: Request, res: Response) {
  const { role, resumeSkills } = req.body;

  const interview = await storage.createAIInterview({
    userId: req.user!.userId,
    role,
    resumeSkills,
  });

  const ai = await runInterview([
    {
      role: "user",
      content: `Role: ${role}
Skills: ${(resumeSkills || []).join(", ")}
Ask first question.`,
    },
  ]);

  res.json({
    interviewId: interview.id,
    question: ai.question,
  });
}

export async function chatInterview(req: Request, res: Response) {
  const { interviewId, answer } = req.body;

  const history = await storage.getAIInterviewHistory(interviewId);

  const conversation: ChatMessage[] = history.map((h: any) => ({
    role: h.sender === "ai" ? "assistant" : "user",
    content: h.message,
  }));

  conversation.push({
    role: "user",
    content: answer,
  });

  const ai = await runInterview(conversation);

  res.json(ai);
}
