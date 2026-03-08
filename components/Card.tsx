"use client";

import React from "react";
import { motion } from "motion/react";
import { Circle, Triangle, Square, Star, Plus } from "lucide-react";

type Shape = "circle" | "triangle" | "cross" | "square" | "star" | "whot";

interface CardProps {
  shape?: Shape;
  number?: number;
  onClick?: () => void;
  disabled?: boolean;
  faceDown?: boolean;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  shape,
  number,
  onClick,
  disabled,
  faceDown,
  className,
}) => {
  const brownColor = "text-[#5D0E0E]";
  const brownFill = "fill-[#5D0E0E]";

  const getIcon = (size: string = "w-12 h-12") => {
    if (!shape) return null;
    switch (shape) {
      case "circle":
        return (
          <svg className={`${size} ${brownFill}`} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
      case "triangle":
        return (
          <svg className={`${size} ${brownFill}`} viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
        );
      case "square":
        return (
          <svg className={`${size} ${brownFill}`} viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" />
          </svg>
        );
      case "star":
        return (
          <svg className={`${size} ${brownFill}`} viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      case "cross":
        return (
          <svg className={`${size} ${brownFill}`} viewBox="0 0 24 24">
            <path d="M8 2h8v6h6v8h-6v6H8v-6H2V8h6V2z" />
          </svg>
        );
      case "whot":
        return (
          <div
            className={`flex flex-col items-center justify-center ${brownColor}`}
          >
            <span
              className="text-xl font-black italic tracking-tighter"
              style={{ fontFamily: "serif" }}
            >
              Whot
            </span>
            <span
              className="text-xl font-black italic tracking-tighter rotate-180 -mt-1"
              style={{ fontFamily: "serif" }}
            >
              Whot
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const getMiniIcon = () => {
    if (number === 20)
      return (
        <span
          className={`text-[8px] font-serif italic ${brownColor} leading-none`}
        >
          w
        </span>
      );
    return getIcon("w-2.5 h-2.5");
  };

  if (faceDown) {
    return (
      <div
        className={`w-16 h-24 sm:w-20 sm:h-32 bg-[#5D0E0E] rounded-lg border-2 border-white flex items-center justify-center shadow-md ${className}`}
      >
        <span className="text-white font-serif italic text-xl">Whot</span>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={!disabled ? { y: -10, scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`
        w-16 h-28 sm:w-20 sm:h-32 bg-white rounded-lg border-2 border-gray-200 
        flex flex-col items-center justify-between p-1.5 shadow-md cursor-pointer
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#5D0E0E]/50"}
        ${className}
      `}
    >
      <div
        className={`w-full flex flex-col items-start leading-none ${brownColor}`}
      >
        <span
          className={`${number === 20 ? "text-xs" : "text-base sm:text-lg"} font-black`}
        >
          {number}
        </span>
        <div className="-mt-0.5">{getMiniIcon()}</div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {getIcon(shape === "whot" ? "w-full" : "w-7 h-7 sm:w-9 sm:h-9")}
      </div>

      <div
        className={`w-full flex flex-col items-start leading-none rotate-180 ${brownColor}`}
      >
        <span
          className={`${number === 20 ? "text-xs" : "text-base sm:text-lg"} font-black`}
        >
          {number}
        </span>
        <div className="-mt-0.5">{getMiniIcon()}</div>
      </div>
    </motion.div>
  );
};

export default Card;
