# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social Battery - a new project (repository currently empty).

# Social Wingman — Claude Instructions (claude.md)

You are an AI coding agent assisting in the implementation of **Social Wingman**, a passive real-time conversational assistant.

You must follow these instructions exactly.

---

## 1. Agent Role

You are implementing a **passive observer AI agent**.

- You DO NOT proactively speak.
- You DO NOT introduce yourself.
- You DO NOT interrupt human speech.
- You ONLY act when explicit trigger conditions are met.
- You ONLY assist the local user.

The agent’s purpose is to:
1. Monitor conversational flow.
2. Maintain a “Social Battery” score.
3. Discreetly suggest conversation rescue prompts when needed.

---

## 2. Conversation Scope

- Strictly **1-on-1 conversations only**.
- Single user + one other participant.
- The agent assists **only the user**.
- No multi-party logic.
- No persistent memory across calls.

---

## 3. Privacy & Data Handling Rules

- Audio and transcripts are **ephemeral**.
- Do NOT store audio, transcripts, or embeddings long-term.
- Do NOT assume consent from the other participant.
- The user handles disclosure externally.
- Always expose a UI-visible “AI Assist Listening” indicator.

---

## 4. Inputs You May Use

### Audio
- Live microphone audio.
- VAD + STT outputs.

### Context
- Full conversation transcript kept for the duration of the session (up to 1 hour).
- Optional user-provided metadata:
  - Event type (e.g., hackathon, networking)
  - User role (e.g., student, founder, recruiter)

You MUST NOT use:
- Past calls
- User history
- External memory

---

## 5. Speech Detection Rules

A speech segment counts as valid ONLY if:
- VAD confidence > threshold
- STT confidence > threshold
- Duration > **350 ms**
- Not classified as noise/disturbance

Filler sounds (e.g., “uh”, “um”, “ah”, “like”) are NOT considered positive speech.

---

## 6. Social Battery Model (v1)

### Battery Definition
- Integer range: **0–100**
- Clamped
- Smoothed (EMA or equivalent)

### Silence Grace Period
- No battery drain for first **1.5 seconds** of silence.

### Default Parameters (Customizable)
- Silence drain: **–4 battery / second**
- Speech recharge: **+12 battery per valid speech segment**
- Filler rate threshold: **6 fillers / minute**

### Filler Penalties
- ≤ 6 / min → no penalty
- 6–10 / min → mild drain
- >10 / min → aggressive drain

### Coherence Penalty
- Determined via **LLM-based clarity evaluation** of recent transcript.
- Conservative weighting.
- Used only to slightly accelerate drain.

---

## 7. Trigger Policy

Triggers are parameterized but must follow these rules:

- Triggers only occur during silence.
- No mid-sentence interventions.
- Common trigger: battery below critical threshold AND silence beyond grace.

After a trigger:
- Deliver **one** suggestion.
- Enter cooldown.
- Stay quiet.

No escalation loops.

---

## 8. Suggestion Generation Rules

- Suggestions must be:
  - Questions or prompts
  - Context-aware
  - Non-repetitive
  - Flow-restoring

- Suggestions must consider:
  - Recent transcript
  - User role
  - Event type

- Suggestions are delivered:
  - As low-volume audio (“whisper”)
  - As a UI toast

---

## 9. Output & Messaging Rules

### UI
- Display only the Social Battery bar.
- Do NOT show reasons or explanations.
- Logging is internal only.

### Audio
- Low-volume TTS.
- Short.
- Non-intrusive.

---

## 10. Data Channel Protocol

- Use **fire-and-forget** messaging.
- Do NOT implement ACK or resend protocols.
- Battery updates may be sent frequently.
- Suggestions may be sent repeatedly for a short duration to reduce loss risk.

### Message Types

Battery update:
```json
{ "type": "battery", "value": 72 }
{ "type": "suggestion", "text": "Ask them what motivated their project." }
{ "type": "state", "value": "listening" }
{
  "type": "stats",
  "fillers": { "um": 12, "uh": 7 },
  "filler_rate_per_min": 8.5,
  "longest_silence_sec": 9.4,
  "total_silence_sec": 84.2,
  "speaking_time_sec": 312.5,
  "battery_low_points": [
    { "t": 120.5, "value": 18 }
  ]
}

11. End-of-Call Analytics

Generate and emit:
	•	Filler word counts
	•	Filler rate
	•	Longest silence
	•	Total silence time
	•	Speaking time
	•	Battery low-point timeline

Purpose: reflection and improvement.

⸻

12. Failure Handling
	•	On STT/LLM/TTS failure:
	•	Log error
	•	Degrade gracefully
	•	On battery pipeline failure:
	•	Reset battery
	•	On reconnect:
	•	Do NOT introduce agent
	•	Resume passive observation

⸻

13. Explicit Non-Goals (Do NOT Implement)
	•	Multi-party modeling
	•	Persistent memory
	•	Personality modes
	•	Auto disclosure
	•	Aggressive coaching
	•	Cross-session learning

⸻

14. Guiding Principle

When in doubt:

Be quiet, be conservative, be human.

