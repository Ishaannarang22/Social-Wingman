import { AccessToken, RoomServiceClient, AgentDispatchClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomName, participantName, metadata } = body;

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "roomName and participantName are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: "LiveKit credentials not configured" },
        { status: 500 }
      );
    }

    // Convert wss:// to https:// for API calls
    const httpUrl = livekitUrl.replace("wss://", "https://");

    // Create the room first
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    try {
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 60 * 10, // 10 minutes
        maxParticipants: 10,
      });
      console.log(`Created room: ${roomName}`);
    } catch (e) {
      // Room might already exist, that's ok
      console.log(`Room ${roomName} may already exist:`, e);
    }

    // Dispatch the agent to the room
    const agentDispatch = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
    try {
      // Use the exact agent name registered in agent.py
      await agentDispatch.createDispatch(roomName, "practice-partner", {
        metadata: metadata ? JSON.stringify(metadata) : "",
      });
      console.log(`Dispatched agent "practice-partner" to room: ${roomName}`);
    } catch (e: any) {
      console.error(`Failed to dispatch agent:`, e?.message || e);
      // Log the full error for debugging
      console.error(`Full error:`, JSON.stringify(e, null, 2));
    }

    // Generate participant token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: livekitUrl,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const roomName = searchParams.get("roomName");
  const participantName = searchParams.get("participantName");

  if (!roomName || !participantName) {
    return NextResponse.json(
      { error: "roomName and participantName are required" },
      { status: 400 }
    );
  }

  // Redirect to POST handler for full functionality
  return POST(
    new NextRequest(request.url, {
      method: "POST",
      body: JSON.stringify({ roomName, participantName }),
      headers: { "Content-Type": "application/json" },
    })
  );
}
