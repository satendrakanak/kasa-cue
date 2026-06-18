"use client";

import { Check, FileText, Loader2, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { modelOptions } from "@/components/workspace/options";
import type { UserDocumentSummary } from "@/components/workspace/types";

import { sessionModes, type SessionModeId } from "../session-config";

type StartSessionModalProps = {
  documents: UserDocumentSummary[];
  open: boolean;
  onClose: () => void;
};

export function StartSessionModal({
  documents,
  open,
  onClose,
}: StartSessionModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<SessionModeId>("interview");
  const [title, setTitle] = useState("Interview session");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [language, setLanguage] = useState("auto");
  const [model, setModel] = useState("gpt-4o-mini");
  const [resumeDocumentId, setResumeDocumentId] = useState("");
  const [referenceDocumentIds, setReferenceDocumentIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const resumeDocuments = useMemo(
    () => documents.filter((document) => document.documentType === "resume"),
    [documents]
  );
  const referenceDocuments = useMemo(
    () => documents.filter((document) => document.documentType === "reference"),
    [documents]
  );

  useEffect(() => {
    if (mode === "interview" && !resumeDocumentId && resumeDocuments[0]) {
      const timerId = window.setTimeout(() => {
        setResumeDocumentId(resumeDocuments[0].id);
      }, 0);

      return () => window.clearTimeout(timerId);
    }
  }, [mode, resumeDocumentId, resumeDocuments]);

  if (!open) {
    return null;
  }

  const selectedResume = resumeDocuments.find(
    (document) => document.id === resumeDocumentId
  );
  const selectedReferences = referenceDocuments.filter((document) =>
    referenceDocumentIds.includes(document.id)
  );
  const shouldShowResume = mode === "interview";
  const shouldShowReferences = true;

  async function startSession() {
    setError("");
    setIsStarting(true);

    try {
      const context = [
        `Session purpose: ${getPurposeDescription(mode)}`,
        company && mode !== "normal-talk" ? `Company: ${company}` : "",
        position ? `${getTopicLabel(mode)}: ${position}` : "",
        shouldShowResume && selectedResume
          ? `Selected resume for candidate background: ${selectedResume.fileName}`
          : "",
        shouldShowReferences && selectedReferences.length
          ? `Selected reference documents: ${selectedReferences
              .map((document) => document.fileName)
              .join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context,
          instructions: getDefaultInstructions(mode),
          language,
          mode,
          model,
          referenceDocumentIds: shouldShowReferences ? referenceDocumentIds : [],
          referenceFiles: shouldShowReferences
            ? selectedReferences.map((document) => document.fileName)
            : [],
          resumeDocumentId: shouldShowResume ? resumeDocumentId : "",
          resumeFileName: shouldShowResume ? selectedResume?.fileName ?? "" : "",
          title,
          tone: "adaptive-genuine",
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        session?: { id: string };
      };

      if (!response.ok || !data.session?.id) {
        throw new Error(data.error ?? "Could not start session.");
      }

      router.push(`/workspace?sessionId=${data.session.id}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not start session."
      );
    } finally {
      setIsStarting(false);
    }
  }

  function toggleReference(documentId: string) {
    setReferenceDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">Start session</h2>
            <p className="text-sm text-slate-500">
              Set everything first, then open the live workspace.
            </p>
          </div>
          <button
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
              <div className="grid gap-1 sm:grid-cols-3">
              {sessionModes.map((item) => {
                const Icon = item.icon;
                const active = item.id === mode;

                return (
                  <button
                    className={`flex min-h-14 items-center gap-3 rounded-md border px-3 py-2 text-left transition ${
                      active
                        ? "border-slate-950 bg-white text-slate-950 shadow-sm"
                        : "border-transparent text-slate-500 hover:bg-white hover:text-slate-950"
                    }`}
                    key={item.id}
                    onClick={() => {
                      setMode(item.id);
                      setTitle(`${item.title} session`);
                      if (item.id !== "interview") {
                        setResumeDocumentId("");
                      }
                      if (item.id === "normal-talk") {
                        setCompany("");
                        if (model === "gpt-4o-mini") {
                          setModel("gpt-4.1-mini");
                        }
                      }
                    }}
                    type="button"
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs opacity-75">
                        {getModeShortDescription(item.id)}
                      </span>
                    </span>
                  </button>
                );
              })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Session title">
                <Input
                  className="h-10"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <Field label="Language">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto detect</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="hinglish">Hinglish</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {mode !== "normal-talk" ? (
                <Field label="Company">
                  <Input
                    className="h-10"
                    placeholder="Example: Digi Verifier"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </Field>
              ) : null}
              <Field label={getTopicLabel(mode)}>
                <Input
                  className="h-10"
                  placeholder={getTopicPlaceholder(mode)}
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                />
              </Field>
              <Field label="AI model">
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-10 w-full">
                    <span className="min-w-0 flex-1 truncate text-left">
                      {modelOptions.find((item) => item.value === model)?.label}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="w-[320px]" position="popper">
                    {modelOptions.map((item) => (
                      <SelectItem
                        className="px-3 py-2.5 pr-9"
                        key={item.value}
                        textValue={item.label}
                        value={item.value}
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Files for this session</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {getFileHelpText(mode)}
                </p>
              </div>
              <div className="space-y-3">
                {shouldShowResume ? (
                  <DocumentPicker
                    documents={resumeDocuments}
                    emptyText="No saved resume yet."
                    label="Resume"
                    selectedIds={resumeDocumentId ? [resumeDocumentId] : []}
                    onSelect={(documentId) => setResumeDocumentId(documentId)}
                  />
                ) : null}
                {shouldShowReferences ? (
                  <DocumentPicker
                    documents={referenceDocuments}
                    emptyText="No saved meeting briefs or reference documents yet."
                    label={
                      mode === "normal-talk"
                        ? "Meeting briefs / reference notes"
                        : "Reference documents"
                    }
                    multiple
                    selectedIds={referenceDocumentIds}
                    onSelect={toggleReference}
                  />
                ) : null}
              </div>
            </section>
          </div>

        </div>

        {error ? (
          <p className="mx-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="min-w-36 gap-2 bg-slate-950 text-white hover:bg-slate-800"
            disabled={isStarting}
            onClick={() => void startSession()}
          >
            {isStarting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Start session
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function DocumentPicker({
  documents,
  emptyText,
  label,
  multiple,
  selectedIds,
  onSelect,
}: {
  documents: UserDocumentSummary[];
  emptyText: string;
  label: string;
  multiple?: boolean;
  selectedIds: string[];
  onSelect: (documentId: string) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {multiple && selectedIds.length ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {selectedIds.length} selected
          </span>
        ) : null}
      </div>
      {documents.length ? (
        <div className="grid max-h-44 gap-2 overflow-y-auto pr-1">
          {documents.map((document) => {
            const selected = selectedIds.includes(document.id);

            return (
              <button
                className={
                  selected
                    ? "flex items-center gap-3 rounded-md border border-slate-950 bg-white px-3 py-2 text-left shadow-sm"
                    : "flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300"
                }
                key={document.id}
                onClick={() => onSelect(document.id)}
                type="button"
              >
                <span
                  className={
                    selected
                      ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white"
                      : "flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white"
                  }
                >
                  {selected ? <Check className="size-3.5" /> : null}
                </span>
                <FileText className="size-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {document.fileName}
                  </span>
                  <span className="block text-xs text-slate-500">
                    Uploaded {formatDate(document.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function getModeShortDescription(mode: SessionModeId) {
  if (mode === "interview") {
    return "Questions and answers";
  }

  if (mode === "normal-talk") {
    return "Natural work calls";
  }

  return "Updates and planning";
}

function getTopicLabel(mode: SessionModeId) {
  if (mode === "interview") {
    return "Position";
  }

  if (mode === "client-call") {
    return "Call topic";
  }

  return "Conversation topic";
}

function getTopicPlaceholder(mode: SessionModeId) {
  if (mode === "interview") {
    return "Example: HR Negotiable Call";
  }

  if (mode === "client-call") {
    return "Example: Sprint status update";
  }

  return "Example: Daily English practice";
}

function getFileHelpText(mode: SessionModeId) {
  if (mode === "interview") {
    return "Pick one resume and optional reference documents.";
  }

  if (mode === "client-call") {
    return "Attach project notes, PRDs, agendas, or call references.";
  }

  return "Optional: select meeting notes, agenda, company context, vocabulary, or talking points so replies match today's call.";
}

function getDefaultInstructions(mode: SessionModeId) {
  if (mode === "interview") {
    return [
      "Interview mode: answer as the candidate.",
      "Use the selected resume as the source of the user's background, experience, projects, and strengths.",
      "For questions like 'tell me about yourself' or 'introduce yourself', create a complete natural introduction using the resume, target role, company, and saved user instructions.",
      "Keep the answer spoken, confident, genuine, and complete enough for the interviewer.",
    ].join(" ");
  }

  if (mode === "client-call") {
    return "Client call mode: answer as the professional on the call. Use the company, call topic, reference documents, and saved instructions to give clear status, risks, decisions, and next steps.";
  }

  return "Normal talk mode: answer naturally for the live conversation. Keep it friendly, clear, and useful without pretending it is an interview.";
}

function getPurposeDescription(mode: SessionModeId) {
  if (mode === "interview") {
    return "Prepare live interview answers tailored to the candidate profile and selected resume.";
  }

  if (mode === "client-call") {
    return "Prepare live client-call replies using the call topic and attached reference material.";
  }

  return "Prepare natural conversation replies.";
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
