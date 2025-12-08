"use client";

import { useState, useEffect, useMemo } from "react";
import { Receipt, DollarSign, TrendingUp, Clock, FileText, Search, Filter, Download, Plus, ArrowLeft, Eye, Edit, Trash2, Archive, Mail, CheckCircle, XCircle, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import CRMLayout from "../../components/CRMLayout";
import ReceiptDetailsModal from "../../components/ReceiptDetailsModal";
import CreateReceiptModal from "../../components/CreateReceiptModal";

interface Transaction {
  id: string;
  type: 'receipt' | 'invoice';
  receiptNumber?: string;
  invoiceNumber?: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: 'paid' | 'sent' | 'draft';
  emailSentAt?: string;
  emailDeliveredAt?: string;
  date: string;
  serviceType?: string;
  description?: string;
  conversationId?: string;
  isEditable?: boolean; // Receipt can only be edited if status is 'draft'
  isDuplicate?: boolean; // Indicates if this is a duplicate of a sent receipt
}

interface BillingAnalytics {
  totalRevenue: number;
  pendingInvoices: number;
  pendingAmount: number;
  totalReceipts: number;
  currentMonthRevenue: number;
  recentTransactions: Transaction[];
}

interface BillingFilters {
  dateRange: string;
  clientId: string;
  transactionType: 'all' | 'receipts' | 'invoices';
  searchTerm: string;
}

// Mock data for development - will be replaced with real API calls
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'receipt',
    receiptNumber: 'REC-001',
    clientId: 'cmfbmj9lx0002uzjt6iloabiv',
    clientName: 'Evan Sommer (Mock Client)',
    amount: 50,
    status: 'sent',
    emailSentAt: new Date(Date.now() - 3600000).toISOString(),
    emailDeliveredAt: new Date(Date.now() - 3500000).toISOString(),
    date: new Date().toISOString(),
    serviceType: 'Lawn Service',
    description: 'Lawn maintenance service completed',
    conversationId: 'cmfbuvvy60001uzdb0enyewyk'
  },
  {
    id: '2',
    type: 'invoice',
    invoiceNumber: 'INV-001',
    clientId: 'cmfbmj9lx0002uzjt6iloabiv',
    clientName: 'Evan Sommer (Mock Client)',
    amount: 150,
    status: 'sent',
    date: new Date(Date.now() - 86400000).toISOString(),
    serviceType: 'Consulting',
    description: 'Business consultation services'
  },
  {
    id: '3',
    type: 'receipt',
    receiptNumber: 'REC-002',
    clientId: 'cmfbmj9lx0002uzjt6iloabiv',
    clientName: 'Evan Sommer (Mock Client)',
    amount: 75,
    status: 'sent',
    date: new Date(Date.now() - 172800000).toISOString(),
    serviceType: 'Snow Removal',
    description: 'Driveway and walkway snow clearing'
  }
];

const mockAnalytics: BillingAnalytics = {
  totalRevenue: 1250.00,
  pendingInvoices: 3,
  pendingAmount: 450.00,
  totalReceipts: 12,
  currentMonthRevenue: 850.00,
  recentTransactions: mockTransactions
};

function BillingMetricsCard({ 
  icon, 
  title, 
  value, 
  trend, 
  className = "" 
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: string; 
  trend?: string; 
  className?: string; 
}) {
  return (
    <div className={`p-6 border-2 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {icon}
        <span className="text-xs font-primary uppercase tracking-wide text-hud-text-secondary">
          {title}
        </span>
      </div>
      <div className="text-2xl font-bold text-hud-text-primary font-primary mb-1">
        {value}
      </div>
      {trend && (
        <div className="text-xs text-hud-text-secondary font-primary">
          {trend}
        </div>
      )}
    </div>
  );
}

function BillingOverviewCards({ analytics }: { analytics: BillingAnalytics }) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <BillingMetricsCard
        icon={<DollarSign className="w-6 h-6 text-green-600" />}
        title="Total Revenue"
        value={formatCurrency(analytics.totalRevenue)}
        trend="+12.5% from last month"
        className="bg-hud-background-primary border-green-200"
      />
      
      <BillingMetricsCard
        icon={<FileText className="w-6 h-6 text-orange-600" />}
        title="Pending Invoices"
        value={analytics.pendingInvoices.toString()}
        trend={formatCurrency(analytics.pendingAmount)}
        className="bg-hud-background-primary border-orange-200"
      />
      
      <BillingMetricsCard
        icon={<Receipt className="w-6 h-6 text-gold" />}
        title="Total Receipts"
        value={analytics.totalReceipts.toString()}
        trend="This month"
        className="bg-hud-background-primary border-hud-border-accent"
      />
      
      <BillingMetricsCard
        icon={<TrendingUp className="w-6 h-6 text-tactical-gold" />}
        title="This Month"
        value={formatCurrency(analytics.currentMonthRevenue)}
        trend="vs last month"
        className="bg-hud-background-primary border-tactical-gold"
      />
    </div>
  );
}

function FilteringControls({ 
  filters, 
  onFiltersChange 
}: { 
  filters: BillingFilters; 
  onFiltersChange: (filters: Partial<BillingFilters>) => void; 
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-hud-text-secondary" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={filters.searchTerm}
          onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
          className="px-3 py-2 border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary text-sm"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-hud-text-secondary" />
        <select
          value={filters.transactionType}
          onChange={(e) => onFiltersChange({ transactionType: e.target.value as any })}
          className="px-3 py-2 border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold font-primary text-sm"
        >
          <option value="all">All Types</option>
          <option value="receipts">Receipts</option>
          <option value="invoices">Invoices</option>
        </select>
        
      </div>
    </div>
  );
}


function TransactionRow({ 
  transaction, 
  onViewClick,
  onEditClick,
  onSendClick,
  onDeleteClick,
  onArchiveClick
}: { 
  transaction: Transaction; 
  onViewClick?: (transaction: Transaction) => void;
  onEditClick?: (transaction: Transaction) => void;
  onSendClick?: (transaction: Transaction) => void;
  onDeleteClick?: (transaction: Transaction) => void;
  onArchiveClick?: (transaction: Transaction) => void;
}) {

  const getRowStyle = () => {
    if (transaction.status === 'sent' && !transaction.isDuplicate) {
      return "border-b border-hud-border bg-hud-background-secondary opacity-75"; // Grey out sent receipts
    }
    return "border-b border-hud-border hover:bg-hud-background-secondary transition-colors";
  };

  const getSentStatus = () => {
    if (transaction.emailSentAt || transaction.status === 'sent') {
      return (
        <span className="flex items-center text-xs text-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Sent
        </span>
      );
    }
    return (
      <span className="flex items-center text-xs text-tactical-grey-500">
        <XCircle className="w-3 h-3 mr-1" />
        Not Sent
      </span>
    );
  };

  const getPaidStatus = () => {
    if (transaction.status === 'paid') {
      return (
        <span className="flex items-center text-xs text-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </span>
      );
    }
    return (
      <span className="flex items-center text-xs text-orange-600">
        <Clock className="w-3 h-3 mr-1" />
        Unpaid
      </span>
    );
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <tr className={getRowStyle()}>
      <td className="px-4 py-3 text-sm text-hud-text-primary font-primary">
        {new Date(transaction.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric', 
          day: 'numeric'
        })}
      </td>
      <td className="px-4 py-3 text-sm text-hud-text-primary font-primary">
        {transaction.clientName}
      </td>
      <td className="px-4 py-3 text-sm text-hud-text-primary font-primary">
        <div className="flex items-center space-x-2">
          {transaction.type === 'receipt' ? (
            <Receipt className="w-4 h-4 text-gold" />
          ) : (
            <FileText className="w-4 h-4 text-tactical-gold" />
          )}
          <span className="uppercase tracking-wide">
            {transaction.type}
          </span>
        </div>
        <div className="text-xs text-hud-text-secondary">
          {transaction.receiptNumber || transaction.invoiceNumber}
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-bold text-hud-text-primary font-primary">
        {formatCurrency(transaction.amount)}
      </td>
      <td className="px-4 py-3">
        {getSentStatus()}
      </td>
      <td className="px-4 py-3">
        {getPaidStatus()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewClick?.(transaction)}
            className="p-1 text-hud-text-secondary hover:text-hud-text-primary transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {transaction.conversationId && (
            <Link
              href={`/conversations/${transaction.conversationId}`}
              className="p-1 text-gold hover:text-gold-dark transition-colors"
              title="View Conversation"
            >
              💬
            </Link>
          )}
          {!transaction.emailSentAt && transaction.status !== 'sent' ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEditClick?.(transaction)}
                className="p-1 text-tactical-gold hover:text-tactical-gold-dark transition-colors"
                title="Edit Receipt"
              >
                <Edit className="w-4 h-4" />
              </button>
              {transaction.status === 'paid' ? (
                <button
                  onClick={() => onSendClick?.(transaction)}
                  className="p-1 text-green-600 hover:text-green-800 transition-colors"
                  title="Send Receipt to Customer"
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled
                  className="p-1 text-gray-400 cursor-not-allowed opacity-50"
                  title="Cannot send unpaid receipts - Mark as paid first"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onArchiveClick?.(transaction)}
                className="p-1 text-orange-600 hover:text-orange-800 transition-colors"
                title="Archive Receipt for Later Review"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteClick?.(transaction)}
                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                title="Delete Receipt Permanently"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : transaction.emailSentAt || transaction.status === 'sent' ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-tactical-grey-500 bg-hud-background-secondary px-2 py-1 rounded" title="Receipt has already been sent. Editing is locked.">
                🔒 Sent
              </span>
              <button
                onClick={() => onEditClick?.(transaction)}
                className="p-1 text-green-600 hover:text-green-800 transition-colors"
                title="Create corrected version - This will duplicate the receipt as a draft"
              >
                📋 Duplicate
              </button>
              <button
                onClick={() => onArchiveClick?.(transaction)}
                className="p-1 text-orange-600 hover:text-orange-800 transition-colors"
                title="Archive Receipt for Later Review"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                disabled
                className="p-1 text-gray-400 cursor-not-allowed opacity-50"
                title="Cannot delete sent receipts - Archive instead"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function TransactionsTable({ 
  transactions, 
  onViewTransaction,
  onEditTransaction,
  onSendReceipt,
  onDeleteTransaction,
  onArchiveTransaction,
  isLoading = false,
  showViewAll = false,
  onViewAllClick
}: { 
  transactions: Transaction[]; 
  onViewTransaction?: (transaction: Transaction) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onSendReceipt?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transaction: Transaction) => void;
  onArchiveTransaction?: (transaction: Transaction) => void;
  isLoading?: boolean;
  showViewAll?: boolean;
  onViewAllClick?: () => void;
}) {
  return (
    <div className="bg-hud-background-primary border-2 border-hud-border">
      <div className="p-4 border-b border-hud-border bg-hud-background-secondary">
        <div className="flex items-center justify-between">
          <h2 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide">
            Recent Transactions
          </h2>
          {showViewAll && (
            <Button
              onClick={onViewAllClick}
              variant="outline"
              size="sm"
              className="text-gold border-hud-border-accent hover:bg-tactical-gold hover:text-hud-text-primary"
            >
              View All History
            </Button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-hud-background-secondary">
            <tr className="border-b border-hud-border">
              <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs tracking-wide">
                Client
              </th>
              <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs tracking-wide">
                Amount
              </th>
              <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs tracking-wide">
                Sent
              </th>
              <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs tracking-wide">
                Paid
              </th>
              <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-hud-text-secondary">
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-hud-text-secondary">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map(transaction => (
                <TransactionRow 
                  key={transaction.id} 
                  transaction={transaction} 
                  onViewClick={onViewTransaction}
                  onEditClick={onEditTransaction}
                  onSendClick={onSendReceipt}
                  onDeleteClick={onDeleteTransaction}
                  onArchiveClick={onArchiveTransaction}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ServicesBillingPage() {
  const [analytics, setAnalytics] = useState<BillingAnalytics>(mockAnalytics);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<BillingFilters>({
    dateRange: 'all',
    clientId: '',
    transactionType: 'all',
    searchTerm: ''
  });
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Transaction | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showHeaderExportMenu, setShowHeaderExportMenu] = useState(false);
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/receipts');
      if (response.ok) {
        const receiptsData = await response.json();
        const receipts = Array.isArray(receiptsData) ? receiptsData : (receiptsData.data || receiptsData.receipts || []);
        
        // Transform receipts to Transaction format
        const transactions: Transaction[] = receipts.map((receipt: any) => {
          // Determine status based on receipt status from API
          let status: 'draft' | 'sent' | 'paid';
          if (receipt.status === 'paid') {
            status = 'paid';
          } else if (receipt.status === 'sent') {
            status = 'sent';
          } else {
            status = 'draft';
          }

          return {
            id: receipt.id,
            type: 'receipt' as const,
            receiptNumber: receipt.receiptNumber || `REC-${receipt.id.slice(-6).toUpperCase()}`,
            clientId: receipt.clientId,
            clientName: receipt.client?.name || 'Unknown Client',
            amount: receipt.totalAmount || 0,
            status: status,
            emailSentAt: receipt.emailSentAt,
            emailDeliveredAt: receipt.emailDeliveredAt,
            date: receipt.createdAt || receipt.serviceDate || new Date().toISOString(),
            serviceType: receipt.items?.[0]?.serviceType || 'Service',
            description: receipt.items?.[0]?.description || receipt.notes || 'Service provided',
            conversationId: receipt.conversationId,
            isEditable: status === 'draft',
            isDuplicate: receipt.isDuplicate || false
          };
        });
        
        // Calculate analytics from real data
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.status === 'paid' ? t.amount : 0), 0);
        const pendingAmount = transactions.reduce((sum, t) => sum + (t.status === 'sent' ? t.amount : 0), 0);
        const pendingCount = transactions.filter(t => t.status === 'sent').length;
        
        const currentMonth = new Date().getMonth();
        const currentMonthRevenue = transactions
          .filter(t => new Date(t.date).getMonth() === currentMonth && t.status === 'paid')
          .reduce((sum, t) => sum + t.amount, 0);
        
        setAnalytics({
          totalRevenue,
          pendingInvoices: pendingCount,
          pendingAmount,
          totalReceipts: transactions.length,
          currentMonthRevenue,
          recentTransactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        });
      } else {
        console.error('Failed to fetch receipts:', response.status);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
    setIsLoading(false);
  };

  const filteredTransactions = useMemo(() => {
    let filtered = analytics.recentTransactions;

    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(t => 
        filters.transactionType === 'receipts' ? t.type === 'receipt' : t.type === 'invoice'
      );
    }


    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.clientName.toLowerCase().includes(searchLower) ||
        t.serviceType?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        (t.receiptNumber && t.receiptNumber.toLowerCase().includes(searchLower)) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [analytics.recentTransactions, filters]);

  const displayedTransactions = useMemo(() => {
    // Show recent 5 transactions by default, all if showAllTransactions is true
    return showAllTransactions ? filteredTransactions : filteredTransactions.slice(0, 5);
  }, [filteredTransactions, showAllTransactions]);

  const handleFiltersChange = (newFilters: Partial<BillingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleViewReceipt = (transaction: Transaction) => {
    if (transaction.type === 'receipt') {
      setSelectedReceipt(transaction);
      setShowReceiptModal(true);
    }
  };

  const handleEditReceipt = (transaction: Transaction) => {
    if (transaction.type === 'receipt') {
      if (transaction.status === 'draft' || transaction.status === 'paid') {
        // Edit existing draft or paid receipt
        setEditingReceipt(transaction);
        setShowEditModal(true);
      } else if (transaction.status === 'sent') {
        // Duplicate sent receipt to create a new draft
        duplicateReceipt(transaction);
      }
    }
  };

  const duplicateReceipt = async (originalTransaction: Transaction) => {
    try {
      // Fetch the original receipt data
      const response = await fetch(`/api/billing/receipts/${originalTransaction.id}`);
      if (response.ok) {
        const data = await response.json();
        const originalReceipt = data.receipt;
        
        // Create duplicate receipt data in the format expected by the API
        const duplicateData = {
          clientId: originalReceipt.clientId,
          items: originalReceipt.items || [],
          subtotal: originalReceipt.subtotal || 0,
          taxAmount: originalReceipt.taxAmount || 0,
          totalAmount: originalReceipt.totalAmount || 0,
          paymentMethod: originalReceipt.paymentMethod || 'cash',
          paymentDate: new Date().toISOString(),
          serviceDate: originalReceipt.serviceDate || new Date().toISOString(),
          status: 'draft',
          notes: (originalReceipt.notes || '') + '\n\n[Corrected version of receipt ' + originalTransaction.receiptNumber + ']',
          isDuplicate: true
        };
        
        // Create new receipt via API
        const createResponse = await fetch('/api/billing/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(duplicateData)
        });
        
        if (createResponse.ok) {
          const newReceiptData = await createResponse.json();
          console.log('Duplicated receipt created:', newReceiptData);
          
          // Refresh transactions and open edit modal for the new draft
          await loadTransactions();
          
          // Find and edit the newly created receipt
          setTimeout(() => {
            setEditingReceipt({
              ...originalTransaction,
              id: newReceiptData.receipt?.id || newReceiptData.id,
              status: 'draft',
              isEditable: true,
              isDuplicate: true
            });
            setShowEditModal(true);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to duplicate receipt:', error);
      alert('Failed to duplicate receipt. Please try again.');
    }
  };

  const handleReceiptUpdate = async (updatedReceipt: any) => {
    // Refresh the transactions list to show the updated receipt
    console.log('Receipt updated:', updatedReceipt);
    await loadTransactions();
  };

  const handleEmailSent = (updatedReceipt: any) => {
    // In a real app, this would refresh the transaction list
    console.log('Email sent for receipt:', updatedReceipt);
  };

  const handleReceiptCreated = (newReceipt: any) => {
    console.log('New receipt created:', newReceipt);
    // Refresh the transactions list to show the new receipt
    loadTransactions();
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = ['Date', 'Client', 'Type', 'Receipt/Invoice Number', 'Amount', 'Sent', 'Paid', 'Service Type', 'Description'];
    const csvData = displayedTransactions.map(transaction => [
      new Date(transaction.date).toLocaleDateString(),
      transaction.clientName,
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      transaction.receiptNumber || transaction.invoiceNumber || '',
      `$${transaction.amount.toFixed(2)}`,
      (transaction.emailSentAt || transaction.status === 'sent') ? 'Yes' : 'No',
      transaction.status === 'paid' ? 'Yes' : 'No',
      transaction.serviceType || '',
      transaction.description || ''
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllDataToCSV = () => {
    const headers = ['Date', 'Client', 'Type', 'Receipt/Invoice Number', 'Amount', 'Sent', 'Paid', 'Service Type', 'Description'];
    const csvData = filteredTransactions.map(transaction => [
      new Date(transaction.date).toLocaleDateString(),
      transaction.clientName,
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      transaction.receiptNumber || transaction.invoiceNumber || '',
      `$${transaction.amount.toFixed(2)}`,
      (transaction.emailSentAt || transaction.status === 'sent') ? 'Yes' : 'No',
      transaction.status === 'paid' ? 'Yes' : 'No',
      transaction.serviceType || '',
      transaction.description || ''
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Create a simple HTML structure for PDF export
    const transactionRows = displayedTransactions.map(transaction => `
      <tr>
        <td>${new Date(transaction.date).toLocaleDateString()}</td>
        <td>${transaction.clientName}</td>
        <td class="status">${transaction.type}</td>
        <td>${transaction.receiptNumber || transaction.invoiceNumber || ''}</td>
        <td class="amount">$${transaction.amount.toFixed(2)}</td>
        <td>${transaction.serviceType || ''}</td>
      </tr>
    `).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transactions Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .amount { text-align: right; }
          .status { text-transform: capitalize; }
          .header-info { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Services & Billing Report</h1>
        <div class="header-info">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Transactions:</strong> ${displayedTransactions.length}</p>
          <p><strong>Total Revenue:</strong> $${analytics.totalRevenue.toFixed(2)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Type</th>
              <th>Number</th>
              <th>Amount</th>
              <th>Service</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    // Open print dialog for PDF export
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Delete receipt functionality
  const handleDeleteReceipt = async (transaction: Transaction) => {
    const confirmed = confirm(`Are you sure you want to permanently delete receipt ${transaction.receiptNumber}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/billing/receipts/${transaction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete receipt');
      }

      const result = await response.json();
      if (result.success) {
        alert('Receipt deleted successfully');
        loadTransactions(); // Refresh the data
      } else {
        throw new Error(result.error || 'Failed to delete receipt');
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert(`Failed to delete receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Archive receipt functionality
  const handleArchiveReceipt = async (transaction: Transaction) => {
    const confirmed = confirm(`Archive receipt ${transaction.receiptNumber} for later review? It will be removed from the main transactions view.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/billing/receipts/${transaction.id}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to archive receipt');
      }

      const result = await response.json();
      if (result.success) {
        alert('Receipt archived successfully');
        loadTransactions(); // Refresh the data
      } else {
        throw new Error(result.error || 'Failed to archive receipt');
      }
    } catch (error) {
      console.error('Error archiving receipt:', error);
      alert(`Failed to archive receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Send receipt functionality
  const handleSendReceipt = async (transaction: Transaction) => {
    if (transaction.emailSentAt || transaction.status === 'sent') {
      alert('This receipt has already been sent.');
      return;
    }

    const confirmed = confirm(`Send receipt ${transaction.receiptNumber} to ${transaction.clientName}?`);
    if (!confirmed) return;

    try {
      // Call API to send the receipt via email
      const response = await fetch(`/api/billing/receipts/${transaction.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: 'contact@evangelosommer.com', // Mock client email for testing
          clientName: transaction.clientName
        })
      });

      if (response.ok) {
        alert(`Receipt sent successfully to ${transaction.clientName}!`);
        // Refresh transactions to show updated status
        await loadTransactions();
      } else {
        const errorData = await response.json();
        console.error('Send receipt API error:', errorData);
        throw new Error(errorData.error || errorData.message || `Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      alert(`Failed to send receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Full error details:', error);
    }
  };

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
                SERVICES & BILLING
              </h1>
              <p className="text-hud-text-secondary font-primary uppercase tracking-wider text-sm">
                Manage all receipts and transactions across clients
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowHeaderExportMenu(!showHeaderExportMenu)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                
                {showHeaderExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-hud-background-primary border-2 border-hud-border shadow-lg z-10 min-w-[150px]">
                    <button
                      onClick={() => {
                        exportToCSV();
                        setShowHeaderExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-primary hover:bg-hud-background-secondary transition-colors"
                    >
                      📊 Export as CSV
                    </button>
                    <button
                      onClick={() => {
                        exportToPDF();
                        setShowHeaderExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-primary hover:bg-hud-background-secondary transition-colors border-t border-hud-border"
                    >
                      📄 Export as PDF
                    </button>
                    <button
                      onClick={() => {
                        exportAllDataToCSV();
                        setShowHeaderExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-primary hover:bg-hud-background-secondary transition-colors border-t border-hud-border"
                    >
                      📈 Export All Data (CSV)
                    </button>
                  </div>
                )}
              </div>
              <Button 
                size="sm" 
                className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Receipt
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div>
        {/* Overview Cards */}
        <BillingOverviewCards analytics={analytics} />
        
        {/* Filtering & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <FilteringControls filters={filters} onFiltersChange={handleFiltersChange} />
        </div>
        
        {/* Transactions Table */}
        <TransactionsTable 
          transactions={displayedTransactions} 
          onViewTransaction={handleViewReceipt}
          onEditTransaction={handleEditReceipt}
          onSendReceipt={handleSendReceipt}
          onDeleteTransaction={handleDeleteReceipt}
          onArchiveTransaction={handleArchiveReceipt}
          isLoading={isLoading}
          showViewAll={!showAllTransactions && filteredTransactions.length > 5}
          onViewAllClick={() => setShowAllTransactions(true)}
        />
        
        {/* Show Less Button for All Transactions View */}
        {showAllTransactions && filteredTransactions.length > 5 && (
          <div className="text-center mt-4">
            <Button
              onClick={() => setShowAllTransactions(false)}
              variant="outline"
              className="text-gold border-hud-border-accent hover:bg-tactical-gold hover:text-hud-text-primary"
            >
              Show Recent Only
            </Button>
          </div>
        )}
        
        {filteredTransactions.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-hud-background-primary border-2 border-hud-border mt-4">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              No Transactions Found
            </h3>
            <p className="text-hud-text-secondary font-primary">
              {filters.searchTerm || filters.transactionType !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Create your first receipt or invoice to get started.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Receipt Details Modal */}
      {showReceiptModal && selectedReceipt && (
        <ReceiptDetailsModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedReceipt(null);
          }}
          receipt={{
            id: selectedReceipt.id,
            receiptNumber: selectedReceipt.receiptNumber || '',
            clientId: selectedReceipt.clientId,
            client: {
              id: selectedReceipt.clientId,
              name: selectedReceipt.clientName,
              email: 'contact@evangelosommer.com',
              phone: '647.327.8401',
              address: {
                street: '84 Newton Dr.',
                city: 'Toronto',
                province: 'Ontario',
                country: 'Canada',
                postalCode: 'M2M 2M9'
              }
            } as any,
            conversationId: selectedReceipt.conversationId,
            items: [{
              id: '1',
              description: selectedReceipt.description || 'Service provided',
              serviceType: 'landscaping' as any,
              quantity: 1,
              unitPrice: selectedReceipt.amount,
              totalPrice: selectedReceipt.amount,
              taxable: false
            }],
            subtotal: selectedReceipt.amount,
            taxAmount: 0,
            totalAmount: selectedReceipt.amount,
            paymentMethod: 'cash' as any,
            paymentDate: new Date(selectedReceipt.date),
            serviceDate: new Date(selectedReceipt.date),
            status: selectedReceipt.status as any,
            emailSentAt: selectedReceipt.emailSentAt ? new Date(selectedReceipt.emailSentAt) : undefined,
            emailDeliveredAt: selectedReceipt.emailDeliveredAt ? new Date(selectedReceipt.emailDeliveredAt) : undefined,
            notes: selectedReceipt.description,
            createdAt: new Date(selectedReceipt.date),
            updatedAt: new Date(selectedReceipt.date)
          }}
          client={{
            id: selectedReceipt.clientId,
            name: selectedReceipt.clientName,
            email: 'contact@evangelosommer.com',
            phone: '647.327.8401',
            address: {
              street: '84 Newton Dr.',
              city: 'Toronto',
              province: 'Ontario',
              country: 'Canada',
              postalCode: 'M2M 2M9'
            }
          } as any}
          onUpdate={handleReceiptUpdate}
          onEmailSent={handleEmailSent}
        />
      )}

      {/* Create Receipt Modal */}
      <CreateReceiptModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onReceiptCreated={handleReceiptCreated}
      />

      {/* Edit Receipt Modal */}
      {showEditModal && editingReceipt && (
        <CreateReceiptModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingReceipt(null);
          }}
          onReceiptCreated={handleReceiptUpdate}
          editMode={true}
          existingReceiptId={editingReceipt.id}
        />
      )}
      </div>
    </CRMLayout>
  );
}