import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Evangelo Sommer",
  description: "Sign in to access the admin dashboard",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
