import { CheckCircle2, MinusCircle } from "lucide-react";
import Link from "next/link";

const rows = [
  ["Live reply workspace", true, true, true],
  ["Reference document context", true, true, true],
  ["Desktop floating overlay", true, true, true],
  ["Extended history", false, true, true],
  ["Team administration", false, false, true],
];

export default function ComparePlansPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3 font-semibold" href="/">
            <img alt="Kasa Cue" className="size-9 rounded-lg" src="/kasa-icon.png" />
            Kasa Cue
          </Link>
          <Link className="text-sm font-semibold" href="/signup">
            Start free
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight">Compare plans</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Keep the first version simple: one strong user workspace now, with Pro
          and Team controls ready as usage grows.
        </p>

        <div className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-100 text-sm font-semibold">
            <div className="p-4">Feature</div>
            <div className="p-4">Starter</div>
            <div className="p-4">Pro</div>
            <div className="p-4">Team</div>
          </div>
          {rows.map(([feature, starter, pro, team]) => (
            <div className="grid grid-cols-4 border-b border-slate-100 text-sm" key={String(feature)}>
              <div className="p-4 font-medium">{feature}</div>
              {[starter, pro, team].map((enabled, index) => (
                <div className="p-4" key={index}>
                  {enabled ? (
                    <CheckCircle2 className="size-5 text-emerald-600" />
                  ) : (
                    <MinusCircle className="size-5 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
