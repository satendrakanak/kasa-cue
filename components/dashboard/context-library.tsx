"use client";

import { BriefcaseBusiness, Mic, Upload } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ContextLibrary() {
  return (
    <Card className="rounded-md border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle>Context library</CardTitle>
        <CardDescription>
          Add details that help Kasa tailor answers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ContextRow
          icon={Upload}
          title="Resume or profile"
          body="Upload in workspace source material, then reuse it from setup."
        />
        <ContextRow
          icon={BriefcaseBusiness}
          title="Project summary"
          body="API migration, delivery updates, stack, risks."
        />
        <ContextRow
          icon={Mic}
          title="Speaking preference"
          body="Short answers, natural tone, no over-explaining."
        />
      </CardContent>
    </Card>
  );
}

function ContextRow({
  body,
  icon: Icon,
  title,
}: {
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-700">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </div>
  );
}
