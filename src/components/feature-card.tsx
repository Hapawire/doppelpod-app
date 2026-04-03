"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  back?: React.ReactNode;
  comingSoon?: boolean;
}

export function FeatureCard({ icon, title, description, back, comingSoon }: FeatureCardProps) {
  const [flipped, setFlipped] = useState(false);
  const isFlippable = !!back;

  return (
    <div
      className="h-full"
      style={{ perspective: "1000px" }}
      onClick={() => isFlippable && setFlipped(f => !f)}
    >
      <motion.div
        className="h-full"
        style={{ display: "grid", transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
      >
        {/* Front */}
        <Card
          className="relative border-border/50 bg-card/50 backdrop-blur transition-colors duration-200 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
          style={{ gridArea: "1/1", backfaceVisibility: "hidden" }}
        >
          {comingSoon && (
            <div className="absolute top-2.5 right-3 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-purple-400 select-none">
              Coming Soon
            </div>
          )}
          <CardHeader>
            <div className="mb-2 text-3xl sm:text-4xl">{icon}</div>
            <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs leading-relaxed sm:text-sm text-muted-foreground">
              {description}
            </p>
          </CardContent>
          {isFlippable && (
            <div className="absolute bottom-3 right-3 text-purple-500/40">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </Card>

        {/* Back — only rendered for flippable cards */}
        {isFlippable && (
          <Card
            className="border-purple-500/30 bg-purple-950/30 backdrop-blur"
            style={{
              gridArea: "1/1",
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed sm:text-sm">
              {back}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
