import React, { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useIsDarkMode } from "@/hooks/useIsDarkMode";

type SparkPoint = { v: number };

type StatDetail = { label: string; value: string };

type GradientStatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  gradient: string;
  shadowClass: string;
  sparkData?: SparkPoint[];
  sparkStroke?: string;
  details?: StatDetail[];
};

export default function GradientStatCard({
  title,
  value,
  subtitle,
  gradient,
  shadowClass,
  sparkData = [],
  sparkStroke,
  details,
}: GradientStatCardProps) {
  const isDark = useIsDarkMode();
  const gradientId = useId().replace(/:/g, "");
  const chartData = sparkData.length > 0 ? sparkData : [{ v: 0 }, { v: 0 }];
  const sparkLineColor = sparkStroke ?? (isDark ? "rgba(255,255,255,0.85)" : "rgba(30,41,59,0.45)");
  const sparkFillTop = isDark ? "rgba(255,255,255,0.35)" : "rgba(30,41,59,0.12)";
  const showSpark = !details?.length && sparkData.length > 0;

  return (
    <div
      className={`relative h-full overflow-hidden rounded-xl p-3.5 min-h-[105px] flex flex-col justify-between ring-1 ring-black/5 dark:ring-white/15 ${gradient} ${shadowClass}`}
    >
      <div className="relative z-10 flex flex-col">
        <p className="text-sm font-bold text-slate-700/90 dark:text-white/80">{title}</p>
        <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
          {value}
        </p>
        {details?.length ? (
          <div className="mt-1.5 space-y-0.5">
            {details.map((item) => (
              <p
                key={item.label}
                className="text-xs text-slate-700/80 dark:text-white/75 tabular-nums"
              >
                {item.label}: {item.value}
              </p>
            ))}
          </div>
        ) : subtitle ? (
          <p className="mt-1 text-xs text-slate-700/80 dark:text-white/75">{subtitle}</p>
        ) : null}
      </div>

      {details?.length ? null : showSpark ? (
        <div className="absolute right-1.5 bottom-1.5 w-[42%] h-[52%] min-h-[42px] opacity-95 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkFillTop} />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkLineColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
