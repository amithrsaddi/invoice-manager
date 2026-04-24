import React from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-chart-3/10 text-chart-3",
  };

  return (
    <motion.div
      className="h-full w-full min-h-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-5 h-full w-full min-h-0 flex flex-col hover:shadow-lg transition-shadow duration-300 overflow-hidden">
        <div className="flex flex-1 min-h-0 items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1 min-h-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 min-h-[2.75rem] leading-snug break-words whitespace-pre-line">
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${colorClasses[color] || colorClasses.primary}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}