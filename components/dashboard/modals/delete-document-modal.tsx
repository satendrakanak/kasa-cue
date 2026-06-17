"use client";

import { Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UserDocumentSummary } from "@/components/workspace/types";

type DeleteDocumentModalProps = {
  document: UserDocumentSummary | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteDocumentModal({
  document,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteDocumentModalProps) {
  if (!document) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-red-50 text-red-600">
              <Trash2 className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Delete document?</h2>
              <p className="text-sm text-slate-500">This action cannot be undone.</p>
            </div>
          </div>
          <button
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            disabled={isDeleting}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-slate-600">
            You are deleting{" "}
            <span className="font-semibold text-slate-950">
              {document.fileName}
            </span>
            . It will be removed from storage and your saved document list.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <Button disabled={isDeleting} variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="gap-2 bg-red-600 text-white hover:bg-red-700"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
