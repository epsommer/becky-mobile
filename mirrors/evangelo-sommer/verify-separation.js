// Final Service Line Separation Verification
const http = require('http')

async function verifyServiceLineSeparation() {
  console.log('🎯 Final Service Line Separation Verification\n')
  
  try {
    // Test API endpoint
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3001/api/clients/cmf5mw8g60002uz8xl4octzrn/services-billing', resolve)
      req.on('error', reject)
    })
    
    let data = ''
    for await (const chunk of response) {
      data += chunk
    }
    
    const clientData = JSON.parse(data)
    
    console.log(`✅ API Response Loaded Successfully`)
    console.log(`📋 Client: ${clientData.name}`)
    console.log(`📊 Service Records: ${clientData.serviceRecords?.length || 0}`)
    
    // Group by service line
    const groupedRecords = {}
    clientData.serviceRecords.forEach(record => {
      const serviceLineId = record.serviceLineId
      const serviceLineName = record.serviceLine?.name || 'Unknown'
      
      if (!groupedRecords[serviceLineId]) {
        groupedRecords[serviceLineId] = {
          name: serviceLineName,
          color: record.serviceLine?.color,
          records: []
        }
      }
      
      groupedRecords[serviceLineId].records.push({
        type: record.serviceType,
        amount: record.amount,
        date: record.serviceDate.split('T')[0]
      })
    })
    
    console.log('\n🔍 Service Line Separation Analysis:')
    
    Object.keys(groupedRecords).forEach(serviceLineId => {
      const group = groupedRecords[serviceLineId]
      console.log(`\n📦 ${group.name} (${serviceLineId}):`)
      console.log(`   Color: ${group.color}`)
      console.log(`   Records: ${group.records.length}`)
      
      const serviceTypes = [...new Set(group.records.map(r => r.type))]
      console.log(`   Service Types: ${serviceTypes.join(', ')}`)
      
      const totalAmount = group.records.reduce((sum, r) => sum + r.amount, 0)
      console.log(`   Total Amount: $${totalAmount}`)
      
      // Show sample records
      console.log(`   Sample Records:`)
      group.records.slice(0, 2).forEach(record => {
        console.log(`     - ${record.type}: $${record.amount} (${record.date})`)
      })
    })
    
    // Verification checks
    const serviceLineIds = Object.keys(groupedRecords)
    const expectedIds = ['whiteknight_snow', 'woodgreen_landscaping']
    
    console.log('\n🎯 Verification Results:')
    console.log(`   Service Lines Found: ${serviceLineIds.length}`)
    console.log(`   Expected Service Lines: ${expectedIds.length}`)
    
    const allExpectedFound = expectedIds.every(id => serviceLineIds.includes(id))
    console.log(`   All Expected Service Lines Present: ${allExpectedFound ? '✅' : '❌'}`)
    
    // Check service type separation
    const whiteKnightTypes = new Set((groupedRecords['whiteknight_snow']?.records || []).map(r => r.type))
    const woodgreenTypes = new Set((groupedRecords['woodgreen_landscaping']?.records || []).map(r => r.type))
    
    const overlaps = [...whiteKnightTypes].filter(type => woodgreenTypes.has(type))
    console.log(`   Service Type Overlaps: ${overlaps.length === 0 ? '✅ None' : '❌ ' + overlaps.join(', ')}`)
    
    // Expected service types
    const expectedWhiteKnight = ['SNOW_REMOVAL', 'PREMIUM_SALTING']
    const expectedWoodgreen = ['LAWN_MOWING', 'HEDGE_TRIMMING']
    
    const whiteKnightCorrect = expectedWhiteKnight.every(type => whiteKnightTypes.has(type))
    const woodgreenCorrect = expectedWoodgreen.every(type => woodgreenTypes.has(type))
    
    console.log(`   White Knight Service Types Correct: ${whiteKnightCorrect ? '✅' : '❌'}`)
    console.log(`   Woodgreen Service Types Correct: ${woodgreenCorrect ? '✅' : '❌'}`)
    
    // Record counts
    const whiteKnightCount = groupedRecords['whiteknight_snow']?.records.length || 0
    const woodgreenCount = groupedRecords['woodgreen_landscaping']?.records.length || 0
    
    console.log(`   White Knight Record Count: ${whiteKnightCount} (Expected: 6)`)
    console.log(`   Woodgreen Record Count: ${woodgreenCount} (Expected: 8)`)
    
    const countsCorrect = whiteKnightCount === 6 && woodgreenCount === 8
    console.log(`   Record Counts Correct: ${countsCorrect ? '✅' : '❌'}`)
    
    // Final status
    const allChecksPass = allExpectedFound && overlaps.length === 0 && whiteKnightCorrect && woodgreenCorrect && countsCorrect
    
    console.log('\n' + '='.repeat(60))
    if (allChecksPass) {
      console.log('🎉 SERVICE LINE SEPARATION - PERFECT!')
      console.log('✅ All verification checks passed')
      console.log('✅ Two distinct service lines with proper separation')
      console.log('✅ No service type overlaps')
      console.log('✅ Correct record counts and assignments')
      console.log('\n🌟 The UI should now display:')
      console.log('   📦 White Knight Snow Service (Blue #4A90E2) - 6 winter records')  
      console.log('   📦 Woodgreen Landscaping (Green #7ED321) - 8 lawn records')
    } else {
      console.log('❌ SERVICE LINE SEPARATION - ISSUES DETECTED!')
      console.log('   Review the verification results above for specific problems')
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
  }
}

verifyServiceLineSeparation()