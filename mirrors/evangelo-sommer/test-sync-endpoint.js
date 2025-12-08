// Test script for the updated /api/events/sync endpoint
const TEST_BASE_URL = 'http://localhost:3000';

async function testSyncEndpoint() {
  console.log('🧪 Testing Event Sync Endpoint...');

  try {
    // Test 1: GET request without localStorage data
    console.log('📋 Test 1: GET sync status without localStorage data...');
    const getResponse = await fetch(`${TEST_BASE_URL}/api/events/sync`);

    if (!getResponse.ok) {
      throw new Error(`GET sync status failed: ${getResponse.status} - ${await getResponse.text()}`);
    }

    const getResult = await getResponse.json();
    console.log('✅ GET sync status successful:', getResult.success);
    console.log('📊 Status:', getResult.status);
    console.log('💡 Recommendations:', getResult.recommendations);
    if (getResult.note) console.log('📝 Note:', getResult.note);

    // Test 2: POST sync-from-database
    console.log('🔄 Test 2: POST sync from database...');
    const syncResponse = await fetch(`${TEST_BASE_URL}/api/events/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync-from-database'
      })
    });

    if (!syncResponse.ok) {
      throw new Error(`POST sync from database failed: ${syncResponse.status} - ${await syncResponse.text()}`);
    }

    const syncResult = await syncResponse.json();
    console.log('✅ Sync from database successful:', syncResult.success);
    console.log('📊 Result:', syncResult.result);
    console.log('💬 Message:', syncResult.message);

    console.log('🎉 All sync endpoint tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('💡 Make sure the dev server is running on port 3000');
  }
}

// Run the test
testSyncEndpoint();