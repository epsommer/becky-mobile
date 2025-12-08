"use client";
import { useState, useEffect } from "react";
import ThreeScene from "./ThreeScene";

export default function Gallery3D() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    console.log("🏠 Gallery3D mounting...");
    setIsMounted(true);
  }, []);

  console.log("🏠 Gallery3D render, isMounted:", isMounted);

  if (!isMounted) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Mounting Gallery...</div>
      </div>
    );
  }

  return <ThreeScene />;
}
