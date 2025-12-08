"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  DollarSign,
  TrendingUp,
  Clock,
  FileText,
  Search,
  Filter,
  Download,
  Plus,
  ArrowLeft,
  Eye,
  Edit,
  Trash2,
  Archive,
  Mail,
  CheckCircle,
  XCircle,
  Send,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import CRMLayout from "../../components/CRMLayout";
import ReceiptDetailsModal from "../../components/ReceiptDetailsModal";
import BillingReceiptModal from "../../components/BillingReceiptModal";
import TimeTrackerModal from "../../components/TimeTrackerModal";
import InvoiceModal from "../../components/InvoiceModal";
import { Client } from "../../types/client";

interface Transaction {
  id: string;
  type: "receipt" | "invoice";
  receiptNumber?: string;
  invoiceNumber?: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: "paid" | "sent" | "draft";
  emailSentAt?: string;
  emailDeliveredAt?: string;
  date: string;
  serviceType?: string;
  description?: string;
  conversationId?: string;
  isEditable?: boolean; // Receipt can only be edited if status is 'draft'
  isDuplicate?: boolean; // Indicates if this is a duplicate of a sent receipt
  isTimed?: boolean; // True when created via time tracking (hours-based)
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
  transactionType: "all" | "receipts" | "invoices" | "timed";
  searchTerm: string;
  paymentStatus: "all" | "paid" | "unpaid";
  sentStatus: "all" | "sent" | "unsent";
  minAmount: string;
  maxAmount: string;
}

// Mock data for development - will be replaced with real API calls
const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "receipt",
    receiptNumber: "REC-001",
    clientId: "cmfbmj9lx0002uzjt6iloabiv",
    clientName: "Evan Sommer (Mock Client)",
    amount: 50,
    status: "sent",
    emailSentAt: new Date(Date.now() - 3600000).toISOString(),
    emailDeliveredAt: new Date(Date.now() - 3500000).toISOString(),
    date: new Date().toISOString(),
    serviceType: "Lawn Service",
    description: "Lawn maintenance service completed",
    conversationId: "cmfbuvvy60001uzdb0enyewyk",
  },
  {
    id: "2",
    type: "invoice",
    invoiceNumber: "INV-001",
    clientId: "cmfbmj9lx0002uzjt6iloabiv",
    clientName: "Evan Sommer (Mock Client)",
    amount: 150,
    status: "sent",
    date: new Date(Date.now() - 86400000).toISOString(),
    serviceType: "Consulting",
    description: "Business consultation services",
  },
  {
    id: "3",
    type: "receipt",
    receiptNumber: "REC-002",
    clientId: "cmfbmj9lx0002uzjt6iloabiv",
    clientName: "Evan Sommer (Mock Client)",
    amount: 75,
    status: "sent",
    date: new Date(Date.now() - 172800000).toISOString(),
    serviceType: "Snow Removal",
    description: "Driveway and walkway snow clearing",
  },
];

const mockAnalytics: BillingAnalytics = {
  totalRevenue: 1250.0,
  pendingInvoices: 3,
  pendingAmount: 450.0,
  totalReceipts: 12,
  currentMonthRevenue: 850.0,
  recentTransactions: mockTransactions,
};

function BillingMetricsCard({
  icon,
  title,
  value,
  trend,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend?: string;
  className?: string;
}) {
  return (
    <div className={`neo-container p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 neo-inset rounded-lg">{icon}</div>
        <span className="text-xs font-primary uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="text-2xl font-bold text-foreground font-primary mb-1">
        {value}
      </div>
      {trend && (
        <div className="text-xs text-muted-foreground font-primary">
          {trend}
        </div>
      )}
    </div>
  );
}

function BillingOverviewCards({ analytics }: { analytics: BillingAnalytics }) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <BillingMetricsCard
        icon={<DollarSign className="w-5 h-5 text-green-600" />}
        title="Total Revenue"
        value={formatCurrency(analytics.totalRevenue)}
        trend="+12.5% from last month"
      />

      <BillingMetricsCard
        icon={<FileText className="w-5 h-5 text-orange-600" />}
        title="Pending Invoices"
        value={analytics.pendingInvoices.toString()}
        trend={formatCurrency(analytics.pendingAmount)}
      />

      <BillingMetricsCard
        icon={<Receipt className="w-5 h-5 text-accent" />}
        title="Total Receipts"
        value={analytics.totalReceipts.toString()}
        trend="This month"
      />

      <BillingMetricsCard
        icon={<TrendingUp className="w-5 h-5 text-accent" />}
        title="This Month"
        value={formatCurrency(analytics.currentMonthRevenue)}
        trend="vs last month"
      />
    </div>
  );
}

function FilteringControls({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: {
  filters: BillingFilters;
  onFiltersChange: (filters: Partial<BillingFilters>) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const tabDefs = [
    { id: "tab-all", label: "All", value: "all" as const },
    { id: "tab-receipts", label: "Receipts", value: "receipts" as const },
    { id: "tab-invoices", label: "Invoices", value: "invoices" as const },
    { id: "tab-timed", label: "Timed", value: "timed" as const },
  ];

  return (
    <div className="neo-container p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-accent" />
          <h3 className="font-primary font-bold text-foreground uppercase tracking-wide text-sm">
            Filter Transactions
          </h3>
          <span className="text-xs text-muted-foreground font-primary">
            ({filteredCount} of {totalCount})
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Type Filter - Segmented control (full row) */}
        <div className="w-full">
          <div
            className="relative w-full neo-card px-2 py-2 rounded-full border-0"
            style={{ border: "none", ["--border" as any]: "transparent" }}
          >
            <div className="flex gap-1 justify-between">
              {tabDefs.map((tab) => {
                const isActive = filters.transactionType === tab.value;
                return (
                  <label
                    key={tab.id}
                    htmlFor={tab.id}
                    className={`relative flex-1 flex items-center justify-center h-10 px-3 text-sm cursor-pointer rounded-full transition-all ${
                      isActive ? "text-[var(--neomorphic-accent)]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <input
                      id={tab.id}
                      type="radio"
                      name="transactionType"
                      className="sr-only"
                      checked={isActive}
                      onChange={() =>
                        onFiltersChange({ transactionType: tab.value })
                      }
                    />
                    <span className={`relative z-10 billing-tab-label ${isActive ? "billing-tab-label-active" : ""}`}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <span className="absolute inset-0 rounded-full neo-inset pointer-events-none bg-[var(--neomorphic-bg)]/60 ring-1 ring-[var(--neomorphic-accent)]/30 z-0" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Second row of controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Payment Status */}
          <select
            value={filters.paymentStatus}
            onChange={(e) => onFiltersChange({ paymentStatus: e.target.value as any })}
            className="neo-inset px-3 py-2 rounded font-primary text-sm text-foreground cursor-pointer w-full"
          >
            <option value="all">All Payment Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>

          {/* Sent Status */}
          <select
            value={filters.sentStatus}
            onChange={(e) => onFiltersChange({ sentStatus: e.target.value as any })}
            className="neo-inset px-3 py-2 rounded font-primary text-sm text-foreground cursor-pointer w-full"
          >
            <option value="all">All Sent Status</option>
            <option value="sent">Sent</option>
            <option value="unsent">Unsent</option>
          </select>

          {/* Min Amount */}
          <input
            type="number"
            placeholder="Min Amount"
            value={filters.minAmount}
            onChange={(e) => onFiltersChange({ minAmount: e.target.value })}
            className="neo-inset px-3 py-2 rounded font-primary text-sm text-foreground placeholder:text-muted-foreground w-full"
            step="0.01"
            min="0"
          />

          {/* Max Amount */}
          <input
            type="number"
            placeholder="Max Amount"
            value={filters.maxAmount}
            onChange={(e) => onFiltersChange({ maxAmount: e.target.value })}
            className="neo-inset px-3 py-2 rounded font-primary text-sm text-foreground placeholder:text-muted-foreground w-full"
            step="0.01"
            min="0"
          />
        </div>
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
  onArchiveClick,
  isSelected,
  onSelect,
}: {
  transaction: Transaction;
  onViewClick?: (transaction: Transaction) => void;
  onEditClick?: (transaction: Transaction) => void;
  onSendClick?: (transaction: Transaction) => void;
  onDeleteClick?: (transaction: Transaction) => void;
  onArchiveClick?: (transaction: Transaction) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}) {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const getRowStyle = () => {
    if (transaction.status === "sent" && !transaction.isDuplicate) {
      return "border-b border-border opacity-60"; // Grey out sent receipts
    }
    return "border-b border-border hover:bg-muted/30 transition-all duration-200";
  };

  const getSentStatus = () => {
    if (transaction.emailSentAt || transaction.status === "sent") {
      return (
        <span className="flex items-center text-xs status-green">
          <CheckCircle className="w-3 h-3 mr-1" />
          Sent
        </span>
      );
    }
    return (
      <span className="flex items-center text-xs text-muted-foreground">
        <XCircle className="w-3 h-3 mr-1" />
        Not Sent
      </span>
    );
  };

  const getPaidStatus = () => {
    if (transaction.status === "paid") {
      return (
        <span className="flex items-center text-xs status-green">
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
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={(e) => onSelect?.(transaction.id, e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
      </td>
      <td className="px-6 py-4 text-sm text-foreground font-primary">
        {new Date(transaction.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        })}
      </td>
      <td className="px-6 py-4 text-sm text-foreground font-primary">
        {transaction.clientName}
      </td>
      <td className="px-6 py-4 text-sm text-foreground font-primary">
        <div className="flex items-center space-x-2">
          {transaction.type === "receipt" ? (
            <Receipt className="w-4 h-4 text-accent" />
          ) : (
            <FileText className="w-4 h-4 text-accent" />
          )}
          <span className="uppercase tracking-wide">{transaction.type}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {transaction.receiptNumber || transaction.invoiceNumber}
        </div>
      </td>
      <td className="px-6 py-4 text-sm font-bold text-foreground font-primary">
        {formatCurrency(transaction.amount)}
      </td>
      <td className="px-6 py-4">{getSentStatus()}</td>
      <td className="px-6 py-4">{getPaidStatus()}</td>
      <td className="px-6 py-4">
        <div className="relative">
          <button
            onClick={() => setActionMenuOpen(prev => !prev)}
            className="neo-button-sm p-2"
            aria-haspopup="menu"
            aria-expanded={actionMenuOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {actionMenuOpen && (
            <div className="absolute right-0 mt-2 neo-card rounded-lg shadow-lg z-20 min-w-[180px]">
              <button
                onClick={() => {
                  onViewClick?.(transaction);
                  setActionMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                View Details
              </button>
              {transaction.conversationId && (
                <Link
                  href={`/conversations/${transaction.conversationId}`}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => setActionMenuOpen(false)}
                >
                  View Conversation
                </Link>
              )}
              {!transaction.emailSentAt && transaction.status !== "sent" && (
                <>
                  <button
                    onClick={() => {
                      onEditClick?.(transaction);
                      setActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Edit Receipt
                  </button>
                  <button
                    onClick={() => {
                      if (transaction.status === "paid") {
                        onSendClick?.(transaction);
                        setActionMenuOpen(false);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      transaction.status === "paid"
                        ? "hover:bg-muted status-green"
                        : "text-muted-foreground cursor-not-allowed"
                    }`}
                    disabled={transaction.status !== "paid"}
                  >
                    Send Receipt
                  </button>
                  <button
                    onClick={() => {
                      onArchiveClick?.(transaction);
                      setActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Archive
                  </button>
                  <button
                    onClick={() => {
                      onDeleteClick?.(transaction);
                      setActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-red-600"
                  >
                    Delete
                  </button>
                </>
              )}
              {(transaction.emailSentAt || transaction.status === "sent") && (
                <>
                  <div className="px-3 py-2 text-xs text-muted-foreground">Sent</div>
                  <button
                    onClick={() => {
                      onEditClick?.(transaction);
                      setActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors status-green"
                    title="Create corrected version - duplicate as draft"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      onArchiveClick?.(transaction);
                      setActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Archive
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                    title="Cannot delete sent receipts - Archive instead"
                    disabled
                  >
                    Delete (disabled)
                  </button>
                </>
              )}
            </div>
          )}
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
  onViewAllClick,
  selectedIds,
  onSelectTransaction,
  onSelectAll,
  onBulkDelete,
  onBulkSend,
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
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
  selectedIds?: Set<string>;
  onSelectTransaction?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onBulkDelete?: () => void;
  onBulkSend?: () => void;
  filters: BillingFilters;
  onFiltersChange: (filters: Partial<BillingFilters>) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const allSelected = transactions.length > 0 && transactions.every(t => selectedIds?.has(t.id));
  const selectedCount = selectedIds?.size || 0;

  return (
    <div className="neo-container overflow-hidden">
      <div className="p-6 border-b border-border neo-inset space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-primary font-bold text-foreground uppercase tracking-wide text-lg">
              Recent Transactions
            </h2>
            <div className="flex items-center space-x-2 neo-card px-3 py-2 rounded w-full max-w-xs">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.searchTerm}
                onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
                className="bg-[var(--neomorphic-bg)] border-none outline-none focus:outline-none font-primary text-sm text-foreground placeholder:text-muted-foreground w-full rounded shadow-none focus:shadow-none appearance-none ring-0 focus:ring-0"
                style={{ boxShadow: "none" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-primary">
                  {selectedCount} selected
                </span>
                <button
                  onClick={onBulkSend}
                  className="neo-button-sm px-3 py-1.5 text-xs uppercase transition-transform hover:scale-[1.02]"
                >
                  Send Selected
                </button>
                <button
                  onClick={onBulkDelete}
                  className="neo-button-sm px-3 py-1.5 text-xs uppercase text-red-600 transition-transform hover:scale-[1.02]"
                >
                  Delete Selected
                </button>
              </div>
            )}
            {showViewAll && (
              <button
                onClick={onViewAllClick}
                className="neo-button text-accent hover:bg-accent hover:text-foreground px-4 py-2 font-primary uppercase tracking-wide text-sm transition-all"
              >
                View All History
              </button>
            )}
          </div>
        </div>
        <FilteringControls
          filters={filters}
          onFiltersChange={onFiltersChange}
          totalCount={totalCount}
          filteredCount={filteredCount}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border neo-inset">
              <th className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll?.(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-left font-primary font-bold uppercase text-foreground text-xs tracking-wide">
                Date
              </th>
              <th className="px-6 py-4 text-left font-primary font-bold uppercase text-foreground text-xs tracking-wide">
                Client
              </th>
              <th className="px-6 py-4 text-left font-primary font-bold uppercase text-foreground text-xs tracking-wide">
                Type
              </th>
              <th className="px-6 py-4 text-left font-primary font-bold uppercase text-foreground text-xs tracking-wide">
                Amount
              </th>
              <th className="px-6 py-4 text-left font-primary font-bold uppercase text-foreground text-xs tracking-wide">
                Sent
              </th>
              <th className="px-6 py-4 text-left font-primary font-bold uppercase text-foreground text-xs tracking-wide">
                Paid
              </th>
              <th className="px-6 py-4 text-left font-primary font-bold uppercase text-foreground text-xs tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-background">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-muted-foreground font-primary"
                >
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-muted-foreground font-primary"
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onViewClick={onViewTransaction}
                  onEditClick={onEditTransaction}
                  onSendClick={onSendReceipt}
                  onDeleteClick={onDeleteTransaction}
                  onArchiveClick={onArchiveTransaction}
                  isSelected={selectedIds?.has(transaction.id)}
                  onSelect={onSelectTransaction}
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<BillingAnalytics>(mockAnalytics);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<BillingFilters>({
    dateRange: "all",
    clientId: "",
    transactionType: "all",
    searchTerm: "",
    paymentStatus: "all",
    sentStatus: "all",
    minAmount: "",
    maxAmount: "",
  });
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(
    null,
  );
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Transaction | null>(
    null,
  );
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showHeaderExportMenu, setShowHeaderExportMenu] = useState(false);
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showTimeTracker, setShowTimeTracker] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [invoiceClient, setInvoiceClient] = useState<Client | null>(null);
  const [manualEntryData, setManualEntryData] = useState({
    documentType: 'receipt' as 'receipt' | 'invoice' | 'quote' | 'estimate',
    serviceType: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    clientId: '',
  });

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadTransactions();
      loadClients();
    }
  }, [status]);

  const loadClients = async () => {
    if (clientsLoading) return;
    setClientsLoading(true);
    try {
      const res = await fetch("/api/clients?limit=200");
      if (res.ok) {
        const data = await res.json();
        const list: Client[] = Array.isArray(data)
          ? data
          : data.data || data.clients || [];
        setClients(list);
        if (!invoiceClient && list.length > 0) {
          setInvoiceClient(list[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load clients for invoices", err);
    } finally {
      setClientsLoading(false);
    }
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/receipts");
      if (response.ok) {
        const receiptsData = await response.json();
        const receipts = Array.isArray(receiptsData)
          ? receiptsData
          : receiptsData.data || receiptsData.receipts || [];

        // Transform receipts to Transaction format
        const transactions: Transaction[] = receipts.map((receipt: any) => {
          // Determine status based on receipt status from API
          let status: "draft" | "sent" | "paid";
          if (receipt.status === "paid") {
            status = "paid";
          } else if (receipt.status === "sent") {
            status = "sent";
          } else {
            status = "draft";
          }

          return {
            id: receipt.id,
            type: "receipt" as const,
            receiptNumber:
              receipt.receiptNumber ||
              `REC-${receipt.id.slice(-6).toUpperCase()}`,
            clientId: receipt.clientId,
            clientName: receipt.client?.name || "Unknown Client",
            amount: receipt.totalAmount || 0,
            status: status,
            emailSentAt: receipt.emailSentAt,
            emailDeliveredAt: receipt.emailDeliveredAt,
            date:
              receipt.createdAt ||
              receipt.serviceDate ||
              new Date().toISOString(),
            serviceType: receipt.items?.[0]?.serviceType || "Service",
            description:
              receipt.items?.[0]?.description ||
              receipt.notes ||
              "Service provided",
            conversationId: receipt.conversationId,
            isEditable: status === "draft",
            isDuplicate: receipt.isDuplicate || false,
            isTimed: receipt.items?.some((i: any) => i?.billingMode === "hours" || i?.billingMode === "time"),
          };
        });

        // Calculate analytics from real data
        const totalRevenue = transactions.reduce(
          (sum, t) => sum + (t.status === "paid" ? t.amount : 0),
          0,
        );
        const pendingAmount = transactions.reduce(
          (sum, t) => sum + (t.status === "sent" ? t.amount : 0),
          0,
        );
        const pendingCount = transactions.filter(
          (t) => t.status === "sent",
        ).length;

        const currentMonth = new Date().getMonth();
        const currentMonthRevenue = transactions
          .filter(
            (t) =>
              new Date(t.date).getMonth() === currentMonth &&
              t.status === "paid",
          )
          .reduce((sum, t) => sum + t.amount, 0);

        setAnalytics({
          totalRevenue,
          pendingInvoices: pendingCount,
          pendingAmount,
          totalReceipts: transactions.length,
          currentMonthRevenue,
          recentTransactions: transactions.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
        });
      } else {
        console.error("Failed to fetch receipts:", response.status);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
    setIsLoading(false);
  };

  const filteredTransactions = useMemo(() => {
    let filtered = analytics.recentTransactions;

    // Filter by transaction type
    if (filters.transactionType !== "all") {
      if (filters.transactionType === "timed") {
        filtered = filtered.filter((t) => t.type === "receipt" && t.isTimed);
      } else {
        filtered = filtered.filter((t) =>
          filters.transactionType === "receipts"
            ? t.type === "receipt"
            : t.type === "invoice",
        );
      }
    }

    // Filter by payment status
    if (filters.paymentStatus !== "all") {
      filtered = filtered.filter((t) =>
        filters.paymentStatus === "paid"
          ? t.status === "paid"
          : t.status !== "paid",
      );
    }

    // Filter by sent status
    if (filters.sentStatus !== "all") {
      filtered = filtered.filter((t) =>
        filters.sentStatus === "sent"
          ? (t.emailSentAt || t.status === "sent")
          : (!t.emailSentAt && t.status !== "sent"),
      );
    }

    // Filter by amount range
    if (filters.minAmount) {
      const minAmt = parseFloat(filters.minAmount);
      filtered = filtered.filter((t) => t.amount >= minAmt);
    }
    if (filters.maxAmount) {
      const maxAmt = parseFloat(filters.maxAmount);
      filtered = filtered.filter((t) => t.amount <= maxAmt);
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.clientName.toLowerCase().includes(searchLower) ||
          t.serviceType?.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower) ||
          (t.receiptNumber &&
            t.receiptNumber.toLowerCase().includes(searchLower)) ||
          (t.invoiceNumber &&
            t.invoiceNumber.toLowerCase().includes(searchLower)),
      );
    }

    return filtered;
  }, [analytics.recentTransactions, filters]);

  const displayedTransactions = useMemo(() => {
    // Show recent 5 transactions by default, all if showAllTransactions is true
    return showAllTransactions
      ? filteredTransactions
      : filteredTransactions.slice(0, 5);
  }, [filteredTransactions, showAllTransactions]);

  const handleFiltersChange = (newFilters: Partial<BillingFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleViewReceipt = (transaction: Transaction) => {
    if (transaction.type === "receipt") {
      setSelectedReceipt(transaction);
      setShowReceiptModal(true);
    }
  };

  const handleEditReceipt = (transaction: Transaction) => {
    if (transaction.type === "receipt") {
      if (transaction.status === "draft" || transaction.status === "paid") {
        // Edit existing draft or paid receipt
        setEditingReceipt(transaction);
        setShowEditModal(true);
      } else if (transaction.status === "sent") {
        // Duplicate sent receipt to create a new draft
        duplicateReceipt(transaction);
      }
    }
  };

  const duplicateReceipt = async (originalTransaction: Transaction) => {
    try {
      // Fetch the original receipt data
      const response = await fetch(
        `/api/billing/receipts/${originalTransaction.id}`,
      );
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
          paymentMethod: originalReceipt.paymentMethod || "cash",
          paymentDate: new Date().toISOString(),
          serviceDate: originalReceipt.serviceDate || new Date().toISOString(),
          status: "draft",
          notes:
            (originalReceipt.notes || "") +
            "\n\n[Corrected version of receipt " +
            originalTransaction.receiptNumber +
            "]",
          isDuplicate: true,
        };

        // Create new receipt via API
        const createResponse = await fetch("/api/billing/receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(duplicateData),
        });

        if (createResponse.ok) {
          const newReceiptData = await createResponse.json();
          console.log("Duplicated receipt created:", newReceiptData);

          // Refresh transactions and open edit modal for the new draft
          await loadTransactions();

          // Find and edit the newly created receipt
          setTimeout(() => {
            setEditingReceipt({
              ...originalTransaction,
              id: newReceiptData.receipt?.id || newReceiptData.id,
              status: "draft",
              isEditable: true,
              isDuplicate: true,
            });
            setShowEditModal(true);
          }, 100);
        }
      }
    } catch (error) {
      console.error("Failed to duplicate receipt:", error);
      alert("Failed to duplicate receipt. Please try again.");
    }
  };

  const handleReceiptUpdate = async (updatedReceipt: any) => {
    // Refresh the transactions list to show the updated receipt
    console.log("Receipt updated:", updatedReceipt);
    await loadTransactions();
  };

  const handleEmailSent = (updatedReceipt: any) => {
    // In a real app, this would refresh the transaction list
    console.log("Email sent for receipt:", updatedReceipt);
  };

  const handleReceiptCreated = (newReceipt: any) => {
    console.log("New receipt created:", newReceipt);
    // Refresh the transactions list to show the new receipt
    loadTransactions();
  };

  const handleInvoiceCreated = (newInvoice: any) => {
    console.log("New invoice created:", newInvoice);
    setShowInvoiceModal(false);
    loadTransactions();
  };

  const openInvoiceModal = async () => {
    if (!clients.length && !clientsLoading) {
      await loadClients();
    }
    setShowInvoiceModal(true);
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Client",
      "Type",
      "Receipt/Invoice Number",
      "Amount",
      "Sent",
      "Paid",
      "Service Type",
      "Description",
    ];
    const csvData = displayedTransactions.map((transaction) => [
      new Date(transaction.date).toLocaleDateString(),
      transaction.clientName,
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      transaction.receiptNumber || transaction.invoiceNumber || "",
      `$${transaction.amount.toFixed(2)}`,
      transaction.emailSentAt || transaction.status === "sent" ? "Yes" : "No",
      transaction.status === "paid" ? "Yes" : "No",
      transaction.serviceType || "",
      transaction.description || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllDataToCSV = () => {
    const headers = [
      "Date",
      "Client",
      "Type",
      "Receipt/Invoice Number",
      "Amount",
      "Sent",
      "Paid",
      "Service Type",
      "Description",
    ];
    const csvData = filteredTransactions.map((transaction) => [
      new Date(transaction.date).toLocaleDateString(),
      transaction.clientName,
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      transaction.receiptNumber || transaction.invoiceNumber || "",
      `$${transaction.amount.toFixed(2)}`,
      transaction.emailSentAt || transaction.status === "sent" ? "Yes" : "No",
      transaction.status === "paid" ? "Yes" : "No",
      transaction.serviceType || "",
      transaction.description || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_transactions_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Create a simple HTML structure for PDF export
    const transactionRows = displayedTransactions
      .map(
        (transaction) => `
      <tr>
        <td>${new Date(transaction.date).toLocaleDateString()}</td>
        <td>${transaction.clientName}</td>
        <td class="status">${transaction.type}</td>
        <td>${transaction.receiptNumber || transaction.invoiceNumber || ""}</td>
        <td class="amount">$${transaction.amount.toFixed(2)}</td>
        <td>${transaction.serviceType || ""}</td>
      </tr>
    `,
      )
      .join("");

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
        <h1>Billing Report</h1>
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
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Delete receipt functionality
  const handleDeleteReceipt = async (transaction: Transaction) => {
    const confirmed = confirm(
      `Are you sure you want to permanently delete receipt ${transaction.receiptNumber}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/billing/receipts/${transaction.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete receipt");
      }

      const result = await response.json();
      if (result.success) {
        alert("Receipt deleted successfully");
        loadTransactions(); // Refresh the data
      } else {
        throw new Error(result.error || "Failed to delete receipt");
      }
    } catch (error) {
      console.error("Error deleting receipt:", error);
      alert(
        `Failed to delete receipt: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Archive receipt functionality
  const handleArchiveReceipt = async (transaction: Transaction) => {
    const confirmed = confirm(
      `Archive receipt ${transaction.receiptNumber} for later review? It will be removed from the main transactions view.`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/billing/receipts/${transaction.id}/archive`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to archive receipt");
      }

      const result = await response.json();
      if (result.success) {
        alert("Receipt archived successfully");
        loadTransactions(); // Refresh the data
      } else {
        throw new Error(result.error || "Failed to archive receipt");
      }
    } catch (error) {
      console.error("Error archiving receipt:", error);
      alert(
        `Failed to archive receipt: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Bulk selection handlers
  const handleSelectTransaction = (id: string, selected: boolean) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTransactions(new Set(displayedTransactions.map(t => t.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedTransactions.size} selected receipt(s)? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const deletePromises = Array.from(selectedTransactions).map(id =>
        fetch(`/api/billing/receipts/${id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      alert(`${selectedTransactions.size} receipt(s) deleted successfully`);
      setSelectedTransactions(new Set());
      loadTransactions();
    } catch (error) {
      console.error('Error bulk deleting receipts:', error);
      alert('Failed to delete some receipts');
    }
  };

  const handleBulkSend = async () => {
    if (selectedTransactions.size === 0) return;

    const selectedTxns = displayedTransactions.filter(t => selectedTransactions.has(t.id));
    const unsentTxns = selectedTxns.filter(t => !t.emailSentAt && t.status !== 'sent');

    if (unsentTxns.length === 0) {
      alert('All selected receipts have already been sent.');
      return;
    }

    const confirmed = confirm(
      `Send ${unsentTxns.length} unsent receipt(s) to their respective clients?`
    );
    if (!confirmed) return;

    try {
      const sendPromises = unsentTxns.map(async (t) => {
        // Fetch client email for each transaction
        const response = await fetch(`/api/clients/${t.clientId}`);
        if (!response.ok) return { success: false, id: t.id };

        const clientData = await response.json();
        const client =
          clientData.data ||
          clientData.client ||
          clientData;

        const clientEmail =
          client?.email ||
          client?.participant?.email ||
          client?.contactEmail ||
          client?.billingInfo?.email;

        const clientName =
          client?.name ||
          client?.participant?.name ||
          t.clientName;

        if (!clientEmail) return { success: false, id: t.id };

        const sendResponse = await fetch(`/api/billing/receipts/${t.id}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail,
            clientName,
          }),
        });

        return { success: sendResponse.ok, id: t.id };
      });

      const results = await Promise.all(sendPromises);
      const successCount = results.filter(r => r.success).length;

      alert(`${successCount} of ${unsentTxns.length} receipt(s) sent successfully`);
      setSelectedTransactions(new Set());
      loadTransactions();
    } catch (error) {
      console.error('Error bulk sending receipts:', error);
      alert('Failed to send some receipts');
    }
  };

  // Send receipt functionality
  const handleSendReceipt = async (transaction: Transaction) => {
    if (transaction.emailSentAt || transaction.status === "sent") {
      alert("This receipt has already been sent.");
      return;
    }

    const confirmed = confirm(
      `Send receipt ${transaction.receiptNumber} to ${transaction.clientName}?`,
    );
    if (!confirmed) return;

    try {
      // Fetch latest client data to get email
      const clientRes = await fetch(`/api/clients/${transaction.clientId}`);
      if (!clientRes.ok) {
        throw new Error(`Client fetch failed (${clientRes.status})`);
      }
      const clientData = await clientRes.json();
      const client =
        clientData.data ||
        clientData.client ||
        clientData;

      const clientEmail =
        client?.email ||
        client?.participant?.email ||
        client?.contactEmail ||
        client?.billingInfo?.email;

      const clientName =
        client?.name ||
        client?.participant?.name ||
        transaction.clientName;

      if (!clientEmail) {
        alert("Client has no email on file. Cannot send receipt.");
        return;
      }

      const response = await fetch(
        `/api/billing/receipts/${transaction.id}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail,
            clientName,
          }),
        },
      );

      if (response.ok) {
        alert(`Receipt sent successfully to ${clientEmail}!`);
        await loadTransactions(); // Refresh status
      } else {
        const errorData = await response.json();
        console.error("Send receipt API error:", errorData);
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Server responded with ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Error sending receipt:", error);
      alert(
        `Failed to send receipt: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-foreground/20 border-t-transparent animate-spin mx-auto mb-4 rounded-full"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  // Don't render anything if unauthenticated (will redirect)
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="neo-container p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
                BILLING & INVOICING
              </h1>
              <p className="text-muted-foreground font-primary uppercase tracking-wider text-sm">
                Manage all receipts and transactions across clients
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  className="neo-button font-primary flex items-center gap-2"
                  onClick={() => setShowHeaderExportMenu(!showHeaderExportMenu)}
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>

                {showHeaderExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-background border border-border shadow-lg z-10 min-w-[150px]">
                    <button
                      onClick={() => {
                        exportToCSV();
                        setShowHeaderExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-primary hover:bg-card transition-colors"
                    >
                      📊 Export as CSV
                    </button>
                    <button
                      onClick={() => {
                        exportToPDF();
                        setShowHeaderExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-primary hover:bg-card transition-colors border-t border-border"
                    >
                      📄 Export as PDF
                    </button>
                    <button
                      onClick={() => {
                        exportAllDataToCSV();
                        setShowHeaderExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-primary hover:bg-card transition-colors border-t border-border"
                    >
                      📈 Export All Data (CSV)
                    </button>
                  </div>
                )}
              </div>
              <button
                className="neo-button-active font-primary flex items-center gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4" />
                Create Receipt
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-6">
            {/* Recent Transactions - Moved to Top */}
            <div>
              <TransactionsTable
                transactions={displayedTransactions}
                onViewTransaction={handleViewReceipt}
                onEditTransaction={handleEditReceipt}
                onSendReceipt={handleSendReceipt}
                onDeleteTransaction={handleDeleteReceipt}
                onArchiveTransaction={handleArchiveReceipt}
                isLoading={isLoading}
                showViewAll={
                  !showAllTransactions && filteredTransactions.length > 5
                }
                onViewAllClick={() => setShowAllTransactions(true)}
                selectedIds={selectedTransactions}
                onSelectTransaction={handleSelectTransaction}
                onSelectAll={handleSelectAll}
                onBulkDelete={handleBulkDelete}
                onBulkSend={handleBulkSend}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                totalCount={analytics.recentTransactions.length}
                filteredCount={filteredTransactions.length}
              />

              {/* Show Less Button */}
              {showAllTransactions && filteredTransactions.length > 5 && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setShowAllTransactions(false)}
                    className="neo-button text-accent hover:bg-accent hover:text-foreground px-6 py-3 font-primary uppercase tracking-wide text-sm transition-all"
                  >
                    Show Recent Only
                  </button>
                </div>
              )}

              {filteredTransactions.length === 0 && !isLoading && (
                <div className="neo-container text-center py-16 mt-4">
                  <div className="text-6xl mb-6">📊</div>
                  <h3 className="text-xl font-bold text-foreground mb-3 font-primary uppercase tracking-wide">
                    No Transactions Found
                  </h3>
                  <p className="text-muted-foreground font-primary text-sm">
                    {filters.searchTerm || filters.transactionType !== "all"
                      ? "Try adjusting your filters to see more results."
                      : "Create your first receipt or invoice to get started."}
                  </p>
                </div>
              )}
            </div>

            {/* Overview Cards - Moved Below Transactions */}
            <BillingOverviewCards analytics={analytics} />
          </div>

          {/* Right Sidebar - Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="neo-container p-6 sticky top-6">
              <h2 className="font-primary font-bold text-foreground uppercase tracking-wide text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Quick Actions
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full neo-button-active text-left px-4 py-3 flex items-center gap-3 text-sm transition-transform hover:scale-[1.02]"
                >
                  <Receipt className="w-5 h-5" />
                  <span>Create Receipt</span>
                </button>
                <button
                  onClick={openInvoiceModal}
                  className="w-full neo-button text-left px-4 py-3 flex items-center gap-3 text-sm transition-transform hover:scale-[1.02]"
                >
                  <FileText className="w-5 h-5 text-accent" />
                  <span>Create Invoice</span>
                </button>
                <button
                  onClick={() => setShowTimeTracker(true)}
                  className="w-full neo-button text-left px-4 py-3 flex items-center gap-3 text-sm transition-transform hover:scale-[1.02]"
                >
                  <Clock className="w-5 h-5 text-accent" />
                  <span>Time Tracker</span>
                </button>
              </div>

              {/* KPI Summary in Sidebar */}
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-primary font-bold text-foreground uppercase tracking-wide text-sm mb-3">
                  KPI Summary
                </h3>
                <div className="space-y-3">
                  <div className="neo-inset p-3 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-primary uppercase">Total Revenue</span>
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-xl font-bold text-foreground font-primary">
                      ${analytics.totalRevenue.toFixed(2)}
                    </div>
                  </div>
                  <div className="neo-inset p-3 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-primary uppercase">Pending</span>
                      <FileText className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="text-xl font-bold text-foreground font-primary">
                      {analytics.pendingInvoices}
                    </div>
                    <div className="text-xs text-muted-foreground font-primary">
                      ${analytics.pendingAmount.toFixed(2)}
                    </div>
                  </div>
                  <div className="neo-inset p-3 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-primary uppercase">This Month</span>
                      <TrendingUp className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-xl font-bold text-foreground font-primary">
                      ${analytics.currentMonthRevenue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              receiptNumber: selectedReceipt.receiptNumber || "",
              clientId: selectedReceipt.clientId,
              client: {
                id: selectedReceipt.clientId,
                name: selectedReceipt.clientName,
                email: "contact@evangelosommer.com",
                phone: "647.327.8401",
                address: {
                  street: "84 Newton Dr.",
                  city: "Toronto",
                  province: "Ontario",
                  country: "Canada",
                  postalCode: "M2M 2M9",
                },
              } as any,
              conversationId: selectedReceipt.conversationId,
              items: [
                {
                  id: "1",
                  description:
                    selectedReceipt.description || "Service provided",
                  serviceType: "landscaping" as any,
                  quantity: 1,
                  unitPrice: selectedReceipt.amount,
                  totalPrice: selectedReceipt.amount,
                  taxable: false,
                },
              ],
              subtotal: selectedReceipt.amount,
              taxAmount: 0,
              totalAmount: selectedReceipt.amount,
              paymentMethod: "cash" as any,
              paymentDate: new Date(selectedReceipt.date),
              serviceDate: new Date(selectedReceipt.date),
              status: selectedReceipt.status as any,
              emailSentAt: selectedReceipt.emailSentAt
                ? new Date(selectedReceipt.emailSentAt)
                : undefined,
              emailDeliveredAt: selectedReceipt.emailDeliveredAt
                ? new Date(selectedReceipt.emailDeliveredAt)
                : undefined,
              notes: selectedReceipt.description,
              createdAt: new Date(selectedReceipt.date),
              updatedAt: new Date(selectedReceipt.date),
            }}
            client={
              {
                id: selectedReceipt.clientId,
                name: selectedReceipt.clientName,
                email: "contact@evangelosommer.com",
                phone: "647.327.8401",
                address: {
                  street: "84 Newton Dr.",
                  city: "Toronto",
                  province: "Ontario",
                  country: "Canada",
                  postalCode: "M2M 2M9",
                },
              } as any
            }
            onUpdate={handleReceiptUpdate}
            onEmailSent={handleEmailSent}
          />
        )}

        {/* Create Receipt Modal */}
        <BillingReceiptModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onReceiptCreated={handleReceiptCreated}
        />

        {/* Edit Receipt Modal */}
        {showEditModal && editingReceipt && (
          <BillingReceiptModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setEditingReceipt(null);
            }}
            onReceiptCreated={handleReceiptUpdate}
            existingReceiptId={editingReceipt.id}
            initialClientId={editingReceipt.clientId}
          />
        )}

        {/* Create Invoice Modal */}
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          client={invoiceClient}
          clients={clients}
          onClientChange={setInvoiceClient}
          onInvoiceCreated={handleInvoiceCreated}
        />

        {/* Time Tracker Modal */}
        <TimeTrackerModal
          isOpen={showTimeTracker}
          onClose={() => setShowTimeTracker(false)}
        />
      </div>
    </CRMLayout>
  );
}
