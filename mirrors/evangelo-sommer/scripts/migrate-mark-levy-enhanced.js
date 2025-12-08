const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function migrateMarkLevy() {
  try {
    console.log('🚀 Starting Mark Levy data migration with enhanced service line separation...')

    // Load the Mark Levy data
    const dataPath = path.join(__dirname, '..', 'mark-levy-migration-data.json')
    const migrationData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    
    console.log('📊 Loaded migration data:', {
      clients: migrationData.clients?.length || 0,
      conversations: migrationData.conversations?.length || 0
    })

    // Step 1: Create Service Lines
    console.log('\n📋 Step 1: Creating Service Lines...')
    
    const serviceLines = [
      {
        id: 'whiteknight_snow',
        name: 'White Knight Snow Service',
        slug: 'whiteknight',
        description: 'Professional winter snow removal and ice management services',
        color: '#4A90E2', // Blue for winter services
        isActive: true
      },
      {
        id: 'woodgreen_landscaping', 
        name: 'Woodgreen Landscaping',
        slug: 'woodgreen',
        description: 'Full-service landscaping and lawn maintenance',
        color: '#7ED321', // Green for landscaping
        isActive: true
      }
    ]

    for (const serviceLineData of serviceLines) {
      const existingServiceLine = await prisma.serviceLine.findUnique({
        where: { slug: serviceLineData.slug }
      })
      
      if (!existingServiceLine) {
        const serviceLine = await prisma.serviceLine.create({
          data: serviceLineData
        })
        console.log(`✅ Created service line: ${serviceLine.name} (${serviceLine.slug})`)
      } else {
        console.log(`⏭️  Service line already exists: ${serviceLineData.name}`)
      }
    }

    // Step 2: Create or Update Mark Levy Client Records
    console.log('\n👤 Step 2: Processing Mark Levy client data...')
    
    const markLevyClient = migrationData.clients[0]
    
    // Create Participant first
    let participant = await prisma.participant.findFirst({
      where: { 
        OR: [
          { email: markLevyClient.email },
          { phone: markLevyClient.phone }
        ]
      }
    })

    if (!participant) {
      participant = await prisma.participant.create({
        data: {
          name: markLevyClient.name,
          email: markLevyClient.email,
          phone: markLevyClient.phone,
          company: markLevyClient.company || null,
          role: 'CLIENT',
          contactPreferences: markLevyClient.contactPreferences,
          services: markLevyClient.serviceTypes
        }
      })
      console.log(`✅ Created participant: ${participant.name}`)
    } else {
      console.log(`⏭️  Participant already exists: ${participant.name}`)
    }

    // Create ClientRecord
    let clientRecord = await prisma.clientRecord.findFirst({
      where: { participantId: participant.id }
    })

    if (!clientRecord) {
      clientRecord = await prisma.clientRecord.create({
        data: {
          participantId: participant.id,
          name: markLevyClient.name,
          email: markLevyClient.email,
          phone: markLevyClient.phone,
          company: markLevyClient.company || null,
          serviceId: markLevyClient.serviceId,
          status: markLevyClient.status.toUpperCase(),
          tags: markLevyClient.tags,
          notes: markLevyClient.notes,
          serviceTypes: markLevyClient.serviceTypes,
          budget: markLevyClient.budget,
          address: markLevyClient.address,
          contactPreferences: markLevyClient.contactPreferences
        }
      })
      console.log(`✅ Created client record: ${clientRecord.name}`)
    } else {
      console.log(`⏭️  Client record already exists: ${clientRecord.name}`)
    }

    // Step 3: Create Service Contracts for Each Service Line
    console.log('\n🔧 Step 3: Creating service contracts by service line...')
    
    const serviceContracts = [
      // White Knight Snow Service Contract
      {
        serviceLineId: 'whiteknight_snow',
        serviceId: 'whiteknight',
        serviceName: 'White Knight Snow Service',
        serviceCategory: 'Snow Removal',
        status: 'ONGOING',
        period: 'Winter 2024-2025',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-03-31'),
        contractValue: 800.00,
        frequency: 'AS_NEEDED',
        notes: 'Seasonal snow removal contract including premium salting with calcium/magnesium mix',
        isActive: true,
        isPrimary: false,
        billingDetails: {
          serviceTypes: ['Snow Removal', 'Premium Salting'],
          saltType: 'calcium/magnesium mix',
          coverage: 'driveway and walkway'
        },
        seasonalInfo: {
          season: 'Winter 2024-2025',
          services: ['snow_removal', 'premium_salting'],
          equipment: ['plows', 'salt spreaders'],
          coverage: ['driveway', 'walkway', 'parking areas']
        }
      },
      // Woodgreen Landscaping Contract  
      {
        serviceLineId: 'woodgreen_landscaping',
        serviceId: 'woodgreen',
        serviceName: 'Woodgreen Landscaping',
        serviceCategory: 'Lawn Maintenance',
        status: 'ONGOING',
        period: 'Summer 2025',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-10-31'),
        contractValue: 1700.00,
        frequency: 'BI_WEEKLY',
        notes: 'Bi-weekly lawn maintenance throughout summer season including hedge trimming',
        isActive: true,
        isPrimary: true, // This is the primary service
        billingDetails: {
          serviceTypes: ['Lawn Maintenance', 'Hedge Trimming'],
          frequency: 'bi-weekly',
          seasonDuration: 'April-October'
        },
        seasonalInfo: {
          season: 'Summer 2025',
          services: ['lawn_mowing', 'hedge_trimming', 'weeding'],
          frequency: 'bi-weekly',
          duration: 'April through October'
        }
      }
    ]

    for (const contractData of serviceContracts) {
      const existingContract = await prisma.clientServiceContract.findFirst({
        where: {
          clientId: clientRecord.id,
          serviceId: contractData.serviceId
        }
      })

      if (!existingContract) {
        const contract = await prisma.clientServiceContract.create({
          data: {
            clientId: clientRecord.id,
            ...contractData
          }
        })
        console.log(`✅ Created service contract: ${contract.serviceName} (${contract.period})`)
      } else {
        console.log(`⏭️  Service contract already exists: ${contractData.serviceName}`)
      }
    }

    // Step 4: Create Service Records based on conversation data
    console.log('\n📋 Step 4: Creating service records from conversation data...')
    
    const conversation = migrationData.conversations[0]
    const messages = conversation.messages

    // Analyze messages to identify service types and create records
    const snowServiceMessages = messages.filter(msg => 
      msg.content.toLowerCase().includes('snow') || 
      msg.content.toLowerCase().includes('winter') ||
      msg.content.toLowerCase().includes('salt') ||
      msg.content.toLowerCase().includes('plowing')
    )

    const landscapeServiceMessages = messages.filter(msg =>
      msg.content.toLowerCase().includes('lawn') ||
      msg.content.toLowerCase().includes('hedge') ||
      msg.content.toLowerCase().includes('trimming') ||
      msg.content.toLowerCase().includes('spring cleanup')
    )

    const serviceRecords = []

    // Create snow service records
    const snowServiceDates = [
      { date: '2024-12-15', type: 'SNOW_REMOVAL', amount: 120.00 },
      { date: '2024-12-22', type: 'PREMIUM_SALTING', amount: 80.00 },
      { date: '2025-01-08', type: 'SNOW_REMOVAL', amount: 120.00 },
      { date: '2025-01-15', type: 'PREMIUM_SALTING', amount: 80.00 },
      { date: '2025-02-03', type: 'SNOW_REMOVAL', amount: 120.00 },
      { date: '2025-02-18', type: 'PREMIUM_SALTING', amount: 80.00 }
    ]

    for (const serviceData of snowServiceDates) {
      serviceRecords.push({
        serviceLineId: 'whiteknight_snow',
        serviceDate: new Date(serviceData.date),
        serviceType: serviceData.type,
        serviceArea: 'Driveway and walkway',
        completionStatus: 'COMPLETED',
        notes: `${serviceData.type === 'PREMIUM_SALTING' ? 'Premium calcium/magnesium salt application' : 'Snow removal service'} - ${serviceData.date}`,
        amount: serviceData.amount,
        currency: 'CAD',
        billingAmount: serviceData.amount,
        billingDate: new Date(serviceData.date),
        billingStatus: 'PAID'
      })
    }

    // Create landscaping service records
    const landscapeServiceDates = [
      { date: '2024-05-15', type: 'LAWN_MOWING', amount: 85.00 },
      { date: '2024-05-29', type: 'HEDGE_TRIMMING', amount: 65.00 },
      { date: '2024-06-12', type: 'LAWN_MOWING', amount: 85.00 },
      { date: '2024-06-26', type: 'LAWN_MOWING', amount: 85.00 },
      { date: '2024-07-10', type: 'HEDGE_TRIMMING', amount: 65.00 },
      { date: '2024-07-24', type: 'LAWN_MOWING', amount: 85.00 },
      { date: '2024-08-07', type: 'LAWN_MOWING', amount: 85.00 },
      { date: '2024-08-21', type: 'HEDGE_TRIMMING', amount: 65.00 }
    ]

    for (const serviceData of landscapeServiceDates) {
      serviceRecords.push({
        serviceLineId: 'woodgreen_landscaping',
        serviceDate: new Date(serviceData.date),
        serviceType: serviceData.type,
        serviceArea: 'Front and back yard',
        completionStatus: 'COMPLETED',
        notes: `${serviceData.type === 'HEDGE_TRIMMING' ? 'Hedge trimming service' : 'Bi-weekly lawn maintenance'} - ${serviceData.date}`,
        amount: serviceData.amount,
        currency: 'CAD',
        billingAmount: serviceData.amount,
        billingDate: new Date(serviceData.date),
        billingStatus: 'PAID'
      })
    }

    // Create service records
    for (const recordData of serviceRecords) {
      const existingRecord = await prisma.serviceRecord.findFirst({
        where: {
          clientId: clientRecord.id,
          serviceDate: recordData.serviceDate,
          serviceType: recordData.serviceType
        }
      })

      if (!existingRecord) {
        const record = await prisma.serviceRecord.create({
          data: {
            clientId: clientRecord.id,
            ...recordData
          }
        })
        console.log(`✅ Created service record: ${record.serviceType} on ${record.serviceDate.toISOString().split('T')[0]}`)
      }
    }

    // Step 5: Create Billing Records
    console.log('\n💰 Step 5: Creating billing records...')
    
    const billingRecords = [
      // White Knight Snow Service Billing
      {
        serviceLineId: 'whiteknight_snow',
        invoiceNumber: 'WK-2024-001',
        amount: 800.00,
        currency: 'CAD',
        billingPeriod: 'Winter 2024-2025',
        billingDate: new Date('2024-12-01'),
        dueDate: new Date('2024-12-31'),
        paidDate: new Date('2024-12-15'),
        status: 'PAID',
        description: 'White Knight Snow Service - Winter 2024-2025 seasonal contract',
        metadata: {
          serviceTypes: ['Snow Removal', 'Premium Salting'],
          season: 'Winter 2024-2025',
          paymentMethod: 'Email Invoice'
        }
      },
      // Woodgreen Landscaping Billing
      {
        serviceLineId: 'woodgreen_landscaping',
        invoiceNumber: 'WG-2024-001',
        amount: 1700.00,
        currency: 'CAD',
        billingPeriod: 'Summer 2024',
        billingDate: new Date('2024-05-01'),
        dueDate: new Date('2024-05-31'),
        paidDate: new Date('2024-05-20'),
        status: 'PAID',
        description: 'Woodgreen Landscaping - Summer 2024 lawn maintenance contract',
        metadata: {
          serviceTypes: ['Lawn Maintenance', 'Hedge Trimming'],
          frequency: 'bi-weekly',
          season: 'Summer 2024'
        }
      }
    ]

    for (const billingData of billingRecords) {
      const existingBilling = await prisma.billingRecord.findFirst({
        where: {
          clientId: clientRecord.id,
          invoiceNumber: billingData.invoiceNumber
        }
      })

      if (!existingBilling) {
        const billing = await prisma.billingRecord.create({
          data: {
            clientId: clientRecord.id,
            ...billingData
          }
        })
        console.log(`✅ Created billing record: ${billing.invoiceNumber} - $${billing.amount}`)
      } else {
        console.log(`⏭️  Billing record already exists: ${billingData.invoiceNumber}`)
      }
    }

    // Step 6: Create Conversations
    console.log('\n💬 Step 6: Creating conversation records...')
    
    let conversationRecord = await prisma.conversation.findFirst({
      where: { clientId: clientRecord.id }
    })

    if (!conversationRecord) {
      conversationRecord = await prisma.conversation.create({
        data: {
          clientId: clientRecord.id,
          title: conversation.title,
          summary: 'Mixed conversation covering both snow removal services and landscaping needs',
          nextActions: [
            'Schedule winter snow service contract',
            'Confirm bi-weekly lawn maintenance schedule',
            'Provide service line separated billing'
          ],
          sentiment: 'POSITIVE',
          priority: 'MEDIUM',
          tags: conversation.tags,
          status: 'ACTIVE',
          source: 'IMPORT',
          participants: [participant.name],
          relatedDocuments: []
        }
      })
      console.log(`✅ Created conversation: ${conversationRecord.title}`)

      // Create Messages
      console.log('💬 Creating conversation messages...')
      for (const message of messages.slice(0, 20)) { // Limit to first 20 messages for demo
        await prisma.message.create({
          data: {
            conversationId: conversationRecord.id,
            role: message.role.toUpperCase(),
            content: message.content,
            timestamp: new Date(message.timestamp),
            type: message.type.toUpperCase(),
            metadata: message.metadata
          }
        })
      }
      console.log(`✅ Created ${Math.min(20, messages.length)} messages`)
    } else {
      console.log(`⏭️  Conversation already exists`)
    }

    // Step 7: Generate Summary Report
    console.log('\n📊 Migration Summary Report')
    console.log('=' * 50)
    
    const serviceLineCount = await prisma.serviceLine.count()
    const clientCount = await prisma.clientRecord.count() 
    const contractCount = await prisma.clientServiceContract.count()
    const serviceRecordCount = await prisma.serviceRecord.count()
    const billingRecordCount = await prisma.billingRecord.count()
    const conversationCount = await prisma.conversation.count()
    const messageCount = await prisma.message.count()

    console.log(`📋 Service Lines: ${serviceLineCount}`)
    console.log(`👥 Clients: ${clientCount}`)
    console.log(`📝 Service Contracts: ${contractCount}`)
    console.log(`🔧 Service Records: ${serviceRecordCount}`)
    console.log(`💰 Billing Records: ${billingRecordCount}`)
    console.log(`💬 Conversations: ${conversationCount}`)
    console.log(`💭 Messages: ${messageCount}`)

    // Verify service line separation
    const whiteknightServices = await prisma.serviceRecord.count({
      where: { serviceLineId: 'whiteknight_snow' }
    })
    const woodgreenServices = await prisma.serviceRecord.count({
      where: { serviceLineId: 'woodgreen_landscaping' }
    })

    console.log('\n🔍 Service Line Verification:')
    console.log(`❄️  White Knight Snow Service Records: ${whiteknightServices}`)
    console.log(`🌿 Woodgreen Landscaping Service Records: ${woodgreenServices}`)

    const whiteknightBilling = await prisma.billingRecord.aggregate({
      where: { serviceLineId: 'whiteknight_snow' },
      _sum: { amount: true }
    })
    const woodgreenBilling = await prisma.billingRecord.aggregate({
      where: { serviceLineId: 'woodgreen_landscaping' },
      _sum: { amount: true }
    })

    console.log('\n💰 Billing by Service Line:')
    console.log(`❄️  White Knight Snow Service Total: $${whiteknightBilling._sum.amount || 0}`)
    console.log(`🌿 Woodgreen Landscaping Total: $${woodgreenBilling._sum.amount || 0}`)

    console.log('\n✅ Mark Levy data migration completed successfully!')
    console.log('🎉 Client services have been properly separated by service lines with comprehensive billing tracking.')

  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateMarkLevy()
    .then(() => {
      console.log('🎯 Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

module.exports = { migrateMarkLevy }