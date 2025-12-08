import AppPageLayout from "@/components/AppPageLayout";
import {
  Shield,
  Banknote,
  ReceiptText,
  Download,
  PieChart,
  BarChart3,
  Building2,
  Landmark,
  Sparkles
} from "lucide-react";

export default function MrsFinsterPage() {
  return (
    <AppPageLayout>
      <div className="min-h-[calc(100vh-5rem)] px-4 py-10">
        {/* Hero */}
        <div className="max-w-none mx-auto space-y-6 xl:px-12">
          <div className="neo-container p-6 sm:p-8 rounded-2xl">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
                  <Sparkles className="w-4 h-4" />
                  Roll-up across every brand
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  M.R.S. Finster — Money Resilience Suite
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg">
                  Pulls B.E.C.K.Y. clients, invoices, and expenses into tax-ready books. Automates categorization,
                  cashflow, estimated taxes, and savings prompts for every entity.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button className="neo-submit px-4 py-2 rounded-lg text-sm font-semibold">
                    Connect B.E.C.K.Y. & banks
                  </button>
                  <button className="neo-button px-4 py-2 rounded-lg text-sm font-semibold">
                    View sample P&amp;L / Tax preview
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                {[
                  { label: "Cash on hand", value: "$—", icon: Banknote },
                  { label: "Unbilled / AR", value: "$—", icon: ReceiptText },
                  { label: "Est. QTD taxes", value: "$—", icon: Landmark },
                  { label: "Entities", value: "—", icon: Building2 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="neo-card p-3 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className="w-4 h-4" /> {item.label}
                      </div>
                      <div className="text-lg font-bold text-foreground">{item.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Data sources & sync */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "B.E.C.K.Y. data", desc: "Clients, invoices, receipts, service lines", status: "Connect" },
              { title: "Banks & cards", desc: "Read-only connections, nightly sync", status: "Connect" },
              { title: "Payroll / sales", desc: "Stripe/ACH, payroll, sales channels", status: "Connect" },
            ].map((card) => (
              <div key={card.title} className="neo-container rounded-xl p-4 space-y-2">
                <div className="text-sm font-semibold text-foreground">{card.title}</div>
                <div className="text-sm text-muted-foreground">{card.desc}</div>
                <button className="neo-button-sm px-3 py-1.5 text-xs font-semibold">{card.status}</button>
              </div>
            ))}
          </div>

          {/* Roll-up dashboard placeholder */}
          <div className="neo-container rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Roll-up dashboard</div>
                <div className="text-sm text-muted-foreground">All brands vs. per-entity toggle, cash + taxes</div>
              </div>
              <div className="flex gap-2">
                <button className="neo-button px-3 py-1.5 text-sm">All entities</button>
                <button className="neo-button px-3 py-1.5 text-sm">Entity A</button>
                <button className="neo-button px-3 py-1.5 text-sm">Entity B</button>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="neo-card rounded-xl p-4 h-56 flex items-center justify-center text-muted-foreground text-sm">
                Cashflow timeline placeholder (Actuals + Forecast)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="neo-card rounded-xl p-4 h-24 flex flex-col justify-between">
                  <div className="text-sm text-muted-foreground">Uncategorized to review</div>
                  <div className="text-2xl font-bold text-foreground">—</div>
                  <div className="text-xs text-muted-foreground">Auto-rules ready</div>
                </div>
                <div className="neo-card rounded-xl p-4 h-24 flex flex-col justify-between">
                  <div className="text-sm text-muted-foreground">Receipts missing</div>
                  <div className="text-2xl font-bold text-foreground">—</div>
                  <div className="text-xs text-muted-foreground">Attach to finalize</div>
                </div>
                <div className="neo-card rounded-xl p-4 h-24 flex flex-col justify-between">
                  <div className="text-sm text-muted-foreground">AP due soon</div>
                  <div className="text-2xl font-bold text-foreground">—</div>
                  <div className="text-xs text-muted-foreground">Schedule ACH</div>
                </div>
                <div className="neo-card rounded-xl p-4 h-24 flex flex-col justify-between">
                  <div className="text-sm text-muted-foreground">Est. quarterly taxes</div>
                  <div className="text-2xl font-bold text-foreground">—</div>
                  <div className="text-xs text-muted-foreground">Adjust assumptions</div>
                </div>
              </div>
            </div>
          </div>

          {/* AR / AP + Expenses */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="neo-container rounded-xl p-4 space-y-3 lg:col-span-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ReceiptText className="w-4 h-4" /> AR & aging (from B.E.C.K.Y.)
              </div>
              <div className="neo-card p-3 rounded-lg text-sm text-muted-foreground">
                Aging buckets, predicted DSO, collection nudges — placeholder
              </div>
              <button className="neo-button px-3 py-2 text-sm">View invoices</button>
            </div>
            <div className="neo-container rounded-xl p-4 space-y-3 lg:col-span-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Banknote className="w-4 h-4" /> Bills & payables
              </div>
              <div className="neo-card p-3 rounded-lg text-sm text-muted-foreground">
                Upcoming due dates, vendor checks, approvals — placeholder
              </div>
              <button className="neo-button px-3 py-2 text-sm">Review payables</button>
            </div>
            <div className="neo-container rounded-xl p-4 space-y-3 lg:col-span-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PieChart className="w-4 h-4" /> Expenses & receipts
              </div>
              <div className="neo-card p-3 rounded-lg text-sm text-muted-foreground">
                Business vs personal splits, rules, receipt attach — placeholder
              </div>
              <button className="neo-button px-3 py-2 text-sm">Open review queue</button>
            </div>
          </div>

          {/* Tax & savings */}
          <div className="neo-container rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Landmark className="w-4 h-4" /> Tax readiness & savings suggestions
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                "Quarterly estimate placeholder",
                "Home-office / vehicle % prompt",
                "R&D or credit prompts",
                "1099/W-9 packet prep",
                "Deductions suggestions",
                "Export tax packet CTA"
              ].map((item) => (
                <div key={item} className="neo-card p-3 rounded-lg text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
            <button className="neo-button px-3 py-2 text-sm">Export tax packet (P&L, ledger, receipts)</button>
          </div>

          {/* Reporting & exports */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="neo-container rounded-xl p-4 space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BarChart3 className="w-4 h-4" /> Reporting
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {["P&L by entity", "Cashflow forecast", "Custom date CSV"].map((item) => (
                  <div key={item} className="neo-card p-3 rounded-lg text-sm text-muted-foreground">
                    {item} — placeholder
                  </div>
                ))}
              </div>
            </div>
            <div className="neo-container rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Download className="w-4 h-4" /> Exports
              </div>
              <div className="neo-card p-3 rounded-lg text-sm text-muted-foreground">
                Trial balance, GL, audit log — placeholder
              </div>
              <button className="neo-button px-3 py-2 text-sm">Download sample</button>
            </div>
          </div>

          {/* Security & compliance */}
          <div className="neo-container rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield className="w-4 h-4" /> Security & compliance
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="neo-card p-3 rounded-lg">Bank-grade encryption, least-privilege access — placeholder</div>
              <div className="neo-card p-3 rounded-lg">SSO/MFA, role-based approvals, audit logs — placeholder</div>
              <div className="neo-card p-3 rounded-lg">Data residency note, backups, retention — placeholder</div>
              <div className="neo-card p-3 rounded-lg">Status/uptime link, incident history — placeholder</div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="neo-container rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-foreground">Ready to go live with M.R.S. Finster?</div>
              <div className="text-sm text-muted-foreground">Connect B.E.C.K.Y., banks, and exports for your CPA.</div>
            </div>
            <div className="flex gap-3">
              <button className="neo-submit px-4 py-2 rounded-lg text-sm font-semibold">Connect now</button>
              <button className="neo-button px-4 py-2 rounded-lg text-sm font-semibold">Book onboarding</button>
            </div>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
