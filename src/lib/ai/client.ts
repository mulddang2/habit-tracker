const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiMessage {
  role: "user" | "model";
  text: string;
}

export interface GeminiGenerateOptions {
  system: string;
  messages: GeminiMessage[];
  temperature?: number;
  responseMimeType?: "text/plain" | "application/json";
  responseSchema?: Record<string, unknown>;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export async function generateContent(
  options: GeminiGenerateOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const body = {
    systemInstruction: { parts: [{ text: options.system }] },
    contents: options.messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      responseMimeType: options.responseMimeType ?? "application/json",
      ...(options.responseSchema && { responseSchema: options.responseSchema }),
    },
  };

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
    res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status !== 503) break;
  }

  if (!res!.ok) {
    const text = await res!.text().catch(() => "");
    throw new GeminiError(
      `Gemini API 호출 실패 (${res!.status}): ${text}`,
      res!.status
    );
  }

  const json = (await res!.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError("Gemini 응답이 비어 있습니다.");
  }
  return text;
}
