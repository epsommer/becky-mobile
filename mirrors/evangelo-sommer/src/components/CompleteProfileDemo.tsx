"use client";

import React, { useState } from "react";
import { Client } from "../types/client";
import ClientProfileCompletion from "./ClientProfileCompletion";

// Mock client data for testing
const mockIncompleteClients: Client[] = [
  {
    id: "client-1",
    name: "John Smith",
    email: "", // Missing email
    phone: "1234567890",
    company: "Smith Landscaping",
    serviceId: "service-1",
    status: "active",
    tags: ["landscaping", "regular"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    serviceTypes: ["lawn_care", "landscaping"],
  },
  {
    id: "client-2",
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "", // Missing phone
    company: "",
    serviceId: "service-1",
    status: "active",
    tags: ["snow_removal"],
    createdAt: "2024-02-01T14:30:00Z",
    updatedAt: "2024-02-01T14:30:00Z",
    serviceTypes: ["snow_removal"],
  },
  {
    id: "client-3",
    name: "Bob Wilson",
    email: "", // Missing both email and phone
    phone: "",
    company: "Wilson Properties",
    serviceId: "service-1",
    status: "prospect",
    tags: ["maintenance"],
    createdAt: "2024-03-10T09:15:00Z",
    updatedAt: "2024-03-10T09:15:00Z",
    serviceTypes: ["maintenance"],
  },
];

export default function CompleteProfileDemo() {
  const [clients, setClients] = useState<Client[]>(mockIncompleteClients);

  const handleClientUpdate = (clientId: string, updatedData: Partial<Client>) => {
    setClients(prevClients =>
      prevClients.map(client =>
        client.id === clientId
          ? { ...client, ...updatedData, updatedAt: new Date().toISOString() }
          : client
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-tactical-grey-800 mb-2">
          Complete Profile Demo
        </h1>
        <p className="text-tactical-grey-500">
          This demo shows the complete profile functionality for clients with missing contact information.
        </p>
      </div>

      <div className="space-y-6">
        {clients.map((client) => (
          <div key={client.id} className="bg-white border border-tactical-grey-300 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-tactical-grey-800 mb-2">
                {client.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-tactical-grey-500">
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {client.email || <span className="text-red-500">Missing</span>}
                </div>
                <div>
                  <span className="font-medium">Phone:</span>{" "}
                  {client.phone || <span className="text-red-500">Missing</span>}
                </div>
                <div>
                  <span className="font-medium">Company:</span>{" "}
                  {client.company || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <span className={`px-2 py-1 rounded text-xs ${
                    client.status === "active" 
                      ? "bg-green-100 text-green-800"
                      : client.status === "prospect"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-tactical-grey-200 text-tactical-grey-700"
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <span className="font-medium text-sm text-tactical-grey-500">Services:</span>{" "}
                <span className="text-sm text-tactical-grey-500">
                  {client.serviceTypes.join(", ")}
                </span>
              </div>
            </div>

            {/* Complete Profile Component */}
            <ClientProfileCompletion
              client={client}
              onClientUpdate={(updatedData) => handleClientUpdate(client.id, updatedData)}
            />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg p-4">
        <h3 className="font-medium text-tactical-brown-dark mb-2">Demo Instructions</h3>
        <ul className="text-sm text-tactical-brown-dark space-y-1">
          <li>• Clients with missing email or phone will show a "Complete Client Profile" section</li>
          <li>• Click "Complete Profile" to open the modal and fill in missing information</li>
          <li>• The form will only show fields that are actually missing</li>
          <li>• After successful completion, the section will disappear</li>
          <li>• All changes are reflected in real-time in the client display</li>
        </ul>
      </div>
    </div>
  );
}
