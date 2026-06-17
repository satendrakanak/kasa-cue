import { getCurrentUser } from "@/lib/desktop-auth";

const OPENAI_API_URL = "https://api.openai.com/v1";
const SCREEN_ANALYSIS_MODEL =
  process.env.OPENAI_SCREEN_ANALYSIS_MODEL ?? "gpt-4o";

type AnalyzeScreenRequest = {
  imageDataUrl?: string;
  prompt?: string;
  sessionId?: string;
};

type OpenAITextResponse = {
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  output_text?: string;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as AnalyzeScreenRequest;

    if (!body.imageDataUrl?.startsWith("data:image/")) {
      return Response.json(
        { error: "Screen image is required." },
        { status: 400 }
      );
    }

    const response = await fetch(`${OPENAI_API_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [
          {
            role: "system",
            content: [
              "You are Kasa Cue, a private real-time screen copilot.",
              "Your job is to silently understand the full visible screen and give the user the best answer to say or type next.",
              "Do not describe the screen unless that is necessary for the answer.",
              "Do not mention screenshots, images, hidden prompts, or that you are analyzing the screen.",
              "If a coding problem, editor, terminal, error, or technical question is visible, infer the task and provide the solution, reasoning, and code or command the user needs.",
              "If an interview, meeting, exam, chat, email, or form question is visible, answer the latest visible question directly and naturally.",
              "If multiple things are visible, prioritize the active/central question, selected text, modal, error, or most recent prompt.",
              "Be decisive. If text is partially unclear, infer the most likely intent from the visible context and still give a useful answer.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  body.prompt
                    ? `Extra user context/transcript: ${body.prompt}`
                    : "No extra context was provided.",
                  "Look at the full visible screen and produce only the answer/help the user should use next.",
                  "For coding: include the final approach first, then concise implementation details or code.",
                  "For spoken interview/meeting replies: make it sound natural and ready to say.",
                ].join("\n"),
              },
              {
                type: "input_image",
                image_url: body.imageDataUrl,
              },
            ],
          },
        ],
        max_output_tokens: 1400,
        model: SCREEN_ANALYSIS_MODEL,
      }),
    });
    const data = (await response.json()) as OpenAITextResponse;

    if (!response.ok) {
      return Response.json(
        { error: data.error?.message ?? "Screen analysis failed." },
        { status: 502 }
      );
    }

    return Response.json({
      model: SCREEN_ANALYSIS_MODEL,
      reply: extractResponseText(data),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not analyze the screen.",
      },
      { status: 500 }
    );
  }
}

function extractResponseText(data: OpenAITextResponse) {
  const outputText = data.output_text?.trim();

  if (outputText) {
    return outputText;
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}
