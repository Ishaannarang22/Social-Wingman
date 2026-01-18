"""
Social Wingman Practice Partner Agent

This agent uses LiveKit with OpenAI Realtime API to provide
a voice-based practice partner for conversation training.
"""

import logging
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    Agent,
    AgentSession,
    RoomInputOptions,
)
from livekit.plugins.openai import realtime
from livekit import rtc

from personas import get_system_prompt, get_persona

# Load environment variables from .env.local
env_path = Path(__file__).parent / ".env.local"
load_dotenv(env_path)

# Configure logging to show in console - set to DEBUG for more detail
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("practice-partner")

# Also enable debug for livekit.agents and openai plugin
logging.getLogger("livekit.agents").setLevel(logging.DEBUG)
logging.getLogger("livekit.plugins.openai").setLevel(logging.DEBUG)

# Log environment check
logger.info(f"LIVEKIT_URL: {os.getenv('LIVEKIT_URL', 'NOT SET')}")
logger.info(f"OPENAI_API_KEY: {'SET' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")


async def entrypoint(ctx: JobContext):
    """Main entry point for the Practice Partner agent."""
    logger.info(f"=== AGENT ENTRYPOINT CALLED ===")
    logger.info(f"Connecting to room: {ctx.room.name}")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info("Connected to room, waiting for participant...")

    # Log room state
    logger.info(f"Room participants: {[p.identity for p in ctx.room.remote_participants.values()]}")

    # Wait for a participant to join
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")
    logger.info(f"Participant tracks: {list(participant.track_publications.keys())}")

    # Parse metadata for session configuration
    metadata = {}
    if participant.metadata:
        try:
            metadata = json.loads(participant.metadata)
            logger.info(f"Parsed metadata: {metadata}")
        except json.JSONDecodeError:
            logger.warning("Failed to parse participant metadata")

    persona_key = metadata.get("persona", "hackathon_contact")
    event_type = metadata.get("eventType", "networking")
    user_role = metadata.get("userRole", "professional")

    persona = get_persona(persona_key)
    system_prompt = get_system_prompt(persona_key, event_type, user_role)

    logger.info(f"Using persona: {persona['name']}")
    logger.info(f"Event type: {event_type}, User role: {user_role}")
    logger.debug(f"System prompt: {system_prompt[:200]}...")

    # Import TurnDetection for configuring VAD
    from livekit.plugins.openai.realtime.realtime_model import TurnDetection

    # Create the OpenAI Realtime model
    # Using server_vad with conservative settings to prevent premature cancellation
    logger.info("Creating OpenAI Realtime model...")
    model = realtime.RealtimeModel(
        voice="alloy",
        modalities=["audio", "text"],
        turn_detection=TurnDetection(
            type="server_vad",  # Use server-side VAD
            threshold=0.7,  # Higher threshold = less sensitive to noise (was 0.6)
            prefix_padding_ms=400,  # Padding before speech starts
            silence_duration_ms=1000,  # Wait longer before considering turn complete (was 800)
            create_response=True,  # Auto-create response when turn ends
            interrupt_response=False,  # Don't interrupt agent while speaking
        ),
    )
    logger.info(f"Model created: {type(model)}")

    # Create the agent with instructions - use defaults
    logger.info("Creating Agent...")
    agent = Agent(
        instructions=system_prompt,
        llm=model,
    )
    logger.info(f"Agent created: {type(agent)}")

    # Create the session
    logger.info("Creating AgentSession...")
    session = AgentSession()
    logger.info(f"Session created: {type(session)}")

    # Set up event handlers to debug audio flow
    @session.on("agent_started_speaking")
    def on_agent_started_speaking():
        logger.info(">>> AGENT STARTED SPEAKING")

    @session.on("agent_stopped_speaking")
    def on_agent_stopped_speaking():
        logger.info(">>> AGENT STOPPED SPEAKING")

    @session.on("user_started_speaking")
    def on_user_started_speaking():
        logger.info(">>> USER STARTED SPEAKING")

    @session.on("user_stopped_speaking")
    def on_user_stopped_speaking():
        logger.info(">>> USER STOPPED SPEAKING")

    # Log when participant publishes tracks
    @ctx.room.on("track_published")
    def on_track_published(publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        logger.info(f">>> TRACK PUBLISHED: {publication.kind} by {participant.identity}")

    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track: rtc.RemoteTrack, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        logger.info(f">>> TRACK SUBSCRIBED: {track.kind} from {participant.identity}")

    # Start the session
    logger.info("Starting agent session with participant...")
    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(
            noise_cancellation=True,
        ),
    )

    logger.info("=== Practice Partner agent started successfully! ===")
    logger.info(">>> Agent is now listening for user speech. Say something!")

    # Have the agent greet the user first
    # This helps verify audio is working and initiates the conversation
    logger.info(">>> Generating initial greeting...")
    try:
        await session.generate_reply(
            instructions="Greet the user warmly and briefly in ENGLISH ONLY. Keep it to 1-2 sentences. Don't ask a question yet, just say hello. You MUST speak in English."
        )
        logger.info(">>> Initial greeting sent!")
    except Exception as e:
        logger.error(f">>> Failed to generate greeting: {e}")


if __name__ == "__main__":
    logger.info("=== Starting Practice Partner Agent ===")
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="practice-partner",
    ))
