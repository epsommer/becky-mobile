import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

export async function POST() {
  try {
    console.log('🚀 Starting Mark Levy data migration API...')

    // Load the Mark Levy data
    const dataPath = path.join(process.cwd(), 'mark-levy-migration-data.json')
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json(
        { error: 'Migration data file not found' },
        { status: 404 }
      )
    }

    const migrationData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

    // Check if migration already exists
    const existingClient = await prisma.clientRecord.findFirst({
      where: { email: migrationData.clients[0].email }
    })

    if (existingClient) {
      return NextResponse.json({
        message: 'Migration already completed',
        clientId: existingClient.id,
        status: 'already_exists'
      })
    }

    // Step 1: Create Service Lines
    const serviceLines = [
      {
        id: 'whiteknight_snow',
        name: 'White Knight Snow Service',
        slug: 'whiteknight',
        description: 'Professional winter snow removal and ice management services',
        color: '#6B7280',
        isActive: true
      },
      {
        id: 'woodgreen_landscaping', 
        name: 'Woodgreen Landscaping',
        slug: 'woodgreen',
        description: 'Full-service landscaping and lawn maintenance',
        color: '#7ED321',
        isActive: true
      }
    ]

    for (const serviceLineData of serviceLines) {
      await prisma.serviceLine.upsert({
        where: { slug: serviceLineData.slug },
        update: serviceLineData,
        create: serviceLineData
      })
    }

    // Step 2: Create Participant and Client Record
    const markLevyClient = migrationData.clients[0]
    
    const participant = await prisma.participant.create({
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

    const clientRecord = await prisma.clientRecord.create({
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

    // Step 3: Create Service Contracts
    const serviceContracts = [
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
        isPrimary: true,
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
      await prisma.clientServiceContract.create({
        data: {
          clientId: clientRecord.id,
          ...contractData
        } as any // Type cast needed for migration data
      })
    }

    // Step 4: Create Service Records
    const serviceRecords = [
      // Snow services
      { date: '2024-12-15', type: 'SNOW_REMOVAL', amount: 120.00, serviceLineId: 'whiteknight_snow', area: 'Driveway and walkway' },
      { date: '2024-12-22', type: 'PREMIUM_SALTING', amount: 80.00, serviceLineId: 'whiteknight_snow', area: 'Driveway and walkway' },
      { date: '2025-01-08', type: 'SNOW_REMOVAL', amount: 120.00, serviceLineId: 'whiteknight_snow', area: 'Driveway and walkway' },
      { date: '2025-01-15', type: 'PREMIUM_SALTING', amount: 80.00, serviceLineId: 'whiteknight_snow', area: 'Driveway and walkway' },
      { date: '2025-02-03', type: 'SNOW_REMOVAL', amount: 120.00, serviceLineId: 'whiteknight_snow', area: 'Driveway and walkway' },
      { date: '2025-02-18', type: 'PREMIUM_SALTING', amount: 80.00, serviceLineId: 'whiteknight_snow', area: 'Driveway and walkway' },
      // Landscaping services
      { date: '2024-05-15', type: 'LAWN_MOWING', amount: 85.00, serviceLineId: 'woodgreen_landscaping', area: 'Front and back yard' },
      { date: '2024-05-29', type: 'HEDGE_TRIMMING', amount: 65.00, serviceLineId: 'woodgreen_landscaping', area: 'Front and back yard' },
      { date: '2024-06-12', type: 'LAWN_MOWING', amount: 85.00, serviceLineId: 'woodgreen_landscaping', area: 'Front and back yard' },
      { date: '2024-06-26', type: 'LAWN_MOWING', amount: 85.00, serviceLineId: 'woodgreen_landscaping', area: 'Front and back yard' },
      { date: '2024-07-10', type: 'HEDGE_TRIMMING', amount: 65.00, serviceLineId: 'woodgreen_landscaping', area: 'Front and back yard' },
      { date: '2024-07-24', type: 'LAWN_MOWING', amount: 85.00, serviceLineId: 'woodgreen_landscaping', area: 'Front and back yard' },
      { date: '2024-08-07', type: 'LAWN_MOWING', amount: 85.00, serviceLineId: 'woodgreen_landscaping', area: 'Front and back yard' },
      { date: '2024-08-21', type: 'HEDGE_TRIMMING', amount: 65.00, serviceLineId: 'woodgreen_landscaping', area: 'Front and back yard' }
    ]

    for (const recordData of serviceRecords) {
      await prisma.serviceRecord.create({
        data: {
          clientId: clientRecord.id,
          serviceLineId: recordData.serviceLineId,
          serviceDate: new Date(recordData.date),
          serviceType: recordData.type as any, // Type cast needed for migration data
          serviceArea: recordData.area,
          completionStatus: 'COMPLETED' as any, // Type cast needed for migration data
          notes: `${recordData.type.replace('_', ' ')} service - ${recordData.date}`,
          amount: recordData.amount,
          currency: 'CAD',
          billingAmount: recordData.amount,
          billingDate: new Date(recordData.date),
          billingStatus: 'PAID' as any // Type cast needed for migration data
        }
      })
    }

    // Step 5: Create Billing Records
    const billingRecords = [
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
      await prisma.billingRecord.create({
        data: {
          clientId: clientRecord.id,
          ...billingData
        } as any // Type cast needed for migration data
      })
    }

    // Step 6: Create Conversation
    const conversation = migrationData.conversations[0]
    const conversationRecord = await prisma.conversation.create({
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

    // Create a subset of messages for demo
    const messages = conversation.messages.slice(0, 10)
    for (const message of messages) {
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

    console.log('✅ Mark Levy data migration completed successfully via API!')

    return NextResponse.json({
      message: 'Migration completed successfully',
      clientId: clientRecord.id,
      participantId: participant.id,
      conversationId: conversationRecord.id,
      stats: {
        serviceLines: 2,
        contracts: serviceContracts.length,
        serviceRecords: serviceRecords.length,
        billingRecords: billingRecords.length,
        messages: messages.length
      }
    })

  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}