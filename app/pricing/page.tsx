import { Check, Crown, Headphones, ShieldCheck } from "lucide-react";

import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Start with the workspace, upgrade when call volume grows.
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Kasa Cue is built for daily conversations: normal calls, interviews,
            and meetings where you need clear English replies quickly.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Headphones,
              name: "Starter",
              price: "Free",
              items: ["User workspace", "Reference documents", "Live answer flow"],
            },
            {
              icon: ShieldCheck,
              name: "Pro",
              price: "Coming soon",
              items: ["More session history", "Priority models", "Desktop updates"],
            },
            {
              icon: Crown,
              name: "Team",
              price: "Custom",
              items: ["Admin controls", "Team onboarding", "Shared policies"],
            },
          ].map((plan) => (
            <div className="rounded-lg border border-slate-200 p-5" key={plan.name}>
              <plan.icon className="size-6 text-emerald-600" />
              <h2 className="mt-4 text-xl font-semibold">{plan.name}</h2>
              <p className="mt-2 text-2xl font-semibold">{plan.price}</p>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                {plan.items.map((item) => (
                  <li className="flex gap-2" key={item}>
                    <Check className="mt-0.5 size-4 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
