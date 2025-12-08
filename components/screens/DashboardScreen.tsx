"use client";

import React from "react";
import ClientPage from "../ClientPage";

interface DashboardScreenProps {
  onOpenPreferences: () => void;
  onNavigateToClients: () => void;
  onViewClientDetail?: (clientId: string) => void;
}

export default function DashboardScreen({
  onOpenPreferences,
  onNavigateToClients,
  onViewClientDetail
}: DashboardScreenProps) {
  return (
    <ClientPage
      onOpenPreferences={onOpenPreferences}
      onNavigateToClients={onNavigateToClients}
      onViewClientDetail={onViewClientDetail}
    />
  );
}
