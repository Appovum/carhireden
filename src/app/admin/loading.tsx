// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Root Streaming Skeleton Boundary
// Route: /admin/loading.tsx
// Renders instant shimmer UI for admin route transitions.
// ═══════════════════════════════════════════════════════════════════

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header bar placeholder */}
      <div className="h-16 bg-paper-raised border-b border-rule flex items-center justify-between px-6">
        <div className="h-5 w-48 bg-paper-sunken rounded-[3px]" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-paper-sunken rounded-full" />
          <div className="h-4 w-28 bg-paper-sunken rounded-[3px]" />
        </div>
      </div>

      {/* Main content placeholder container */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Metric Cards Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 bg-paper-raised border border-rule rounded-[4px] space-y-3">
              <div className="h-3 w-24 bg-paper-sunken rounded-[3px]" />
              <div className="h-7 w-32 bg-paper-sunken rounded-[3px]" />
              <div className="h-3 w-20 bg-paper-sunken rounded-[3px]" />
            </div>
          ))}
        </div>

        {/* Table Frame Skeleton */}
        <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-rule">
            <div className="h-9 w-64 bg-paper-sunken rounded-[3px]" />
            <div className="h-9 w-32 bg-paper-sunken rounded-[3px]" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-paper-sunken/60 rounded-[3px] w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
