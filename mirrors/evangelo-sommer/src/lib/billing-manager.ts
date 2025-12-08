// src/lib/billing-manager.ts
import { 
  Receipt, 
  Invoice, 
  ReceiptItem, 
  InvoiceItem, 
  CreateReceiptData, 
  CreateInvoiceData, 
  BillingSuggestion,
  BillingAnalytics,
  DEFAULT_TAX_CONFIG,
  TaxConfig,
  BusinessConfig,
  DEFAULT_BUSINESS_CONFIG,
  Quote,
  QuoteItem,
  CreateQuoteData
} from '../types/billing';
import { Client, Conversation, Message } from '../types/client';

class BillingManager {
  private receipts: Receipt[] = [];
  private invoices: Invoice[] = [];
  private quotes: Quote[] = [];
  private taxConfig: TaxConfig = DEFAULT_TAX_CONFIG;
  private businessConfig: BusinessConfig = DEFAULT_BUSINESS_CONFIG;

  // Receipt Management
  async createReceipt(data: CreateReceiptData): Promise<Receipt> {
    console.log('[BillingManager] createReceipt called with clientId:', data.clientId);

    // CRITICAL: Always fetch latest client data
    console.log('[BillingManager] Fetching client data...');
    const client = await this.getClientById(data.clientId);

    if (!client) {
      console.error('[BillingManager] Client not found for ID:', data.clientId);
      throw new Error('Client not found');
    }
    console.log('[BillingManager] Client found:', { id: client.id, name: client.name, email: client.email });

    // Verify client has required info for receipt
    if (!client.email || !client.name) {
      console.error('[BillingManager] Client missing required info:', { hasEmail: !!client.email, hasName: !!client.name });
      throw new Error('Client missing required information for receipt generation');
    }

    console.log('[BillingManager] Generating receipt items...');
    // Generate receipt items with IDs
    const items: ReceiptItem[] = data.items.map(item => ({
      ...item,
      id: this.generateId(),
      totalPrice: item.quantity * item.unitPrice
    }));

    const subtotal = this.calculateSubtotal(items);
    const taxAmount = this.calculateTax(items);
    const totalAmount = subtotal + taxAmount;
    console.log('[BillingManager] Calculated totals:', { subtotal, taxAmount, totalAmount });

    console.log('[BillingManager] Generating receipt number...');
    const receiptNumber = await this.generateReceiptNumber();
    console.log('[BillingManager] Receipt number:', receiptNumber);

    const receipt: Receipt = {
      id: this.generateId(),
      receiptNumber: receiptNumber,
      clientId: data.clientId,
      client: client, // Use fresh client data
      conversationId: data.conversationId,
      items: items,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate || new Date(),
      serviceDate: data.serviceDate || new Date(),
      status: data.status || 'draft',
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('[BillingManager] Saving receipt to database...');
    const savedReceipt = await this.saveReceipt(receipt);
    console.log('[BillingManager] Receipt saved successfully:', savedReceipt.id);

    return savedReceipt;
  }

  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    // CRITICAL: Always fetch latest client data
    const client = await this.getClientById(data.clientId);
    
    if (!client) {
      throw new Error('Client not found');
    }
    
    // Verify client has required info for invoice
    if (!client.email || !client.name) {
      throw new Error('Client missing required information for invoice generation');
    }

    // Generate invoice items with IDs
    const items: InvoiceItem[] = data.items.map(item => ({
      ...item,
      id: this.generateId(),
      totalPrice: item.quantity * item.unitPrice
    }));

    const subtotal = this.calculateSubtotal(items);
    const taxAmount = this.calculateTax(items);
    const totalAmount = subtotal + taxAmount;
    
    const invoice: Invoice = {
      id: this.generateId(),
      invoiceNumber: await this.generateInvoiceNumber(),
      clientId: data.clientId,
      client: client, // Use fresh client data
      conversationId: data.conversationId,
      items: items,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      dueDate: data.dueDate || this.calculateDueDate(data.paymentTerms || 'net30'),
      paymentTerms: data.paymentTerms || 'net30',
      status: 'draft',
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await this.saveInvoice(invoice);
  }

  // Client Data Sync Functions
  async syncBillingDocumentsWithClient(clientId: string, updatedClient: Client): Promise<void> {
    // Update all receipts
    await this.updateReceiptsClientData(clientId, {
      name: updatedClient.name,
      email: updatedClient.email,
      phone: updatedClient.phone,
      address: updatedClient.address,
      company: updatedClient.company
    });
    
    // Update all invoices
    await this.updateInvoicesClientData(clientId, updatedClient);
    
    console.log(`Synced billing documents for client: ${updatedClient.name}`);
  }

  private async updateReceiptsClientData(clientId: string, clientData: Partial<Client>): Promise<void> {
    const clientReceipts = this.receipts.filter(r => r.clientId === clientId);
    
    for (const receipt of clientReceipts) {
      receipt.client = { ...receipt.client, ...clientData };
      receipt.updatedAt = new Date();
      await this.saveReceipt(receipt);
    }
  }

  private async updateInvoicesClientData(clientId: string, updatedClient: Client): Promise<void> {
    const clientInvoices = this.invoices.filter(i => i.clientId === clientId);
    
    for (const invoice of clientInvoices) {
      invoice.client = updatedClient;
      invoice.updatedAt = new Date();
      await this.saveInvoice(invoice);
    }
  }

  // Individual Message Analysis for Billing
  analyzeMessageForBilling(message: Message, client: Client): BillingSuggestion {
    // Only analyze client messages
    if (message.role !== 'client') {
      return { type: 'none', confidence: 'low', reason: 'Not a client message' };
    }

    const content = message.content.toLowerCase();
    
    // High confidence patterns
    if (this.hasHighConfidencePattern(content)) {
      return {
        type: this.determineDocumentType(content),
        confidence: 'high',
        suggestedAmount: this.extractAmount([message]),
        reason: 'Strong billing indicators detected in message'
      };
    }
    
    // Medium confidence patterns
    if (this.hasMediumConfidencePattern(content)) {
      return {
        type: this.determineDocumentType(content),
        confidence: 'medium',
        suggestedAmount: this.extractAmount([message]),
        reason: 'Possible billing opportunity detected'
      };
    }
    
    // Low confidence patterns
    if (this.hasLowConfidencePattern(content)) {
      return {
        type: 'receipt',
        confidence: 'low',
        suggestedAmount: this.extractAmount([message]),
        reason: 'Service-related content detected'
      };
    }
    
    return { type: 'none', confidence: 'low', reason: 'No billing indicators found' };
  }

  private hasHighConfidencePattern(content: string): boolean {
    const highConfidencePatterns = [
      /paid.*\$\d+/,
      /payment.*received/,
      /cash.*\$\d+/,
      /(service|work).*completed.*paid/,
      /done.*job.*\$\d+/,
      /finished.*here.*money/,
      /etransfer.*sent/,
      /card.*payment/
    ];
    
    return highConfidencePatterns.some(pattern => pattern.test(content));
  }

  private hasMediumConfidencePattern(content: string): boolean {
    const mediumConfidencePatterns = [
      /(job|work|service).*done/,
      /(finished|completed).*today/,
      /all.*set/,
      /ready.*for.*invoice/,
      /how.*much.*owe/,
      /send.*bill/,
      /what.*cost/,
      /payment.*ready/
    ];
    
    return mediumConfidencePatterns.some(pattern => pattern.test(content));
  }

  private hasLowConfidencePattern(content: string): boolean {
    const serviceKeywords = [
      'lawn', 'grass', 'mowing', 'landscaping', 'garden',
      'snow', 'driveway', 'shovel', 'salt', 'plowing',
      'hair', 'cut', 'trim', 'style', 'color',
      'website', 'app', 'design', 'development', 'coding'
    ];
    
    return serviceKeywords.some(keyword => content.includes(keyword));
  }

  private determineDocumentType(content: string): 'receipt' | 'invoice' {
    const receiptIndicators = ['paid', 'payment', 'cash', 'card', 'etransfer'];
    const invoiceIndicators = ['bill', 'invoice', 'charge', 'owe'];
    
    if (receiptIndicators.some(indicator => content.includes(indicator))) {
      return 'receipt';
    }
    
    return 'invoice';
  }

  // Conversation Analysis for Billing
  analyzeConversationForBilling(conversation: Conversation): BillingSuggestion {
    const messages = conversation.messages;
    const lastMessages = messages.slice(-5); // Check last 5 messages
    
    const indicators = {
      serviceCompleted: this.checkForServiceCompletion(lastMessages),
      paymentMentioned: this.checkForPaymentMention(lastMessages),
      pricingDiscussed: this.checkForPricingDiscussion(messages),
      schedulingConfirmed: this.checkForSchedulingConfirmation(messages)
    };
    
    // Determine if receipt should be suggested
    if (indicators.serviceCompleted && indicators.paymentMentioned) {
      return {
        type: 'receipt',
        confidence: 'high',
        suggestedItems: this.extractServiceItems(messages),
        suggestedAmount: this.extractAmount(lastMessages),
        reason: 'Service completed and payment mentioned in conversation'
      };
    }
    
    // Determine if invoice should be suggested
    if (indicators.serviceCompleted && !indicators.paymentMentioned) {
      return {
        type: 'invoice',
        confidence: 'medium',
        suggestedItems: this.extractServiceItems(messages),
        suggestedAmount: this.extractAmount(messages),
        reason: 'Service completed but no payment mentioned'
      };
    }
    
    return { 
      type: 'none', 
      confidence: 'low',
      reason: 'No clear billing indicators found in conversation'
    };
  }

  // Enhanced message-level analysis for auto-draft billing with seasonal intelligence
  analyzeMessageForAutoDraft(message: Message, context: { conversation: Conversation, client: Client }): {
    shouldTrigger: boolean;
    confidence: 'high' | 'medium' | 'low';
    serviceType: string | null;
    suggestedAmount: number | null;
    reason: string;
  } {
    const content = message.content.toLowerCase();
    const currentSeason = this.getCurrentSeason();
    const clientServices = context.client.serviceTypes || [];
    const isSeasonalService = this.isClientSeasonalService(context.client);
    
    // Dynamic service patterns based on season and client services
    const servicePatterns = this.getSeasonalServicePatterns(currentSeason, clientServices, isSeasonalService);

    // Check for service type
    let detectedService = null;
    let serviceAmount = null;
    
    for (const [serviceType, patterns] of Object.entries(servicePatterns)) {
      if (patterns.triggers.some(trigger => content.includes(trigger))) {
        detectedService = serviceType;
        serviceAmount = patterns.defaultAmount;
        
        // Check for completion indicators
        const isCompleted = patterns.completion.some(completion => content.includes(completion));
        
        if (isCompleted) {
          const contractInfo = patterns.contractType === 'seasonal' ? '(Seasonal Contract)' : '(Per-Service)';
          const seasonInfo = `${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)} Season`;
          
          // High confidence for explicit completion + payment mention
          if (this.checkForPaymentMention([message])) {
            return {
              shouldTrigger: true,
              confidence: 'high',
              serviceType: serviceType,
              suggestedAmount: this.extractAmount([message]) || serviceAmount,
              reason: `${seasonInfo} ${serviceType} completion detected with payment mention ${contractInfo}`
            };
          }
          
          // Medium confidence for completion without payment
          return {
            shouldTrigger: true,
            confidence: 'medium',
            serviceType: serviceType,
            suggestedAmount: serviceAmount,
            reason: `${seasonInfo} ${serviceType} completion detected ${contractInfo}`
          };
        }
        
        // Low confidence for service mention without completion
        if (this.checkForSchedulingLanguage([message])) {
          return {
            shouldTrigger: false, // Don't trigger on scheduling, just track
            confidence: 'low',
            serviceType: serviceType,
            suggestedAmount: null,
            reason: `${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)} service scheduling detected for ${serviceType}`
          };
        }
      }
    }

    return {
      shouldTrigger: false,
      confidence: 'low',
      serviceType: null,
      suggestedAmount: null,
      reason: `No ${currentSeason} service indicators detected for client services: ${clientServices.length > 0 ? clientServices.join(', ') : 'none configured'}`
    };
  }

  // Enhanced service completion detection with context
  private checkForServiceCompletion(messages: Message[]): boolean {
    const completionPhrases = [
      'job is done', 'finished', 'completed', 'all set',
      'work is finished', 'service completed', 'task completed',
      'wrapped up', 'done with', 'finished up', 'work completed',
      'finished cutting', 'lawn is done', 'grass is cut', 'mowing completed',
      'driveway is clear', 'snow removed', 'finished plowing', 'clearing done',
      'landscaping done', 'yard work finished', 'trimming completed'
    ];
    
    return messages.some(msg => 
      completionPhrases.some(phrase => 
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  // Check for scheduling language patterns
  private checkForSchedulingLanguage(messages: Message[]): boolean {
    const schedulingPhrases = [
      'availability', 'schedule', 'which time', 'which dates', 'time slots',
      'when can you', 'what time', 'appointment', 'booking', 'available',
      'next week', 'tomorrow', 'this week', 'when are you free'
    ];
    
    return messages.some(msg => 
      schedulingPhrases.some(phrase => 
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  // Payment mention detection
  private checkForPaymentMention(messages: Message[]): boolean {
    const paymentPhrases = [
      'paid', 'payment', 'cash', 'card', 'e-transfer',
      'bill', 'charge', 'cost', '$', 'invoice', 'receipt',
      'etransfer', 'interac', 'visa', 'mastercard'
    ];
    
    return messages.some(msg =>
      paymentPhrases.some(phrase =>
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  private checkForPricingDiscussion(messages: Message[]): boolean {
    const pricingPhrases = [
      'price', 'cost', 'quote', 'estimate', '$', 'dollar',
      'rate', 'fee', 'charge', 'total', 'amount'
    ];
    
    return messages.some(msg =>
      pricingPhrases.some(phrase =>
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  private checkForSchedulingConfirmation(messages: Message[]): boolean {
    const schedulingPhrases = [
      'scheduled', 'appointment', 'booked', 'confirmed',
      'see you', 'coming by', 'visit', 'arrive'
    ];
    
    return messages.some(msg =>
      schedulingPhrases.some(phrase =>
        msg.content.toLowerCase().includes(phrase)
      )
    );
  }

  private extractServiceItems(messages: Message[]): ReceiptItem[] {
    // Simple extraction - in a real implementation, this would use NLP
    const items: ReceiptItem[] = [];
    
    // Look for common service patterns
    const servicePatterns = [
      { pattern: /lawn\s*(care|mowing|cutting)/i, service: 'lawn_care', description: 'Lawn Care Service' },
      { pattern: /landscaping/i, service: 'landscaping', description: 'Landscaping Service' },
      { pattern: /snow\s*(removal|clearing)/i, service: 'snow_removal', description: 'Snow Removal Service' },
      { pattern: /maintenance/i, service: 'maintenance', description: 'Maintenance Service' },
      { pattern: /consultation/i, service: 'consultation', description: 'Consultation Service' }
    ];

    const messageText = messages.map(m => m.content).join(' ');
    
    servicePatterns.forEach(pattern => {
      if (pattern.pattern.test(messageText)) {
        items.push({
          id: this.generateId(),
          description: pattern.description,
          serviceType: pattern.service as 'landscaping' | 'snow_removal' | 'hair_cutting' | 'creative_development',
          quantity: 1,
          unitPrice: 0, // Would need to be filled in by user
          totalPrice: 0,
          taxable: true
        });
      }
    });

    return items;
  }

  private extractAmount(messages: Message[]): number | undefined {
    const messageText = messages.map(m => m.content).join(' ');
    
    // Look for dollar amounts
    const dollarMatch = messageText.match(/\$(\d+(?:\.\d{2})?)/);
    if (dollarMatch) {
      return parseFloat(dollarMatch[1]);
    }
    
    return undefined;
  }

  // Calculation helpers
  private calculateSubtotal(items: (ReceiptItem | InvoiceItem)[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  private calculateTax(items: (ReceiptItem | InvoiceItem)[], businessRegistered?: boolean): number {
    // For unregistered business under $30k CAD, no tax is applicable
    if (!businessRegistered && !this.businessConfig.isRegistered) {
      return 0;
    }
    
    const taxableAmount = items
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    
    return taxableAmount * this.taxConfig.rate;
  }

  private calculateTaxForQuote(items: QuoteItem[], businessRegistered?: boolean): number {
    // For unregistered business under $30k CAD, no tax is applicable
    if (!businessRegistered && !this.businessConfig.isRegistered) {
      return 0;
    }
    
    // For quotes, assume all items are taxable unless specified otherwise
    const taxableAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    return taxableAmount * this.taxConfig.rate;
  }

  private calculateDueDate(paymentTerms: Invoice['paymentTerms']): Date {
    const now = new Date();
    switch (paymentTerms) {
      case 'due_on_receipt':
        return now;
      case 'net15':
        return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      case 'net30':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'net45':
        return new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Number generation
  private async generateReceiptNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const prefix = `REC-${year}-`;
      
      // Check database for existing receipt numbers to prevent duplicates
      if (typeof window === 'undefined') {
        const { getPrismaClient } = await import('./prisma');
        const prisma = getPrismaClient();
        
        if (prisma) {
          // Get all receipts from current year from database
          const existingReceipts = await prisma.document.findMany({
            where: { type: 'RECEIPT' },
            select: { content: true }
          });
          
          // Extract receipt numbers from content and filter by current year
          const currentYearNumbers: number[] = [];
          
          existingReceipts.forEach(doc => {
            try {
              const receiptData = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
              if (receiptData.receiptNumber && receiptData.receiptNumber.startsWith(prefix)) {
                // Extract the number part (e.g., "REC-2025-001" -> 1)
                const numberPart = receiptData.receiptNumber.split('-').pop();
                if (numberPart) {
                  const num = parseInt(numberPart, 10);
                  if (!isNaN(num)) {
                    currentYearNumbers.push(num);
                  }
                }
              }
            } catch (error) {
              console.warn('Error parsing receipt content for numbering:', error);
            }
          });
          
          // Find the next available number
          const maxNumber = currentYearNumbers.length > 0 ? Math.max(...currentYearNumbers) : 0;
          const nextNumber = maxNumber + 1;
          
          return `REC-${year}-${nextNumber.toString().padStart(3, '0')}`;
        }
      }
      
      // Fallback to in-memory method if database is not available
      const count = this.receipts.filter(r => 
        r.receiptNumber.startsWith(prefix)
      ).length + 1;
      
      return `REC-${year}-${count.toString().padStart(3, '0')}`;
      
    } catch (error) {
      console.error('Error generating receipt number:', error);
      // Emergency fallback with timestamp
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      return `REC-${year}-${timestamp}`;
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.invoices.filter(i => 
      i.invoiceNumber.startsWith(`INV-${year}`)
    ).length + 1;
    
    return `INV-${year}-${count.toString().padStart(3, '0')}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Data persistence (mock implementation - replace with actual database)
  private async saveReceipt(receipt: Receipt): Promise<Receipt> {
    console.log('[BillingManager] saveReceipt called for receipt:', receipt.receiptNumber);
    try {
      // Only use Prisma on server-side
      if (typeof window === 'undefined') {
        console.log('[BillingManager] Running on server-side, importing Prisma...');
        // Import Prisma client dynamically to avoid circular dependencies
        const { getPrismaClient } = await import('./prisma');
        const prisma = getPrismaClient();
        console.log('[BillingManager] Prisma client available:', !!prisma);

      if (prisma) {
        console.log('[BillingManager] Creating document in database...');
        // Save to database as a Document with type RECEIPT
        const savedDocument = await prisma.document.create({
          data: {
            clientId: receipt.clientId,
            name: `Receipt ${receipt.receiptNumber}`,
            type: 'RECEIPT',
            status: receipt.status === 'paid' ? 'PAID' : 'DRAFT',
            content: JSON.stringify({
              receiptNumber: receipt.receiptNumber,
              items: receipt.items,
              subtotal: receipt.subtotal,
              taxAmount: receipt.taxAmount,
              totalAmount: receipt.totalAmount,
              paymentMethod: receipt.paymentMethod,
              paymentDate: receipt.paymentDate,
              serviceDate: receipt.serviceDate,
              notes: receipt.notes
            }),
            amount: receipt.totalAmount,
            currency: 'CAD',
            sentDate: new Date(),
            paidDate: receipt.status === 'paid' ? new Date() : null,
            metadata: undefined
          }
        });

        console.log('[BillingManager] Document created successfully, ID:', savedDocument.id);
          // Update receipt with database ID
          receipt.id = savedDocument.id;
        console.log('[BillingManager] Receipt ID updated to:', receipt.id);
        }
      }
    } catch (error) {
      console.error('[BillingManager] Failed to save receipt to database:', error);
      console.error('[BillingManager] Error stack:', (error as Error).stack);
      // Fall back to in-memory storage
    }

    console.log('[BillingManager] Saving to in-memory storage...');
    // Also save to memory for backward compatibility
    const existingIndex = this.receipts.findIndex(r => r.id === receipt.id);
    if (existingIndex >= 0) {
      this.receipts[existingIndex] = receipt;
      console.log('[BillingManager] Updated existing in-memory receipt');
    } else {
      this.receipts.push(receipt);
      console.log('[BillingManager] Added new in-memory receipt');
    }
    console.log('[BillingManager] Receipt save complete, returning receipt');
    return receipt;
  }

  private async saveInvoice(invoice: Invoice): Promise<Invoice> {
    const existingIndex = this.invoices.findIndex(i => i.id === invoice.id);
    if (existingIndex >= 0) {
      this.invoices[existingIndex] = invoice;
    } else {
      this.invoices.push(invoice);
    }
    return invoice;
  }

  // Client data fetching - directly from database to avoid auth issues
  private async getClientById(clientId: string): Promise<Client | null> {
    try {
      console.log('[BillingManager] Fetching client directly from database...');

      // Only use Prisma on server-side
      if (typeof window === 'undefined') {
        const { getPrismaClient } = await import('./prisma');
        const { transformClientRecordForResponse } = await import('./json-fields');
        const prisma = getPrismaClient();

        if (!prisma) {
          console.error('[BillingManager] Prisma client not available');
          return null;
        }

        console.log('[BillingManager] Querying database for client:', clientId);
        const clientRecord = await prisma.clientRecord.findUnique({
          where: { id: clientId },
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true
              }
            },
            serviceHistory: {
              take: 10,
              orderBy: { serviceDate: 'desc' }
            },
            serviceContracts: {
              orderBy: [
                { isPrimary: 'desc' },
                { isActive: 'desc' },
                { createdAt: 'asc' }
              ]
            }
          }
        });

        if (!clientRecord) {
          console.error(`[BillingManager] Client with ID ${clientId} not found in database`);
          return null;
        }

        console.log('[BillingManager] Client record found, transforming...');
        const client = transformClientRecordForResponse(clientRecord);
        console.log('[BillingManager] Client transformed:', { id: client.id, name: client.name, email: client.email });

        return client;
      }

      console.error('[BillingManager] Cannot fetch client on client-side');
      return null;
    } catch (error) {
      console.error('[BillingManager] Error fetching client:', error);
      console.error('[BillingManager] Error stack:', (error as Error).stack);
      return null;
    }
  }

  // Public getters
  async getAllReceipts(includeArchived: boolean = false): Promise<Receipt[]> {
    try {
      // Only use Prisma on server-side
      if (typeof window === 'undefined') {
        // Import Prisma client dynamically
        const { getPrismaClient } = await import('./prisma');
        const prisma = getPrismaClient();
      
      if (prisma) {
        const documents = await prisma.document.findMany({
          where: { type: 'RECEIPT' },
          include: { client: true },
          orderBy: { createdAt: 'desc' }
        });
        
        // Transform database documents to Receipt format
        const allReceipts: Receipt[] = documents.map(doc => {
          const receiptData = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
          return {
            id: doc.id,
            receiptNumber: receiptData.receiptNumber || `REC-${doc.id.slice(-6).toUpperCase()}`,
            clientId: doc.clientId,
            client: {
              id: doc.client.participantId,
              name: doc.client.name,
              email: doc.client.email || undefined,
              phone: doc.client.phone || undefined,
              company: doc.client.company || undefined
            },
            items: receiptData.items || [],
            subtotal: receiptData.subtotal || doc.amount || 0,
            taxAmount: receiptData.taxAmount || 0,
            totalAmount: receiptData.totalAmount || doc.amount || 0,
            paymentMethod: receiptData.paymentMethod || 'cash',
            paymentDate: receiptData.paymentDate ? new Date(receiptData.paymentDate) : doc.paidDate || new Date(),
            serviceDate: receiptData.serviceDate ? new Date(receiptData.serviceDate) : doc.createdAt,
            status: doc.status === 'PAID' ? 'paid' : (receiptData.emailSentAt ? 'sent' : 'draft'),
            emailStatus: receiptData.emailStatus || null,
            emailSentAt: receiptData.emailSentAt ? new Date(receiptData.emailSentAt) : undefined,
            emailDeliveredAt: receiptData.emailDeliveredAt ? new Date(receiptData.emailDeliveredAt) : undefined,
            emailError: receiptData.emailError || undefined,
            notes: receiptData.notes || '',
            archived: receiptData.archived || false,
            archivedAt: receiptData.archivedAt ? new Date(receiptData.archivedAt) : undefined,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            conversationId: receiptData.conversationId
          } as Receipt;
        });
        
        // Filter based on archive status
        const receipts = includeArchived 
          ? allReceipts 
          : allReceipts.filter(receipt => !receipt.archived);
        
          return receipts;
        }
      }
    } catch (error) {
      console.error('Failed to fetch receipts from database:', error);
    }
    
    // Fall back to in-memory receipts
    return [...this.receipts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getReceiptsByClientId(clientId: string): Promise<Receipt[]> {
    console.log('[BillingManager] getReceiptsByClientId called with clientId:', clientId);
    try {
      // Only use Prisma on server-side
      if (typeof window === 'undefined') {
        const { getPrismaClient } = await import('./prisma');
        const prisma = getPrismaClient();

        if (prisma) {
          console.log('[BillingManager] Querying database for receipts with clientId:', clientId);
          const documents = await prisma.document.findMany({
            where: {
              type: 'RECEIPT',
              clientId: clientId
            },
            include: { client: true },
            orderBy: { createdAt: 'desc' }
          });

          console.log('[BillingManager] Database returned', documents.length, 'documents');
          if (documents.length > 0) {
            console.log('[BillingManager] First document clientId:', documents[0].clientId);
          }

          // Transform database documents to Receipt format
          const receipts: Receipt[] = documents.map(doc => {
            const receiptData = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
            return {
              id: doc.id,
              receiptNumber: receiptData.receiptNumber || `REC-${doc.id.slice(-6).toUpperCase()}`,
              clientId: doc.clientId,
              client: {
                id: doc.client.participantId,
                name: doc.client.name,
                email: doc.client.email || undefined,
                phone: doc.client.phone || undefined,
                company: doc.client.company || undefined
              },
              items: receiptData.items || [],
              subtotal: receiptData.subtotal || doc.amount || 0,
              taxAmount: receiptData.taxAmount || 0,
              totalAmount: receiptData.totalAmount || doc.amount || 0,
              paymentMethod: receiptData.paymentMethod || 'cash',
              paymentDate: receiptData.paymentDate ? new Date(receiptData.paymentDate) : doc.paidDate || new Date(),
              serviceDate: receiptData.serviceDate ? new Date(receiptData.serviceDate) : doc.createdAt,
              status: doc.status === 'PAID' ? 'paid' : (receiptData.emailSentAt ? 'sent' : 'draft'),
              emailStatus: receiptData.emailStatus || null,
              emailSentAt: receiptData.emailSentAt ? new Date(receiptData.emailSentAt) : undefined,
              emailDeliveredAt: receiptData.emailDeliveredAt ? new Date(receiptData.emailDeliveredAt) : undefined,
              emailError: receiptData.emailError || undefined,
              notes: receiptData.notes || '',
              archived: receiptData.archived || false,
              archivedAt: receiptData.archivedAt ? new Date(receiptData.archivedAt) : undefined,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
              conversationId: receiptData.conversationId
            } as Receipt;
          });

          // Filter out archived receipts
          return receipts.filter(receipt => !receipt.archived);
        }
      }
    } catch (error) {
      console.error('Failed to fetch receipts from database for clientId:', clientId, error);
    }

    // Fall back to in-memory receipts
    return this.receipts.filter(r => r.clientId === clientId);
  }

  getInvoicesByClientId(clientId: string): Invoice[] {
    return this.invoices.filter(i => i.clientId === clientId);
  }

  getReceiptsByConversationId(conversationId: string): Receipt[] {
    return this.receipts.filter(r => r.conversationId === conversationId);
  }

  getInvoicesByConversationId(conversationId: string): Invoice[] {
    return this.invoices.filter(i => i.conversationId === conversationId);
  }

  async getReceiptById(receiptId: string): Promise<Receipt | null> {
    try {
      // Only use Prisma on server-side
      if (typeof window === 'undefined') {
        const { getPrismaClient } = await import('./prisma');
        const prisma = getPrismaClient();
        
        if (prisma) {
          const document = await prisma.document.findUnique({
            where: { 
              id: receiptId,
              type: 'RECEIPT'
            },
            include: { client: true }
          });
          
          if (document) {
            // Transform database document to Receipt format
            const receiptData = typeof document.content === 'string' ? JSON.parse(document.content) : document.content;
            return {
              id: document.id,
              receiptNumber: receiptData.receiptNumber || `REC-${document.id.slice(-6).toUpperCase()}`,
              clientId: document.clientId,
              client: document.client as any,
              conversationId: receiptData.conversationId || null,
              items: receiptData.items || [],
              subtotal: receiptData.subtotal || 0,
              taxAmount: receiptData.taxAmount || 0,
              totalAmount: receiptData.totalAmount || 0,
              paymentMethod: receiptData.paymentMethod || 'cash',
              paymentDate: receiptData.paymentDate ? new Date(receiptData.paymentDate) : new Date(),
              serviceDate: receiptData.serviceDate ? new Date(receiptData.serviceDate) : new Date(),
              status: receiptData.status === 'paid' ? 'paid' : (receiptData.emailSentAt ? 'sent' : 'draft'),
              emailStatus: receiptData.emailStatus || null,
              emailSentAt: receiptData.emailSentAt ? new Date(receiptData.emailSentAt) : undefined,
              emailDeliveredAt: receiptData.emailDeliveredAt ? new Date(receiptData.emailDeliveredAt) : undefined,
              notes: receiptData.notes || '',
              createdAt: document.createdAt,
              updatedAt: document.updatedAt
            };
          }
        }
      }
      
      // Fallback to in-memory search
      return this.receipts.find(r => r.id === receiptId) || null;
    } catch (error) {
      console.error('Error fetching receipt by ID:', error);
      // Fallback to in-memory search
      return this.receipts.find(r => r.id === receiptId) || null;
    }
  }

  async updateReceipt(receiptId: string, updateData: any): Promise<Receipt | null> {
    try {
      // Only use Prisma on server-side
      if (typeof window === 'undefined') {
        const { getPrismaClient } = await import('./prisma');
        const prisma = getPrismaClient();
      
      if (!prisma) {
        console.error('Database connection failed');
        return null;
      }

      // Find the existing document
      const existingDoc = await prisma.document.findUnique({
        where: { 
          id: receiptId,
          type: 'RECEIPT'
        },
        include: { client: true }
      });

      if (!existingDoc) {
        console.error(`Receipt with ID ${receiptId} not found`);
        return null;
      }

      // Parse existing receipt data
      const existingReceiptData = typeof existingDoc.content === 'string' ? JSON.parse(existingDoc.content) : existingDoc.content;
      
      // Calculate new totals if items were updated
      const items = updateData.items || existingReceiptData.items || [];
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
      const taxAmount = 0; // No tax for unregistered business
      const totalAmount = subtotal + taxAmount;

      // Merge updated data with existing data
      const updatedReceiptData = {
        ...existingReceiptData,
        ...updateData,
        items: items,
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: totalAmount
      };

      // Determine the new document status based on receipt status
      let newDocStatus = existingDoc.status;
      let newPaidDate = existingDoc.paidDate;

      if (updateData.status === 'paid') {
        newDocStatus = 'PAID';
        newPaidDate = new Date();
      } else if (updateData.status === 'draft') {
        newDocStatus = 'DRAFT';
        newPaidDate = null;
      } else if (updateData.status === 'sent') {
        newDocStatus = 'SENT';
        newPaidDate = null;
      }

      // Update the document
      const updatedDoc = await prisma.document.update({
        where: { id: receiptId },
        data: {
          content: JSON.stringify(updatedReceiptData),
          amount: totalAmount,
          status: newDocStatus,
          paidDate: newPaidDate,
          updatedAt: new Date()
        },
        include: { client: true }
      });

      // Transform back to Receipt format
      const updatedReceipt: Receipt = {
        id: updatedDoc.id,
        receiptNumber: updatedReceiptData.receiptNumber || `REC-${updatedDoc.id.slice(-6).toUpperCase()}`,
        clientId: updatedDoc.clientId,
        client: updatedDoc.client as any,
        items: updatedReceiptData.items || [],
        subtotal: updatedReceiptData.subtotal || 0,
        taxAmount: updatedReceiptData.taxAmount || 0,
        totalAmount: updatedReceiptData.totalAmount || 0,
        paymentMethod: updatedReceiptData.paymentMethod || 'cash',
        paymentDate: new Date(updatedReceiptData.paymentDate || updatedDoc.paidDate || new Date()),
        serviceDate: new Date(updatedReceiptData.serviceDate || updatedDoc.createdAt),
        status: updatedDoc.status === 'PAID' ? 'paid' : (updatedReceiptData.emailSentAt ? 'sent' : 'draft'),
        emailStatus: updatedReceiptData.emailStatus || null,
        emailSentAt: updatedReceiptData.emailSentAt ? new Date(updatedReceiptData.emailSentAt) : undefined,
        emailDeliveredAt: updatedReceiptData.emailDeliveredAt ? new Date(updatedReceiptData.emailDeliveredAt) : undefined,
        emailError: updatedReceiptData.emailError || undefined,
        notes: updatedReceiptData.notes || '',
        createdAt: updatedDoc.createdAt,
        updatedAt: updatedDoc.updatedAt,
        conversationId: updatedReceiptData.conversationId
      };

      // Update in-memory storage as well
      const existingIndex = this.receipts.findIndex(r => r.id === receiptId);
      if (existingIndex >= 0) {
        this.receipts[existingIndex] = updatedReceipt;
      }

        return updatedReceipt;
      }

    } catch (error) {
      console.error('Failed to update receipt:', error);
      return null;
    }

    // Client-side fallback
    return null;
  }

  getInvoiceById(invoiceId: string): Invoice | null {
    return this.invoices.find(i => i.id === invoiceId) || null;
  }

  // Quote Management
  async createQuote(data: CreateQuoteData): Promise<Quote> {
    // CRITICAL: Always fetch latest client data
    const client = await this.getClientById(data.clientId);
    
    if (!client) {
      throw new Error('Client not found');
    }
    
    // Verify client has required info for quote (name is sufficient)
    if (!client.name) {
      throw new Error('Client missing required information for quote generation');
    }

    // Generate quote items with IDs
    const items: QuoteItem[] = data.items.map(item => ({
      ...item,
      id: this.generateId(),
      totalPrice: item.quantity * item.unitPrice
    }));

    const subtotal = this.calculateSubtotal(items as any); // QuoteItem compatible with calculation
    const businessRegistered = data.businessRegistered ?? this.businessConfig.isRegistered;
    const taxAmount = this.calculateTaxForQuote(items, businessRegistered);
    const totalAmount = subtotal + taxAmount;
    
    const quote: Quote = {
      id: this.generateId(),
      quoteNumber: await this.generateQuoteNumber(),
      clientId: data.clientId,
      client: client, // Use fresh client data
      conversationId: data.conversationId,
      items: items,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      taxStatus: businessRegistered ? 'applicable' : 'not_applicable',
      businessRegistered: businessRegistered,
      validUntil: data.validUntil,
      status: 'draft',
      notes: data.notes,
      terms: data.terms || this.getDefaultQuoteTerms(client.serviceId),
      projectScope: data.projectScope,
      estimatedDuration: data.estimatedDuration,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await this.saveQuote(quote);
  }

  async updateQuoteStatus(quoteId: string, status: Quote['status']): Promise<Quote> {
    const quote = this.getQuoteById(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    quote.status = status;
    quote.updatedAt = new Date();

    if (status === 'sent') {
      quote.sentAt = new Date();
    } else if (status === 'accepted') {
      quote.acceptedAt = new Date();
    } else if (status === 'declined') {
      quote.declinedAt = new Date();
    }

    return await this.saveQuote(quote);
  }

  async convertQuoteToInvoice(quoteId: string): Promise<Invoice> {
    const quote = this.getQuoteById(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status !== 'accepted') {
      throw new Error('Quote must be accepted before converting to invoice');
    }

    // Convert quote items to invoice items
    const invoiceItems: InvoiceItem[] = quote.items.map(item => ({
      id: this.generateId(),
      description: item.description,
      serviceType: item.serviceCategory as any, // Map serviceCategory to serviceType
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      taxable: true
    }));

    const invoiceData: CreateInvoiceData = {
      clientId: quote.clientId,
      conversationId: quote.conversationId,
      items: invoiceItems.map(item => ({
        description: item.description,
        serviceType: item.serviceType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        taxable: item.taxable
      })),
      notes: `Converted from Quote ${quote.quoteNumber}. ${quote.notes || ''}`.trim()
    };

    const invoice = await this.createInvoice(invoiceData);

    // Update quote status and link to invoice
    quote.status = 'converted';
    quote.convertedToInvoiceId = invoice.id;
    quote.updatedAt = new Date();
    await this.saveQuote(quote);

    return invoice;
  }

  private getDefaultQuoteTerms(serviceId?: string): string {
    const baseTerms = `This quote is valid for 30 days from the date issued.
Pricing subject to change after expiration date.
Work will commence upon written acceptance of this quote.
Payment terms: Net 30 days from invoice date.`;

    const serviceSpecificTerms: Record<string, string> = {
      landscaping: `${baseTerms}
Weather conditions may affect project timeline.
Materials costs subject to supplier availability.`,
      
      'creative-development': `${baseTerms}
50% deposit required to begin work.
Additional revisions beyond scope may incur extra charges.
Client responsible for providing necessary assets and content.`,
      
      'snow-removal': `${baseTerms}
Seasonal contract rates available.
Emergency service calls subject to additional charges.`,
      
      'hair-cutting': `${baseTerms}
Appointment booking required.
Cancellation policy: 24 hours notice required.`
    };

    return serviceSpecificTerms[serviceId || ''] || baseTerms;
  }

  private async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this.quotes.filter(q => 
      q.quoteNumber.startsWith(`QUO-${year}`)
    ).length + 1;
    
    return `QUO-${year}-${count.toString().padStart(3, '0')}`;
  }

  private async saveQuote(quote: Quote): Promise<Quote> {
    const existingIndex = this.quotes.findIndex(q => q.id === quote.id);
    if (existingIndex >= 0) {
      this.quotes[existingIndex] = quote;
    } else {
      this.quotes.push(quote);
    }
    return quote;
  }

  // Quote getters
  getQuotesByClientId(clientId: string): Quote[] {
    return this.quotes.filter(q => q.clientId === clientId);
  }

  getQuoteById(quoteId: string): Quote | null {
    return this.quotes.find(q => q.id === quoteId) || null;
  }

  getExpiredQuotes(): Quote[] {
    const now = new Date();
    return this.quotes.filter(q => 
      q.status === 'sent' && q.validUntil < now
    );
  }

  // Analytics
  calculateBillingAnalytics(): BillingAnalytics {
    const totalRevenue = this.receipts.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalReceiptsIssued = this.receipts.length;
    const totalInvoicesSent = this.invoices.filter(i => i.status === 'sent').length;
    const averageReceiptAmount = totalReceiptsIssued > 0 ? totalRevenue / totalReceiptsIssued : 0;
    const averageInvoiceAmount = this.invoices.length > 0 ? 
      this.invoices.reduce((sum, i) => sum + i.totalAmount, 0) / this.invoices.length : 0;

    const outstandingInvoices = this.invoices.filter(i => 
      i.status === 'sent' || i.status === 'overdue'
    ).length;
    const outstandingAmount = this.invoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const overdueInvoices = this.invoices.filter(i => 
      i.status === 'overdue' || (i.status === 'sent' && new Date() > i.dueDate)
    ).length;
    const overdueAmount = this.invoices
      .filter(i => i.status === 'overdue' || (i.status === 'sent' && new Date() > i.dueDate))
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const paymentMethodBreakdown = this.receipts.reduce((acc, r) => {
      acc[r.paymentMethod] = (acc[r.paymentMethod] || 0) + r.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenue,
      totalReceiptsIssued,
      totalInvoicesSent,
      averageReceiptAmount,
      averageInvoiceAmount,
      outstandingInvoices,
      outstandingAmount,
      overdueInvoices,
      overdueAmount,
      paymentMethodBreakdown,
      monthlyRevenue: [], // Would implement monthly breakdown
      topServices: [] // Would implement service breakdown
    };
  }

  // Seasonal service intelligence methods
  private getCurrentSeason(): 'winter' | 'spring' | 'summer' | 'fall' {
    const month = new Date().getMonth(); // 0-11
    if (month >= 11 || month <= 1) return 'winter';    // Dec, Jan, Feb
    if (month >= 2 && month <= 4) return 'spring';     // Mar, Apr, May
    if (month >= 5 && month <= 7) return 'summer';     // Jun, Jul, Aug
    return 'fall';                                      // Sep, Oct, Nov
  }

  private isClientSeasonalService(client: Client): boolean {
    // Check if client has seasonal service indicators
    const serviceTypes = client.serviceTypes || [];
    const seasonalIndicators = ['seasonal', 'contract', 'monthly', 'annual'];
    
    return serviceTypes.some(service => 
      seasonalIndicators.some(indicator => 
        service.toLowerCase().includes(indicator)
      )
    ) || (client as any).contractType === 'seasonal';
  }

  private getSeasonalServicePatterns(season: string, clientServices: string[], isSeasonalService: boolean): Record<string, {
    triggers: string[];
    completion: string[];
    defaultAmount: number;
    contractType: string;
  }> {
    const patterns: Record<string, {
      triggers: string[];
      completion: string[];
      defaultAmount: number;
      contractType: string;
    }> = {};

    // Base completion patterns
    const baseCompletionPatterns = [
      'is completed', 'is finished', 'is done', 'service completed', 'service finished',
      'finished', 'completed', 'done', 'all set', 'wrapped up'
    ];

    // Seasonal contract completion patterns
    const seasonalContractPatterns = [
      'monthly invoice', 'monthly billing', 'monthly charge', 'monthly service',
      'seasonal billing', 'contract billing', 'monthly payment due',
      'time to invoice', 'ready to bill', 'send monthly bill'
    ];

    // Per-service completion patterns
    const perServicePatterns = [...baseCompletionPatterns];

    // Winter services (Snow removal)
    if (season === 'winter' || clientServices.some(s => s.toLowerCase().includes('snow'))) {
      patterns.snowRemoval = {
        triggers: ['snow removal', 'snow clearing', 'driveway clearing', 'plowing', 'salting', 'de-icing', 'winter service'],
        completion: isSeasonalService ? 
          [...seasonalContractPatterns, 'driveway is clear', 'snow removed', 'finished plowing', 'clearing done', ...baseCompletionPatterns] :
          ['driveway is clear', 'snow removed', 'finished plowing', 'clearing done', ...perServicePatterns],
        defaultAmount: isSeasonalService ? 150 : 75, // Higher for monthly contract
        contractType: isSeasonalService ? 'seasonal' : 'per-service'
      };
    }

    // Spring/Summer/Fall services (Landscaping)
    if (['spring', 'summer', 'fall'].includes(season) || clientServices.some(s => 
      ['lawn', 'landscaping', 'garden', 'mowing'].some(keyword => s.toLowerCase().includes(keyword)))) {
      
      patterns.lawnService = {
        triggers: ['lawn service', 'lawn maintenance', 'grass cut', 'grass cutting', 'mowing', 'lawn care'],
        completion: isSeasonalService ? 
          [...seasonalContractPatterns, 'finished cutting', 'lawn is done', 'grass is cut', 'mowing completed', ...baseCompletionPatterns] :
          ['finished cutting', 'lawn is done', 'grass is cut', 'mowing completed', ...perServicePatterns],
        defaultAmount: isSeasonalService ? 120 : 50, // Higher for monthly contract
        contractType: isSeasonalService ? 'seasonal' : 'per-service'
      };

      patterns.landscaping = {
        triggers: ['landscaping', 'garden work', 'trimming', 'hedge cutting', 'yard work'],
        completion: isSeasonalService ? 
          [...seasonalContractPatterns, 'landscaping done', 'yard work finished', 'trimming completed', ...baseCompletionPatterns] :
          ['landscaping done', 'yard work finished', 'trimming completed', ...perServicePatterns],
        defaultAmount: isSeasonalService ? 200 : 100, // Higher for monthly contract
        contractType: isSeasonalService ? 'seasonal' : 'per-service'
      };
    }

    // Always include general patterns if client has multiple services
    if (clientServices.length > 1) {
      patterns.generalService = {
        triggers: ['service', 'work completed', 'job done'],
        completion: isSeasonalService ? [...seasonalContractPatterns, ...baseCompletionPatterns] : baseCompletionPatterns,
        defaultAmount: isSeasonalService ? 100 : 50,
        contractType: isSeasonalService ? 'seasonal' : 'per-service'
      };
    }

    return patterns;
  }
}

// Export singleton instance
export const billingManager = new BillingManager();
export default billingManager;
