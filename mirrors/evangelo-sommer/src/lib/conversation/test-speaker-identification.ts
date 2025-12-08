/**
 * Test script to verify speaker identification logic
 * Run this to debug the role attribution issue
 */

import { SMSProcessor } from './sms-processor';

// Test data based on the user's description
const testRows = [
  {
    'Type': 'Sent',
    'Date': 'Monday, July 29, 2025 2:10:11 p.m. Eastern Standard Time',
    'Name / Number': 'Mark Levy',
    'Content': 'Test message from you to Mark'
  },
  {
    'Type': 'Received',
    'Date': 'Monday, July 29, 2025 2:15:11 p.m. Eastern Standard Time',
    'Name / Number': 'Mark Levy',
    'Content': 'Test reply from Mark to you'
  },
  {
    'Type': 'Received Sent by: Mark Levy',
    'Date': 'Monday, July 29, 2025 2:20:11 p.m. Eastern Standard Time', 
    'Name / Number': 'Mark Levy',
    'Content': 'Another message from Mark with extended type field'
  },
  {
    'Type': 'Sent',
    'Date': 'Monday, July 29, 2025 2:25:11 p.m. Eastern Standard Time',
    'Name / Number': 'Mark Levy', 
    'Content': 'Your response back to Mark'
  }
];

export async function testSpeakerIdentification() {
  console.log('🧪 Testing Speaker Identification Logic');
  console.log('=====================================\n');

  const processor = new SMSProcessor();
  
  try {
    const result = await processor.processSMSExport(testRows);
    
    console.log('\n📊 Processing Results:');
    console.log(`Total messages: ${result.messages.length}`);
    console.log(`Average confidence: ${Math.round(result.summary.confidenceAverage * 100)}%`);
    
    console.log('\n📝 Message Analysis:');
    result.messages.forEach((msg, index) => {
      const originalType = testRows[index]?.Type || 'Unknown';
      console.log(`\nMessage ${index + 1}:`);
      console.log(`  Original Type: "${originalType}"`);
      console.log(`  Assigned Role: "${msg.role}"`);
      console.log(`  Confidence: ${Math.round(msg.metadata.confidence * 100)}%`);
      console.log(`  Content: "${msg.content.substring(0, 50)}..."`);
      console.log(`  Expected: ${originalType === 'Sent' ? 'you' : 'client'}`);
      console.log(`  Correct: ${
        (originalType === 'Sent' && msg.role === 'you') ||
        (originalType.startsWith('Received') && msg.role === 'client')
          ? '✅' : '❌'
      }`);
    });
    
    // Summary check
    const sentMessages = result.messages.filter(m => testRows.find(r => r.Type === 'Sent'));
    const youMessages = result.messages.filter(m => m.role === 'you');
    const receivedMessages = result.messages.filter(m => testRows.find(r => r.Type.startsWith('Received')));
    const clientMessages = result.messages.filter(m => m.role === 'client');
    
    console.log('\n🎯 Summary Analysis:');
    console.log(`Sent messages (should be "you"): ${sentMessages.length}`);
    console.log(`Messages assigned to "you": ${youMessages.length}`);
    console.log(`Received messages (should be "client"): ${receivedMessages.length}`);
    console.log(`Messages assigned to "client": ${clientMessages.length}`);
    
    const isCorrect = youMessages.length >= 2 && clientMessages.length >= 2;
    console.log(`\nOverall result: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!isCorrect) {
      console.log('\n🚨 Issue Details:');
      if (youMessages.length < 2) {
        console.log(`  - Too few "you" messages: expected 2, got ${youMessages.length}`);
      }
      if (clientMessages.length < 2) {
        console.log(`  - Too few "client" messages: expected 2, got ${clientMessages.length}`);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    throw error;
  }
}

// Export for use in other tests
export { testRows };