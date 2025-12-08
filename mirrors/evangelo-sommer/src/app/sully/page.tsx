import AppPageLayout from "@/components/AppPageLayout";
import { GitBranch, TrendingUp, Users, Mail, Phone, Calendar, Sparkles, Activity, BarChart3 } from "lucide-react";

export default function SullyPage() {
  return (
    <AppPageLayout>
      <div className="min-h-[calc(100vh-5rem)] px-4 py-10">
        <div className="max-w-none mx-auto space-y-6 xl:px-12">
          {/* Hero / headline */}
          <div className="neo-container p-6 sm:p-8 rounded-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              Sales utility for leads, loyalty, and yield
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">S.U.L.L.Y.</h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-3xl">
                Pipeline intelligence that uses B.E.C.K.Y. signals to score leads, sequence outreach, and keep AR clean.
                Built for multi-brand sales and hand-offs to billing.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Open pipeline", value: "$—", icon: TrendingUp },
                { label: "Leads to work", value: "—", icon: Users },
                { label: "Risks flagged", value: "—", icon: Activity },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="neo-card p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="w-4 h-4" /> {item.label}
                    </div>
                    <div className="text-xl font-bold text-foreground">{item.value}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="neo-submit px-4 py-2 rounded-lg text-sm font-semibold">Create outreach plan</button>
              <button className="neo-button px-4 py-2 rounded-lg text-sm font-semibold">Import leads</button>
            </div>
          </div>

          {/* Sources / imports */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="neo-container p-4 rounded-xl space-y-2 sm:col-span-2">
              <div className="text-sm font-semibold text-foreground">Data sources</div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                {[
                  { title: "B.E.C.K.Y. leads & clients", desc: "Sync people, companies, service lines", cta: "Sync from B.E.C.K.Y." },
                  { title: "CRM conversations", desc: "Pull sentiment + intent signals", cta: "Connect now" },
                  { title: "Billing & invoices", desc: "Eligibility and AR status", cta: "Connect billing" },
                ].map((item) => (
                  <div key={item.title} className="neo-card p-3 rounded-lg space-y-2">
                    <div className="text-foreground font-semibold text-sm">{item.title}</div>
                    <div className="text-muted-foreground text-xs">{item.desc}</div>
                    <button className="neo-button px-3 py-1.5 text-xs font-semibold">{item.cta}</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline overview / Revio-like cards */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="neo-container p-4 rounded-xl space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <GitBranch className="w-4 h-4" /> Pipeline board
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
                <div className="neo-card p-3 rounded-lg">Placeholder: New → Qualified</div>
                <div className="neo-card p-3 rounded-lg">Placeholder: Proposal → Negotiation</div>
                <div className="neo-card p-3 rounded-lg">Placeholder: Won / Lost with reasons</div>
              </div>
            </div>
            <div className="neo-container p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BarChart3 className="w-4 h-4" /> Revenue outlook
              </div>
              <div className="neo-card p-4 rounded-lg text-sm text-muted-foreground">
                Placeholder: forecast by service line and close probability.
              </div>
            </div>
          </div>

          {/* Sequences and touchpoints */}
          <div className="neo-container p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="w-4 h-4" /> Sequences
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
              <div className="neo-card p-3 rounded-lg">Outbound intro — email/SMS placeholders</div>
              <div className="neo-card p-3 rounded-lg">Warm follow-up — call + calendar CTA</div>
              <div className="neo-card p-3 rounded-lg">Reactivation — dormant clients from CRM</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="neo-button px-3 py-2 text-sm">Build sequence</button>
              <button className="neo-button px-3 py-2 text-sm">Import template</button>
            </div>
          </div>

          {/* Signals and hand-offs */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="neo-container p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Calendar className="w-4 h-4" /> Tasks & hand-offs
              </div>
              <div className="neo-card p-4 rounded-lg text-sm text-muted-foreground">
                Placeholder: assign to rep, sync to calendar, push to B.E.C.K.Y. for delivery.
              </div>
            </div>
            <div className="neo-container p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Phone className="w-4 h-4" /> Signals & sentiment
              </div>
              <div className="neo-card p-4 rounded-lg text-sm text-muted-foreground">
                Placeholder: conversation sentiment, intent score, risk flags from CRM threads.
              </div>
            </div>
            <div className="neo-container p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="w-4 h-4" /> ICP & personas
              </div>
              <div className="neo-card p-4 rounded-lg text-sm text-muted-foreground">
                Placeholder: ideal customer profiles per service line; route to M.A.R.C.I.A. for creative.
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="neo-container rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-foreground">Ready to activate S.U.L.L.Y.?</div>
              <div className="text-sm text-muted-foreground">Plug in leads, sequences, and billing hand-offs.</div>
            </div>
            <div className="flex gap-3">
              <button className="neo-submit px-4 py-2 rounded-lg text-sm font-semibold">Start a sequence</button>
              <button className="neo-button px-4 py-2 rounded-lg text-sm font-semibold">Book a walkthrough</button>
            </div>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
