import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  getWingmanSystemPrompt,
  getWingmanUserPrompt,
  WingmanPromptContext,
} from "@/lib/wingmanPrompts";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recentTranscript,
      lastPartnerUtterance,
      eventType = "networking",
      userRole = "professional",
      triggerReason = "low_battery",
    } = body;

    // Debug logging
    console.log("=== WINGMAN SUGGEST API ===");
    console.log("recentTranscript:", recentTranscript);
    console.log("lastPartnerUtterance:", lastPartnerUtterance);
    console.log("eventType:", eventType);
    console.log("userRole:", userRole);

    // If no context, use a generic prompt
    const hasContext = recentTranscript || lastPartnerUtterance;

    const context: WingmanPromptContext = {
      recentTranscript: recentTranscript || "(No recent conversation)",
      lastPartnerUtterance: lastPartnerUtterance || "(Conversation has gone quiet)",
      eventType,
      userRole,
      triggerReason,
    };

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 150,
      system: getWingmanSystemPrompt(),
      messages: [
        {
          role: "user",
          content: getWingmanUserPrompt(context),
        },
      ],
    });

    // Extract the text response
    const suggestion =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      suggestion: suggestion.trim(),
      triggerReason,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error generating suggestion:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
