"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useVoiceActivityDetection } from "@/hooks/useVoiceActivityDetection";

interface OnboardingProps {
  onComplete: (choice: string, eventType: string, userRole: string) => void;
}

const OPTIONS = [
  { keywords: ["interview", "job", "hiring"], label: "Interview Practice", eventType: "interview", userRole: "candidate" },
  { keywords: ["network", "networking", "connect", "meeting"], label: "Networking", eventType: "networking", userRole: "professional" },
  { keywords: ["pitch", "investor", "startup", "funding"], label: "Pitch Practice", eventType: "pitch", userRole: "founder" },
  { keywords: ["casual", "chat", "talk", "conversation"], label: "Casual Chat", eventType: "casual", userRole: "professional" },
  { keywords: ["hackathon", "hack", "project", "build"], label: "Hackathon", eventType: "hackathon", userRole: "student" },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [stage, setStage] = useState<"greeting" | "listening" | "processing">("greeting");
  const [transcript, setTranscript] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const greetingSpoken = useRef(false);

  const vad = useVoiceActivityDetection({
    silenceThreshold: 0.02,
    speechThreshold: 0.03,
    silenceDelay: 1500, // Wait 1.5s of silence before processing
  });

  // Typewriter effect for greeting
  const greeting = "Hi! What would you like to practice today?";

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= greeting.length) {
        setDisplayText(greeting.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
        // Show options after greeting is typed
        setTimeout(() => {
          setShowOptions(true);
          setStage("listening");
          vad.startListening();
        }, 500);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  // Speech recognition using Web Speech API
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (stage === "listening" && typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const currentTranscript = finalTranscript || interimTranscript;
          setTranscript(currentTranscript);

          // If we have a final transcript, process it
          if (finalTranscript) {
            processResponse(finalTranscript.toLowerCase());
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;

        return () => {
          recognition.stop();
        };
      }
    }
  }, [stage]);

  const processResponse = useCallback((text: string) => {
    setStage("processing");
    vad.stopListening();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Find matching option
    for (const option of OPTIONS) {
      for (const keyword of option.keywords) {
        if (text.includes(keyword)) {
          setTimeout(() => {
            onComplete(option.label, option.eventType, option.userRole);
          }, 1000);
          return;
        }
      }
    }

    // Default to casual chat if no match
    setTimeout(() => {
      onComplete("Casual Chat", "casual", "professional");
    }, 1000);
  }, [onComplete, vad]);

  // Manual option selection
  const handleOptionClick = (option: typeof OPTIONS[0]) => {
    setStage("processing");
    vad.stopListening();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setTimeout(() => {
      onComplete(option.label, option.eventType, option.userRole);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-8">
      {/* Animated Ball */}
      <div className="mb-12">
        <div className={`onboarding-ball ${stage === "listening" && vad.isSpeaking ? "active" : ""}`}>
          <div className="ball-highlight" />
        </div>
      </div>

      {/* Greeting Text */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-gray-800 mb-2">
          {displayText}
          <span className="animate-pulse">|</span>
        </h1>

        {transcript && stage === "listening" && (
          <p className="text-lg text-gray-500 mt-4 italic">"{transcript}"</p>
        )}

        {stage === "processing" && (
          <p className="text-lg text-teal-600 mt-4">Starting your session...</p>
        )}
      </div>

      {/* Options */}
      {showOptions && stage !== "processing" && (
        <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
          {OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => handleOptionClick(option)}
              className="px-6 py-3 bg-white border-2 border-gray-200 rounded-full text-gray-700
                         hover:border-teal-400 hover:text-teal-600 hover:shadow-md
                         transition-all duration-300 ease-out"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Listening indicator */}
      {stage === "listening" && (
        <div className="mt-8 flex items-center gap-2 text-gray-500">
          <div className={`w-3 h-3 rounded-full ${vad.isSpeaking ? "bg-teal-500" : "bg-gray-300"} transition-colors`} />
          <span className="text-sm">
            {vad.isSpeaking ? "Listening..." : "Speak or tap an option"}
          </span>
        </div>
      )}

      <style jsx>{`
        .onboarding-ball {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a8edea 0%, #E6E6FA 50%, #fed6e3 100%);
          box-shadow:
            0 20px 40px rgba(0,0,0,0.1),
            0 10px 20px rgba(168, 237, 234, 0.3);
          position: relative;
          animation: gentle-float 3s ease-in-out infinite;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .onboarding-ball.active {
          animation: pulse-grow 0.5s ease-in-out infinite;
          box-shadow:
            0 20px 40px rgba(0,0,0,0.15),
            0 0 60px rgba(64, 224, 208, 0.4);
        }

        .ball-highlight {
          position: absolute;
          top: 15%;
          left: 20%;
          width: 30%;
          height: 30%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%);
        }

        @keyframes gentle-float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.02);
          }
        }

        @keyframes pulse-grow {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
