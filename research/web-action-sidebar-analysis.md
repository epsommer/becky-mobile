# Action Sidebar & Year Calendar Analysis

## Overview

The evangelo-sommer web application implements a sophisticated responsive action system that adapts between three main viewport states:

1. **Desktop/Landscape (>=768px or landscape >=640px)**: Full `ActionSidebar` visible alongside calendar
2. **Mobile/Portrait (<768px in portrait or <640px)**: `CalendarBottomActionBar` - a draggable bottom sheet
3. **Alternative Sidebar Pattern**: `BottomActionBar` (generic component) uses `lg:hidden` breakpoint (1024px)

The system provides quick actions, a mini calendar for navigation, event creation forms, event details viewing, batch event creation, and analytics - all in a unified responsive interface.

---

## Year Calendar Component

### Structure and Layout

The "year calendar" in the action sidebar is actually implemented as a **mini calendar** widget (month view) within the `ActionSidebar` component, combined with a **12-week activity heatmap** for longer-term visibility.

#### Mini Calendar (renderMiniCalendar)
Located in `/Users/epsommer/projects/web/evangelo-sommer/src/components/ActionSidebar.tsx` (lines 217-321):

```typescript
const renderMiniCalendar = () => {
  const monthStart = startOfMonth(displayedMonth)
  const monthEnd = endOfMonth(displayedMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  // ...
}
```

**Key structural elements:**
- Month header with navigation (ChevronUp/ChevronDown buttons)
- "Return to today" button (RotateCcw icon) appears when viewing non-current months
- Day headers row (S, M, T, W, T, F, S)
- Calendar grid (7x6 maximum)

#### Activity Heatmap (renderActivityHeatmap)
Lines 458-517 provide a GitHub-style heatmap showing the last 12 weeks:

```typescript
const heatmapDays = useMemo(() => {
  const heatmapStart = subWeeks(new Date(), 12)
  return eachDayOfInterval({ start: heatmapStart, end: new Date() })
}, [])
```

### Interactions and Navigation

**Month Navigation:**
- `handlePreviousMonth()` - Navigate to previous month
- `handleNextMonth()` - Navigate to next month
- `handleReturnToToday()` - Jump back to current month and select today

**Date Selection:**
- `handleDayClick(date)` - Selects a date and optionally switches to day view
- Days outside current month are disabled (non-clickable)
- Visual states: today (ring highlight), selected (neo-button-active), has events (dot indicators)

**Event Indicators:**
Days with events show up to 3 dots below the date number indicating event presence.

### Integration with Main Calendar

The ActionSidebar receives `onDateSelect` and `onViewChange` callbacks from the parent:

```typescript
interface ActionSidebarProps {
  selectedDate: Date
  currentView: 'day' | 'week' | 'month'
  onDateSelect: (date: Date) => void
  onViewChange?: (view: 'day' | 'week') => void
  // ...
}
```

When a date is clicked:
1. The date is passed up via `onDateSelect(date)`
2. If current view is 'month', it switches to 'day' view via `onViewChange?.('day')`

### YearDayIndicator Component

Located at `/Users/epsommer/projects/web/evangelo-sommer/src/components/calendar/YearDayIndicator.tsx`:

A reusable component for rendering event density indicators:
- 0 events: Empty/transparent
- 1-3 events: Colored cell with tally count (number)
- 4+ events: Colored dot with badge for 5+
- Supports today highlighting with ring
- Uses Framer Motion for hover/tap animations

```typescript
const getIndicatorColor = (): string => {
  if (eventCount === 0) return 'bg-transparent'
  if (eventCount === 1) return 'bg-accent/40'
  if (eventCount === 2) return 'bg-accent/60'
  if (eventCount <= 5) return 'bg-accent/80'
  return 'bg-accent'
}
```

---

## Action Sidebar (Wide View)

### Layout and Positioning

**File:** `/Users/epsommer/projects/web/evangelo-sommer/src/components/CalendarLayout.tsx`

```typescript
<aside className="hidden md:block landscape:block w-80 border-l border-border overflow-y-auto">
  <ActionSidebar {...props} />
</aside>
```

**Key specifications:**
- **Width**: `w-80` (320px / 20rem)
- **Visibility**: `hidden md:block landscape:block`
  - Hidden by default
  - Shown on `md` breakpoint (768px+)
  - Also shown in landscape orientation
- **Position**: Right side of main calendar content (`border-l`)
- **Scrolling**: `overflow-y-auto` for internal content scrolling

### Available Actions/Features

The sidebar is organized with a tabbed interface:

**Tab Navigation (lines 778-817):**
1. **Overview Tab** - Default view with:
   - Collapsible Mini Calendar panel
   - "Batch Add" button (navigates to BatchAddPanel)
   - Collapsible "Upcoming Events" panel (next 5 events)

2. **Analytics Tab:**
   - Weekly summary with day-by-day badges
   - 12-week activity heatmap
   - Quick stats (Today/Week/Month event counts and hours)

**Special Content Modes:**
- **Event Creation Mode**: Full event creation form (`EventCreationForm`)
- **Event Details Mode**: View/edit selected event (`EventDetailsPanel`)
- **Batch Add Mode**: Multiple event creation (`BatchAddPanel`)
- **Edit Mode**: Editing an existing event

**Conflict Indicator** (lines 805-816):
```typescript
{conflictCount > 0 && (
  <button onClick={onShowConflicts} className="neo-button p-2 rounded-lg relative">
    <AlertTriangle className="h-4 w-4 text-orange-500" />
    <span className="absolute -top-1 -right-1 ...">
      {conflictCount > 9 ? '9+' : conflictCount}
    </span>
  </button>
)}
```

### Collapsible Panels

State managed via `expandedPanels` Set:

```typescript
const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['calendar']))

const togglePanel = (panel: string) => {
  setExpandedPanels(prev => {
    const next = new Set(prev)
    if (next.has(panel)) {
      next.delete(panel)
    } else {
      next.add(panel)
    }
    return next
  })
}
```

Default: Calendar panel is expanded on mount.

### Sidebar State Management

**Internal States:**
- `displayedMonth` - Month shown in mini calendar
- `expandedPanels` - Which collapsible panels are open
- `isBatchAddMode` - Batch creation mode active
- `activeTab` - 'overview' | 'analytics'
- `isSidebarCollapsed` - (defined but appears unused)
- `isEditMode` / `eventToEdit` - Editing state for events

**External State (via props):**
- `isEventCreationMode` - Parent controls creation mode
- `selectedEvent` - Parent provides selected event for details view

---

## Narrow View Adaptations

### Breakpoint Definitions

**CalendarLayout.tsx** uses a responsive toggle pattern:

```typescript
// Desktop sidebar
<aside className="hidden md:block landscape:block w-80 ...">

// Mobile bottom bar
<div className="block md:hidden landscape:hidden">
```

**Breakpoints:**
| Condition | Sidebar | Bottom Bar |
|-----------|---------|------------|
| < 768px portrait | Hidden | Shown |
| >= 768px | Shown | Hidden |
| Landscape >= 640px | Shown | Hidden |
| Landscape < 640px | Hidden | Shown |

The `md:` breakpoint in Tailwind defaults to 768px.
The `landscape:` modifier uses `@media (orientation: landscape)`.

### Layout Changes

When switching to narrow view:
1. ActionSidebar is completely hidden (`hidden md:block`)
2. CalendarBottomActionBar takes over (`block md:hidden`)
3. Main calendar content gets full width
4. A spacer div is added to prevent content from hiding behind the fixed bottom bar

### Toggle/Access Mechanism

There is no hamburger menu toggle. The responsive behavior is purely CSS-driven:
- Wide view: Sidebar always visible
- Narrow view: Bottom action bar replaces sidebar

The ChevronToggle button in ActionSidebar (lines 635-652) closes the sidebar content panels but doesn't collapse the entire sidebar on desktop.

---

## Bottom Action Menu (Minimal Width)

### CalendarBottomActionBar Component

**File:** `/Users/epsommer/projects/web/evangelo-sommer/src/components/CalendarBottomActionBar.tsx`

This is a draggable bottom sheet that replaces the sidebar on narrow viewports.

### Trigger and Appearance

The bottom bar is always visible on narrow viewports but in a collapsed state:

```typescript
const minCollapsedHeight = 80 // Quick actions bar
const maxExpandedHeight = Math.floor(viewportHeight * 0.7) // 70% of viewport
```

**Default collapsed state (80px):**
- Shows drag handle (GripHorizontal)
- "Tap to expand/collapse" text indicator
- Quick action buttons (Create Event, Batch Add, Conflict indicator)

### Content Mapping from Sidebar

The bottom bar provides the same content as the sidebar, just in a vertical stack:

| Sidebar Section | Bottom Bar Equivalent |
|-----------------|----------------------|
| Event Creation Form | Full-screen scrollable form |
| Event Details Panel | Full-screen scrollable panel |
| Batch Add Panel | Full-screen scrollable panel |
| Quick Actions | Collapsed bar with buttons |

**Note:** The mini calendar and analytics tabs are NOT included in the bottom bar - only the action-oriented panels.

### Drag Gesture Implementation

**useResizableDrawer Hook**

Located at `/Users/epsommer/projects/web/evangelo-sommer/src/hooks/useResizableDrawer.ts`:

```typescript
interface UseResizableDrawerOptions {
  minHeight: number      // Collapsed height
  maxHeight: number      // Fully expanded height
  defaultHeight?: number // Initial height
  snapThreshold?: number // Distance to snap to min/max
  onHeightChange?: (height: number) => void
}
```

**Key Implementation Details:**

1. **Pointer Event Handling:**
```typescript
const handlePointerDown = useCallback((e: React.PointerEvent) => {
  e.preventDefault()
  setIsDragging(true)
  startYRef.current = e.clientY
  startHeightRef.current = height
}, [height])
```

2. **Drag Movement Calculation:**
```typescript
const handlePointerMove = useCallback((e: PointerEvent) => {
  if (!isDragging) return
  const deltaY = startYRef.current - e.clientY // Negative = dragging up
  const newHeight = startHeightRef.current + deltaY
  setHeight(newHeight)
}, [isDragging, setHeight])
```

3. **Snap on Release:**
```typescript
const handlePointerUp = useCallback(() => {
  if (currentHeight < minHeight + snapThreshold) {
    setHeight(minHeight)
  } else if (currentHeight > maxHeight - snapThreshold) {
    setHeight(maxHeight)
  }
}, [height, minHeight, maxHeight, snapThreshold])
```

4. **Global Event Listeners:**
```typescript
useEffect(() => {
  if (isDragging) {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    // cleanup...
  }
}, [isDragging])
```

### Snap Points and Animation

**Two snap points:**
1. **Collapsed**: `minHeight` (80px) - Quick actions visible
2. **Expanded**: `maxHeight` (70% of viewport) - Full content visible

**Snap Threshold:** 50px (configurable via `snapThreshold`)
- If released within 50px of min, snaps to collapsed
- If released within 50px of max, snaps to expanded

**Animation via Framer Motion:**
```typescript
<motion.div
  style={{ height }}
  animate={{ height }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
```

Spring animation parameters:
- `stiffness: 300` - Fairly responsive spring
- `damping: 30` - Moderate damping to prevent oscillation

### Dismissal Behavior

**Toggle by Tap:**
```typescript
const toggleExpanded = useCallback(() => {
  if (isExpanded) {
    setHeight(minHeight)
  } else {
    setHeight(maxHeight)
  }
}, [isExpanded, minHeight, maxHeight])
```

The drag handle area supports both:
1. **Tap/Click**: Toggles between collapsed and expanded
2. **Drag**: Resizes dynamically

**Auto-expand on Mode Change:**
```typescript
useEffect(() => {
  if (isEventCreationMode || selectedEvent || isBatchAddMode) {
    setHeight(maxExpandedHeight)
  }
}, [isEventCreationMode, selectedEvent, isBatchAddMode])
```

---

## State Management Architecture

### CalendarLayout Coordination

The `CalendarLayout` component acts as the coordinator, passing the same props to both the `ActionSidebar` and `CalendarBottomActionBar`:

```typescript
const CalendarLayout: React.FC<CalendarLayoutProps> = ({
  selectedDate,
  currentView,
  events,
  onDateSelect,
  onViewChange,
  onEventCreate,
  onBatchEventCreate,
  isEventCreationMode,
  selectedEvent,
  onEventEdit,
  onEventDelete,
  onExitEventCreation,
  onExitEventDetails,
  onFormChange,
  conflictCount,
  onShowConflicts
}) => {
  // Both ActionSidebar and CalendarBottomActionBar receive identical props
}
```

### State Ownership

| State | Owner | Passed To |
|-------|-------|-----------|
| selectedDate | TimeManager (parent) | CalendarLayout > ActionSidebar/BottomBar |
| currentView | TimeManager | CalendarLayout > ActionSidebar/BottomBar |
| isEventCreationMode | TimeManager | CalendarLayout > ActionSidebar/BottomBar |
| selectedEvent | TimeManager | CalendarLayout > ActionSidebar/BottomBar |
| displayedMonth | ActionSidebar (local) | N/A |
| expandedPanels | ActionSidebar (local) | N/A |
| bottom bar height | useResizableDrawer (local) | N/A |
| isBatchAddMode | ActionSidebar/BottomBar (local) | N/A |

### Form State Synchronization

The `EventCreationForm` uses `onFormChange` to sync form values back to the parent for placeholder updates during event creation:

```typescript
useEffect(() => {
  if (onFormChange) {
    onFormChange({
      title: formData.title,
      date: formData.date,
      startTime: formData.startTime,
      duration: formData.duration
    })
  }
}, [formData.title, formData.date, formData.startTime, formData.duration])
```

---

## Animation and Transition Details

### Bottom Sheet Animations

**Framer Motion Spring:**
```typescript
transition={{ type: 'spring', stiffness: 300, damping: 30 }}
```

**Drag Handle Visual Feedback:**
```typescript
className={`... ${isDragging ? 'bg-accent/10' : 'hover:bg-accent/5'} transition-colors`}
```

### YearDayIndicator Animations

```typescript
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>

<motion.span
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ duration: 0.2 }}
>
```

### Panel Transitions

CSS transitions are used for panel state changes:
```typescript
className="transition-all duration-300 ease-in-out"
```

### Chevron Rotation

```typescript
<ChevronDown
  className={`h-4 w-4 transition-transform ${
    expandedPanels.has('calendar') ? 'rotate-180' : ''
  }`}
/>
```

---

## React Native Considerations

### Bottom Sheet Libraries

For implementing the draggable bottom sheet in React Native, consider:

1. **react-native-bottom-sheet** (Gorhom)
   - Most popular and feature-rich
   - Built on Reanimated 2 + Gesture Handler
   - Supports snap points, keyboard handling, backdrop
   - [https://gorhom.github.io/react-native-bottom-sheet/](https://gorhom.github.io/react-native-bottom-sheet/)

2. **@gorhom/bottom-sheet**
   - Modern API with hooks
   - Supports dynamic sizing
   - Backdrop component included

**Key features to implement:**
- Two snap points: collapsed (80-100pt) and expanded (70% screen height)
- Spring animation with similar parameters
- Handle gesture for drag
- Tap-to-toggle functionality

```typescript
// Example snap points for RN
const snapPoints = useMemo(() => ['15%', '70%'], []);

<BottomSheet
  snapPoints={snapPoints}
  index={0}
  animateOnMount={true}
  enablePanDownToClose={false}
  handleIndicatorStyle={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
>
  <BottomSheetContent />
</BottomSheet>
```

### Gesture Handler Integration

The web implementation uses PointerEvents. For RN, use:

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const panGesture = Gesture.Pan()
  .onStart((e) => {
    startY.value = translateY.value;
  })
  .onUpdate((e) => {
    translateY.value = startY.value + e.translationY;
  })
  .onEnd((e) => {
    // Snap logic
    if (translateY.value < snapThreshold) {
      translateY.value = withSpring(minHeight);
    } else {
      translateY.value = withSpring(maxHeight);
    }
  });
```

### Responsive Breakpoints in RN

Use `useWindowDimensions` for responsive behavior:

```typescript
import { useWindowDimensions } from 'react-native';

const { width, height } = useWindowDimensions();

const isTablet = width >= 768;
const isLandscape = width > height;

// Determine layout
const showSidebar = isTablet || isLandscape;
const showBottomBar = !showSidebar;
```

**Breakpoint mapping from web:**
| Web Breakpoint | RN Equivalent |
|----------------|---------------|
| md (768px) | width >= 768 |
| landscape | width > height |
| lg (1024px) | width >= 1024 |

### Component Structure Recommendations

```
components/
  calendar/
    ActionSidebar.tsx          # Desktop/tablet sidebar
    CalendarBottomSheet.tsx    # Mobile bottom sheet
    MiniCalendar.tsx           # Reusable mini calendar
    YearDayIndicator.tsx       # Event density indicator
    CalendarLayout.tsx         # Responsive layout coordinator
  sidebar/
    EventDetailsPanel.tsx
    EventCreationForm.tsx
    BatchAddPanel.tsx
hooks/
  useBottomSheet.ts            # Hook for bottom sheet state
  useResponsiveLayout.ts       # Hook for layout decisions
```

### Spring Animation Mapping

Web Framer Motion to RN Reanimated:

```typescript
// Web
transition={{ type: 'spring', stiffness: 300, damping: 30 }}

// React Native (Reanimated)
withSpring(targetValue, {
  stiffness: 300,
  damping: 30,
  mass: 1,
})
```

---

## Key File References

| Component | Path |
|-----------|------|
| ActionSidebar | `/Users/epsommer/projects/web/evangelo-sommer/src/components/ActionSidebar.tsx` |
| CalendarBottomActionBar | `/Users/epsommer/projects/web/evangelo-sommer/src/components/CalendarBottomActionBar.tsx` |
| CalendarLayout | `/Users/epsommer/projects/web/evangelo-sommer/src/components/CalendarLayout.tsx` |
| useResizableDrawer | `/Users/epsommer/projects/web/evangelo-sommer/src/hooks/useResizableDrawer.ts` |
| YearDayIndicator | `/Users/epsommer/projects/web/evangelo-sommer/src/components/calendar/YearDayIndicator.tsx` |
| EventDetailsPanel | `/Users/epsommer/projects/web/evangelo-sommer/src/components/sidebar/EventDetailsPanel.tsx` |
| EventCreationForm | `/Users/epsommer/projects/web/evangelo-sommer/src/components/sidebar/EventCreationForm.tsx` |
| BatchAddPanel | `/Users/epsommer/projects/web/evangelo-sommer/src/components/sidebar/BatchAddPanel.tsx` |
| BottomActionBar (generic) | `/Users/epsommer/projects/web/evangelo-sommer/src/components/BottomActionBar.tsx` |
| ContextualSidebar | `/Users/epsommer/projects/web/evangelo-sommer/src/components/ContextualSidebar.tsx` |

---

## Summary

The web implementation demonstrates a well-architected responsive action system with:

1. **Unified prop interface** - Both sidebar and bottom bar receive identical props
2. **CSS-driven responsive switching** - No JavaScript media query listeners needed
3. **Smooth drag gestures** - PointerEvents with spring animations
4. **Binary snap points** - Collapsed (80px) and expanded (70% viewport)
5. **Mode-driven content** - Event creation, details, batch add modes override default content
6. **State ownership clarity** - Parent owns selection/mode state, children own presentation state

For React Native, leverage `react-native-bottom-sheet` for the draggable behavior and `useWindowDimensions` for responsive layout decisions, mapping the spring animation parameters directly to Reanimated's `withSpring`.
