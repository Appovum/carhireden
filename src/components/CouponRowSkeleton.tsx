// ═══════════════════════════════════════════════════════════════════
// CouponRowSkeleton — Matches exact dimensions of CouponRow
// ═══════════════════════════════════════════════════════════════════

export function CouponRowSkeleton() {
  return (
    <div
      className="voucher-row rounded-[3px] overflow-hidden"
      aria-hidden="true"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Left: Info skeleton */}
        <div className="flex-1 flex gap-3 p-3 sm:p-4">
          {/* Logo skeleton */}
          <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 skeleton rounded-[3px]" />

          <div className="flex-1 flex flex-col gap-2">
            {/* Discount + title */}
            <div className="flex items-center gap-2">
              <div className="skeleton w-[80px] h-[22px] sm:h-[26px] rounded-[2px]" />
              <div className="skeleton w-[140px] h-[14px] rounded-[2px]" />
            </div>

            {/* Trust cluster */}
            <div className="flex gap-3">
              <div className="skeleton w-[50px] h-[12px] rounded-[2px]" />
              <div className="skeleton w-[70px] h-[12px] rounded-[2px]" />
              <div className="skeleton w-[90px] h-[12px] rounded-[2px]" />
            </div>

            {/* Badge + Expiry */}
            <div className="flex gap-2">
              <div className="skeleton w-[42px] h-[18px] rounded-[2px]" />
              <div className="skeleton w-[80px] h-[18px] rounded-[2px]" />
            </div>
          </div>
        </div>

        {/* Right: Action skeleton */}
        <div className="sm:w-[180px] border-t sm:border-t-0 p-3 sm:p-4 flex items-center justify-center">
          <div className="skeleton w-[100px] h-[36px] rounded-[3px]" />
        </div>
      </div>
    </div>
  );
}
