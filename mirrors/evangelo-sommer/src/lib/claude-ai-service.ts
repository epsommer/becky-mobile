import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface ObjectiveSortingRequest {
  objectives: Array<{
    id: string
    text: string
    priority: 'urgent' | 'high' | 'medium' | 'low'
    estimatedMinutes?: number
    completed: boolean
  }>
  context?: string
  sortingStrategy?: 'priority' | 'time' | 'energy' | 'dependencies' | 'smart'
}

interface ObjectiveSortingResponse {
  sortedObjectives: Array<{
    id: string
    newPosition: number
    reasoning: string
  }>
  explanation: string
  strategy: string
}

export class ClaudeAIService {
  static async sortObjectives(request: ObjectiveSortingRequest): Promise<ObjectiveSortingResponse> {
    const { objectives, context = '', sortingStrategy = 'smart' } = request

    const incompleteObjectives = objectives.filter(obj => !obj.completed)

    if (incompleteObjectives.length <= 1) {
      return {
        sortedObjectives: incompleteObjectives.map((obj, index) => ({
          id: obj.id,
          newPosition: index,
          reasoning: 'Single or no objectives to sort'
        })),
        explanation: 'Not enough objectives to sort meaningfully.',
        strategy: sortingStrategy
      }
    }

    const prompt = `You are an AI productivity assistant helping to optimize daily task management.

**Current Objectives:**
${incompleteObjectives.map((obj, index) =>
  `${index + 1}. "${obj.text}" (Priority: ${obj.priority}${obj.estimatedMinutes ? `, Est: ${obj.estimatedMinutes}min` : ''})`
).join('\n')}

**Context:** ${context || 'No additional context provided'}

**Sorting Strategy:** ${sortingStrategy}

Please analyze these objectives and provide an optimal ordering based on the following criteria:

1. **Priority Urgency** - Urgent > High > Medium > Low
2. **Time Management** - Consider estimated duration and available time
3. **Energy Levels** - Front-load complex tasks when energy is typically higher
4. **Dependencies** - Identify if any tasks should be done before others
5. **Momentum Building** - Balance quick wins with important work
6. **Context Switching** - Group similar types of work together when possible

Return a JSON response with this exact structure:
{
  "sortedObjectives": [
    {
      "id": "objective_id",
      "newPosition": 0,
      "reasoning": "Brief explanation for this positioning"
    }
  ],
  "explanation": "Overall strategy explanation (2-3 sentences)",
  "strategy": "${sortingStrategy}"
}

Focus on practical productivity principles. Be concise but insightful in your reasoning.`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Claude response')
      }

      const result = JSON.parse(jsonMatch[0]) as ObjectiveSortingResponse

      // Validate the response structure
      if (!result.sortedObjectives || !Array.isArray(result.sortedObjectives)) {
        throw new Error('Invalid response structure from Claude')
      }

      // Ensure all original objective IDs are present
      const originalIds = new Set(incompleteObjectives.map(obj => obj.id))
      const responseIds = new Set(result.sortedObjectives.map(obj => obj.id))

      if (originalIds.size !== responseIds.size || ![...originalIds].every(id => responseIds.has(id))) {
        throw new Error('Claude response missing some objective IDs')
      }

      return result
    } catch (error) {
      console.error('Claude AI sorting error:', error)

      // Fallback sorting: priority-based
      const fallbackSorted = incompleteObjectives
        .map((obj, index) => ({ obj, originalIndex: index }))
        .sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          const priorityDiff = priorityOrder[a.obj.priority] - priorityOrder[b.obj.priority]

          if (priorityDiff !== 0) return priorityDiff

          // If same priority, sort by estimated time (shorter first)
          const aTime = a.obj.estimatedMinutes || 60
          const bTime = b.obj.estimatedMinutes || 60
          return aTime - bTime
        })
        .map((item, newPosition) => ({
          id: item.obj.id,
          newPosition,
          reasoning: 'Fallback: Priority-based sorting with time consideration'
        }))

      return {
        sortedObjectives: fallbackSorted,
        explanation: 'Used fallback priority-based sorting due to AI service unavailability.',
        strategy: 'fallback-priority'
      }
    }
  }

  static async generateSuggestions(objectives: string[], context?: string): Promise<string[]> {
    const prompt = `Based on these current objectives and context, suggest 3-5 additional productive tasks for today:

**Current Objectives:**
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**Context:** ${context || 'No additional context'}

Suggest practical, actionable tasks that complement the existing objectives. Consider:
- Task relationships and dependencies
- Time management and energy levels
- Professional development opportunities
- Health and wellness balance

Return only a simple array of task suggestions, one per line, without numbers or formatting.`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })

      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      return responseText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^\d+\./))
        .slice(0, 5)
    } catch (error) {
      console.error('Claude AI suggestions error:', error)
      return [
        'Review and prioritize email inbox',
        'Take a 10-minute break and stretch',
        'Plan tomorrow\'s priorities',
        'Check in with team members',
        'Update project documentation'
      ]
    }
  }
}

export default ClaudeAIService