// src/lib/claude-api.ts
import { Anthropic } from "@anthropic-ai/sdk";
import { ClaudeRequest, ClaudeResponse, DocumentType } from "../types/claude";
import { getServiceById, Service } from "./service-config"; // Import Service type

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
});

export async function processWithClaude({
  text,
  businessId, // This will now be serviceId
  documentType,
  customPrompt = "",
  additionalData = {},
}: ClaudeRequest): Promise<ClaudeResponse> {
  const service = getServiceById(businessId);

  if (!service) {
    throw new Error("Service not found");
  }

  const prompt = buildPrompt(
    text,
    documentType,
    service,
    customPrompt,
    additionalData,
  );

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text content from the response
    let textContent = "";

    for (const block of response.content) {
      if (block.type === "text") {
        textContent += block.text;
      }
    }

    if (!textContent) {
      throw new Error("No text content received from Claude");
    }

    return {
      content: textContent,
      business: service.name,
      type: documentType,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Claude API Error:", error);
    throw new Error("Failed to process with Claude API");
  }
}

function buildPrompt(
  text: string,
  documentType: DocumentType,
  service: Service, // Fixed: Use proper Service type instead of any
  customPrompt: string,
  additionalData: Record<string, unknown>,
): string {
  const baseContext = `
Service: ${service.name}
Business Type: ${service.businessType}
Communication Style: ${service.communicationStyle}
Domain: ${service.domain}
Default Signature: ${service.defaultEmailSignature}
`;

  const prompts: Record<DocumentType, string> = {
    "blog-post": `${baseContext}
Convert this text into a professional blog post. Make it engaging with a catchy title, introduction, main content, and conclusion:

${text}`,

    invoice: `${baseContext}
Create a detailed, professional invoice. Include:
- Invoice number (generate one)
- Date and due date
- Itemized services/products
- Rates and totals
- Payment terms
- Professional formatting

Based on this information:
${text}

Additional data: ${JSON.stringify(additionalData)}`,

    quote: `${baseContext}
Generate a professional project quote/estimate. Include:
- Project scope and description
- Itemized breakdown of costs
- Timeline estimate
- Terms and conditions
- Professional presentation

Based on this request:
${text}

Services available: ${service.serviceTypes.join(", ")}`,

    receipt: `${baseContext}
Create a professional receipt. Include:
- Receipt number
- Transaction date
- Itemized purchase details
- Payment method
- Total amount
- Thank you message

Transaction details:
${text}`,

    email: `${baseContext}
Write a professional email response using the ${service.communicationStyle} style. Make it helpful and on-brand:

Original message/context:
${text}`,

    proposal: `${baseContext}
Draft a comprehensive business proposal. Include:
- Executive summary
- Project scope
- Methodology/approach
- Timeline
- Investment/pricing
- Next steps

Based on this opportunity:
${text}`,

    custom: `${baseContext}
${customPrompt}

Content to process:
${text}`,
  };

  return prompts[documentType] || prompts["custom"];
}
