import CapabilitiesShowcase from "@/components/CapabilitiesShowcase";

export const metadata = {
  title: "Portfolio - Evangelo Sommer",
  description: "AI-powered CRM solutions and creative prompt engineering capabilities",
};

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-tactical-grey-50 to-white">
      <CapabilitiesShowcase />
    </main>
  );
}
