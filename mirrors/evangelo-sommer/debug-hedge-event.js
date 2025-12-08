// Quick script to debug hedge trimming event data
console.log('🔍 DEBUGGING HEDGE TRIMMING EVENT DATA...')

// Check localStorage
const localStorageEvents = localStorage.getItem('unified-events')
if (localStorageEvents) {
  const events = JSON.parse(localStorageEvents)
  const hedgeEvents = events.filter(e => e.title.toLowerCase().includes('hedge'))

  console.log('📁 LOCALSTORAGE HEDGE EVENTS:', hedgeEvents.length)
  hedgeEvents.forEach((event, index) => {
    console.log(`📁 LocalStorage Event ${index + 1}:`, {
      id: event.id,
      title: event.title,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      duration: event.duration,
      calculatedDuration: event.endDateTime ?
        Math.round((new Date(event.endDateTime).getTime() - new Date(event.startDateTime).getTime()) / (1000 * 60)) :
        'N/A'
    })
  })
} else {
  console.log('📁 No localStorage events found')
}

// Check if there are different dates for hedge events
const testEvent = {
  title: "Hedge Trimming - Test No. 3",
  startDateTime: "2025-09-20T08:00:00",
  endDateTime: "2025-09-20T18:00:00"
}

const sept16Event = {
  title: "Hedge Trimming",
  startDateTime: "2025-09-16T06:00:00",
  endDateTime: "2025-09-16T07:00:00"
}

console.log('🧪 TEST EVENT (Sept 20):', {
  start: testEvent.startDateTime,
  end: testEvent.endDateTime,
  duration: Math.round((new Date(testEvent.endDateTime).getTime() - new Date(testEvent.startDateTime).getTime()) / (1000 * 60))
})

console.log('🧪 EXPECTED EVENT (Sept 16):', {
  start: sept16Event.startDateTime,
  end: sept16Event.endDateTime,
  duration: Math.round((new Date(sept16Event.endDateTime).getTime() - new Date(sept16Event.startDateTime).getTime()) / (1000 * 60))
})

// Try to fetch from API
fetch('/api/events?source=both')
  .then(response => response.json())
  .then(data => {
    console.log('🌐 API RESPONSE:', data)
    if (data.events) {
      const hedgeEvents = data.events.filter(e => e.title.toLowerCase().includes('hedge'))
      console.log('🌐 API HEDGE EVENTS:', hedgeEvents.length)
      hedgeEvents.forEach((event, index) => {
        console.log(`🌐 API Event ${index + 1}:`, {
          id: event.id,
          title: event.title,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          duration: event.duration
        })
      })
    }
  })
  .catch(error => {
    console.error('🌐 API Error:', error)
  })