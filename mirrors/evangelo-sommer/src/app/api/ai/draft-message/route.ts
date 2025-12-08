import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  // Initialize Anthropic client inside the function to get fresh env vars
  const apiKey = process.env.ANTHROPIC_API_KEY || '';

  // Debug logging
  console.log('=== API KEY DEBUG ===');
  console.log('Raw API Key:', apiKey);
  console.log('API Key length:', apiKey.length);
  console.log('API Key starts with sk-ant:', apiKey.startsWith('sk-ant'));
  console.log('====================');

  if (!apiKey || apiKey === 'your-key-here' || !apiKey.startsWith('sk-ant')) {
    return NextResponse.json(
      { error: 'Anthropic API key is not configured correctly. Please set ANTHROPIC_API_KEY in .env.local' },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });
  try {
    const {
      conversationContext,
      clientName,
      messageType = 'response',
      tone = 'professional',
      specificInstructions,
    } = await request.json();

    if (!conversationContext || !Array.isArray(conversationContext)) {
      return NextResponse.json(
        { error: 'Conversation context is required and must be an array' },
        { status: 400 }
      );
    }

    // Build the prompt for Claude
    const systemPrompt = `You are an AI assistant helping to draft professional business messages. Generate clear, concise, and ${tone} messages based on the conversation context provided.`;

    const userPrompt = `Based on the following conversation with ${clientName || 'the client'}, please draft a ${tone} ${messageType} message.

Conversation history:
${conversationContext.map((msg: any) => `[${msg.role}]: ${msg.content}`).join('\n\n')}

${specificInstructions ? `\nSpecific instructions: ${specificInstructions}` : ''}

Please draft an appropriate message that:
1. Addresses any questions or concerns raised
2. Maintains a ${tone} tone
3. Is clear and actionable
4. Is concise but complete

Return ONLY the drafted message text, without any preamble or explanation.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const draftedMessage = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    return NextResponse.json({
      success: true,
      draftedMessage,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Error drafting message:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to draft message' },
      { status: 500 }
    );
  }
}
