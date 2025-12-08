import AppPageLayout from "@/components/AppPageLayout";
import { Target, Briefcase, LineChart, Gauge } from "lucide-react";

export default function BuckPage() {
  return (
    <AppPageLayout>
      <div className="min-h-[calc(100vh-5rem)] px-4 py-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="neo-container p-6 sm:p-8 rounded-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 text-xs font-semibold">
              <Target className="w-4 h-4" />
              Strategy command
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">B.U.C.K.</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Business Upside &amp; Capital Knowledge — your strategist for portfolio-level decisions, pricing moves,
              and capital planning fed by B.E.C.K.Y. performance data.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Growth thesis drafts", desc: "Market, pricing, expansion" },
                { label: "Capital runway", desc: "Scenario modeling placeholders" },
                { label: "Service-line bets", desc: "Ranked by margin/sentiment" },
              ].map((item) => (
                <div key={item.label} className="neo-card p-4 rounded-xl space-y-1">
                  <div className="text-sm font-semibold text-foreground">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="neo-submit px-4 py-2 rounded-lg text-sm font-semibold">Build strategy brief</button>
              <button className="neo-button px-4 py-2 rounded-lg text-sm font-semibold">Upload financials</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="neo-container p-4 rounded-xl space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <LineChart className="w-4 h-4" /> Scenario planning
              </div>
              <div className="neo-card p-4 rounded-lg text-sm text-muted-foreground">
                Placeholder: run sensitivity on pricing, staffing, CAC/LTV. Pulls revenue/expenses from M.R.S. Finster.
              </div>
            </div>
            <div className="neo-container p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Gauge className="w-4 h-4" /> Risk & alerts
              </div>
              <div className="neo-card p-4 rounded-lg text-sm text-muted-foreground">
                Placeholder: concentration risk, margin decay, burn alerts.
              </div>
            </div>
          </div>

          <div className="neo-container p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Briefcase className="w-4 h-4" /> Action queue
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
              <div className="neo-card p-3 rounded-lg">Placeholder: price increase plan</div>
              <div className="neo-card p-3 rounded-lg">Placeholder: staffing/headcount plan</div>
              <div className="neo-card p-3 rounded-lg">Placeholder: expansion/market test</div>
            </div>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
