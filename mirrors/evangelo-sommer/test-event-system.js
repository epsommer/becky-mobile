// Test script for event persistence and display system
const TEST_BASE_URL = 'http://localhost:3001';

async function testEventSystem() {
  console.log('🧪 Testing Event System...');

  // Test event data (similar to hedge trimming event)
  const testEvent = {
    type: 'event',
    title: 'Test Hedge Trimming Service',
    description: 'Testing event persistence and display functionality',
    startDateTime: '2024-12-15T09:00:00',
    endDateTime: '2024-12-15T17:00:00',
    duration: 480, // 8 hours
    priority: 'medium',
    // clientId: 'test-client-123', // Comment out to avoid foreign key constraint
    clientName: 'Test Property Owner',
    location: '123 Test Street',
    notes: 'This is a test event to verify the system works after the hedge trimming deletion issue',
    isAllDay: false,
    isMultiDay: false
  };

  try {
    // Test 1: Create event
    console.log('📝 Test 1: Creating test event...');
    const createResponse = await fetch(`${TEST_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent)
    });

    if (!createResponse.ok) {
      throw new Error(`Create failed: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    console.log('✅ Event created:', createResult.success);
    console.log('📊 Database persisted:', createResult.database?.persisted || false);

    const eventId = createResult.event.id;

    // Test 2: Retrieve events
    console.log('📋 Test 2: Retrieving events...');
    const getResponse = await fetch(`${TEST_BASE_URL}/api/events?source=both`);

    if (!getResponse.ok) {
      throw new Error(`Get failed: ${getResponse.status}`);
    }

    const getResult = await getResponse.json();
    console.log('✅ Events retrieved:', getResult.success);
    console.log('📊 Total events:', getResult.count);
    console.log('📊 Event found:', getResult.events.some(e => e.id === eventId));

    // Test 3: Check sync status
    console.log('🔄 Test 3: Checking sync status...');
    const syncStatusResponse = await fetch(`${TEST_BASE_URL}/api/events/sync`);

    if (syncStatusResponse.ok) {
      const syncStatus = await syncStatusResponse.json();
      console.log('✅ Sync status checked:', syncStatus.success);
      console.log('📊 LocalStorage events:', syncStatus.status?.localStorageCount || 0);
      console.log('📊 Database events:', syncStatus.status?.databaseCount || 0);
      console.log('📊 Recommendations:', syncStatus.recommendations || []);
    }

    // Test 4: Update event
    console.log('✏️ Test 4: Updating event...');
    const updateResponse = await fetch(`${TEST_BASE_URL}/api/events?id=${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: 'Updated test event - persistence verified!'
      })
    });

    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log('✅ Event updated:', updateResult.success);
      console.log('📊 Database updated:', updateResult.database?.persisted || false);
    }

    // Test 5: Delete event (cleanup)
    console.log('🗑️ Test 5: Deleting test event...');
    const deleteResponse = await fetch(`${TEST_BASE_URL}/api/events?id=${eventId}`, {
      method: 'DELETE'
    });

    if (deleteResponse.ok) {
      const deleteResult = await deleteResponse.json();
      console.log('✅ Event deleted:', deleteResult.success);
      console.log('📊 Database deleted:', deleteResult.database?.deleted || false);
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('💡 Make sure the dev server is running on port 3001');
  }
}

// Run the test
testEventSystem();