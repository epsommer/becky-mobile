"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import AppPageLayout from "@/components/AppPageLayout";

// Dynamically import Gallery3D with SSR disabled
const Gallery3D = dynamic(() => import("@/components/gallery/Gallery3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Loading Sammy workspace...</div>
    </div>
  ),
});

export default function SammyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Protect route - redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Authenticating...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppPageLayout>
      <Gallery3D />
    </AppPageLayout>
  );
}
