"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AnswerPanel } from "@/components/workspace/answer-panel";
import { ChatComposer } from "@/components/workspace/chat-composer";
import { LiveTranscriptStrip } from "@/components/workspace/live-transcript-strip";
import { modeOptions } from "@/components/workspace/options";
import { SessionTopBar } from "@/components/workspace/session-top-bar";
import type {
  ActiveWorkspaceSession,
  GenerateReplyResponse,
  KasaSpeechRecognition,
  SpeechWindow,
  WorkspaceUser,
} from "@/components/workspace/types";

type CopilotAppProps = {
  activeSession: ActiveWorkspaceSession;
  user: WorkspaceUser;
};

export default function CopilotApp({ activeSession }: CopilotAppProps) {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [visibleReply, setVisibleReply] = useState(
    "Ready. Speak or type the interviewer line, then press Answer."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoAnswer, setAutoAnswer] = useState(false);
  const [listenStatus, setListenStatus] = useState("Preparing audio");
  const [durationLabel, setDurationLabel] = useState("0:00");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [model, setModel] = useState(activeSession.model);
  const [copied, setCopied] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [answerIndex, setAnswerIndex] = useState(-1);
  const recognitionRef = useRef<KasaSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);
  const autoAnswerTimerRef = useRef<number | null>(null);
  const autoAnswerRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const lastAutoAnsweredRef = useRef("");
  const transcriptRef = useRef("");

  const activeMode = useMemo(
    () =>
      modeOptions.find((item) => item.value === activeSession.mode) ??
      modeOptions[0],
    [activeSession.mode]
  );

  useEffect(() => {
    const startedAt = new Date(activeSession.startedAt).getTime();

    function updateDuration() {
      const totalSeconds = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000)
      );
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setDurationLabel(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }

    updateDuration();
    const intervalId = window.setInterval(updateDuration, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeSession.startedAt]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    autoAnswerRef.current = autoAnswer;
  }, [autoAnswer]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  async function generateReply(sourceTranscript = transcript) {
    const normalizedTranscript = sourceTranscript.trim();

    if (!normalizedTranscript) {
      setWarning("Waiting for spoken or typed text before answering.");
      return;
    }

    setError("");
    setWarning("");
    setModel(activeSession.model);
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setVisibleReply("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/openai/generate-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: activeSession.language,
          mode: activeSession.mode,
          model: activeSession.model,
          responseLength: "adaptive",
          sessionId: activeSession.id,
          stream: true,
          tone: activeSession.tone ?? "adaptive-genuine",
          transcript: normalizedTranscript,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as GenerateReplyResponse;

        throw new Error(data.error ?? "Could not generate reply.");
      }

      const nextReply = await readStreamingReply(response);

      if (!nextReply.trim()) {
        throw new Error("No reply generated.");
      }

      setModel(response.headers.get("X-Model") ?? activeSession.model);
      setAnswers((current) => {
        const nextAnswers = [...current, nextReply];
        setAnswerIndex(nextAnswers.length - 1);
        return nextAnswers;
      });
      await saveSessionTurn(
        "assistant",
        nextReply,
        response.headers.get("X-Model") ?? activeSession.model
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Could not generate reply.";

      setError(message);
      setVisibleReply(`I could not generate a reliable answer yet. ${message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveSessionTurn(
    speaker: "other" | "user" | "assistant",
    content: string,
    turnModel?: string
  ) {
    try {
      await fetch(`/api/sessions/${activeSession.id}/turns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          model: turnModel,
          speaker,
        }),
      });
    } catch (caughtError) {
      setWarning(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save session turn."
      );
    }
  }

  async function readStreamingReply(response: Response) {
    if (!response.body) {
      const data = (await response.json()) as GenerateReplyResponse;
      const nextReply = data.reply ?? "";

      setVisibleReply(nextReply);
      return nextReply;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let reply = "";
    let displayedLength = 0;
    let streamDone = false;
    let resolveReveal: (() => void) | null = null;
    const revealDone = new Promise<void>((resolve) => {
      resolveReveal = resolve;
    });

    setVisibleReply("");

    typingTimerRef.current = window.setInterval(() => {
      if (displayedLength < reply.length) {
        displayedLength = Math.min(reply.length, displayedLength + 3);
        setVisibleReply(reply.slice(0, displayedLength));
        return;
      }

      if (streamDone && typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        resolveReveal?.();
      }
    }, 16);

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });

      if (!chunk) {
        continue;
      }

      reply += chunk;
    }

    const tail = decoder.decode();

    if (tail) {
      reply += tail;
    }

    streamDone = true;
    await revealDone;

    return reply;
  }

  async function sendChatMessage() {
    const message = chatInput.trim();

    if (!message || isGenerating) {
      return;
    }

    const nextTranscript = [transcript.trim(), `User: ${message}`]
      .filter(Boolean)
      .join("\n");

    setTranscript(nextTranscript);
    setChatInput("");
    await saveSessionTurn("user", message);
    await generateReply(nextTranscript);
  }

  function showAnswerAt(nextIndex: number) {
    const nextReply = answers[nextIndex];

    if (!nextReply) {
      return;
    }

    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    setAnswerIndex(nextIndex);
    setVisibleReply(nextReply);
  }

  async function startListening() {
    setError("");

    const SpeechRecognition =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setListenStatus("Type mode");
      setWarning(
        "Speech listening is not supported in this browser. You can type or paste the conversation below."
      );
      return;
    }

    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    shouldKeepListeningRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      activeSession.language === "hindi" ||
      activeSession.language === "hinglish"
        ? "hi-IN"
        : "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const spokenText = result[0].transcript.trim();

        if (result.isFinal) {
          finalText += `${spokenText} `;
        } else {
          interimText += `${spokenText} `;
        }
      }

      if (finalText.trim()) {
        const cleanFinalText = finalText.trim();
        const nextTranscript = [transcriptRef.current.trim(), cleanFinalText]
          .filter(Boolean)
          .join("\n");

        void saveSessionTurn("other", finalText.trim());
        transcriptRef.current = nextTranscript;
        setTranscript(nextTranscript);

        if (
          autoAnswerRef.current &&
          nextTranscript !== lastAutoAnsweredRef.current
        ) {
          if (autoAnswerTimerRef.current) {
            window.clearTimeout(autoAnswerTimerRef.current);
          }

          autoAnswerTimerRef.current = window.setTimeout(() => {
            if (isGeneratingRef.current) {
              return;
            }

            lastAutoAnsweredRef.current = nextTranscript;
            void generateReply(nextTranscript);
          }, 700);
        }
      }

      setLiveTranscript(interimText.trim() || finalText.trim());
    };

    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        shouldKeepListeningRef.current = false;
        setError(
          "Microphone permission is blocked. Allow microphone access, or type the conversation manually."
        );
        setIsListening(false);
        setListenStatus("Mic blocked");
        return;
      }

      setListenStatus("Reconnecting");
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start();
            setIsListening(true);
            setListenStatus("Listening");
          } catch {
            setListenStatus("Reconnecting");
          }
        }, 350);
        return;
      }

      setIsListening(false);
      setListenStatus("Type mode");
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setListenStatus("Listening");
    } catch {
      setListenStatus("Type mode");
      setWarning("Audio could not start automatically. Type the line below.");
    }
  }

  useEffect(() => {
    const startTimer = window.setTimeout(() => {
      void startListening();
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
      }
      if (autoAnswerTimerRef.current) {
        window.clearTimeout(autoAnswerTimerRef.current);
      }
    };
    // The session opens from a user action. Try audio once when this live
    // workspace mounts, then keep the same recognizer alive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function endSession() {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setListenStatus("Session ended");

    await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PATCH",
    });
    router.push("/dashboard");
    router.refresh();
  }

  async function copyReply() {
    await navigator.clipboard.writeText(visibleReply);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <section className="flex h-screen min-w-[960px] flex-col overflow-hidden">
        <SessionTopBar
          autoAnswer={autoAnswer}
          canAnswer={Boolean(transcript.trim())}
          durationLabel={durationLabel}
          isGenerating={isGenerating}
          isListening={isListening}
          listenStatus={listenStatus}
          onAnswer={() => void generateReply()}
          onAutoAnswerChange={setAutoAnswer}
          onEnd={() => void endSession()}
        />

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex min-h-full w-full flex-col gap-4">
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            {warning ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {warning}
              </div>
            ) : null}

            <LiveTranscriptStrip
              liveTranscript={liveTranscript}
              transcript={transcript}
            />

            <AnswerPanel
              activeMode={activeMode}
              answerIndex={answerIndex}
              answersLength={answers.length}
              copied={copied}
              isGenerating={isGenerating}
              model={model}
              visibleReply={visibleReply}
              onCopy={() => void copyReply()}
              onNext={() => showAnswerAt(answerIndex + 1)}
              onPrevious={() => showAnswerAt(answerIndex - 1)}
            />

            <ChatComposer
              disabled={isGenerating}
              value={chatInput}
              onChange={setChatInput}
              onSend={() => void sendChatMessage()}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
