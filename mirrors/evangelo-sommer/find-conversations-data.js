#!/usr/bin/env node

/**
 * Find Conversations Data Script
 * 
 * Checks various sources where conversation data might exist:
 * 1. Database (SQLite)
 * 2. JSON files 
 * 3. Migration files
 */

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

async function findConversationsData() {
  console.log('🔍 SEARCHING FOR CONVERSATION DATA')
  console.log('==================================')

  let foundData = false

  // 1. Check database
  console.log('\n📊 1. CHECKING DATABASE...')
  try {
    const prisma = new PrismaClient()
    
    const conversationCount = await prisma.conversation.count()
    const messageCount = await prisma.message.count()
    const clientCount = await prisma.clientRecord.count()
    
    console.log(`✅ Database connection successful`)
    console.log(`   Conversations: ${conversationCount}`)
    console.log(`   Messages: ${messageCount}`)
    console.log(`   Clients: ${clientCount}`)
    
    if (conversationCount > 0) {
      foundData = true
      
      // Show sample conversations
      const conversations = await prisma.conversation.findMany({
        take: 5,
        include: {
          messages: true
        }
      })
      
      console.log('\n📋 Sample conversations:')
      conversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. "${conv.title || 'Untitled'}"`)
        console.log(`      Client ID: ${conv.clientId}`)
        console.log(`      Messages: ${conv.messages.length}`)
        console.log(`      Status: ${conv.status}`)
        console.log(`      Created: ${conv.createdAt}`)
      })
    } else {
      console.log('⚠️  No conversations found in database')
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.log(`❌ Database error: ${error.message}`)
  }

  // 2. Check JSON files
  console.log('\n📁 2. CHECKING JSON FILES...')
  const jsonFiles = [
    'mark-levy-migration-data.json',
    'conversation-recovery-report.json',
    'final-conversation-recovery-report.json'
  ]
  
  jsonFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'))
        console.log(`✅ Found: ${file}`)
        
        if (data.conversations && Array.isArray(data.conversations)) {
          console.log(`   Conversations: ${data.conversations.length}`)
          if (data.conversations[0]?.messages) {
            console.log(`   Sample messages: ${data.conversations[0].messages.length}`)
          }
          foundData = true
        } else if (Array.isArray(data) && data[0]?.messages) {
          console.log(`   Array of conversations: ${data.length}`)
          foundData = true
        } else {
          console.log(`   Structure: ${Object.keys(data).join(', ')}`)
        }
      } catch (error) {
        console.log(`❌ Error reading ${file}: ${error.message}`)
      }
    } else {
      console.log(`❌ Not found: ${file}`)
    }
  })

  // 3. Check if clientManager has data
  console.log('\n🗂️ 3. CHECKING CLIENTMANAGER DATA...')
  
  // This would only work in browser context, but we can check the mechanism
  console.log('📝 ClientManager should read from localStorage key: "crm-conversations"')
  console.log('💡 To check this, run in browser console:')
  console.log('   localStorage.getItem("crm-conversations")')
  
  // 4. Check migration scripts
  console.log('\n🔄 4. CHECKING MIGRATION SCRIPTS...')
  const migrationFiles = [
    'migrate-mark-levy.js',
    'scripts/migrate-mark-levy-enhanced.js',
    'recover-mark-levy-conversation.js',
    'complete-conversation-recovery.js'
  ]
  
  migrationFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ Found migration script: ${file}`)
    } else {
      console.log(`❌ Missing: ${file}`)
    }
  })

  // 5. Summary and recommendations
  console.log('\n💡 RECOMMENDATIONS:')
  
  if (!foundData) {
    console.log('❌ No conversation data found in any location!')
    console.log('\nPossible solutions:')
    console.log('1. 🔄 Re-run Excel import with your conversation file')
    console.log('2. 📊 Check if data exists in database and migrate to localStorage')
    console.log('3. 🗂️ Import from backup files if available')
  } else {
    console.log('✅ Found conversation data in some locations')
    console.log('\nNext steps:')
    console.log('1. 🔍 Verify which data source should be primary')
    console.log('2. 🔄 Migrate data to localStorage if needed')
    console.log('3. 🧪 Test with browser console debug script')
  }
  
  console.log('\n🔧 DEBUGGING COMMANDS:')
  console.log('Browser console: Run the debug-conversations-universal.js script')
  console.log('Database check: node find-conversations-data.js')
  console.log('Import fresh data: node scripts/universal-excel-import.js <your-file.xlsx>')
}

// Run the check
if (require.main === module) {
  findConversationsData().catch(console.error)
}

module.exports = { findConversationsData }