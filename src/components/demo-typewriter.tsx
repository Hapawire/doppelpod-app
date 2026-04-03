"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";

const examples = [
  {
    input: "just dropped a new track, go check it out 🔥",
    output: "New music out now. This one's been sitting in the vault — finally ready. Stream it. 🔗 in bio.",
  },
  {
    input: "had a great meeting today, learned a lot about scaling a startup",
    output: "Had a meeting today that reframed how I think about scale. The best founders aren't the ones with all the answers — they're the ones who keep showing up to learn.",
  },
  {
    input: "new youtube video on building habits that actually stick",
    output: "Most habit advice is wrong. It's not about discipline — it's about design. New video breaks it down. Link in bio.",
  },
];

const TYPING_SPEED = 28;
const PAUSE_AFTER_INPUT = 800;
const PAUSE_AFTER_OUTPUT = 2800;

type Phase = "typing-input" | "pause-input" | "typing-output" | "pause-output";

export function DemoTypewriter({ onSignup }: { onSignup: () => void }) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing-input");
  const [charIndex, setCharIndex] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const example = examples[exampleIndex];
  const inputText = phase === "typing-input" || phase === "pause-input" || phase === "typing-output" || phase === "pause-output"
    ? example.input.slice(0, phase === "typing-input" ? charIndex : example.input.length)
    : "";
  const outputText = phase === "typing-output"
    ? example.output.slice(0, charIndex)
    : phase === "pause-output"
      ? example.output
      : "";

  useEffect(() => {
    setPhase("typing-input");
    setCharIndex(0);
  }, [exampleIndex]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (phase === "typing-input") {
      if (charIndex < example.input.length) {
        timeoutRef.current = setTimeout(() => setCharIndex(i => i + 1), TYPING_SPEED);
      } else {
        timeoutRef.current = setTimeout(() => { setPhase("typing-output"); setCharIndex(0); }, PAUSE_AFTER_INPUT);
      }
    } else if (phase === "typing-output") {
      if (charIndex < example.output.length) {
        timeoutRef.current = setTimeout(() => setCharIndex(i => i + 1), TYPING_SPEED);
      } else {
        timeoutRef.current = setTimeout(() => setPhase("pause-output"), PAUSE_AFTER_OUTPUT);
      }
    } else if (phase === "pause-output") {
      timeoutRef.current = setTimeout(() => setExampleIndex(i => (i + 1) % examples.length), 500);
    }

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [phase, charIndex, example]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-purple-500/20 bg-card/60 backdrop-blur overflow-hidden"
      >
        {/* Input section */}
        <div className="p-4 sm:p-5 border-b border-purple-500/10">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            You wrote
          </p>
          <p className="min-h-[2.5rem] text-sm text-muted-foreground leading-relaxed">
            {inputText}
            {(phase === "typing-input") && (
              <span className="inline-block w-[2px] h-[1em] bg-muted-foreground/60 ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>

        {/* Output section */}
        <div className="p-4 sm:p-5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-purple-400">
            Your AI twin wrote
          </p>
          <AnimatePresence>
            {(phase === "typing-output" || phase === "pause-output") && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[4rem] text-sm leading-relaxed"
              >
                {outputText}
                {phase === "typing-output" && (
                  <span className="inline-block w-[2px] h-[1em] bg-purple-400/80 ml-0.5 animate-pulse align-middle" />
                )}
              </motion.p>
            )}
          </AnimatePresence>
          {(phase === "typing-input" || phase === "pause-input") && (
            <div className="min-h-[4rem] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
            </div>
          )}
        </div>

        {/* Example indicator dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {examples.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === exampleIndex ? "w-4 bg-purple-400" : "w-1 bg-purple-500/30"
              }`}
            />
          ))}
        </div>
      </motion.div>

      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">Ready to try for yourself?</p>
        <Button
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
          onClick={() => { onSignup(); setAuthOpen(true); }}
        >
          Create Free Account
        </Button>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
