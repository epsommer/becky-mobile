import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clients | Evangelo Sommer CRM",
  description: "Manage clients and services",
};

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
