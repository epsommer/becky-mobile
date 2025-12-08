import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Evangelo Sommer CRM",
  description: "Client relationship management dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
