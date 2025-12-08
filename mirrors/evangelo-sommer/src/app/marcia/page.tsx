import AppPageLayout from "@/components/AppPageLayout";
import { Megaphone, Sparkles, Users2, Target } from "lucide-react";

export default function MarciaPage() {
  return (
    <AppPageLayout>
      <div className="min-h-[calc(100vh-5rem)] px-4 py-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="neo-container p-6 sm:p-8 rounded-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-700 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              Campaign intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">M.A.R.C.I.A.</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Marketing, Advertising, Reach, Campaigns, Insights &amp; Avatars — brand and demand partner that uses
              B.E.C.K.Y. + M.R.S. Finster insights to shape campaigns, personas, and sentiment predictions.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Personas & avatars", desc: "Segmented by service line" },
                { label: "Campaign drafts", desc: "Email/ads/social placeholders" },
                { label: "Sentiment signals", desc: "Predictive nudges from CRM" },
              ].map((item) => (
                <div key={item.label} className="neo-card p-4 rounded-xl space-y-1">
                  <div className="text-sm font-semibold text-foreground">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="neo-submit px-4 py-2 rounded-lg text-sm font-semibold">Generate playbook</button>
              <button className="neo-button px-4 py-2 rounded-lg text-sm font-semibold">Upload creatives</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="neo-container p-4 rounded-xl space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Megaphone className="w-4 h-4" /> Campaign wall
              </div>
              <div className="neo-card p-4 rounded-lg text-sm text-muted-foreground">
                Placeholder: multi-channel campaigns with spend caps and target personas.
              </div>
            </div>
            <div className="neo-container p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users2 className="w-4 h-4" /> Audience & lookalikes
              </div>
              <div className="neo-card p-4 rounded-lg text-sm text-muted-foreground">
                Placeholder: build/lookalike audiences from CRM + spend signals.
              </div>
            </div>
          </div>

          <div className="neo-container p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="w-4 h-4" /> Action queue
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
              <div className="neo-card p-3 rounded-lg">Placeholder: persona pack per service line</div>
              <div className="neo-card p-3 rounded-lg">Placeholder: ad + email draft sets</div>
              <div className="neo-card p-3 rounded-lg">Placeholder: sentiment report from recent conversations</div>
            </div>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
