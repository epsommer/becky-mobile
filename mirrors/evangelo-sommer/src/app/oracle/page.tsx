import AppPageLayout from "@/components/AppPageLayout";

export default function OraclePage() {
  return (
    <AppPageLayout>
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full space-y-5 text-center neo-container p-10 rounded-2xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/15 text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
            >
              <path d="M12 3v5" />
              <path d="m16 9-4-4-4 4" />
              <path d="M12 21v-5" />
              <path d="m8 15 4 4 4-4" />
              <path d="M5 9h14" />
              <path d="M5 15h14" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">O.R.A.C.L.E.</h1>
          <p className="text-muted-foreground text-base">
            Observational Relationship Astrology &amp; Cosmology Lifecycle Engine. Drop in client and family birthdays to
            generate cosmology snapshots, life-stage cues, and timing prompts for outreach.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 text-left">
            <div className="neo-container p-4 rounded-xl">
              <div className="text-sm font-semibold text-foreground mb-2">What&apos;s next</div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Birthday + time + location intake</li>
                <li>Client + household member linking</li>
                <li>Cosmology overview and timing windows</li>
                <li>Suggested touchpoints pushed to CRM</li>
              </ul>
            </div>
            <div className="neo-container p-4 rounded-xl">
              <div className="text-sm font-semibold text-foreground mb-2">Ready for requirements?</div>
              <p className="text-sm text-muted-foreground">
                Provide the exact cosmology system (Western, Vedic, Human Design, etc.), data sources, and any guardrails
                for how insights should influence outreach. We will wire the ingestion, calculators, and routing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
