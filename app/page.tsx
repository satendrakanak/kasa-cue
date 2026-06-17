import {
  ArrowRight,
  AudioLines,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Headphones,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default async function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <PublicNav />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,197,94,0.32),transparent_32rem),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.28),transparent_28rem)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-18">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-100">
              <Sparkles className="size-4" />
              Realtime replies for English calls
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Kasa Cue
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              A private live communication assistant for interviews, client
              calls, and manager conversations. Upload context, listen quietly,
              and get a clear answer you can speak naturally.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-100"
                href="/signup"
              >
                Start free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/how-it-works"
              >
                See how it works
              </Link>
            </div>
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="rounded-lg bg-slate-100 p-4 text-slate-950">
                <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      alt="Kasa Cue"
                      className="size-10 rounded-lg"
                      src="/kasa-icon.png"
                    />
                    <div>
                      <p className="font-semibold">Live answer window</p>
                      <p className="text-xs text-slate-500">
                        Normal talk mode
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Listening
                  </span>
                </div>
                <div className="space-y-3">
                  <p className="rounded-lg bg-white p-3 text-sm text-slate-600">
                    Manager: Can you walk me through what you handled this week?
                  </p>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-emerald-700">
                      Suggested reply
                    </p>
                    <p className="text-sm leading-6 text-slate-800">
                      This week I focused on stabilizing the core workflow,
                      testing edge cases, and documenting the rollout plan. The
                      next priority is to reduce manual checks and keep updates
                      predictable for the team.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Context", "Reference docs"],
                      ["Tone", "Professional"],
                      ["Mode", "Call ready"],
                    ].map(([label, value]) => (
                      <div
                        className="rounded-lg border border-slate-200 bg-white p-3"
                        key={label}
                      >
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="mt-1 text-sm font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            {
              icon: Headphones,
              title: "Normal calls",
              text: "Hear the question, read a natural reply, and keep the conversation moving.",
            },
            {
              icon: BriefcaseBusiness,
              title: "Mock interviews",
              text: "Use your resume and reference docs so replies match your real work.",
            },
            {
              icon: ShieldCheck,
              title: "Private workspace",
              text: "Users get protected dashboards, saved sessions, and role-based access.",
            },
          ].map((item) => (
            <div className="rounded-lg border border-slate-200 p-5" key={item.title}>
              <item.icon className="mb-4 size-6 text-emerald-600" />
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <img alt="Kasa Cue" className="size-10 rounded-lg" src="/kasa-icon.png" />
          <span className="text-lg font-semibold">Kasa Cue</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
          <Link href="/how-it-works">How it works</Link>
          <Link href="/compare-plans">Compare</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            className="hidden h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white hover:bg-white/10 sm:inline-flex"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            aria-label="Open login"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 text-white hover:bg-white/10 sm:hidden"
            href="/login"
          >
            <AudioLines className="size-4" />
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-slate-950 hover:bg-emerald-100"
            href="/signup"
          >
            Start
          </Link>
        </div>
      </div>
    </header>
  );
}
