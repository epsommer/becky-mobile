// src/components/CalendarIntegration.tsx
"use client";

import { useState } from "react";
import {
  CalendarEvent,
  CalendarIntegration as IntegrationType,
} from "../types/scheduling";

interface CalendarIntegrationProps {
  events: CalendarEvent[];
  integrations: IntegrationType[];
  onConnect: (provider: string) => void;
  onDisconnect: (integrationId: string) => void;
  onSyncEvents: (integrationId: string) => void;
  className?: string;
}

export default function CalendarIntegration({
  events,
  integrations,
  onConnect,
  onDisconnect,
  onSyncEvents,
  className = "",
}: CalendarIntegrationProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    Record<string, "idle" | "syncing" | "success" | "error">
  >({});

  const providers = [
    {
      id: "google",
      name: "Google Calendar",
      icon: "📅",
      color: "bg-tactical-gold",
      description: "Sync with Google Calendar for seamless scheduling",
    },
    {
      id: "outlook",
      name: "Microsoft Outlook",
      icon: "📆",
      color: "bg-tactical-brown",
      description: "Connect with Outlook calendar and email",
    },
    {
      id: "apple",
      name: "Apple Calendar",
      icon: "🍎",
      color: "bg-tactical-grey-700",
      description: "Integrate with Apple Calendar (iCloud)",
    },
    {
      id: "custom",
      name: "Custom Webhook",
      icon: "🔗",
      color: "bg-green-500",
      description: "Custom integration via webhooks",
    },
  ];

  const handleConnect = async (providerId: string) => {
    setIsConnecting(true);
    setSelectedProvider(providerId);

    try {
      await onConnect(providerId);
      // In a real implementation, this would handle OAuth flow
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
      setSelectedProvider(null);
    }
  };

  const handleSync = async (integrationId: string) => {
    setSyncStatus((prev) => ({ ...prev, [integrationId]: "syncing" }));

    try {
      await onSyncEvents(integrationId);
      setSyncStatus((prev) => ({ ...prev, [integrationId]: "success" }));

      // Reset status after 3 seconds
      setTimeout(() => {
        setSyncStatus((prev) => ({ ...prev, [integrationId]: "idle" }));
      }, 3000);
    } catch (error) {
      setSyncStatus((prev) => ({ ...prev, [integrationId]: "error" }));
      console.error("Failed to sync:", error);
    }
  };

  const getIntegratedProvider = (providerId: string) => {
    return integrations.find(
      (integration) => integration.provider === providerId,
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-tactical-grey-800">
            Calendar Integration
          </h2>
          <p className="text-sm text-tactical-grey-500 mt-1">
            Connect your calendar services to sync events and appointments
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-tactical-grey-500">
            {integrations.filter((i) => i.isActive).length} of{" "}
            {providers.length} connected
          </div>
        </div>
      </div>

      {/* Integration Status */}
      {integrations.length > 0 && (
        <div className="bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-tactical-brown-dark">
              Calendar integrations are active
            </span>
          </div>
          <div className="text-sm text-tactical-brown-dark">
            Last sync:{" "}
            {integrations.find((i) => i.lastSyncAt)?.lastSyncAt
              ? new Date(
                  integrations.find((i) => i.lastSyncAt)!.lastSyncAt!,
                ).toLocaleString()
              : "Never"}
          </div>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider) => {
          const integration = getIntegratedProvider(provider.id);
          const isConnected = integration?.isActive;
          const currentSyncStatus = integration
            ? syncStatus[integration.id] || "idle"
            : "idle";

          return (
            <div
              key={provider.id}
              className={`border-2 rounded-lg p-6 transition-all ${
                isConnected
                  ? "border-green-200 bg-green-50"
                  : "border-tactical-grey-300 hover:border-tactical-grey-400"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white text-xl`}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-tactical-grey-800">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-tactical-grey-500">
                      {provider.description}
                    </p>
                  </div>
                </div>

                {isConnected && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 font-medium">
                      Connected
                    </span>
                  </div>
                )}
              </div>

              {integration && isConnected ? (
                <div className="space-y-4">
                  {/* Integration Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-tactical-grey-500">Calendar</div>
                      <div className="font-medium text-tactical-grey-800">
                        {integration.calendarId}
                      </div>
                    </div>
                    <div>
                      <div className="text-tactical-grey-500">Sync Direction</div>
                      <div className="font-medium text-tactical-grey-800 capitalize">
                        {integration.syncSettings.syncDirection.replace(
                          "-",
                          " ",
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={currentSyncStatus === "syncing"}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentSyncStatus === "syncing"
                          ? "bg-tactical-grey-200 text-gray-400 cursor-not-allowed"
                          : currentSyncStatus === "success"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : currentSyncStatus === "error"
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-tactical-gold-muted text-tactical-brown-dark hover:bg-tactical-gold-light"
                      }`}
                    >
                      {currentSyncStatus === "syncing" && "🔄 Syncing..."}
                      {currentSyncStatus === "success" && "✅ Synced"}
                      {currentSyncStatus === "error" && "❌ Failed"}
                      {currentSyncStatus === "idle" && "🔄 Sync Now"}
                    </button>

                    <button
                      onClick={() => onDisconnect(integration.id)}
                      className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Sync Settings */}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-tactical-grey-500 hover:text-tactical-grey-700">
                      Sync Settings
                    </summary>
                    <div className="mt-2 space-y-2 text-xs text-tactical-grey-500 bg-white rounded p-3">
                      <div className="flex justify-between">
                        <span>Auto-create events:</span>
                        <span
                          className={
                            integration.syncSettings.autoCreateEvents
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {integration.syncSettings.autoCreateEvents
                            ? "Enabled"
                            : "Disabled"}
                        </span>
                      </div>
                      {integration.syncSettings.eventPrefix && (
                        <div className="flex justify-between">
                          <span>Event prefix:</span>
                          <span>
                            &quot;{integration.syncSettings.eventPrefix}&quot;
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Visibility:</span>
                        <span className="capitalize">
                          {integration.syncSettings.defaultVisibility}
                        </span>
                      </div>
                    </div>
                  </details>
                </div>
              ) : (
                /* Connection Button */
                <button
                  onClick={() => handleConnect(provider.id)}
                  disabled={isConnecting && selectedProvider === provider.id}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    isConnecting && selectedProvider === provider.id
                      ? "bg-tactical-grey-200 text-gray-400 cursor-not-allowed"
                      : "bg-tactical-gold text-white hover:bg-tactical-gold-dark"
                  }`}
                >
                  {isConnecting && selectedProvider === provider.id
                    ? "Connecting..."
                    : `Connect ${provider.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Events Summary */}
      {events.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-medium text-tactical-grey-800 mb-4">
            Synchronized Events
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-tactical-gold">
                {events.length}
              </div>
              <div className="text-sm text-tactical-grey-500">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {events.filter((e) => e.status === "scheduled").length}
              </div>
              <div className="text-sm text-tactical-grey-500">Scheduled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {events.filter((e) => e.status === "completed").length}
              </div>
              <div className="text-sm text-tactical-grey-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {events.filter((e) => e.metadata?.autoGenerated).length}
              </div>
              <div className="text-sm text-tactical-grey-500">Auto-Generated</div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-tactical-grey-600 mb-3">
              Recent Events
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {events
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-tactical-grey-100 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">
                        {event.type === "follow-up"
                          ? "🔄"
                          : event.type === "appointment"
                            ? "📅"
                            : event.type === "deadline"
                              ? "⏰"
                              : "🔔"}
                      </div>
                      <div>
                        <div className="font-medium text-tactical-grey-800 text-sm">
                          {event.title}
                        </div>
                        <div className="text-tactical-grey-500 text-xs">
                          {new Date(event.startTime).toLocaleDateString()} •{" "}
                          {event.type}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        event.status === "scheduled"
                          ? "bg-tactical-gold-muted text-tactical-brown-dark"
                          : event.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : event.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-tactical-grey-200 text-tactical-grey-700"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Features */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-medium text-amber-900 mb-4">🚀 Coming Soon</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-amber-800">Two-way calendar sync</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-amber-800">Meeting link generation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-amber-800">
                Automatic conflict detection
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-amber-800">
                Smart scheduling suggestions
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-amber-800">Timezone handling</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-amber-800">
                Advanced recurring patterns
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-tactical-grey-500">
        <p>
          Calendar integration is currently in beta. Full functionality will be
          available in the next release.
        </p>
        <p className="mt-1">
          For immediate needs, you can export events using the iCal format from
          the conversation details.
        </p>
      </div>
    </div>
  );
}
