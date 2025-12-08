"use client";

import { useState } from 'react';

export default function DataExportPage() {
  const [exportData, setExportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const exportLocalStorageData = () => {
    setIsLoading(true);
    
    try {
      const clients = JSON.parse(localStorage.getItem('crm-clients') || '[]');
      const conversations = JSON.parse(localStorage.getItem('crm-conversations') || '[]');
      const documents = JSON.parse(localStorage.getItem('crm-documents') || '[]');

      console.log(`Found ${clients.length} clients, ${conversations.length} conversations, ${documents.length} documents`);
      
      const data = {
        clients,
        conversations,
        documents,
        exportedAt: new Date().toISOString(),
        summary: {
          clientCount: clients.length,
          conversationCount: conversations.length,
          documentCount: documents.length,
          totalMessages: conversations.reduce((sum: number, conv: any) => sum + (conv.messages?.length || 0), 0)
        }
      };

      setExportData(data);

      // Create downloadable file
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      console.log('Export completed!', data.summary);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const importDataToDatabase = async () => {
    if (!exportData) {
      alert('Please export data first');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/migrate-localstorage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Migration completed! ${result.summary}`);
        console.log('Migration result:', result);
      } else {
        throw new Error(result.error || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalStorage = () => {
    if (confirm('Are you sure you want to clear localStorage? This will remove all local conversation data. Make sure you have migrated to database first!')) {
      localStorage.removeItem('crm-clients');
      localStorage.removeItem('crm-conversations');
      localStorage.removeItem('crm-documents');
      alert('LocalStorage cleared!');
      setExportData(null);
    }
  };

  return (
    <div className="min-h-screen bg-tactical-grey-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-tactical-grey-800 mb-8">
            LocalStorage to Database Migration Tool
          </h1>

          <div className="space-y-6">
            {/* Export Section */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-tactical-grey-700 mb-4">
                Step 1: Export LocalStorage Data
              </h2>
              <p className="text-tactical-grey-500 mb-4">
                Export your conversations and client data from browser localStorage to a JSON file.
              </p>
              
              <button
                onClick={exportLocalStorageData}
                disabled={isLoading}
                className="px-4 py-2 bg-tactical-gold text-white rounded hover:bg-tactical-gold-dark disabled:opacity-50"
              >
                {isLoading ? 'Exporting...' : 'Export LocalStorage Data'}
              </button>

              {exportData && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-medium text-green-800 mb-2">Export Summary:</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• {exportData.summary.clientCount} clients</li>
                    <li>• {exportData.summary.conversationCount} conversations</li>
                    <li>• {exportData.summary.totalMessages} messages</li>
                    <li>• {exportData.summary.documentCount} documents</li>
                  </ul>
                  <p className="text-xs text-green-600 mt-2">
                    Data exported to JSON file. Check your Downloads folder.
                  </p>
                </div>
              )}
            </div>

            {/* Import Section */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-tactical-grey-700 mb-4">
                Step 2: Import to Database
              </h2>
              <p className="text-tactical-grey-500 mb-4">
                Import the exported data into your Prisma database. This will create new client records and conversations.
              </p>
              
              <button
                onClick={importDataToDatabase}
                disabled={isLoading || !exportData}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Importing...' : 'Import to Database'}
              </button>

              {!exportData && (
                <p className="text-sm text-tactical-grey-500 mt-2">
                  Please export data first before importing.
                </p>
              )}
            </div>

            {/* Clear Section */}
            <div className="border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-4">
                Step 3: Clear LocalStorage (Optional)
              </h2>
              <p className="text-red-600 mb-4">
                ⚠️ Only do this AFTER successfully migrating to database! This will permanently remove all localStorage data.
              </p>
              
              <button
                onClick={clearLocalStorage}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear LocalStorage
              </button>
            </div>

            {/* Preview Section */}
            {exportData && (
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-tactical-grey-700 mb-4">
                  Data Preview
                </h2>
                
                {exportData.conversations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-tactical-grey-600 mb-2">Sample Conversations:</h3>
                    <div className="bg-tactical-grey-100 p-3 rounded text-sm max-h-60 overflow-y-auto">
                      {exportData.conversations.slice(0, 3).map((conv: any) => (
                        <div key={conv.id} className="mb-3 p-2 bg-white rounded border">
                          <div className="font-medium">{conv.title || conv.id}</div>
                          <div className="text-tactical-grey-500 text-xs">
                            Client: {conv.clientId} | Messages: {conv.messages?.length || 0} | Status: {conv.status}
                          </div>
                          {conv.clientId === 'client_udpu1m387' && (
                            <div className="text-green-600 font-medium text-xs mt-1">
                              🎉 This is your Mark Levy conversation!
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {exportData.clients.length > 0 && (
                  <div>
                    <h3 className="font-medium text-tactical-grey-600 mb-2">Sample Clients:</h3>
                    <div className="bg-tactical-grey-100 p-3 rounded text-sm max-h-40 overflow-y-auto">
                      {exportData.clients.slice(0, 3).map((client: any) => (
                        <div key={client.id} className="mb-2">
                          <span className="font-medium">{client.name}</span>
                          <span className="text-tactical-grey-500 ml-2">({client.id})</span>
                          {client.id === 'client_udpu1m387' && (
                            <span className="text-green-600 font-medium ml-2">← Mark Levy</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}