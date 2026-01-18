"""
Test script for the Practice Partner Agent

This script tests:
1. Environment variables are set
2. LiveKit connection works
3. OpenAI Realtime model can be created
4. Agent can be created and started
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / ".env.local"
load_dotenv(env_path)


def test_environment():
    """Test that all required environment variables are set."""
    print("\n=== Testing Environment Variables ===")

    required_vars = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "OPENAI_API_KEY",
    ]

    all_set = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask the value for security
            masked = value[:4] + "..." + value[-4:] if len(value) > 8 else "****"
            print(f"  {var}: {masked}")
        else:
            print(f"  {var}: NOT SET")
            all_set = False

    if all_set:
        print("  All required environment variables are set.")
    else:
        print("  ERROR: Some environment variables are missing!")

    return all_set


def test_imports():
    """Test that all required imports work."""
    print("\n=== Testing Imports ===")

    try:
        from livekit.agents import (
            AutoSubscribe,
            JobContext,
            WorkerOptions,
            cli,
            Agent,
            AgentSession,
            RoomInputOptions,
        )
        print("  livekit.agents imports: OK")
    except ImportError as e:
        print(f"  livekit.agents imports: FAILED - {e}")
        return False

    try:
        from livekit.plugins.openai import realtime
        print("  livekit.plugins.openai.realtime import: OK")
    except ImportError as e:
        print(f"  livekit.plugins.openai.realtime import: FAILED - {e}")
        return False

    try:
        from personas import get_system_prompt, get_persona
        print("  personas imports: OK")
    except ImportError as e:
        print(f"  personas imports: FAILED - {e}")
        return False

    return True


def test_realtime_model():
    """Test creating an OpenAI Realtime model."""
    print("\n=== Testing OpenAI Realtime Model Creation ===")

    from livekit.plugins.openai import realtime

    try:
        # Test model creation with basic parameters
        model = realtime.RealtimeModel(
            voice="alloy",
            modalities=["audio", "text"],
        )
        print(f"  RealtimeModel created: OK")
        print(f"  Model type: {type(model)}")

        # Check what attributes the model has
        attrs = [attr for attr in dir(model) if not attr.startswith('_')]
        print(f"  Model attributes: {attrs[:10]}...")  # First 10

        return True
    except Exception as e:
        print(f"  RealtimeModel creation: FAILED - {e}")
        return False


def test_agent_creation():
    """Test creating an Agent with the RealtimeModel."""
    print("\n=== Testing Agent Creation ===")

    from livekit.agents import Agent
    from livekit.plugins.openai import realtime

    try:
        model = realtime.RealtimeModel(
            voice="alloy",
            modalities=["audio", "text"],
        )

        agent = Agent(
            instructions="You are a friendly assistant.",
            llm=model,
            allow_interruptions=True,
            min_endpointing_delay=0.5,
            max_endpointing_delay=2.0,
        )
        print(f"  Agent created: OK")
        print(f"  Agent type: {type(agent)}")

        return True
    except Exception as e:
        print(f"  Agent creation: FAILED - {e}")
        import traceback
        traceback.print_exc()
        return False


def test_agent_session_creation():
    """Test creating an AgentSession."""
    print("\n=== Testing AgentSession Creation ===")

    from livekit.agents import AgentSession

    try:
        session = AgentSession()
        print(f"  AgentSession created: OK")
        print(f"  Session type: {type(session)}")

        return True
    except Exception as e:
        print(f"  AgentSession creation: FAILED - {e}")
        return False


def test_room_options():
    """Test RoomOptions (the new API)."""
    print("\n=== Testing RoomOptions ===")

    try:
        from livekit.agents import RoomOptions

        options = RoomOptions(
            audio_input_enabled=True,
            audio_output_enabled=True,
        )
        print(f"  RoomOptions created: OK")
        return True
    except ImportError:
        print("  RoomOptions not available, using RoomInputOptions")
        return False
    except Exception as e:
        print(f"  RoomOptions creation: FAILED - {e}")
        return False


def test_persona_loading():
    """Test loading personas."""
    print("\n=== Testing Persona Loading ===")

    from personas import get_persona, get_system_prompt

    personas = ["hackathon_contact", "recruiter", "interviewer", "investor", "peer"]

    for key in personas:
        try:
            persona = get_persona(key)
            prompt = get_system_prompt(key, "hackathon", "student")
            print(f"  {key}: OK ({persona['name']})")
        except Exception as e:
            print(f"  {key}: FAILED - {e}")
            return False

    return True


def check_livekit_agents_version():
    """Check the installed livekit-agents version."""
    print("\n=== Checking livekit-agents Version ===")

    try:
        import livekit.agents as agents
        version = getattr(agents, '__version__', 'unknown')
        print(f"  livekit-agents version: {version}")
    except Exception as e:
        print(f"  Could not determine version: {e}")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Practice Partner Agent Test Suite")
    print("=" * 60)

    check_livekit_agents_version()

    results = {
        "environment": test_environment(),
        "imports": test_imports(),
        "realtime_model": test_realtime_model(),
        "agent": test_agent_creation(),
        "session": test_agent_session_creation(),
        "room_options": test_room_options(),
        "personas": test_persona_loading(),
    }

    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)

    all_passed = True
    for test_name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {test_name}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("All tests passed!")
    else:
        print("Some tests failed. Check the output above for details.")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
