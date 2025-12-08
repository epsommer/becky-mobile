#!/usr/bin/env node

/**
 * Universal Excel Import Script
 * 
 * Imports Excel conversation data for any client with comprehensive validation,
 * client auto-detection, and conversation processing.
 * 
 * Usage:
 *   node scripts/universal-excel-import.js <excel-file> [options]
 * 
 * Options:
 *   --client-name "Name"     Override detected client name
 *   --client-phone "phone"   Override detected client phone
 *   --user-name "Your Name"  Set service provider name (default: Evangelo P. Sommer)
 *   --user-phone "phone"     Set service provider phone
 *   --preview                Show preview without importing
 *   --dry-run                Validate data without saving to database
 *   --force                  Override existing conversations
 *   --debug                  Enable detailed debugging output
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

// Import our existing Excel processing libraries
const excelImport = require('../src/lib/excel-import')

const prisma = new PrismaClient()

// Default configuration
const DEFAULT_CONFIG = {
  userName: 'Evangelo P. Sommer',
  userPhone: '647-327-8401',
  userEmail: 'evangelo@woodgreenlawncare.ca',
  serviceLines: ['Woodgreen Landscaping', 'White Knight Snow Service'],
  debug: false,
  preview: false,
  dryRun: false,
  force: false
}

class UniversalExcelImporter {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.logger = this.createLogger()
  }

  createLogger() {
    return {
      info: (msg, data) => console.log(`ℹ️  ${msg}`, data ? data : ''),
      success: (msg, data) => console.log(`✅ ${msg}`, data ? data : ''),
      warn: (msg, data) => console.log(`⚠️  ${msg}`, data ? data : ''),
      error: (msg, data) => console.log(`❌ ${msg}`, data ? data : ''),
      debug: (msg, data) => this.config.debug ? console.log(`🔍 [DEBUG] ${msg}`, data ? data : '') : null,
      header: (msg) => {
        console.log('\n' + '='.repeat(60))
        console.log(`🎯 ${msg}`)
        console.log('='.repeat(60))
      }
    }
  }

  async validateExcelFile(filePath) {
    this.logger.debug('Validating Excel file', filePath)
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found: ${filePath}`)
    }

    const stats = fs.statSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    
    if (!(['.xlsx', '.xls'].includes(ext))) {
      throw new Error(`Invalid file format: ${ext}. Please use .xlsx or .xls`)
    }

    this.logger.success(`Valid Excel file: ${path.basename(filePath)} (${this.formatFileSize(stats.size)})`)
    return true
  }

  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  async parseExcelFile(filePath) {
    this.logger.info('Parsing Excel file...')
    
    try {
      // Read file as buffer and create File-like object for our parser
      const buffer = fs.readFileSync(filePath)
      const file = {
        name: path.basename(filePath),
        size: buffer.length,
        type: path.extname(filePath) === '.xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/vnd.ms-excel',
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      }

      // Use our existing parseExcelFile function
      const parseResult = await excelImport.parseExcelFile(file)
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse Excel file')
      }

      this.logger.success(`Parsed ${parseResult.data.length} rows from Excel`)
      this.logger.debug('Headers detected', parseResult.headers)
      
      return parseResult
      
    } catch (error) {
      this.logger.error('Excel parsing failed', error.message)
      throw error
    }
  }

  async detectAndValidateClient(excelData) {
    this.logger.info('Auto-detecting client information...')
    
    // Use our existing client detection
    const detectedClient = excelImport.detectClientInfo(excelData)
    
    // Apply overrides from config
    const clientInfo = {
      name: this.config.clientName || detectedClient.name || 'Unknown Client',
      phone: this.config.clientPhone || detectedClient.phone || '',
      email: this.config.clientEmail || detectedClient.email || '',
      contact: this.config.clientContact || detectedClient.contact || detectedClient.name || 'Unknown Contact'
    }

    this.logger.success('Client detected:', {
      name: clientInfo.name,
      phone: clientInfo.phone,
      contact: clientInfo.contact
    })

    // Validate required fields
    if (!clientInfo.name || clientInfo.name === 'Unknown Client') {
      this.logger.warn('Client name not detected. Use --client-name to specify.')
    }

    return clientInfo
  }

  async findOrCreateClient(clientInfo) {
    this.logger.info('Searching for existing client in database...')
    
    try {
      // Search by phone first, then by name
      let existingClient = null
      
      if (clientInfo.phone) {
        existingClient = await prisma.clientRecord.findFirst({
          where: {
            OR: [
              { phone: clientInfo.phone },
              { name: { equals: clientInfo.name, mode: 'insensitive' } }
            ]
          },
          include: {
            conversations: true
          }
        })
      } else {
        existingClient = await prisma.clientRecord.findFirst({
          where: {
            name: { equals: clientInfo.name, mode: 'insensitive' }
          },
          include: {
            conversations: true
          }
        })
      }

      if (existingClient) {
        this.logger.success(`Found existing client: ${existingClient.name} (ID: ${existingClient.id})`)
        this.logger.info(`Client has ${existingClient.conversations.length} existing conversations`)
        return existingClient
      }

      // Create new client if not found
      this.logger.info('Creating new client record...')
      
      const newClient = await prisma.clientRecord.create({
        data: {
          participantId: `temp_${Date.now()}`, // Will be updated with proper participant
          name: clientInfo.name,
          email: clientInfo.email || null,
          phone: clientInfo.phone || null,
          company: null, // Individual clients
          serviceId: 'universal', // Universal service
          status: 'ACTIVE',
          tags: ['excel-import', 'new-client'],
          notes: `Client imported from Excel conversation data: ${new Date().toISOString()}`,
          budget: null,
          timeline: 'Imported via Excel conversation',
          seasonalContract: false,
          address: {
            note: 'Address to be updated from conversation context'
          },
          personalInfo: {
            clientType: 'RESIDENTIAL_INDIVIDUAL',
            propertyType: 'RESIDENTIAL',
            importSource: 'excel-conversation'
          }
        },
        include: {
          conversations: true
        }
      })

      this.logger.success(`Created new client: ${newClient.name} (ID: ${newClient.id})`)
      return newClient
      
    } catch (error) {
      this.logger.error('Database client operation failed', error.message)
      throw error
    }
  }

  async processConversation(excelData, clientInfo, client) {
    this.logger.info('Processing conversation messages...')
    
    const userInfo = {
      name: this.config.userName,
      phone: this.config.userPhone,
      email: this.config.userEmail
    }

    try {
      // Use our existing conversation processing
      const conversation = excelImport.processConversationImport(
        excelData,
        userInfo,
        clientInfo
      )

      this.logger.success(`Processed ${conversation.messages.length} messages`)
      this.logger.info(`Date range: ${conversation.metadata.dateRange.start} to ${conversation.metadata.dateRange.end}`)
      
      // Analyze message distribution
      const clientMessages = conversation.messages.filter(m => m.role === 'client').length
      const serviceMessages = conversation.messages.filter(m => m.role === 'you').length
      
      this.logger.info(`Message distribution: ${clientMessages} from client, ${serviceMessages} from service provider`)

      return conversation
      
    } catch (error) {
      this.logger.error('Conversation processing failed', error.message)
      throw error
    }
  }

  async saveConversation(conversation, client) {
    if (this.config.dryRun) {
      this.logger.info('DRY RUN: Conversation would be saved to database')
      return null
    }

    this.logger.info('Saving conversation to database...')
    
    try {
      // Check for existing conversations with same title
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          clientId: client.id,
          title: conversation.title
        }
      })

      if (existingConversation && !this.config.force) {
        this.logger.warn(`Conversation already exists: "${conversation.title}"`)
        this.logger.info('Use --force to override existing conversations')
        return existingConversation
      }

      // Delete existing if force mode
      if (existingConversation && this.config.force) {
        this.logger.info('Force mode: Removing existing conversation and messages...')
        
        await prisma.message.deleteMany({
          where: { conversationId: existingConversation.id }
        })
        
        await prisma.conversation.delete({
          where: { id: existingConversation.id }
        })
        
        this.logger.success('Existing conversation removed')
      }

      // Create new conversation
      const newConversation = await prisma.conversation.create({
        data: {
          clientId: client.id,
          title: conversation.title,
          summary: conversation.metadata ? `Imported conversation with ${conversation.metadata.messageCount} messages from Excel file. Date range: ${conversation.metadata.dateRange?.start?.split('T')[0]} to ${conversation.metadata.dateRange?.end?.split('T')[0]}.` : 'Imported Excel conversation',
          status: 'ACTIVE',
          priority: 'MEDIUM',
          source: 'IMPORT',
          tags: ['excel-import', 'text-messages', 'complete-history']
        }
      })

      // Create messages in batches
      const BATCH_SIZE = 50
      let savedMessages = 0
      
      for (let i = 0; i < conversation.messages.length; i += BATCH_SIZE) {
        const batch = conversation.messages.slice(i, i + BATCH_SIZE)
        
        const messageData = batch.map(msg => ({
          conversationId: newConversation.id,
          role: msg.role.toUpperCase() === 'CLIENT' ? 'CLIENT' : 'YOU',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          type: 'TEXT',
          metadata: msg.metadata || {}
        }))

        await prisma.message.createMany({
          data: messageData
        })

        savedMessages += batch.length
        
        const progress = Math.round((savedMessages / conversation.messages.length) * 100)
        this.logger.info(`Saved messages: ${progress}% (${savedMessages}/${conversation.messages.length})`)
      }

      this.logger.success(`Conversation saved: ${newConversation.title} (ID: ${newConversation.id})`)
      this.logger.success(`Total messages saved: ${savedMessages}`)
      
      return newConversation
      
    } catch (error) {
      this.logger.error('Database save failed', error.message)
      throw error
    }
  }

  showPreview(conversation, client) {
    this.logger.header('IMPORT PREVIEW')
    
    console.log(`📱 Client: ${client.name}`)
    console.log(`📞 Phone: ${client.phone || 'Not provided'}`)
    console.log(`💬 Conversation: "${conversation.title}"`)
    console.log(`📊 Messages: ${conversation.messages.length}`)
    
    if (conversation.metadata?.dateRange) {
      console.log(`📅 Date Range: ${conversation.metadata.dateRange.start.split('T')[0]} to ${conversation.metadata.dateRange.end.split('T')[0]}`)
    }
    
    console.log('\n📝 Sample Messages:')
    conversation.messages.slice(0, 5).forEach((msg, index) => {
      const role = msg.role === 'client' ? '👤 Client' : '🔧 Service'
      const preview = msg.content.length > 60 
        ? msg.content.substring(0, 60) + '...'
        : msg.content
      console.log(`   ${index + 1}. [${role}] ${preview}`)
    })

    if (conversation.messages.length > 5) {
      console.log(`   ... and ${conversation.messages.length - 5} more messages`)
    }
  }

  async run(filePath, options = {}) {
    this.config = { ...this.config, ...options }
    
    try {
      this.logger.header('UNIVERSAL EXCEL IMPORT')
      console.log(`📁 File: ${filePath}`)
      console.log(`👤 Service Provider: ${this.config.userName}`)
      console.log(`🔧 Mode: ${this.config.dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`)
      console.log('')

      // Step 1: Validate and parse Excel file
      await this.validateExcelFile(filePath)
      const parseResult = await this.parseExcelFile(filePath)
      
      // Step 2: Detect client information
      const clientInfo = await this.detectAndValidateClient(parseResult.data)
      
      // Step 3: Find or create client
      const client = await this.findOrCreateClient(clientInfo)
      
      // Step 4: Process conversation
      const conversation = await this.processConversation(parseResult.data, clientInfo, client)
      
      // Step 5: Show preview if requested
      if (this.config.preview) {
        this.showPreview(conversation, client)
        this.logger.info('Preview mode - no data saved')
        return
      }
      
      // Step 6: Save to database
      const savedConversation = await this.saveConversation(conversation, client)
      
      // Success summary
      this.logger.header('IMPORT COMPLETE')
      
      if (this.config.dryRun) {
        console.log('🏁 DRY RUN COMPLETED - No data was saved')
      } else {
        console.log(`🎉 SUCCESS: Imported conversation for ${client.name}`)
        console.log(`📊 Final Stats:`)
        console.log(`   • Messages: ${conversation.messages.length}`)
        console.log(`   • Client ID: ${client.id}`)
        if (savedConversation) {
          console.log(`   • Conversation ID: ${savedConversation.id}`)
        }
        console.log(`   • Import Date: ${new Date().toISOString()}`)
      }
      
    } catch (error) {
      this.logger.header('IMPORT FAILED')
      console.error(error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🔄 Universal Excel Import Script

Usage: node scripts/universal-excel-import.js <excel-file> [options]

Options:
  --client-name "Name"       Override detected client name
  --client-phone "phone"     Override detected client phone  
  --user-name "Your Name"    Set service provider name (default: Evangelo P. Sommer)
  --user-phone "phone"       Set service provider phone
  --preview                  Show preview without importing
  --dry-run                  Validate data without saving to database
  --force                    Override existing conversations
  --debug                    Enable detailed debugging output
  --help                     Show this help message

Examples:
  # Basic import
  node scripts/universal-excel-import.js messages.xlsx
  
  # Preview before importing
  node scripts/universal-excel-import.js messages.xlsx --preview
  
  # Override client detection
  node scripts/universal-excel-import.js messages.xlsx --client-name "John Smith" --client-phone "647-555-0123"
  
  # Force replace existing conversation
  node scripts/universal-excel-import.js messages.xlsx --force
`)
    process.exit(0)
  }

  const filePath = args[0]
  const options = {}
  
  // Parse command line options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '')
      
      if (['preview', 'dry-run', 'force', 'debug'].includes(key)) {
        options[key.replace('-', '')] = true
      } else if (i + 1 < args.length) {
        const value = args[i + 1]
        options[key.replace('-', '')] = value
        i++ // Skip next argument as it's the value
      }
    }
  }

  const importer = new UniversalExcelImporter(options)
  await importer.run(filePath, options)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { UniversalExcelImporter }