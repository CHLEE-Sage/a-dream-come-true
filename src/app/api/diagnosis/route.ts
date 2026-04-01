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

type DiagnosisCard = {
  heading: string;
  body: string;
  tone: "neutral" | "warning" | "action";
};

type DiagnosisPayload = {
  headline: string;
  summary: string;
  cards: DiagnosisCard[];
  next_steps: string[];
};

const DEFAULT_MODEL = "gpt-5-mini";

async function readPromptFile(fileName: string) {
  const filePath = path.join(process.cwd(), "src", "prompts", fileName);
  return fs.readFile(filePath, "utf8");
}

function parseJson(text: string): DiagnosisPayload {
  const trimmed = text.trim();
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(cleaned) as DiagnosisPayload;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "尚未設定 OPENAI_API_KEY。" },
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
    "參考知識：",
    knowledge.trim(),
    "",
    "只回傳合法 JSON。",
    "輸出格式：",
    '{',
    '  "headline": "string",',
    '  "summary": "string",',
    '  "cards": [',
    '    { "heading": "string", "body": "string", "tone": "neutral|warning|action" }',
    "  ],",
    '  "next_steps": ["string", "string"]',
    '}',
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
              text: `請根據以下客戶資料，產生一份精簡、溫和、專業的繁體中文初步財務診斷。\n\n${userPrompt}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return Response.json(
      { error: errorText || "OpenAI 請求失敗。" },
      { status: 500 },
    );
  }

  const data = (await response.json()) as { output_text?: string };

  try {
    const diagnosis = parseJson(data.output_text ?? "");
    return Response.json({ diagnosis });
  } catch {
    return Response.json(
      { error: "模型回傳的診斷格式不是合法 JSON。" },
      { status: 500 },
    );
  }
}
