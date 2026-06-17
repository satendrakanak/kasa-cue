import { extractDocumentProfile } from "@/lib/document-extraction";
import { getCurrentUser } from "@/lib/desktop-auth";
import { prisma } from "@/lib/prisma";
import { downloadDocumentFromS3 } from "@/lib/s3";

const OPENAI_API_URL = "https://api.openai.com/v1";
const ALLOWED_REPLY_MODELS = [
  "gpt-5-mini",
  "gpt-5",
  "gpt-5-nano",
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4o",
];
const RELIABLE_FALLBACK_MODEL = "gpt-4o-mini";

type GenerateReplyRequest = {
  instructions?: string;
  language?: string;
  model?: string;
  mode?: string;
  responseLength?: string;
  sessionId?: string;
  stream?: boolean;
  tone?: string;
  transcript?: string;
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

type OpenAIInputItem = {
  role: "system" | "user";
  content: string;
};

type SessionPromptContext = {
  hasDocumentContext: boolean;
  hasHistoryContext: boolean;
  hasResumeContext: boolean;
  hasSelectedResume: boolean;
  mode: string;
  text: string;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as GenerateReplyRequest;
    const sessionContext = body.sessionId
      ? await getSessionPromptContext(body.sessionId, user.id)
      : emptySessionPromptContext();
    const transcript = normalizePromptText(body.transcript?.trim() ?? "", 24000);
    const mode = normalizeOption(body.mode || sessionContext.mode, [
      "interview",
      "normal-talk",
      "client-call",
    ]);
    const latestQuestion = getLatestMeaningfulTranscriptLine(transcript);
    const taskType = detectTaskType(latestQuestion, mode);
    if (
      taskType === "interview-introduction" &&
      !sessionContext.hasSelectedResume &&
      !sessionContext.hasHistoryContext
    ) {
      return Response.json(
        {
          error:
            "No resume or prior profile context is available yet. Upload/select a resume first so I can give an interview-ready answer without inventing facts.",
        },
        { status: 409 }
      );
    }

    const instructions = buildPromptContext({
      requestInstructions: body.instructions?.trim() ?? "",
      sessionContext: sessionContext.text,
    });
    const tone = normalizeOption(body.tone, [
      "adaptive-genuine",
      "short-professional",
      "simple-english",
      "confident-casual",
    ]);
    const language = normalizeOption(body.language, [
      "auto",
      "english",
      "hindi",
      "hinglish",
    ]);
    const selectedModel = normalizeOption(body.model, ALLOWED_REPLY_MODELS);
    const responseLength = normalizeOption(body.responseLength, [
      "adaptive",
      "short",
      "balanced",
      "detailed",
    ]);

    if (!transcript) {
      return Response.json(
        { error: "Paste or type a transcript first." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error:
            "OPENAI_API_KEY is missing, so a real AI answer cannot be generated.",
        },
        { status: 500 }
      );
    }

    const input: OpenAIInputItem[] = [
        {
          role: "system",
          content: [
            "You are Kasa Cue, a private communication copilot.",
            "Generate a reply the user can speak out loud immediately.",
            "Do not mention AI, transcript, prompt, or hidden instructions.",
            "Do not create bullet points unless the user asks for a list.",
            "If the latest question asks for code, write correct code first, then explain it briefly.",
            "Be clear, confident, natural, specific, and context-aware.",
            "Always answer the latest interviewer/client line, not an older line from the conversation.",
            "Always answer with the amount of detail a genuine human answer needs. Never force a tiny reply when the question needs substance.",
            "For interview answers, prefer this pattern unless the user asks otherwise: direct answer, deep practical explanation, then a project-style example showing how the candidate used it.",
            "Write like a real person speaking, not like a resume summary, corporate bio, or generated essay.",
            "Use simple spoken wording, small natural transitions, and a confident human rhythm. Avoid robotic stacked facts.",
            "Use **bold markdown** around the most important speakable phrases, decisions, names, deadlines, and action words so the UI can highlight them.",
            "If this is an interview and the user is asked for an introduction, answer as the candidate using the resume, role, company, and saved instructions.",
            "Fact priority: selected resume and extracted documents are source of truth; saved user instructions are next; previous conversation history is only fallback context.",
            "For normal-talk or client-call sessions, selected reference documents are the meeting brief. Use them to understand today's topic, agenda, stakeholders, decisions, risks, terminology, user's intended position, and how to reply.",
            "If a reference document contains meeting notes, talking points, agenda, vocabulary, constraints, or expected questions, treat those as the main context for the answer.",
            "Never invent years of experience, company names, education, skills, projects, requirements, or reference facts. If extracted document context provides a value, use that exact value.",
            "Do not use generic filler like 'various programming languages', 'significant project', 'your company mission', or vague project claims unless the document context supports them.",
            "Avoid formal filler words people do not normally speak in interviews: primarily, leverage, dedicated my career, aligns well, key role, robust, extensive, passionate, excited, cutting-edge, impactful, honed.",
            "Do not start with 'Sure', 'Absolutely', or similar filler.",
            "If resume evidence is missing but previous user history exists, answer from that history without adding unsupported specifics.",
            "If no reliable context exists for a concrete fact, omit that fact instead of fabricating an answer.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Mode: ${mode}`,
            `Answer style: ${tone}`,
            `Language: ${language}`,
            `Length: ${responseLength}`,
            `Detected task: ${taskType}`,
            `Evidence status: selectedResume=${sessionContext.hasSelectedResume}; resumeContext=${sessionContext.hasResumeContext}; documentContext=${sessionContext.hasDocumentContext}; historyContext=${sessionContext.hasHistoryContext}`,
            `User instructions: ${instructions || "Keep it concise and natural."}`,
            `Latest line to answer: ${latestQuestion}`,
            `Conversation so far, for context only:\n${transcript}`,
            "Speech cleanup: if the latest line has unclear speech-recognition words, infer the most likely intended meaning from the session context, documents, and conversation before answering.",
            "Critical: answer the latest line only. Use earlier transcript only to understand continuity, not to repeat an old answer.",
            "Use selected resume, reference documents, and saved user instructions when relevant. Do not mention that you used them.",
            "If the question is broad, such as 'tell me about yourself', give a complete spoken answer with relevant background, strengths, and fit for the situation.",
            "For introduction answers, avoid bullet points and avoid incomplete endings. Write one polished spoken answer that can be read directly, with a warm opening, a clear career story, concrete evidence, and a confident ending.",
            mode === "normal-talk"
              ? "For normal workplace calls, give only what the user should say next. Keep it simple, fluent, respectful, and easy to speak. If helpful, include one short backup sentence starting with 'If needed:'"
              : "For normal cross-questions, answer directly first, then add one short example from the candidate's experience if useful.",
            "For scenario-based questions, first identify the problem, then explain the approach deeply, mention tradeoffs, and give a project-style example/outcome in a spoken way.",
            "For coding questions, provide a clean code answer in the most likely language or the language requested, then explain the approach, edge cases, complexity, and where this pattern would be used in a real project.",
            "Do not just list skills. Explain what kind of problems the candidate has solved and how that experience connects to the latest question.",
            getModeGuidance(mode),
            getTaskGuidance(taskType),
            getToneGuidance(tone),
            getLengthGuidance(responseLength),
            getLanguageGuidance(language),
            "Return only the suggested reply.",
          ].join("\n"),
        },
      ];
    if (body.stream) {
      return streamOpenAIReply(selectedModel, input);
    }

    const primaryReply = await requestOpenAIReply(selectedModel, input);
    const fallbackReply =
      !primaryReply.reply && selectedModel !== RELIABLE_FALLBACK_MODEL
        ? await requestOpenAIReply(RELIABLE_FALLBACK_MODEL, input)
        : null;
    const reply = primaryReply.reply || fallbackReply?.reply || "";

    if (!reply) {
      return Response.json(
        {
          error:
            "OpenAI returned an empty response from the selected model and fallback model. Please try a different model.",
          details: primaryReply.error ?? fallbackReply?.error,
        },
        { status: 502 }
      );
    }

    const grounding =
      taskType === "interview-introduction" && sessionContext.hasResumeContext
        ? await validateGroundedReply({
            evidence: sessionContext.text,
            reply,
            taskType,
          })
        : { ok: true, reason: "" };

    if (!grounding.ok) {
      const correctedReply = await requestOpenAIReply(
        RELIABLE_FALLBACK_MODEL,
        [
          ...input,
          {
            role: "user",
            content: [
              "The previous draft failed grounding validation.",
              `Validation issue: ${grounding.reason}`,
              "Regenerate the reply using ONLY facts directly supported by the document/session evidence above.",
              "If a concrete fact is not available, omit it. Do not replace it with a generic invented fact.",
            ].join("\n"),
          },
        ]
      );

      if (correctedReply.reply) {
        const correctedGrounding = await validateGroundedReply({
          evidence: sessionContext.text,
          reply: correctedReply.reply,
          taskType,
        });

        return Response.json({
          reply: correctedReply.reply,
          model: `${selectedModel} -> ${RELIABLE_FALLBACK_MODEL} grounded`,
          warning: correctedGrounding.ok
            ? ""
            : "I tightened the answer against the available context. Please verify resume extraction if any concrete fact still looks off.",
        });
      }

      return Response.json({
        reply,
        model: selectedModel,
        warning:
          "I could not run the grounded retry, so this answer uses the available session context. Please verify concrete resume facts before speaking.",
      });
    }

    return Response.json({
      reply,
      model: fallbackReply?.reply
        ? `${selectedModel} -> ${RELIABLE_FALLBACK_MODEL}`
        : selectedModel,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate reply.",
      },
      { status: 500 }
    );
  }
}

function buildPromptContext({
  requestInstructions,
  sessionContext,
}: {
  requestInstructions: string;
  sessionContext: string;
}) {
  return [
    requestInstructions
      ? `Immediate user instructions:\n${normalizePromptText(requestInstructions, 1800)}`
      : "",
    sessionContext
      ? `Saved resume, documents, and session memory:\n${normalizePromptText(sessionContext, 18000)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function normalizePromptText(value: string, maxChars: number) {
  const normalized = value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return normalized.slice(-maxChars);
}

async function requestOpenAIReply(model: string, input: OpenAIInputItem[]) {
  try {
    const response = await fetch(`${OPENAI_API_URL}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input,
        max_output_tokens: 1500,
        model,
      }),
    });

    const data = (await response.json()) as OpenAITextResponse;

    if (!response.ok) {
      return {
        error: data.error?.message ?? "OpenAI reply generation failed.",
        reply: "",
      };
    }

    return {
      error: "",
      reply: extractResponseText(data),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "OpenAI reply generation failed.",
      reply: "",
    };
  }
}

async function streamOpenAIReply(model: string, input: OpenAIInputItem[]) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = await fetch(`${OPENAI_API_URL}/responses`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input,
            max_output_tokens: 1500,
            model,
            stream: true,
          }),
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text();
          controller.enqueue(
            encoder.encode(
              parseOpenAIErrorMessage(errorText) ||
                "Could not generate a reply right now."
            )
          );
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            const delta = parseResponsesStreamDelta(event);

            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        }

        const finalDelta = parseResponsesStreamDelta(buffer);

        if (finalDelta) {
          controller.enqueue(encoder.encode(finalDelta));
        }

        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            error instanceof Error
              ? error.message
              : "Could not generate a reply right now."
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Model": model,
    },
  });
}

function parseResponsesStreamDelta(eventBlock: string) {
  const dataLines = eventBlock
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, "").trim())
    .filter(Boolean);

  let text = "";

  for (const line of dataLines) {
    if (line === "[DONE]") {
      continue;
    }

    try {
      const event = JSON.parse(line) as {
        delta?: string;
        item?: {
          content?: Array<{
            text?: string;
          }>;
        };
        output_text?: string;
        response?: {
          output_text?: string;
        };
        type?: string;
      };

      if (
        event.type === "response.output_text.delta" ||
        event.type === "response.refusal.delta"
      ) {
        text += event.delta ?? "";
      }
    } catch {
      // Ignore non-JSON stream control lines.
    }
  }

  return text;
}

function parseOpenAIErrorMessage(errorText: string) {
  try {
    const parsed = JSON.parse(errorText) as OpenAITextResponse;

    return parsed.error?.message ?? "";
  } catch {
    return errorText.slice(0, 300);
  }
}

async function validateGroundedReply({
  evidence,
  reply,
  taskType,
}: {
  evidence: string;
  reply: string;
  taskType: string;
}) {
  if (!evidence.trim()) {
    return {
      ok: false,
      reason: "No evidence was available for this grounded answer.",
    };
  }

  try {
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
              "You validate whether a live assistant reply is grounded in provided evidence.",
              "Check concrete facts only: years, companies, roles, skills, tools, projects, metrics, education, dates, names, requirements, and claims.",
              "If any concrete fact in the reply is not supported by the evidence, mark INVALID.",
              "Ignore harmless wording and style differences.",
              "Return exactly one line: VALID or INVALID: short reason.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              `Task: ${taskType}`,
              "Evidence:",
              evidence.slice(0, 9000),
              "Reply:",
              reply,
            ].join("\n"),
          },
        ],
        max_output_tokens: 80,
        model: RELIABLE_FALLBACK_MODEL,
      }),
    });

    const data = (await response.json()) as OpenAITextResponse;
    const verdict = extractResponseText(data);

    if (!response.ok || !verdict) {
      return {
        ok: false,
        reason: data.error?.message ?? "Grounding validation failed.",
      };
    }

    return {
      ok: verdict.trim().toUpperCase().startsWith("VALID"),
      reason: verdict,
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error ? error.message : "Grounding validation failed.",
    };
  }
}

function emptySessionPromptContext(): SessionPromptContext {
  return {
    hasDocumentContext: false,
    hasHistoryContext: false,
    hasResumeContext: false,
    hasSelectedResume: false,
    mode: "interview",
    text: "",
  };
}

async function getSessionPromptContext(
  sessionId: string,
  userId: string
): Promise<SessionPromptContext> {
  const communicationSession = await prisma.communicationSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      context: true,
      instructions: true,
      mode: true,
      referenceDocumentIds: true,
      resumeDocumentId: true,
      resumeFileName: true,
      referenceFiles: true,
    },
  });

  if (!communicationSession) {
    return emptySessionPromptContext();
  }

  const resumeDocument = await resolveSessionResumeDocument({
    sessionId,
    userId,
    mode: communicationSession.mode,
    resumeDocumentId: communicationSession.resumeDocumentId,
  });
  const resumeDocumentId =
    communicationSession.resumeDocumentId ?? resumeDocument?.id ?? null;
  const resumeFileName =
    communicationSession.resumeFileName ?? resumeDocument?.fileName ?? null;
  const documentIds = [
    resumeDocumentId,
    ...normalizeStringArray(communicationSession.referenceDocumentIds),
  ].filter((id): id is string => Boolean(id));
  const documents = documentIds.length
    ? await prisma.userDocument.findMany({
        where: {
          id: {
            in: documentIds,
          },
          userId,
        },
        select: {
          documentType: true,
          extractedText: true,
          fileName: true,
          contentType: true,
          id: true,
          s3Bucket: true,
          s3Key: true,
        },
      })
    : [];
  const documentsWithText = await Promise.all(
    documents.map((document) => ensureDocumentHasExtractedText(document, userId))
  );
  const hasResumeContext = documentsWithText.some(
    (document) => document.documentType === "resume" && document.extractedText
  );
  const hasDocumentContext = documentsWithText.some((document) =>
    Boolean(document.extractedText)
  );
  const historyText = await getPriorUserHistoryContext(userId, sessionId);
  const hasHistoryContext = Boolean(historyText);

  const text = [
    communicationSession.instructions
      ? `Saved/session instructions:\n${communicationSession.instructions}`
      : "",
    communicationSession.context
      ? `Active session memory:\n${communicationSession.context}`
      : "",
    resumeFileName ? `Selected resume: ${resumeFileName}` : "",
    normalizeStringArray(communicationSession.referenceFiles).length
      ? `Selected reference files: ${normalizeStringArray(
          communicationSession.referenceFiles
        ).join(", ")}`
      : "",
    documentsWithText
      .map((document) => {
        const extractedText = document.extractedText ?? "";
        const documentLabel =
          document.documentType === "resume"
            ? "Resume"
            : communicationSession.mode === "normal-talk"
              ? "Meeting brief / reference"
              : "Reference";

        return [
          `${documentLabel} document: ${document.fileName}`,
          extractedText
            ? `${
                document.documentType === "resume"
                  ? "Candidate background source"
                  : "Meeting brief source of truth"
              }:\n${extractedText.slice(0, 6500)}`
            : "Readable text is not available; do not invent facts from this file.",
        ].join("\n");
      })
      .join("\n\n"),
    historyText,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 14000);

  return {
    hasDocumentContext,
    hasHistoryContext,
    hasResumeContext,
    hasSelectedResume: Boolean(resumeDocumentId),
    mode: communicationSession.mode,
    text,
  };
}

async function getPriorUserHistoryContext(userId: string, currentSessionId: string) {
  const recentSessions = await prisma.communicationSession.findMany({
    where: {
      userId,
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 5,
    select: {
      context: true,
      id: true,
      instructions: true,
      mode: true,
      resumeFileName: true,
      title: true,
      turns: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          content: true,
          speaker: true,
        },
      },
    },
  });

  const chunks = recentSessions
    .map((session) => {
      const userTurns = session.turns
        .filter((turn) => turn.speaker !== "assistant")
        .reverse()
        .map((turn) => `${turn.speaker}: ${turn.content.slice(0, 700)}`)
        .join("\n");
      const sessionDetails = [
        session.id === currentSessionId ? "Current session history" : "Previous session history",
        `Mode: ${session.mode}`,
        session.title ? `Title: ${session.title}` : "",
        session.resumeFileName ? `Resume file mentioned: ${session.resumeFileName}` : "",
        session.context ? `Session context: ${session.context.slice(0, 1000)}` : "",
        session.instructions
          ? `Session instructions: ${session.instructions.slice(0, 1000)}`
          : "",
        userTurns ? `User/interviewer lines:\n${userTurns}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return sessionDetails;
    })
    .filter((chunk) => chunk.trim().length > 0);

  if (!chunks.length) {
    return "";
  }

  return [
    "Prior conversation/history context:",
    "Use this only for continuity and user preference. Do not treat prior AI answers as resume facts. If resume context is missing, this may be used as a fallback, but avoid unsupported concrete claims.",
    chunks.join("\n\n"),
  ].join("\n");
}

async function resolveSessionResumeDocument({
  mode,
  resumeDocumentId,
  sessionId,
  userId,
}: {
  mode: string;
  resumeDocumentId: string | null;
  sessionId: string;
  userId: string;
}) {
  if (mode !== "interview" || resumeDocumentId) {
    return null;
  }

  const latestResume = await prisma.userDocument.findFirst({
    where: {
      documentType: "resume",
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      fileName: true,
      id: true,
    },
  });

  if (!latestResume) {
    return null;
  }

  await prisma.communicationSession.updateMany({
    data: {
      resumeDocumentId: latestResume.id,
      resumeFileName: latestResume.fileName,
    },
    where: {
      id: sessionId,
      userId,
    },
  });

  return latestResume;
}

async function ensureDocumentHasExtractedText(
  document: {
    contentType: string;
    documentType: string;
    extractedText: string | null;
    fileName: string;
    id: string;
    s3Bucket: string;
    s3Key: string;
  },
  userId: string
) {
  if (document.extractedText && !shouldRefreshExtractedText(document.extractedText)) {
    return document;
  }

  try {
    const buffer = await downloadDocumentFromS3({
      bucket: document.s3Bucket,
      key: document.s3Key,
    });
    const extractedText = await extractDocumentProfile({
      buffer,
      contentType: document.contentType,
      documentType: document.documentType,
      fileName: document.fileName,
    });

    if (!extractedText) {
      return document;
    }

    await prisma.userDocument.updateMany({
      data: {
        extractedText,
      },
      where: {
        id: document.id,
        userId,
      },
    });

    return {
      ...document,
      extractedText,
    };
  } catch {
    return document;
  }
}

function shouldRefreshExtractedText(extractedText: string) {
  return (
    !extractedText.includes("AI_EXTRACTED_DOCUMENT_CONTEXT") ||
    extractedText.includes("EXTRACTED PROFILE DATA - USE AS SOURCE OF TRUTH")
  );
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

function normalizeOption(value: string | undefined, allowed: string[]) {
  return allowed.includes(value ?? "") ? value ?? allowed[0] : allowed[0];
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getLatestMeaningfulTranscriptLine(transcript: string) {
  const lines = transcript
    .split(/\n+/)
    .map((line) => line.replace(/^(user|other|interviewer|candidate):\s*/i, "").trim())
    .filter(Boolean);

  return lines.at(-1) ?? transcript.trim();
}

function detectTaskType(latestQuestion: string, mode: string | undefined) {
  const normalized = latestQuestion.toLowerCase();

  if (
    mode === "interview" &&
    (normalized.includes("tell me about yourself") ||
      normalized.includes("introduce yourself") ||
      normalized.includes("about yourself") ||
      normalized.includes("your introduction") ||
      normalized.includes("tell me yourself") ||
      normalized.includes("tell me something about"))
  ) {
    return "interview-introduction";
  }

  if (
    normalized.includes("salary") ||
    normalized.includes("ctc") ||
    normalized.includes("negotiat") ||
    normalized.includes("lpa")
  ) {
    return "salary-negotiation";
  }

  if (
    mode === "interview" &&
    (normalized.includes("code") ||
      normalized.includes("program") ||
      normalized.includes("function") ||
      normalized.includes("write") ||
      normalized.includes("implement") ||
      normalized.includes("algorithm"))
  ) {
    return "interview-coding";
  }

  if (
    mode === "interview" &&
    (normalized.includes("scenario") ||
      normalized.includes("suppose") ||
      normalized.includes("how would you") ||
      normalized.includes("what would you do") ||
      normalized.includes("design") ||
      normalized.includes("debug") ||
      normalized.includes("optimize") ||
      normalized.includes("explain") ||
      normalized.includes("difference") ||
      normalized.includes("if else") ||
      normalized.includes("react") ||
      normalized.includes("node") ||
      normalized.includes("next"))
  ) {
    return "interview-technical-or-scenario";
  }

  return "general-live-reply";
}

function getTaskGuidance(taskType: string) {
  if (taskType === "interview-introduction") {
    return [
      "Interview introduction task:",
      "Write a polished 90-120 second spoken introduction in first person.",
      "Use this shape: warm greeting + name + exact experience/current identity, practical career story, strongest relevant skills, 2 concrete resume-backed work/project highlights, working style, and a role/company fit ending.",
      "Use exact years of experience from extracted resume context if available.",
      "Mention concrete technologies, domains, companies, or projects only when present in the extracted context.",
      "Make it human: include phrases like 'over the years', 'in my recent work', 'what I have enjoyed most is', only where they fit naturally.",
      "Do not sound like a motivational essay, LinkedIn bio, or keyword dump. Do not use generic claims. Do not invent impact metrics.",
      "Keep it as 3 natural paragraphs that the candidate can speak directly.",
    ].join(" ");
  }

  if (taskType === "salary-negotiation") {
    return [
      "Salary negotiation task:",
      "Answer calmly and professionally.",
      "Acknowledge the other person's point, anchor on experience/skills/current market fit, and suggest a reasonable next number or discussion path if user instructions provide it.",
      "Do not sound aggressive or desperate.",
    ].join(" ");
  }

  if (taskType === "interview-coding") {
    return [
      "Coding interview task:",
      "Answer the latest coding question directly. If code is requested, provide clean working code.",
      "Use the requested language if mentioned; otherwise choose JavaScript/TypeScript for web/frontend/backend questions.",
      "Use this structure: short approach explanation, code, then explain important edge cases, time/space complexity, and how the candidate has used this type of logic in a real project.",
      "Do not give an introduction or resume summary.",
    ].join(" ");
  }

  if (taskType === "interview-technical-or-scenario") {
    return [
      "Technical or scenario interview task:",
      "Answer the exact latest question directly. Do not give an introduction.",
      "Use a natural spoken structure: direct answer, deep practical explanation, one project-style example or experience-backed point, and a confident close.",
      "If the interviewer gives a long scenario, summarize the core issue in one sentence before answering.",
      "If the latest line is just a topic, explain it as if the interviewer asked for a practical explanation.",
      "Keep it human and speakable; avoid textbook wording unless the question is explicitly academic.",
    ].join(" ");
  }

  return "General live reply task: answer the latest question directly, using saved context only where it helps. Do not return an introduction unless the latest question asks for one.";
}

function getModeGuidance(mode: string) {
  if (mode === "interview") {
    return [
      "Interview mode: answer as the candidate, not as an advisor.",
      "Use resume details and saved instructions to tailor the response.",
      "For introduction questions only, include a natural summary of experience, core skills, relevant projects, how the candidate works, and why the profile fits the role.",
      "For follow-up questions, answer the follow-up directly and naturally, as a candidate would in a live interview.",
      "For HR or negotiation questions, sound mature, practical, and confident.",
    ].join(" ");
  }

  if (mode === "client-call") {
    return "Client call mode: answer as the person attending the call. Be professional, status-oriented, and clear about decisions, risks, blockers, and next steps.";
  }

  return [
    "Normal talk mode: the user is speaking with English-speaking managers, teammates, HR, clients, or overseas colleagues.",
    "Answer as the user in first person, with simple professional English that can be spoken immediately.",
    "Use selected meeting brief/reference documents heavily. If the document says what today's call is about, align every answer to that topic and the user's intended position.",
    "If reference docs include vocabulary or talking points, reuse those words naturally so the user sounds prepared.",
    "Prioritize the best next reply, not explanation about the conversation.",
    "If the other person asks a question, answer directly. If they give an update, acknowledge it and give the next action. If they ask for status, give a confident status update. If the user may not understand, ask for clarification politely.",
    "Keep most replies to 1-4 natural sentences. For complex work topics, use up to 6 sentences.",
    "Avoid difficult vocabulary, idioms, slang, and over-formal corporate wording.",
    "Use useful workplace phrases like: **I understand**, **I will check and update you**, **Could you please clarify**, **That works for me**, **I need a little more time**, only when they fit.",
    "Highlight the key words using **bold markdown**.",
  ].join(" ");
}

function getToneGuidance(tone: string) {
  if (tone === "adaptive-genuine") {
    return "Use the best genuine spoken answer style for the situation: professional, natural, confident, and complete enough to be useful. Prefer spoken sentences over written-resume sentences. Use everyday words a candidate would actually say.";
  }

  if (tone === "simple-english") {
    return "Use simple English and avoid heavy vocabulary.";
  }

  if (tone === "confident-casual") {
    return "Use a confident but casual tone.";
  }

  return "Use a short professional tone.";
}

function getLengthGuidance(responseLength: string) {
  if (responseLength === "adaptive") {
    return "Use the right length for the question. For normal workplace talk, prefer a short speakable reply. For broad interview or negotiation questions, give a fuller answer with enough substance to speak confidently for about 60-120 seconds.";
  }

  if (responseLength === "short") {
    return "Keep the reply under 25 words.";
  }

  if (responseLength === "detailed") {
    return "Keep the reply under 180 words unless the question clearly needs more.";
  }

  return "Keep the reply under 90 words.";
}

function getLanguageGuidance(language: string) {
  if (language === "hindi") {
    return "Reply in natural Hindi.";
  }

  if (language === "hinglish") {
    return "Reply in natural Hinglish using simple, professional wording.";
  }

  if (language === "auto") {
    return "Reply in the same language or language mix used by the speaker. If unclear, use clear spoken English.";
  }

  return "Use clear spoken English.";
}
