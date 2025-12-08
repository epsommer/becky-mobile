// src/app/api/ai/analyze-context/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processWithClaude } from "../../../../lib/claude-api";
import { Conversation, Client } from "../../../../types/client";

export async function POST(request: NextRequest) {
  try {
    const { clientData, conversations, requestType } = await request.json();

    const contextPrompt = buildContextPrompt(
      clientData,
      conversations,
      requestType,
    );

    const result = await processWithClaude({
      text: contextPrompt,
      businessId: clientData.serviceId, // Changed from businessId to serviceId
      documentType: "custom",
      customPrompt: getPromptByRequestType(requestType),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("AI Context Analysis Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze client context" },
      { status: 500 },
    );
  }
}

function buildContextPrompt(
  clientData: Client, // Fixed: Use proper Client type instead of any
  conversations: Conversation[],
  requestType: string,
): string {
  const recentMessages = conversations
    .flatMap((conv) => conv.messages)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 10);

  return `
CLIENT PROFILE:
Name: ${clientData.name}
Company: ${clientData.company || "Individual"}
Project Type: ${clientData.projectType || "Not specified"}
Status: ${clientData.status}
Budget: ${clientData.budget ? `$${clientData.budget}` : "Not specified"}
Timeline: ${clientData.timeline || "Not specified"}
Tags: ${clientData.tags.join(", ")}
Notes: ${clientData.notes || "None"}
Service: ${clientData.serviceId}
Service Types: ${clientData.serviceTypes.join(", ")}

RECENT CONVERSATION HISTORY:
${recentMessages
  .map(
    (msg) => `
[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.content}
${msg.metadata?.subject ? `Subject: ${msg.metadata.subject}` : ""}
`,
  )
  .join("\n")}

CURRENT REQUEST: ${requestType}
`;
}

function getPromptByRequestType(requestType: string): string {
  const prompts: Record<string, string> = {
    "draft-response": `
Based on the client profile and conversation history above, draft a professional and personalized response. Consider:
- Their communication style and preferences
- Current project status and needs
- Any outstanding questions or concerns
- Appropriate tone for the relationship stage
- Specific details that show you remember previous conversations

Make the response feel personal and contextual, not generic.`,

    "generate-summary": `
Create a concise summary of this client relationship including:
- Key project details and current status
- Client preferences and communication style
- Important dates, deadlines, or milestones
- Outstanding items or next steps
- Overall relationship health and sentiment`,

    "suggest-followup": `
Based on the conversation history, suggest 3-5 specific follow-up actions:
- What questions need answers
- What information should be provided
- When to follow up next
- Any potential concerns to address
- Opportunities to add value`,

    "analyze-sentiment": `
Analyze the client's recent communications for:
- Overall satisfaction level
- Any concerns or frustrations
- Urgency indicators
- Communication preferences
- Relationship health score (1-10)`,
  };

  return prompts[requestType] || prompts["draft-response"];
}
