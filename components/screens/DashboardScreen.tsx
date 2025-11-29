"use client";

import React from "react";
import ClientPage from "../ClientPage";

interface DashboardScreenProps {
  onOpenPreferences: () => void;
}

export default function DashboardScreen({ onOpenPreferences }: DashboardScreenProps) {
  return <ClientPage onOpenPreferences={onOpenPreferences} />;
}
