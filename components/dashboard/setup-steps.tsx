"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { setupSteps } from "./session-config";

type SetupStepsProps = {
  onStart: () => void;
};

export function SetupSteps({ onStart }: SetupStepsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {setupSteps.map((step, index) => {
        const Icon = step.icon;
        const featured = index === 3;

        return (
          <Card
            className={`rounded-md bg-white shadow-sm ${
              featured ? "border-emerald-300" : "border-slate-200"
            }`}
            key={step.title}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {step.label}
                </span>
                <Icon className="size-4 text-slate-500" />
              </div>
              <div>
                <CardTitle className="text-base">{step.title}</CardTitle>
                <CardDescription className="mt-2 leading-6">
                  {step.body}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className={
                  featured
                    ? "w-full bg-emerald-700 text-white hover:bg-emerald-800"
                    : "w-full"
                }
                onClick={onStart}
                variant={featured ? "default" : "outline"}
              >
                {step.action}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
