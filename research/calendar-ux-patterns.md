# Calendar UX Patterns Research

**Last Updated:** December 30, 2025
**Scope:** Multi-event display patterns and drag/resize library evaluation for Becky CRM web app
**Target Codebase:** `/Users/epsommer/projects/web/evangelo-sommer`

---

## Multi-Event Display Patterns

### Notion Calendar Approach

#### Overlapping Event Display

Based on research of Notion Calendar's handling of multiple events:

**Filtering as Primary Solution**: Notion Calendar relies on filtering as the primary method to manage visual clutter when events overlap. When multiple events occur at the same time, users can apply filters to display only relevant tasks at a time, rather than sophisticated visual stacking.

**Conflict Avoidance**: Notion Calendar includes a conflict avoidance feature that automatically identifies time slots that don't conflict with "busy" events when sharing availability. This suggests the system actively tracks and manages overlapping events.

**All-Day Events**: Tasks without specific times are displayed as all-day events at the top of the calendar view, separate from timed events. The all-day section can be collapsed/expanded via keyboard shortcut (Ctrl/Cmd + K).

**Multi-Calendar Integration**: Notion Calendar's key feature is integrating multiple calendar accounts (personal, work, team) in one interface, overlaying team schedules on top of individual schedules.

**Visual Layout Details**: The research did not reveal specific technical details about how overlapping timed events are visually rendered (side-by-side, stacked, or with visual indicators). Notion appears to emphasize filtering and conflict prevention over complex visual overlap algorithms.

#### Week View Features
- Supports both monthly and weekly calendar views
- Quick switching between views using number keys (1-9 for custom day counts)
- Toggle weekends display with Ctrl/Cmd + K
- Collapsible all-day event sections
- Event types: Event, Focus time, Out of office, Birthday

**Key Insight**: Notion Calendar prioritizes simplicity and filtering over complex overlap visualization, which may be suitable for productivity-focused calendars but less ideal for scheduling-heavy CRM applications.

---

### Google Calendar Approach

#### Overlapping Event Display Algorithm

Google Calendar uses a sophisticated column-based layout algorithm for overlapping events:

**Collision Groups**: Events are organized into "collision groups" - sets of events that overlap with each other in time. If event A overlaps with B, and B overlaps with C, then A, B, and C are all in the same collision group, even if A and C don't directly overlap. Each collision group is processed independently.

**Matrix-Based Layout**: For each collision group:
1. Events are sorted by start time
2. A 2D matrix tracks column assignments (columns = concurrent events, rows = time periods)
3. Each event is placed in the leftmost available column that doesn't conflict
4. The matrix determines maximum concurrent events at any time point

**Width Calculation**:
- Formula: `width = containerWidth / maxColumns`
- All events in a collision group share the same width
- Example: 3 overlapping events each get 33.33% width

**Position Calculation**:
- Formula: `left = columnIndex * (containerWidth / maxColumns)`
- Events are positioned side-by-side, never overlapping visually

**Algorithm Implementation (from taterbase/calendar-puzzle)**:
```javascript
// Stage 1: Form collision groups
function findCollisionGroups(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const groups = [];

  for (const event of sorted) {
    let placed = false;
    for (const group of groups) {
      if (overlapsWithGroup(event, group)) {
        group.push(event);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([event]);
  }
  return groups;
}

// Stage 2: Assign columns within each group
function assignColumns(group) {
  const columns = [];
  const positions = new Map();

  for (const event of group) {
    let columnIndex = 0;
    while (columns[columnIndex] && overlapsWithColumn(event, columns[columnIndex])) {
      columnIndex++;
    }
    if (!columns[columnIndex]) columns[columnIndex] = [];
    columns[columnIndex].push(event);
    positions.set(event.id, columnIndex);
  }

  // Calculate final layout
  const maxColumns = columns.length;
  positions.forEach((column, eventId) => {
    positions.set(eventId, {
      column,
      maxColumns,
      width: 100 / maxColumns,
      left: column * (100 / maxColumns)
    });
  });

  return positions;
}
```

**Multi-Day Events**: All-day and multi-day events appear in a dedicated section at the top of the day/week view, rendered as horizontal bars spanning across days.

**Side-by-Side vs Overlay**: Google Calendar offers a "View calendars side by side in Day View" setting for multiple calendar sources. Individual events within a single calendar view are always displayed side-by-side when overlapping.

**Known Limitations**:
- Some users report visual overlap issues even for non-conflicting sequential events
- No built-in option to hide side-by-side display and prefer stacking

**Key Insight**: Google Calendar's algorithm is robust, mathematically precise, and handles complex overlap scenarios. It prioritizes showing all events simultaneously without hiding information.

---

### Recommended Pattern for Becky CRM

#### Recommendation: Google Calendar-style Column Algorithm

For a CRM application like Becky, the Google Calendar approach is strongly recommended:

**Rationale**:

1. **Information Density**: CRM users need to see all scheduled activities/meetings at once to understand availability and conflicts. Hiding events through filtering (Notion's approach) reduces visibility.

2. **Professional Context**: CRM users (sales, customer success, account managers) often have back-to-back meetings and need precise time management. The side-by-side column layout clearly shows timing and overlap.

3. **Visual Clarity**: The column algorithm provides immediate visual feedback about:
   - How many events overlap
   - Exact timing of each event
   - Available time slots
   - Potential scheduling conflicts

4. **Scalability**: The algorithm handles anywhere from 1 to N overlapping events gracefully, automatically adjusting widths.

**Already Implemented in Becky CRM Web App**:

The evangelo-sommer codebase already has this algorithm implemented in `/src/utils/calendar/eventOverlap.ts`:

```typescript
// Existing implementation includes:
- eventsOverlap(event1, event2): boolean
- findCollisionGroups(events): CollisionGroup[]
- assignColumns(group): Map<eventId, EventPosition>
- calculateEventPositions(events): Map<eventId, EventPosition>
```

**Current Gap**: The algorithm exists but isn't fully applied in the visual rendering. The analysis document at `/analyses/overlapping-events-analysis.md` provides detailed recommendations for integration.

**Recommended Next Steps**:
1. Apply `calculateEventPositions()` to Day/Week views
2. Update `getEventStyle()` to use calculated positions
3. Add "+N more" indicator to Month view for overflow handling

---

## Drag/Resize Library Recommendation

### Current Codebase Analysis

**Becky CRM Web App** (`/Users/epsommer/projects/web/evangelo-sommer/package.json`):

| Dependency | Version | Relevance |
|------------|---------|-----------|
| **next** | 15.5.7 | Framework |
| **react** | 19.0.0 | Core library |
| **framer-motion** | 12.23.24 | Animation/gestures (already installed) |
| **react-rnd** | 10.5.2 | Drag + resize (already installed) |
| **date-fns** | 4.1.0 | Date manipulation |
| **zustand** | 5.0.8 | State management |
| **typescript** | 5.9.3 | Type checking |

**Key Observations**:
- **react-rnd is already installed** (v10.5.2) - handles both drag AND resize
- **framer-motion is already installed** (v12.23.24) - can complement react-rnd
- Modern React 19 with Next.js 15
- Full TypeScript support

**Existing Calendar Components**:
- `/src/components/calendar/CalendarEvent.tsx` - Unified event with drag/resize support
- `/src/components/calendar/UnifiedEvent.tsx` - Framer Motion-based event component
- `/src/components/calendar/ResizeHandle.tsx` - Custom resize handles (all 8 directions)
- `/src/utils/calendar/eventOverlap.ts` - Overlap algorithm implementation
- `/src/hooks/useEventResize.ts` - Resize hook with preview support

---

### Library Comparison

| Library | Bundle Size | Resize Support | React 18/19 | TypeScript | Weekly Downloads | Activity |
|---------|-------------|----------------|-------------|------------|------------------|----------|
| **react-rnd** | ~15.5kb gzip | Yes (built-in) | React 19 | Built-in | 483k | Active (10mo) |
| **dnd-kit** | ~10kb core | No (drag only) | React 19 | Built-in | 6M+ | Active (1yr) |
| **react-dnd** | ~40kb+ w/backend | No (drag only) | React 19 | Built-in | 3M | Active |
| **@use-gesture/react** | ~8kb | Manual impl. | React 19 | Built-in | 400k+ | Active |
| **framer-motion** | ~40kb | Via drag gestures | React 18 (19 issues) | Built-in | 5M+ | Active |
| **Native Pointer Events** | 0kb | Manual impl. | React 19 | Manual | N/A | N/A |

**Detailed Analysis**:

#### react-rnd (v10.5.2) - ALREADY INSTALLED
- **Pros**:
  - Handles BOTH drag AND resize out of box
  - Recently updated with fixes for Next.js 15 + React 19 (Feb 2025, May 2025)
  - Grid snapping via `dragGrid` prop
  - Bounded dragging via `bounds` prop
  - Aspect ratio locking available
  - 4,260+ GitHub stars, 1.1M+ monthly downloads
- **Cons**:
  - Focused on single elements (not list sorting)
  - Slightly larger than gesture-only libraries
- **Dependencies**: re-resizable, react-draggable, tslib

#### dnd-kit
- **Pros**: Lightweight, modern, accessible, modular, great for sortable lists
- **Cons**: No built-in resize - requires custom implementation
- **Best For**: Kanban boards, sortable lists, drag between containers
- **Note**: 16k+ GitHub stars, most downloaded DnD library

#### @use-gesture/react
- **Pros**: Gesture-based, works with any renderer, pairs well with react-spring/framer-motion
- **Cons**: Requires manual resize logic, gesture-only (no resize primitives)
- **Best For**: Custom gesture interactions, animation-heavy UIs

#### framer-motion
- **Pros**: Already installed, excellent animations, drag gesture support
- **Cons**: React 19 compatibility issues in v12.x, no built-in resize
- **Note**: Motion v12 alpha added React 19 support but may have issues

#### Native Pointer Events
- **Pros**: Zero dependencies, full control, modern API
- **Cons**: Must implement all logic manually (collision, constraints, snap)
- **Best For**: Custom requirements, minimal bundle, learning

---

### Recommendation

#### Primary: Continue Using react-rnd (Already Installed)

**Reasoning**:
1. **Already in package.json**: No additional dependency to add
2. **Resize + Drag Built-in**: Calendar events need both - react-rnd handles natively
3. **React 19 Compatible**: Recent updates specifically for Next.js 15 and React 19
4. **Active Maintenance**: Regular updates, responsive to modern React changes
5. **Grid Snapping**: Built-in `dragGrid` for 15-minute time intervals
6. **Bounded Dragging**: `bounds="parent"` keeps events in calendar container

**Existing Usage Pattern in Codebase**:
The codebase already uses react-rnd patterns via custom hooks and components:
- `useEventResize.ts` - Custom resize hook with pixel-to-time calculations
- `ResizeHandle.tsx` - Custom resize handles for all 8 directions
- `CalendarEvent.tsx` - HTML5 drag with custom resize integration

#### Secondary: Leverage Existing framer-motion

**For Enhanced Animations**:
- Use framer-motion's `AnimatePresence` for event transitions
- Use `motion.div` for hover/tap feedback
- Combine with react-rnd for best of both worlds

**Current Pattern in UnifiedEvent.tsx**:
```typescript
<motion.div
  drag={!isResizing}
  dragMomentum={false}
  whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
  whileHover={{ scale: 1.01 }}
  layout
  layoutId={`event-${event.id}`}
>
```

---

## Implementation Notes

### Key Considerations for the Implementer

#### 1. Apply Existing Overlap Algorithm

The overlap algorithm already exists in `/src/utils/calendar/eventOverlap.ts`. To apply it:

```typescript
// In WeekView.tsx or UnifiedDailyPlanner.tsx
import { calculateEventPositions } from '@/utils/calendar/eventOverlap'

const eventPositions = useMemo(() => {
  return calculateEventPositions(filteredEvents)
}, [filteredEvents])

// Update getEventStyle to use calculated position
const getEventStyle = (event: UnifiedEvent): React.CSSProperties => {
  const position = eventPositions.get(event.id)

  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${Math.max(height, 25)}px`,
    left: position ? `${position.left}%` : 0,
    width: position ? `${position.width}%` : '100%',
    zIndex: position ? position.zIndex : 10
  }
}
```

#### 2. Time-to-Pixel Conversion

Already implemented in the codebase. Standard formula:
```typescript
const PIXELS_PER_HOUR = 60; // 1px per minute
pxInMs = height / (hoursCount * MS_IN_HOUR)
top = pxInMs * (value.start - startOfDay)
```

#### 3. Snap to 15-Minute Grid

For react-rnd:
```typescript
<Rnd
  dragGrid={[1, 15]} // [x, y] - horizontal free, vertical 15px
  resizeGrid={[1, 15]}
  // ...
/>
```

For custom implementation (already in useEventResize.ts):
```typescript
function snapToGrid(pixels: number, gridSize: number = 15): number {
  const minutes = pixels;
  return Math.round(minutes / gridSize) * gridSize;
}
```

#### 4. Minimum Event Duration

Already implemented - enforce 15-minute minimum:
```typescript
const MIN_EVENT_DURATION_MINUTES = 15;
const MIN_EVENT_HEIGHT = 15; // pixels

function enforceMinDuration(height: number): number {
  return Math.max(height, MIN_EVENT_HEIGHT);
}
```

#### 5. Touch Target Size

For mobile compatibility:
```typescript
const MIN_TOUCH_WIDTH = 60; // 60px minimum
const MIN_TOUCH_HEIGHT = 44; // iOS HIG recommendation
```

If event width < MIN_TOUCH_WIDTH due to many overlaps, expand on tap to show details.

#### 6. Month View "+N More" Indicator

```typescript
const MAX_VISIBLE_EVENTS_PER_DAY = 3

const renderDayEvents = (day: Date) => {
  const dayEvents = getSingleDayEventsForDate(day)
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS_PER_DAY)
  const hiddenCount = Math.max(0, dayEvents.length - MAX_VISIBLE_EVENTS_PER_DAY)

  return (
    <>
      {visibleEvents.map(event => (
        <CalendarEvent key={event.id} event={event} isCompact={true} />
      ))}
      {hiddenCount > 0 && (
        <button
          className="text-xs text-accent hover:underline"
          onClick={() => navigateToDayView(day)}
        >
          +{hiddenCount} more
        </button>
      )}
    </>
  )
}
```

#### 7. Performance Optimization

The existing codebase uses memoization:
```typescript
const eventPositions = useMemo(
  () => calculateEventPositions(filteredEvents),
  [filteredEvents]
);
```

For large event counts, consider virtualization with react-window.

#### 8. Accessibility

The codebase includes:
- Keyboard navigation support
- ARIA labels on events
- Focus management during drag/resize
- Screen reader announcements

---

## Verification Checklist

- [x] Notion Calendar multi-event behavior documented with specifics
- [x] Google Calendar multi-event behavior documented with specifics
- [x] At least 3 drag/resize libraries compared with concrete metrics
- [x] Clear recommendation made with supporting rationale
- [x] Research file saved to `./research/calendar-ux-patterns.md`

---

## Sources

### Notion Calendar
- [Manage your calendars & events - Notion Help Center](https://www.notion.com/help/manage-your-calendars-and-events)
- [Calendar view - Notion Help Center](https://www.notion.com/help/calendars)
- [Getting started with Notion Calendar](https://www.notion.com/help/guides/getting-started-with-notion-calendar)
- [Notion Calendar settings - Notion Help Center](https://www.notion.com/help/notion-calendar-settings)

### Google Calendar
- [google calendar: display of overlapping events - Google Calendar Community](https://support.google.com/calendar/thread/203429627/google-calendar-display-of-overlapping-events?hl=en)
- [Changing side by side into overlaying events - Google Calendar Community](https://support.google.com/calendar/thread/137931023/changing-side-by-side-into-overlaying-events?hl=en)
- [GitHub - taterbase/calendar-puzzle (Algorithm implementation)](https://github.com/taterbase/calendar-puzzle)

### Library Comparisons
- [Top 5 Drag-and-Drop Libraries for React in 2025 | Puck](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- [@dnd-kit/core vs react-dnd vs react-beautiful-dnd | npm-compare](https://npm-compare.com/@dnd-kit/core,react-beautiful-dnd,react-dnd,react-sortable-hoc)
- [GitHub - clauderic/dnd-kit](https://github.com/clauderic/dnd-kit)
- [npmtrends - react-rnd](https://npmtrends.com/react-rnd)
- [npmtrends - moveable vs react-moveable vs react-resizable vs react-rnd](https://npmtrends.com/moveable-vs-react-moveable-vs-react-resizable-vs-react-rnd)

### react-rnd
- [GitHub - bokuweb/react-rnd](https://github.com/bokuweb/react-rnd)
- [react-rnd - npm](https://www.npmjs.com/package/react-rnd)

### @use-gesture/react
- [@use-gesture/react - npm](https://www.npmjs.com/package/@use-gesture/react)
- [GitHub - pmndrs/use-gesture](https://github.com/pmndrs/use-gesture)
- [Home - @use-gesture documentation](https://use-gesture.netlify.app/)

### Framer Motion
- [Motion & Framer Motion upgrade guide | Motion](https://motion.dev/docs/react-upgrade-guide)
- [React gesture animations - hover, drag, press | Motion](https://www.framer.com/motion/gestures/)
- [React 19 compatibility issue - GitHub](https://github.com/framer/motion/issues/2668)

### Custom Implementation Reference
- [Calendar Editor with React | Drag & Resize Elements](https://radzion.com/blog/calendar-editor/)
- [React Event calendar Move, resize & create Example | Mobiscroll](https://demo.mobiscroll.com/react/eventcalendar/move-resize-drag-drop-to-create-events)

---

**Research completed:** December 30, 2025
**Next steps:** Apply overlap algorithm to Day/Week views, add "+N more" to Month view
