<objective>
Investigate and fix why calendar views (day, week, month, year) in the Becky CRM web app are displaying old/legacy styles instead of the user's selected "neomorphic" theme with "true-night" display options. The end goal is to ensure user theme preferences are respected across all calendar views without being overridden by HUD, tactical, or legacy style elements.
</objective>

<context>
This is a theming/styling bug investigation in the Becky CRM web application. Users have selected specific theme preferences (neomorphic styling, true-night display mode), but the calendar components are rendering with old styles instead.

Web app location: `~/projects/web/evangelo-sommer`

Potential causes to investigate:
- CSS specificity conflicts where legacy styles override theme styles
- HUD or tactical UI elements applying their own styling
- Theme context not being properly passed to calendar components
- Hardcoded styles in calendar view components
- Missing theme variants for calendar-specific elements
- Style import order issues
</context>

<research>
Thoroughly analyze the codebase to understand:

1. **Theme System Architecture**
   - How themes are defined and structured
   - Where neomorphic and true-night styles are configured
   - How theme preferences are stored and retrieved

2. **Calendar Component Styling**
   - Examine all calendar view components: DayView, WeekView, MonthView, YearView
   - Identify where styles are applied (inline, CSS modules, styled-components, etc.)
   - Look for hardcoded color values or legacy class names

3. **Override Sources**
   - Search for HUD-related styles/components that might affect calendar views
   - Search for tactical UI elements and their styling scope
   - Identify any global styles that might have high specificity

4. **Preference Flow**
   - Trace how user preferences flow from storage to component rendering
   - Check if calendar components are consuming theme context correctly
</research>

<investigation_steps>
1. Read the theme configuration files to understand the neomorphic and true-night style definitions
2. Examine the user preferences/settings system to see how theme choices are stored
3. Read each calendar view component (DayView, WeekView, MonthView, YearView)
4. Search for "hud", "tactical", "legacy" in styles and component files
5. Check CSS/style import order for specificity issues
6. Trace the theme context provider to ensure calendar views receive theme props
7. Identify all locations where styles are being overridden
</investigation_steps>

<requirements>
- Find the root cause of why user theme preferences are not being applied
- Identify ALL override sources (not just the first one found)
- Fix the styling so neomorphic + true-night preferences are correctly applied to all four calendar views
- Ensure fixes don't break other components that correctly use the theme system
- Preserve any legitimate HUD/tactical styling that should remain separate from calendar views
</requirements>

<implementation>
When fixing:
- Prefer fixing the root cause over adding more CSS overrides (avoid specificity wars)
- If components aren't consuming theme context, connect them properly
- If hardcoded values exist, replace with theme variables
- If import order is the issue, restructure imports correctly
- Document any non-obvious fixes with brief inline comments explaining WHY
</implementation>

<output>
Modify files in `~/projects/web/evangelo-sommer` as needed to:
- Fix theme application in calendar view components
- Remove or scope any overriding HUD/tactical styles
- Ensure proper theme context consumption

After completing fixes, provide a summary of:
- Root cause(s) identified
- Files modified
- Changes made
</output>

<verification>
Before declaring complete, verify:
- [ ] All four calendar views (day, week, month, year) now correctly display neomorphic styling
- [ ] True-night display mode is properly applied to calendar views
- [ ] No HUD or tactical elements are overriding user preferences
- [ ] Other themed components still work correctly (no regressions)
- [ ] No hardcoded legacy color values remain in calendar components
</verification>

<success_criteria>
- Calendar views render with neomorphic theme styling
- True-night mode is active when selected by user
- User theme preferences are respected without override
- Root cause is fixed, not just symptoms
</success_criteria>
