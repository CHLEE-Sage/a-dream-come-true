import { promises as fs } from "node:fs";
import path from "node:path";

type DiagnosisRequest = {
  intent: unknown;
  input: unknown;
  answers: unknown;
  events: unknown;
  recommendations: unknown;
  insight: unknown;
};

const DEFAULT_MODEL = "gpt-5-mini";

async function readPromptFile(fileName: string) {
  const filePath = path.join(process.cwd(), "src", "prompts", fileName);
  return fs.readFile(filePath, "utf8");
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as DiagnosisRequest;
  const [instructions, knowledge] = await Promise.all([
    readPromptFile("advisor-instructions.md"),
    readPromptFile("advisor-knowledge.md"),
  ]);

  const developerPrompt = [
    instructions.trim(),
    "",
    "Reference knowledge:",
    knowledge.trim(),
  ].join("\n");

  const userPrompt = JSON.stringify(body, null, 2);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      instructions: developerPrompt,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Create a concise, empathetic, advisor-style first diagnosis for this client.\n\n${userPrompt}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return Response.json(
      { error: errorText || "OpenAI request failed." },
      { status: 500 },
    );
  }

  const data = (await response.json()) as { output_text?: string };
  return Response.json({ diagnosis: data.output_text ?? "" });
}
