"use client";

import React from "react";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HintProps {
  children: React.ReactNode;
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

export const Hint = ({ children, text, side, align, className }: HintProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        {/* 
          we added asChild attribute because TooltipTrigger renders a button by default
          but if we wrap the Hint component on another <Button> component which also contains a <button> element
          then the tooltip will not work and will give a console error

          Radix provides asChild for exactly this.
          It tells the trigger:
          > "Don't render your own button — use the child element instead"
        */}
        <TooltipTrigger className={cn("", className)} asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align}>
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
