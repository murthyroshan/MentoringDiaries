import { GhostWrapper } from "./SkeletonCard";

export function SkeletonChart({ delay = 0 }) {
  return (
    <GhostWrapper delay={delay}>
      <div className="glass-card p-4 w-full h-[220px] flex flex-col">
        <div className="skeleton h-4 w-1/3 rounded-full mb-4"></div>
        <div className="flex-1 w-full flex items-end justify-between gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div 
              key={i} 
              className="skeleton rounded-t-sm w-full" 
              style={{ height: `${Math.random() * 60 + 20}%` }}
            ></div>
          ))}
        </div>
      </div>
    </GhostWrapper>
  );
}
