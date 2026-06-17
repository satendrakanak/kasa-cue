"use client";

import {
  AudioLines,
  Check,
  FileText,
  Languages,
  Loader2,
  LogOut,
  Paperclip,
  Settings2,
  Target,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { modeDescriptions, modeOptions, modelOptions } from "./options";
import type { UserDocumentSummary, WorkspaceUser } from "./types";

type SettingsSidebarProps = {
  contextPriority: string;
  documents: UserDocumentSummary[];
  instructions: string;
  isUploadingDocument: boolean;
  language: string;
  mode: string;
  openAiModel: string;
  referenceFileNames: string[];
  resumeFileName: string;
  selectedReferenceDocumentIds: string[];
  selectedResumeDocumentId: string;
  sessionContext: string;
  user: WorkspaceUser;
  onContextPriorityChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onModeChange: (value: "interview" | "normal-talk" | "client-call") => void;
  onOpenAiModelChange: (value: string) => void;
  onReferenceDocumentToggle: (document: UserDocumentSummary) => void;
  onReferenceUpload: (files: FileList | null) => void;
  onResumeDocumentSelect: (document: UserDocumentSummary) => void;
  onResumeUpload: (file: File | undefined) => void;
  onSessionContextChange: (value: string) => void;
};

export function SettingsSidebar({
  contextPriority,
  documents,
  instructions,
  isUploadingDocument,
  language,
  mode,
  openAiModel,
  referenceFileNames,
  resumeFileName,
  selectedReferenceDocumentIds,
  selectedResumeDocumentId,
  sessionContext,
  user,
  onContextPriorityChange,
  onInstructionsChange,
  onLanguageChange,
  onModeChange,
  onOpenAiModelChange,
  onReferenceDocumentToggle,
  onReferenceUpload,
  onResumeDocumentSelect,
  onResumeUpload,
  onSessionContextChange,
}: SettingsSidebarProps) {
  const selectedModel = modelOptions.find((item) => item.value === openAiModel);
  const resumeDocuments = documents.filter(
    (document) => document.documentType === "resume"
  );
  const referenceDocuments = documents.filter(
    (document) => document.documentType === "reference"
  );

  return (
    <aside className="sticky left-0 top-0 flex h-screen w-[380px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-slate-950 text-white">
            <AudioLines className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Kasa Cue</h1>
            <p className="text-xs text-slate-500">Live reply assistant</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4" />
            Session settings
          </div>
          <Badge variant="outline" className="text-[11px]">
            Live
          </Badge>
        </div>

        <div className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Target className="size-3.5" />
              Session Type
            </div>
            <div className="grid gap-2">
              {modeOptions.map((item) => {
                const Icon = item.icon;
                const isActive = mode === item.value;

                return (
                  <button
                    className={
                      isActive
                        ? "rounded-md border border-slate-950 bg-white p-3 text-left shadow-sm"
                        : "rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300"
                    }
                    key={item.value}
                    onClick={() => onModeChange(item.value)}
                    type="button"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="size-4" />
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {modeDescriptions[item.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-3">
            <SectionTitle icon={Settings2} label="Model" />
            <div className="space-y-2">
              <Label>OpenAI model</Label>
              <Select value={openAiModel} onValueChange={onOpenAiModelChange}>
                <SelectTrigger className="h-12 w-full rounded-md px-3">
                  <span className="min-w-0 flex-1 truncate text-left font-medium">
                    {selectedModel?.label ?? "Choose model"}
                  </span>
                </SelectTrigger>
                <SelectContent className="w-[330px] p-1" position="popper">
                  {modelOptions.map((item) => (
                    <SelectItem
                      className="px-3 py-2.5 pr-9 text-[15px] focus:bg-orange-50 focus:text-orange-700"
                      key={item.value}
                      textValue={item.label}
                      value={item.value}
                    >
                      <span className="block min-w-0 truncate font-medium">
                        {item.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-slate-500">
                {modelOptions.find((item) => item.value === openAiModel)
                  ?.description ?? "Choose the model used for generated replies."}
              </p>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-3">
            <SectionTitle icon={Languages} label="Language & Context" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Output language"
                value={language}
                onChange={onLanguageChange}
              >
                <SelectItem value="auto">Auto detect</SelectItem>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="hinglish">Hinglish</SelectItem>
              </SelectField>
              <SelectField
                label="Context use"
                value={contextPriority}
                onChange={onContextPriorityChange}
              >
                <SelectItem value="strict">Strict</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectField>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2">
              <Label htmlFor="instructions">Speaking instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(event) => onInstructionsChange(event.target.value)}
                className="min-h-24 resize-none bg-white text-sm leading-6"
                placeholder="Example: Keep replies concise, natural, and easy to speak."
              />
            </div>

            <div className="mt-3 space-y-2">
              <Label htmlFor="session-context">
                {mode === "interview"
                  ? "Interview context"
                  : "Meeting or call context"}
              </Label>
              <Textarea
                id="session-context"
                value={sessionContext}
                onChange={(event) => onSessionContextChange(event.target.value)}
                className="min-h-24 resize-none bg-white text-sm leading-6"
                placeholder={
                  mode === "interview"
                    ? "Example: Senior Next.js interview focused on API migration, ownership, debugging, and communication."
                    : "Example: Today’s call is about API migration status, blockers, risks, and next steps."
                }
              />
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-3">
            <SectionTitle icon={Paperclip} label="Source Material" />
            {mode === "interview" ? (
              <div className="space-y-3">
                <UploadField
                  accept=".pdf,.doc,.docx,.txt,.md"
                  description="Upload a resume, or choose one already saved in your account."
                  id="resume-upload"
                  isUploading={isUploadingDocument}
                  label="Resume"
                  name={resumeFileName || "Upload resume or profile"}
                  onChange={(files) => onResumeUpload(files?.[0])}
                />
                <SavedDocumentList
                  documents={resumeDocuments}
                  emptyText="No saved resume yet."
                  selectedIds={
                    selectedResumeDocumentId ? [selectedResumeDocumentId] : []
                  }
                  type="single"
                  onSelect={onResumeDocumentSelect}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <UploadField
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.json"
                  description="Upload notes, or reuse saved files for this session."
                  id="reference-upload"
                  isUploading={isUploadingDocument}
                  label="Reference documents"
                  multiple
                  name={
                    referenceFileNames.length
                      ? `${referenceFileNames.length} file selected`
                      : "Upload notes or reference docs"
                  }
                  onChange={onReferenceUpload}
                />
                <SavedDocumentList
                  documents={referenceDocuments}
                  emptyText="No saved reference files yet."
                  selectedIds={selectedReferenceDocumentIds}
                  type="multiple"
                  onSelect={onReferenceDocumentToggle}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="border-t border-slate-200 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name ?? "Kasa User"}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <Badge variant="outline">{user.role}</Badge>
        </div>
        <Button
          className="w-full gap-2"
          variant="outline"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      <Icon className="size-3.5" />
      {label}
    </div>
  );
}

function SelectField({
  children,
  label,
  value,
  onChange,
}: {
  children: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function UploadField({
  accept,
  description,
  id,
  isUploading,
  label,
  multiple,
  name,
  onChange,
}: {
  accept: string;
  description: string;
  id: string;
  isUploading: boolean;
  label: string;
  multiple?: boolean;
  name: string;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <label
        className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm transition hover:bg-white"
        htmlFor={id}
      >
        <span className="flex min-w-0 items-center gap-2">
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-slate-500" />
          ) : (
            <Upload className="size-4 text-slate-500" />
          )}
          <span className="truncate">{name}</span>
        </span>
        <FileText className="size-4 text-slate-400" />
      </label>
      <input
        accept={accept}
        className="hidden"
        id={id}
        multiple={multiple}
        onChange={(event) => onChange(event.target.files)}
        type="file"
      />
      <p className="text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function SavedDocumentList({
  documents,
  emptyText,
  selectedIds,
  type,
  onSelect,
}: {
  documents: UserDocumentSummary[];
  emptyText: string;
  selectedIds: string[];
  type: "single" | "multiple";
  onSelect: (document: UserDocumentSummary) => void;
}) {
  if (!documents.length) {
    return (
      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Saved files
      </p>
      <div className="grid gap-2">
        {documents.map((document) => {
          const isSelected = selectedIds.includes(document.id);

          return (
            <button
              className={
                isSelected
                  ? "flex w-full items-center gap-3 rounded-md border border-slate-950 bg-slate-50 px-3 py-2 text-left shadow-sm"
                  : "flex w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300"
              }
              key={document.id}
              onClick={() => onSelect(document)}
              type="button"
            >
              <span
                className={
                  type === "single"
                    ? "flex size-4 shrink-0 items-center justify-center rounded-full border border-slate-400"
                    : "flex size-4 shrink-0 items-center justify-center rounded border border-slate-400"
                }
              >
                {isSelected ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {document.fileName}
                </span>
                <span className="block text-xs text-slate-500">
                  {formatFileSize(document.sizeBytes)} ·{" "}
                  {formatUploadDate(document.createdAt)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
