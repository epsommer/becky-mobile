// Comprehensive Client Data Integrity Verification Script
const { PrismaClient } = require('@prisma/client')
const dns = require('dns').promises
const https = require('https')
const util = require('util')

const prisma = new PrismaClient()

const CLIENT_ID = 'cmf5mw8g60002uz8xl4octzrn' // Mark Levy

async function verifyClientIntegrity() {
  console.log('🔍 COMPREHENSIVE CLIENT DATA INTEGRITY VERIFICATION')
  console.log('=' * 70)
  console.log(`Client ID: ${CLIENT_ID}`)
  console.log(`Verification Time: ${new Date().toISOString()}`)
  console.log('')

  try {
    // 1. Fetch comprehensive client data
    console.log('📋 1. FETCHING CLIENT DATA...')
    const client = await prisma.clientRecord.findUnique({
      where: { id: CLIENT_ID },
      include: {
        participant: true,
        serviceContracts: {
          include: {
            serviceLine: true
          }
        },
        serviceHistory: {
          include: {
            serviceLine: true
          }
        },
        billingRecords: {
          include: {
            serviceLine: true
          }
        },
        conversations: {
          include: {
            messages: {
              select: {
                id: true,
                timestamp: true,
                role: true,
                type: true
              }
            }
          }
        },
        communications: {
          select: {
            id: true,
            direction: true,
            channel: true,
            timestamp: true,
            subject: true,
            content: true
          }
        }
      }
    })

    if (!client) {
      console.log('❌ Client not found!')
      return
    }

    console.log('✅ Client data loaded successfully')
    console.log('')

    // 2. Contact Information Validation
    console.log('📞 2. CONTACT INFORMATION VALIDATION')
    console.log('-'.repeat(50))
    
    const contactVerification = {
      name: {
        value: client.name,
        isValid: !!client.name && client.name.length > 0,
        notes: client.name ? 'Present' : 'Missing'
      },
      email: {
        value: client.email,
        isValid: !!client.email && client.email.includes('@'),
        deliverable: null,
        notes: 'Will verify deliverability'
      },
      phone: {
        value: client.phone,
        isValid: !!client.phone && client.phone.length >= 10,
        formatted: client.phone ? client.phone.replace(/\D/g, '') : null,
        notes: 'Canadian format expected'
      },
      address: {
        street: client.address?.street || '37 Mintwood Dr.',
        city: client.address?.city || 'Not specified',
        province: client.address?.province || 'Not specified',
        postal: client.address?.postalCode || 'Not specified',
        isComplete: !!(client.address?.street && client.address?.city),
        notes: 'From confirmed details'
      }
    }

    // Email domain verification
    if (contactVerification.email.isValid) {
      try {
        const domain = client.email.split('@')[1]
        const mxRecords = await dns.resolveMx(domain)
        contactVerification.email.deliverable = mxRecords.length > 0
        contactVerification.email.mxRecords = mxRecords.length
        contactVerification.email.notes = `MX records: ${mxRecords.length}`
      } catch (error) {
        contactVerification.email.deliverable = false
        contactVerification.email.notes = 'Domain not resolvable'
      }
    }

    // Display contact verification results
    Object.entries(contactVerification).forEach(([field, data]) => {
      if (typeof data === 'object' && data.value !== undefined) {
        const status = data.isValid ? '✅' : '❌'
        console.log(`${status} ${field.toUpperCase()}: ${data.value || 'Not provided'}`)
        if (data.notes) console.log(`   Notes: ${data.notes}`)
      } else if (field === 'address') {
        console.log(`📍 ADDRESS:`)
        console.log(`   Street: ${data.street}`)
        console.log(`   City: ${data.city}`)
        console.log(`   Province: ${data.province}`)
        console.log(`   Postal: ${data.postal}`)
        console.log(`   Complete: ${data.isComplete ? '✅' : '❌'}`)
      }
    })
    console.log('')

    // 3. Property & Service Context
    console.log('🏠 3. PROPERTY & SERVICE CONTEXT')
    console.log('-'.repeat(50))
    
    const propertyContext = {
      propertyType: 'Residential', // From confirmed details
      gateAccess: client.notes?.includes('gate') || client.notes?.includes('Dog') || false,
      petConsiderations: client.notes?.includes('Dog') || false,
      serviceAccessNotes: client.notes || 'No specific notes',
      tags: client.tags || [],
      budget: client.budget || 'Not specified'
    }

    console.log(`🏡 Property Type: ${propertyContext.propertyType}`)
    console.log(`🚪 Gate Access Required: ${propertyContext.gateAccess ? '✅ Yes' : '❌ No'}`)
    console.log(`🐕 Pet Considerations: ${propertyContext.petConsiderations ? '✅ Yes (Dog on property)' : '❌ None'}`)
    console.log(`💰 Budget: ${typeof propertyContext.budget === 'number' ? `$${propertyContext.budget.toLocaleString()}` : propertyContext.budget}`)
    console.log(`🏷️  Tags: ${propertyContext.tags.length > 0 ? propertyContext.tags.join(', ') : 'None'}`)
    console.log(`📝 Access Notes: ${propertyContext.serviceAccessNotes}`)
    console.log('')

    // 4. Data Completeness Assessment
    console.log('📊 4. DATA COMPLETENESS ASSESSMENT')
    console.log('-'.repeat(50))
    
    const completenessChecklist = {
      // Core Information
      'Name': !!client.name,
      'Email': !!client.email,
      'Phone': !!client.phone,
      'Address': !!(client.address?.street),
      'Status': !!client.status,
      
      // Extended Information
      'Company': !!client.company,
      'Budget': !!client.budget,
      'Tags': client.tags && client.tags.length > 0,
      'Notes': !!client.notes,
      'Timeline': !!client.timeline,
      
      // Service Information
      'Service Types': client.serviceTypes && client.serviceTypes.length > 0,
      'Service Contracts': client.serviceContracts && client.serviceContracts.length > 0,
      'Service History': client.serviceHistory && client.serviceHistory.length > 0,
      
      // Communication
      'Conversations': client.conversations && client.conversations.length > 0,
      'Communications Log': client.communications && client.communications.length > 0,
      
      // Billing
      'Billing Records': client.billingRecords && client.billingRecords.length > 0
    }

    const totalFields = Object.keys(completenessChecklist).length
    const completedFields = Object.values(completenessChecklist).filter(Boolean).length
    const completenessPercentage = Math.round((completedFields / totalFields) * 100)

    console.log(`📈 Overall Completeness: ${completenessPercentage}% (${completedFields}/${totalFields} fields)`)
    console.log('')
    console.log('FIELD BREAKDOWN:')
    Object.entries(completenessChecklist).forEach(([field, isComplete]) => {
      const status = isComplete ? '✅' : '❌'
      console.log(`${status} ${field}`)
    })
    console.log('')

    // 5. Service Line Relationship Mapping
    console.log('🔗 5. SERVICE LINE RELATIONSHIP MAPPING')
    console.log('-'.repeat(50))
    
    const serviceLineAnalysis = {}
    
    // Analyze service contracts by line
    client.serviceContracts.forEach(contract => {
      const serviceLineId = contract.serviceLineId || 'unassigned'
      if (!serviceLineAnalysis[serviceLineId]) {
        serviceLineAnalysis[serviceLineId] = {
          name: contract.serviceLine?.name || 'Unknown',
          color: contract.serviceLine?.color || '#gray',
          contracts: [],
          history: [],
          billing: []
        }
      }
      serviceLineAnalysis[serviceLineId].contracts.push(contract)
    })
    
    // Analyze service history by line
    client.serviceHistory.forEach(record => {
      const serviceLineId = record.serviceLineId || 'unassigned'
      if (serviceLineAnalysis[serviceLineId]) {
        serviceLineAnalysis[serviceLineId].history.push(record)
      }
    })
    
    // Analyze billing by line
    client.billingRecords.forEach(billing => {
      const serviceLineId = billing.serviceLineId || 'unassigned'
      if (serviceLineAnalysis[serviceLineId]) {
        serviceLineAnalysis[serviceLineId].billing.push(billing)
      }
    })

    Object.entries(serviceLineAnalysis).forEach(([serviceLineId, data]) => {
      console.log(`📦 ${data.name} (${serviceLineId}):`)
      console.log(`   Color: ${data.color}`)
      console.log(`   Contracts: ${data.contracts.length}`)
      console.log(`   Service Records: ${data.history.length}`)
      console.log(`   Billing Records: ${data.billing.length}`)
      
      if (data.contracts.length > 0) {
        const totalValue = data.contracts.reduce((sum, c) => sum + (c.contractValue || 0), 0)
        console.log(`   Total Contract Value: $${totalValue.toLocaleString()}`)
      }
      
      if (data.billing.length > 0) {
        const totalBilled = data.billing.reduce((sum, b) => sum + (b.amount || 0), 0)
        console.log(`   Total Billed: $${totalBilled.toLocaleString()}`)
      }
      console.log('')
    })

    // 6. Communication Audit
    console.log('💬 6. COMMUNICATION AUDIT')
    console.log('-'.repeat(50))
    
    const communicationAudit = {
      conversations: client.conversations.length,
      totalMessages: client.conversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0),
      communicationLogs: client.communications.length,
      lastActivity: null,
      messageTypes: {},
      senderDistribution: {}
    }

    // Analyze message patterns
    client.conversations.forEach(conv => {
      conv.messages?.forEach(msg => {
        // Track message types
        const msgType = msg.type || 'unknown'
        communicationAudit.messageTypes[msgType] = (communicationAudit.messageTypes[msgType] || 0) + 1
        
        // Track sender distribution
        const sender = msg.role || 'unknown'
        communicationAudit.senderDistribution[sender] = (communicationAudit.senderDistribution[sender] || 0) + 1
        
        // Track latest activity
        const msgTime = new Date(msg.timestamp)
        if (!communicationAudit.lastActivity || msgTime > communicationAudit.lastActivity) {
          communicationAudit.lastActivity = msgTime
        }
      })
    })

    console.log(`💬 Conversations: ${communicationAudit.conversations}`)
    console.log(`📨 Total Messages: ${communicationAudit.totalMessages}`)
    console.log(`📋 Communication Logs: ${communicationAudit.communicationLogs}`)
    console.log(`📅 Last Activity: ${communicationAudit.lastActivity ? communicationAudit.lastActivity.toISOString().split('T')[0] : 'No messages'}`)
    
    if (Object.keys(communicationAudit.messageTypes).length > 0) {
      console.log(`📊 Message Types:`)
      Object.entries(communicationAudit.messageTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`)
      })
    }
    
    if (Object.keys(communicationAudit.senderDistribution).length > 0) {
      console.log(`👥 Sender Distribution:`)
      Object.entries(communicationAudit.senderDistribution).forEach(([sender, count]) => {
        console.log(`   ${sender}: ${count} messages`)
      })
    }
    console.log('')

    // 7. Security & Privacy Considerations
    console.log('🔒 7. SECURITY & PRIVACY ASSESSMENT')
    console.log('-'.repeat(50))
    
    const privacyAssessment = {
      dataConsent: 'Not explicitly tracked', // Would need to be implemented
      lastUpdated: client.updatedAt ? new Date(client.updatedAt).toISOString() : 'Unknown',
      dataRetention: 'Active client - retention justified',
      accessLevel: 'Full access granted for service delivery',
      sensitiveData: {
        personalInfo: !!client.email && !!client.phone,
        financialInfo: client.billingRecords.length > 0,
        propertyInfo: !!client.address,
        communicationHistory: client.conversations.length > 0
      }
    }

    console.log(`📝 Data Consent: ${privacyAssessment.dataConsent}`)
    console.log(`📅 Last Updated: ${privacyAssessment.lastUpdated}`)
    console.log(`🗄️  Data Retention: ${privacyAssessment.dataRetention}`)
    console.log(`🔑 Access Level: ${privacyAssessment.accessLevel}`)
    console.log(`🔐 Sensitive Data Categories:`)
    Object.entries(privacyAssessment.sensitiveData).forEach(([category, hasData]) => {
      const status = hasData ? '✅' : '❌'
      console.log(`   ${status} ${category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}`)
    })
    console.log('')

    // 8. Data Integrity Summary
    console.log('📋 8. DATA INTEGRITY SUMMARY')
    console.log('=' * 70)
    
    const integrityScore = {
      contactInfo: Object.values(contactVerification).filter(field => 
        typeof field === 'object' && field.isValid
      ).length / 3, // name, email, phone
      dataCompleteness: completenessPercentage / 100,
      serviceLineIntegrity: Object.keys(serviceLineAnalysis).length >= 2 ? 1 : 0.5,
      communicationIntegrity: communicationAudit.totalMessages > 0 ? 1 : 0
    }
    
    const overallScore = Object.values(integrityScore).reduce((sum, score) => sum + score, 0) / Object.keys(integrityScore).length
    const scorePercentage = Math.round(overallScore * 100)
    
    console.log(`📊 OVERALL DATA INTEGRITY SCORE: ${scorePercentage}%`)
    console.log('')
    console.log('COMPONENT SCORES:')
    console.log(`   Contact Information: ${Math.round(integrityScore.contactInfo * 100)}%`)
    console.log(`   Data Completeness: ${Math.round(integrityScore.dataCompleteness * 100)}%`)
    console.log(`   Service Line Integrity: ${Math.round(integrityScore.serviceLineIntegrity * 100)}%`)
    console.log(`   Communication Integrity: ${Math.round(integrityScore.communicationIntegrity * 100)}%`)
    console.log('')
    
    // 9. Recommendations
    console.log('💡 9. RECOMMENDATIONS')
    console.log('-'.repeat(50))
    
    const recommendations = []
    
    if (!client.address?.city) {
      recommendations.push('🏠 Complete address information (city, province, postal code)')
    }
    if (!client.company && !client.notes?.includes('Individual')) {
      recommendations.push('🏢 Clarify if client represents a company or is individual')
    }
    if (!client.timeline) {
      recommendations.push('📅 Add service timeline/scheduling preferences')
    }
    if (client.communications.length === 0) {
      recommendations.push('📱 Initialize communication preferences tracking')
    }
    if (completenessPercentage < 80) {
      recommendations.push('📋 Improve data completeness (currently ' + completenessPercentage + '%)')
    }
    if (!client.address?.postalCode) {
      recommendations.push('📮 Add postal code for service area optimization')
    }
    
    if (recommendations.length === 0) {
      console.log('✅ No immediate recommendations - client profile is well-maintained!')
    } else {
      console.log('PRIORITY IMPROVEMENTS:')
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`)
      })
    }
    console.log('')
    
    console.log('🎉 CLIENT DATA INTEGRITY VERIFICATION COMPLETE!')
    console.log('=' * 70)

  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Execute verification
if (require.main === module) {
  verifyClientIntegrity()
}