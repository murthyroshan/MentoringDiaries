import { GhostWrapper } from "./SkeletonCard";

export function SkeletonTimeline({ count = 3, delay = 0 }) {
  return (
    <GhostWrapper delay={delay}>
      <div className="space-y-6 max-w-3xl mx-auto w-full px-4 pt-10">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="relative">
              <div className="w-6 h-6 rounded-full skeleton" />
              {i !== count - 1 && (
                <div className="absolute left-1/2 top-8 bottom-[-24px] w-0.5 -translate-x-1/2 skeleton" opacity={0.5} />
              )}
            </div>
            <div className="flex-1 glass-card p-5">
              <div className="skeleton h-5 w-2/3 rounded-full mb-3"></div>
              <div className="skeleton h-3 w-1/4 rounded-full mb-2"></div>
              <div className="skeleton h-3 w-full rounded-full mt-4"></div>
              <div className="skeleton h-3 w-4/5 rounded-full mt-2"></div>
            </div>
          </div>
        ))}
      </div>
    </GhostWrapper>
  );
}
