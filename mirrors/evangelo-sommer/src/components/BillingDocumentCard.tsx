"use client";

import { Receipt, FileText, DollarSign, Check, Clock, X } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export type BillingDocumentType = 'RECEIPT' | 'INVOICE' | 'QUOTE' | 'ESTIMATE';
export type BillingDocumentStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'CANCELLED';

interface BillingDocument {
  id: string;
  documentNumber: string;
  documentType: BillingDocumentType;
  serviceType: string;
  amount: number;
  description?: string;
  date: string;
  status: BillingDocumentStatus;
  sentAt?: string;
  paidAt?: string;
}

interface BillingDocumentCardProps {
  document: BillingDocument;
  onView?: (document: BillingDocument) => void;
  onEdit?: (document: BillingDocument) => void;
  onDelete?: (documentId: string) => void;
  compact?: boolean;
}

export default function BillingDocumentCard({
  document,
  onView,
  onEdit,
  onDelete,
  compact = false
}: BillingDocumentCardProps) {
  const getDocumentIcon = (type: BillingDocumentType) => {
    switch (type) {
      case 'RECEIPT':
        return <Receipt className="w-5 h-5" />;
      case 'INVOICE':
        return <FileText className="w-5 h-5" />;
      case 'QUOTE':
      case 'ESTIMATE':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: BillingDocumentStatus) => {
    const configs = {
      DRAFT: { bg: 'bg-tactical-grey-200', text: 'text-tactical-grey-700', icon: <Clock className="w-3 h-3" /> },
      SENT: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Check className="w-3 h-3" /> },
      VIEWED: { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Check className="w-3 h-3" /> },
      PAID: { bg: 'bg-green-100', text: 'text-green-800', icon: <Check className="w-3 h-3" /> },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', icon: <X className="w-3 h-3" /> }
    };

    const config = configs[status];
    return (
      <Badge className={`${config.bg} ${config.text} flex items-center space-x-1`}>
        {config.icon}
        <span>{status}</span>
      </Badge>
    );
  };

  const getTypeColor = (type: BillingDocumentType) => {
    switch (type) {
      case 'RECEIPT':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'INVOICE':
        return 'text-tactical-gold bg-tactical-gold-muted border-tactical-gold';
      case 'QUOTE':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ESTIMATE':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-tactical-grey-600 bg-tactical-grey-100 border-tactical-grey-300';
    }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between p-3 border-2 ${getTypeColor(document.documentType)} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => onView?.(document)}
      >
        <div className="flex items-center space-x-3">
          <div className={getTypeColor(document.documentType)}>
            {getDocumentIcon(document.documentType)}
          </div>
          <div>
            <div className="font-primary font-bold text-sm">{document.documentNumber}</div>
            <div className="text-xs text-medium-grey">{document.serviceType}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">${document.amount.toFixed(2)}</div>
          {getStatusBadge(document.status)}
        </div>
      </div>
    );
  }

  return (
    <Card className={`p-4 border-2 ${getTypeColor(document.documentType)} hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 ${getTypeColor(document.documentType)}`}>
            {getDocumentIcon(document.documentType)}
          </div>
          <div>
            <h3 className="font-primary font-bold text-hud-text-primary">
              {document.documentNumber}
            </h3>
            <p className="text-sm text-medium-grey">
              {document.documentType}
            </p>
          </div>
        </div>
        {getStatusBadge(document.status)}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-medium-grey font-primary uppercase tracking-wide">Service:</span>
          <span className="text-sm font-bold text-hud-text-primary">{document.serviceType}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-medium-grey font-primary uppercase tracking-wide">Amount:</span>
          <span className="text-xl font-bold text-tactical-gold">${document.amount.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-medium-grey font-primary uppercase tracking-wide">Date:</span>
          <span className="text-sm text-hud-text-primary">
            {new Date(document.date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {document.description && (
        <div className="mb-4 p-2 bg-tactical-grey-100 border-l-2 border-tactical-gold">
          <p className="text-xs text-tactical-grey-700">{document.description}</p>
        </div>
      )}

      {(document.sentAt || document.paidAt) && (
        <div className="mb-4 space-y-1 text-xs text-medium-grey">
          {document.sentAt && (
            <div>Sent: {new Date(document.sentAt).toLocaleDateString()}</div>
          )}
          {document.paidAt && (
            <div className="text-green-600 font-bold">
              Paid: {new Date(document.paidAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-2">
        {onView && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(document)}
            className="flex-1 font-primary text-xs uppercase tracking-wide"
          >
            View Details
          </Button>
        )}
        {onEdit && document.status === 'DRAFT' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(document)}
            className="flex-1 font-primary text-xs uppercase tracking-wide"
          >
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(document.id)}
            className="text-red-600 hover:bg-red-50 font-primary text-xs uppercase tracking-wide"
          >
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
}
