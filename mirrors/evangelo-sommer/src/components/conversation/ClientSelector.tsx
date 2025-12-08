// src/components/conversation/ClientSelector.tsx
"use client";

import { useState } from "react";
import { Client } from "../../types/client";

interface ClientSelectorProps {
  clients: Client[];
  selectedClientId?: string;
  onClientSelect: (clientId: string) => void;
  onNewClient?: () => void;
}

export default function ClientSelector({ 
  clients, 
  selectedClientId, 
  onClientSelect, 
  onNewClient 
}: ClientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
          Search Clients
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
          placeholder="Search by name, email, or company"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            onClick={() => onClientSelect(client.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedClientId === client.id
                ? 'border-hud-border-accent bg-tactical-gold bg-opacity-10'
                : 'border-hud-border bg-white hover:border-medium-grey'
            }`}
          >
            <h4 className="font-bold text-hud-text-primary font-primary">
              {client.name}
            </h4>
            {client.email && (
              <p className="text-sm text-medium-grey font-primary">
                {client.email}
              </p>
            )}
            {client.phone && (
              <p className="text-sm text-medium-grey font-primary">
                {client.phone}
              </p>
            )}
            {client.company && (
              <p className="text-sm text-medium-grey font-primary">
                {client.company}
              </p>
            )}
          </div>
        ))}
      </div>

      {onNewClient && (
        <div className="text-center">
          <button
            onClick={onNewClient}
            className="px-4 py-2 border-2 border-medium-grey text-medium-grey hover:border-dark-grey hover:text-hud-text-primary font-primary font-bold uppercase tracking-wide transition-colors"
          >
            + Create New Client
          </button>
        </div>
      )}

      {filteredClients.length === 0 && searchTerm && (
        <div className="text-center text-medium-grey font-primary">
          No clients found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}