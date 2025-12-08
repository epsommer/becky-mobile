"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GalleryPage() {
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

  // Redirect legacy gallery route to Sammy
  useEffect(() => {
    router.replace("/sammy");
  }, [router]);

  return null;
}
