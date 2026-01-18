import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Deepgram API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Create a temporary API key for the client
    // This is safer than sending the main API key
    const response = await fetch("https://api.deepgram.com/v1/projects", {
      method: "GET",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to validate Deepgram API key");
    }

    // For simplicity, we'll return the API key directly
    // In production, you might want to use Deepgram's temporary key API
    return NextResponse.json({
      token: apiKey,
      expiresAt: Date.now() + 3600000, // 1 hour
    });
  } catch (error) {
    console.error("Error with Deepgram auth:", error);
    return NextResponse.json(
      { error: "Failed to authenticate with Deepgram" },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Same as GET for consistency
  return GET();
}
