"use client";

import { useEffect, useState } from "react";

export type FlowBallState = "idle" | "rolling" | "coasting" | "receiving";

interface FlowBallProps {
  state: FlowBallState;
  className?: string;
}

export function FlowBall({ state, className = "" }: FlowBallProps) {
  const [currentState, setCurrentState] = useState<FlowBallState>(state);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Handle state transitions smoothly
    if (state !== currentState) {
      if (state === "idle" && currentState === "rolling") {
        // User stopped speaking - coast first
        setCurrentState("coasting");
        setIsTransitioning(true);

        // After coasting animation, go to idle
        const timer = setTimeout(() => {
          setCurrentState("idle");
          setIsTransitioning(false);
        }, 2000);

        return () => clearTimeout(timer);
      } else {
        setCurrentState(state);
      }
    }
  }, [state, currentState]);

  const getStateClasses = () => {
    switch (currentState) {
      case "rolling":
        return "animate-roll";
      case "coasting":
        return "animate-coast";
      case "receiving":
        return "animate-float animate-glow";
      case "idle":
      default:
        return "animate-float";
    }
  };

  return (
    <div className={`flow-container ${className}`}>
      <div className={`flow-ball ${getStateClasses()}`}>
        {/* Inner highlight for 3D effect */}
        <div className="flow-ball-highlight" />
      </div>

      {/* Subtle shadow beneath */}
      <div className={`flow-ball-shadow ${currentState === "rolling" ? "shadow-active" : ""}`} />

      <style jsx>{`
        .flow-container {
          position: relative;
          width: 100%;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .flow-ball {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;

          /* Beautiful pastel gradient - visible rotation */
          background:
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 50%),
            linear-gradient(135deg, #a8edea 0%, #E6E6FA 50%, #fed6e3 100%);

          /* Soft shadow for depth */
          box-shadow:
            0 10px 30px rgba(0,0,0,0.15),
            0 5px 15px rgba(168, 237, 234, 0.3),
            inset 0 -5px 20px rgba(0,0,0,0.05);

          /* Smooth transitions */
          transition:
            transform 0.3s cubic-bezier(0.25, 1, 0.5, 1),
            box-shadow 0.5s ease;
        }

        .flow-ball-highlight {
          position: absolute;
          top: 10%;
          left: 15%;
          width: 30%;
          height: 30%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%);
          pointer-events: none;
        }

        .flow-ball-shadow {
          position: absolute;
          bottom: 30px;
          width: 60px;
          height: 15px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(0,0,0,0.2) 0%, transparent 70%);
          transition: all 0.5s ease;
        }

        .shadow-active {
          width: 80px;
          height: 20px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%);
        }

        /* Idle: Gentle floating */
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        /* Rolling: User is speaking - smooth rotation */
        .animate-roll {
          animation: roll-forward 1.5s linear infinite;
          box-shadow:
            0 10px 30px rgba(0,0,0,0.2),
            0 5px 15px rgba(64, 224, 208, 0.4),
            inset 0 -5px 20px rgba(0,0,0,0.05);
        }

        /* Coasting: User stopped - gradual slowdown */
        .animate-coast {
          animation: coast 2s ease-out forwards;
        }

        /* Receiving: VC is speaking - subtle glow */
        .animate-glow {
          box-shadow:
            0 10px 30px rgba(0,0,0,0.15),
            0 0 40px rgba(230, 230, 250, 0.6),
            0 0 60px rgba(168, 237, 234, 0.3),
            inset 0 -5px 20px rgba(0,0,0,0.05);
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        @keyframes roll-forward {
          0% {
            transform: rotate(0deg) translateX(-5px);
          }
          25% {
            transform: rotate(90deg) translateX(5px);
          }
          50% {
            transform: rotate(180deg) translateX(-5px);
          }
          75% {
            transform: rotate(270deg) translateX(5px);
          }
          100% {
            transform: rotate(360deg) translateX(-5px);
          }
        }

        @keyframes coast {
          0% {
            transform: rotate(0deg) translateX(0);
          }
          30% {
            transform: rotate(90deg) translateX(3px);
          }
          60% {
            transform: rotate(150deg) translateX(1px);
          }
          100% {
            transform: rotate(180deg) translateY(0) translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
