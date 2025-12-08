#!/usr/bin/env node

/**
 * Migrate Database Conversations to localStorage
 * 
 * This script moves conversations from the Prisma database to localStorage
 * so they can be displayed by the UI components.
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function migrateDbToLocalStorage() {
  console.log('🔄 MIGRATING DATABASE CONVERSATIONS TO LOCALSTORAGE')
  console.log('==================================================')

  try {
    // 1. Fetch all conversations from database
    console.log('📊 1. FETCHING DATABASE CONVERSATIONS...')
    
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      }
    })

    console.log(`✅ Found ${conversations.length} conversations in database`)
    
    if (conversations.length === 0) {
      console.log('⚠️  No conversations to migrate')
      return
    }

    // 2. Transform to localStorage format
    console.log('🔧 2. TRANSFORMING TO LOCALSTORAGE FORMAT...')
    
    const localStorageConversations = conversations.map(conv => ({
      id: conv.id,
      clientId: conv.clientId,
      title: conv.title || 'Untitled Conversation',
      summary: conv.summary || '',
      status: conv.status?.toLowerCase() || 'active',
      priority: conv.priority?.toLowerCase() || 'medium',
      source: conv.source?.toLowerCase() || 'database',
      tags: conv.tags || [],
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages: conv.messages.map(msg => ({
        id: msg.id,
        role: msg.role.toLowerCase(), // Convert 'CLIENT' to 'client', 'YOU' to 'you' 
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        type: msg.type?.toLowerCase() || 'text',
        metadata: msg.metadata || {}
      }))
    }))

    console.log('✅ Transformed conversations to localStorage format')
    
    // 3. Show sample data
    localStorageConversations.forEach((conv, index) => {
      console.log(`   ${index + 1}. "${conv.title}"`)
      console.log(`      Client ID: ${conv.clientId}`)
      console.log(`      Messages: ${conv.messages.length}`)
      console.log(`      Status: ${conv.status}`)
      console.log(`      Created: ${conv.createdAt}`)
    })

    // 4. Check for existing localStorage data
    console.log('\n📂 3. CHECKING EXISTING LOCALSTORAGE DATA...')
    
    // For this script, we'll generate the data structure and save it to a file
    // that can be imported into localStorage via browser
    const outputFile = 'localstorage-conversations.json'
    
    // Check if there's existing data that we should merge
    let existingData = []
    if (fs.existsSync(outputFile)) {
      try {
        existingData = JSON.parse(fs.readFileSync(outputFile, 'utf8'))
        console.log(`📋 Found existing data: ${existingData.length} conversations`)
      } catch (error) {
        console.log('⚠️  Could not parse existing data, starting fresh')
      }
    }

    // 5. Merge data (avoid duplicates by ID)
    console.log('🔗 4. MERGING DATA...')
    
    const existingIds = new Set(existingData.map(conv => conv.id))
    const newConversations = localStorageConversations.filter(conv => !existingIds.has(conv.id))
    
    const mergedData = [...existingData, ...newConversations]
    
    console.log(`📊 Merge results:`)
    console.log(`   Existing: ${existingData.length}`)
    console.log(`   New: ${newConversations.length}`)
    console.log(`   Total: ${mergedData.length}`)

    // 6. Save to file
    console.log('💾 5. SAVING TO FILE...')
    
    fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2))
    console.log(`✅ Saved to ${outputFile}`)

    // 7. Generate browser import script
    const browserScript = `
// Copy and paste this into your browser console to import conversations

const conversations = ${JSON.stringify(mergedData, null, 2)};

console.log('📥 Importing', conversations.length, 'conversations to localStorage...');

// Save to localStorage
localStorage.setItem('crm-conversations', JSON.stringify(conversations));

// Trigger storage event for components
window.dispatchEvent(new StorageEvent('storage', {
  key: 'crm-conversations',
  newValue: JSON.stringify(conversations),
  storageArea: localStorage
}));

console.log('✅ Import complete! Conversations should now appear in UI.');
console.log('🔄 Refresh the page if needed.');

// Verify the import
const stored = localStorage.getItem('crm-conversations');
const parsed = stored ? JSON.parse(stored) : [];
console.log('📊 Verification:', parsed.length, 'conversations stored');
`

    fs.writeFileSync('import-to-browser.js', browserScript)
    console.log('✅ Created import-to-browser.js for browser console')

    // 8. Instructions
    console.log('\n🎯 MIGRATION COMPLETE!')
    console.log('====================')
    console.log('\nTo complete the migration:')
    console.log('1. 🌐 Open your browser and navigate to your app')
    console.log('2. 🔧 Open DevTools (F12) and go to Console tab')
    console.log('3. 📋 Copy the contents of import-to-browser.js')
    console.log('4. 📥 Paste into console and press Enter')
    console.log('5. 🔄 Refresh the page')
    console.log('6. ✅ Conversations should now appear in the UI!')

    console.log('\n📁 Files created:')
    console.log(`   • ${outputFile} - JSON data for localStorage`)
    console.log(`   • import-to-browser.js - Browser console script`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  migrateDbToLocalStorage().catch(console.error)
}

module.exports = { migrateDbToLocalStorage }