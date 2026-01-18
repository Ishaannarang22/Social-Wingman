import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || transcript.trim().length < 10) {
      // Not enough text to evaluate
      return NextResponse.json({ score: 1.0, reason: "insufficient_text" });
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 100,
      system: `You evaluate speech coherence. Rate the following transcript on a scale of 0.0 to 1.0:
- 1.0 = Perfectly clear and coherent speech
- 0.7 = Minor issues but understandable
- 0.5 = Somewhat unclear or rambling
- 0.3 = Very unclear, fragmented, or nonsensical
- 0.0 = Completely incoherent

Consider: sentence structure, logical flow, clarity of thought, and whether ideas connect.
Ignore filler words (um, uh, like) - focus on the actual content.

Respond with ONLY a JSON object: {"score": 0.X, "issue": "brief reason or null"}`,
      messages: [
        {
          role: "user",
          content: `Evaluate this speech transcript:\n"${transcript}"`,
        },
      ],
    });

    // Parse the response
    const content = response.content[0];
    if (content.type === "text") {
      try {
        const result = JSON.parse(content.text);
        return NextResponse.json({
          score: Math.max(0, Math.min(1, result.score)),
          issue: result.issue || null,
        });
      } catch {
        // If parsing fails, assume coherent
        return NextResponse.json({ score: 1.0, reason: "parse_error" });
      }
    }

    return NextResponse.json({ score: 1.0 });
  } catch (error) {
    console.error("Coherence evaluation error:", error);
    return NextResponse.json({ score: 1.0, reason: "error" });
  }
}
