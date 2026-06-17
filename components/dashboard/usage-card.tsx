"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type UsageCardProps = {
  sessionsCount: number;
};

export function UsageCard({ sessionsCount }: UsageCardProps) {
  return (
    <Card className="rounded-md border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle>Usage</CardTitle>
        <CardDescription>
          Your current communication practice plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Monthly minutes</span>
          <span className="font-semibold">Unlimited</span>
        </div>
        <Progress value={38} className="h-2" />
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Sessions" value={String(sessionsCount)} />
          <Metric label="Modes" value="3" />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
