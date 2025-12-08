// Service Line Separation Analysis Script
const fetch = require('node-fetch')

async function analyzeServiceSeparation() {
  try {
    console.log('🔍 Analyzing Service Line Separation...\n')
    
    const clientId = 'cmf5mw8g60002uz8xl4octzrn'
    const response = await fetch(`http://localhost:3001/api/clients/${clientId}/services-billing`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('✅ API Response Retrieved Successfully')
    console.log(`📋 Client: ${data.name}`)
    console.log(`📊 Data Summary:`)
    console.log(`   - Service Contracts: ${data.serviceContracts?.length || 0}`)
    console.log(`   - Service Records: ${data.serviceRecords?.length || 0}`)
    console.log(`   - Billing Records: ${data.billingRecords?.length || 0}`)
    
    // Group service records by service line
    console.log('\n🔍 Service Records by Service Line:')
    const serviceLineGroups = {}
    
    data.serviceRecords.forEach(record => {
      const serviceLineId = record.serviceLineId
      const serviceLineName = record.serviceLine?.name || 'Unknown'
      
      if (!serviceLineGroups[serviceLineId]) {
        serviceLineGroups[serviceLineId] = {
          name: serviceLineName,
          color: record.serviceLine?.color || '#gray',
          records: []
        }
      }
      
      serviceLineGroups[serviceLineId].records.push({
        type: record.serviceType,
        date: record.serviceDate.split('T')[0],
        amount: record.amount
      })
    })
    
    Object.keys(serviceLineGroups).forEach(serviceLineId => {
      const group = serviceLineGroups[serviceLineId]
      console.log(`\n  📦 ${group.name} (${serviceLineId}):`)
      console.log(`     Color: ${group.color}`)
      console.log(`     Records: ${group.records.length}`)
      
      const serviceTypes = [...new Set(group.records.map(r => r.type))]
      console.log(`     Service Types: ${serviceTypes.join(', ')}`)
      
      const totalAmount = group.records.reduce((sum, r) => sum + r.amount, 0)
      console.log(`     Total Amount: $${totalAmount}`)
      
      // Show first few records
      console.log(`     Recent Records:`)
      group.records.slice(0, 3).forEach(record => {
        console.log(`       - ${record.type}: $${record.amount} (${record.date})`)
      })
    })
    
    // Check for proper separation
    console.log('\n🎯 Separation Analysis:')
    const serviceLineCount = Object.keys(serviceLineGroups).length
    console.log(`   Service Lines Found: ${serviceLineCount}`)
    
    if (serviceLineCount === 2) {
      console.log('   ✅ CORRECT: Two service lines detected')
      
      const whiteKnightId = 'whiteknight_snow'
      const woodgreenId = 'woodgreen_landscaping' 
      
      const whiteKnight = serviceLineGroups[whiteKnightId]
      const woodgreen = serviceLineGroups[woodgreenId]
      
      if (whiteKnight && woodgreen) {
        console.log('   ✅ CORRECT: Both expected service lines present')
        console.log(`   ❄️  White Knight: ${whiteKnight.records.length} records`)
        console.log(`   🌿 Woodgreen: ${woodgreen.records.length} records`)
        
        // Check for overlapping service types
        const whiteKnightTypes = new Set(whiteKnight.records.map(r => r.type))
        const woodgreenTypes = new Set(woodgreen.records.map(r => r.type))
        
        const overlaps = [...whiteKnightTypes].filter(type => woodgreenTypes.has(type))
        
        if (overlaps.length === 0) {
          console.log('   ✅ PERFECT: No service type overlaps between service lines')
        } else {
          console.log(`   ❌ ISSUE: Service type overlaps found: ${overlaps.join(', ')}`)
        }
      } else {
        console.log('   ❌ ISSUE: Expected service line IDs not found')
      }
    } else {
      console.log(`   ❌ ISSUE: Expected 2 service lines, found ${serviceLineCount}`)
    }
    
    console.log('\n🚀 Analysis Complete!')
    
    if (serviceLineCount === 2 && serviceLineGroups['whiteknight_snow'] && serviceLineGroups['woodgreen_landscaping']) {
      console.log('🎉 SERVICE LINE SEPARATION IS WORKING CORRECTLY!')
      console.log('   The issue is likely in the UI component rendering logic.')
      return true
    } else {
      console.log('❌ SERVICE LINE SEPARATION ISSUE DETECTED!')
      console.log('   The problem is in the data structure or API response.')
      return false
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
    return false
  }
}

analyzeServiceSeparation()