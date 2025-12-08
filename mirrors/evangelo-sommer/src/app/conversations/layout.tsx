import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conversations | Evangelo Sommer CRM",
  description: "Manage client conversations",
};

export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
