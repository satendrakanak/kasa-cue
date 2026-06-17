import { getCurrentUser } from "@/lib/desktop-auth";

const OPENAI_API_URL = "https://api.openai.com/v1";
const TRANSCRIPTION_MODEL =
  process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-transcribe";
const REPLY_MODEL = process.env.OPENAI_REPLY_MODEL ?? "gpt-4o-mini";

type OpenAITextResponse = {
  output_text?: string;
  error?: {
    message?: string;
  };
};

type OpenAITranscriptionResponse = {
  text?: string;
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
        {
          error:
            "OPENAI_API_KEY is missing. Add it to .env.local and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio");
    const mode = String(formData.get("mode") ?? "client-call");
    const prompt = String(formData.get("prompt") ?? "");
    const tone = String(formData.get("tone") ?? "adaptive-genuine");
    const instructions = String(formData.get("instructions") ?? "");
    const language = String(formData.get("language") ?? "en");
    const outputLanguage = String(formData.get("outputLanguage") ?? "english");
    const transcribeOnly = String(formData.get("transcribeOnly") ?? "") === "true";

    if (!(audio instanceof File) || audio.size === 0) {
      return Response.json(
        { error: "Audio file is required." },
        { status: 400 }
      );
    }

    const transcription = await transcribeAudio(audio, prompt, language);
    const normalizedTranscript = await normalizeTranscriptLanguage(
      transcription.text,
      outputLanguage
    );

    if (!normalizedTranscript) {
      return Response.json(
        { error: "No speech detected in this audio chunk." },
        { status: 422 }
      );
    }

    if (transcribeOnly) {
      return Response.json({
        transcript: normalizedTranscript,
        models: {
          transcription: TRANSCRIPTION_MODEL,
        },
      });
    }

    const reply = await generateReply({
      transcript: normalizedTranscript,
      instructions,
      mode,
      tone,
    });

    return Response.json({
      transcript: normalizedTranscript,
      reply,
      models: {
        transcription: TRANSCRIPTION_MODEL,
        reply: REPLY_MODEL,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "OpenAI processing failed.",
      },
      { status: 500 }
    );
  }
}

async function transcribeAudio(audio: File, prompt: string, language: string) {
  const body = new FormData();
  body.append("file", audio, audio.name || "audio.webm");
  body.append("model", TRANSCRIPTION_MODEL);
  body.append("language", language || "en");
  body.append(
    "prompt",
    [
      prompt.trim(),
      "Return English words in Latin script only. Never return Urdu, Arabic, Hindi, Devanagari, or any non-Latin script.",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 1800)
  );

  const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body,
  });

  const data = (await response.json()) as OpenAITranscriptionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "OpenAI transcription failed.");
  }

  return {
    text: data.text?.trim() ?? "",
  };
}

async function normalizeTranscriptLanguage(
  transcript: string,
  outputLanguage: string
) {
  const text = transcript.trim();

  if (!text) {
    return "";
  }

  if (
    outputLanguage !== "english" ||
    !/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u0900-\u097f]/u.test(text)
  ) {
    return text;
  }

  const response = await fetch(`${OPENAI_API_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: REPLY_MODEL,
      input: [
        {
          role: "system",
          content:
            "Convert live transcript text to English in Latin script only. Preserve names, companies, technologies, numbers, and code terms. Return only the converted transcript.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_output_tokens: 250,
    }),
  });

  const data = (await response.json()) as OpenAITextResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Transcript language cleanup failed.");
  }

  return data.output_text?.trim() ?? text;
}

async function generateReply({
  instructions,
  mode,
  tone,
  transcript,
}: {
  instructions: string;
  mode: string;
  tone: string;
  transcript: string;
}) {
  const response = await fetch(`${OPENAI_API_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: REPLY_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are Kasa Cue, a private communication copilot. Generate a speakable English reply. Do not mention that you are an AI. Keep it genuinely useful for the user's live conversation, with enough detail for the situation.",
        },
        {
          role: "user",
          content: [
            `Session mode: ${mode}`,
            `Answer style: ${tone}`,
            `User instructions: ${instructions || "Keep it concise and natural."}`,
            `Latest heard speech: ${transcript}`,
            "Return only the suggested reply. Use the right length for the question; do not force an overly short answer.",
          ].join("\n"),
        },
      ],
      max_output_tokens: 450,
    }),
  });

  const data = (await response.json()) as OpenAITextResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "OpenAI reply generation failed.");
  }

  return data.output_text?.trim() ?? "";
}
