// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Overview Dashboard Page
// Route: /admin
// Real dynamic database fetching for metrics, queues, and live activity feed.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { formatMoney } from "@/lib/money";
import { useSiteSettings } from "@/hooks";

// Inline Mini SVG Sparkline Component — All Neutral Ink
function Sparkline({ data, color = "var(--ink)" }: { data: number[]; color?: string }) {
  const height = 24;
  const width = 80;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

interface ActionQueueItem {
  title: string;
  subtitle: string;
  href: string;
  count: number;
  isUrgent?: boolean;
}

interface ActivityItem {
  id: string;
  title: string;
  time: string;
  type: "conversion" | "withdrawal" | "import" | "claim";
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Never";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export default function AdminOverviewPage() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const [dateRange, setDateRange] = useState("90d");
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [loading, setLoading] = useState(true);
  const [networkStatuses, setNetworkStatuses] = useState<
    { id: string; name: string; slug: string; isEnabled: boolean; status: string; lastSyncedAt: string | null }[]
  >([]);

  const [metrics, setMetrics] = useState({
    clicksCount: 0,
    conversionsCount: 0,
    grossCommissionMinor: 0,
    adsRevenueMinor: 0,
    netEarningsMinor: 0,
    clicksDelta: 0,
    conversionsDelta: 0,
    grossCommissionDelta: 0,
    adsRevenueDelta: 0,
    netEarningsDelta: 0,
    sparklineClicks: [0, 0, 0, 0, 0, 0, 0],
    sparklineConvs: [0, 0, 0, 0, 0, 0, 0],
    sparklineGross: [0, 0, 0, 0, 0, 0, 0],
    sparklineAds: [0, 0, 0, 0, 0, 0, 0],
    sparklineNet: [0, 0, 0, 0, 0, 0, 0],
  });

  const [counts, setCounts] = useState({
    pendingWithdrawals: 0,
    pendingClaims: 0,
    pendingOffers: 0,
    activeStores: 0,
    activeCoupons: 0,
    unconfiguredStores: 0,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [resEarnings, resWithdrawals, resClaims, resAudit, resStores, resImports] = await Promise.all([
          fetch(`/api/admin/earnings?range=${dateRange}`),
          fetch("/api/admin/withdrawals?status=requested"),
          fetch("/api/admin/claims"),
          fetch("/api/admin/audit-log"),
          fetch("/api/admin/stores?status=pending_review"),
          fetch("/api/admin/import-sources"),
        ]);

        const dataEarnings = await resEarnings.json();
        const dataWithdrawals = await resWithdrawals.json();
        const dataClaims = await resClaims.json();
        const dataAudit = await resAudit.json();
        const dataStores = await resStores.json();
        const dataImports = await resImports.json();

        if (dataImports.networks) {
          setNetworkStatuses(dataImports.networks);
        }

        if (dataEarnings.totals) {
          setMetrics({
            clicksCount: dataEarnings.totals.totalClicks || 0,
            conversionsCount: dataEarnings.totals.totalConversions || 0,
            grossCommissionMinor: dataEarnings.totals.grossCommissionMinor || 0,
            adsRevenueMinor: dataEarnings.totals.adRevenueMinor || 0,
            netEarningsMinor: dataEarnings.totals.netProfitMinor || 0,
            clicksDelta: dataEarnings.totals.clicksDelta || 0,
            conversionsDelta: dataEarnings.totals.conversionsDelta || 0,
            grossCommissionDelta: dataEarnings.totals.grossCommissionDelta || 0,
            adsRevenueDelta: dataEarnings.totals.adRevenueDelta || 0,
            netEarningsDelta: dataEarnings.totals.netProfitDelta || 0,
            sparklineClicks: dataEarnings.revenueChartPoints?.map((pt: any) => pt.value) || [0, 0, 0, 0, 0, 0, 0],
            sparklineConvs: dataEarnings.clicksVsConvPoints?.map((pt: any) => pt.conversions) || [0, 0, 0, 0, 0, 0, 0],
            sparklineGross: dataEarnings.revenueChartPoints?.map((pt: any) => pt.value) || [0, 0, 0, 0, 0, 0, 0],
            sparklineAds: dataEarnings.revenueChartPoints?.map((pt: any) => pt.value) || [0, 0, 0, 0, 0, 0, 0],
            sparklineNet: dataEarnings.revenueChartPoints?.map((pt: any) => pt.value) || [0, 0, 0, 0, 0, 0, 0],
          });
        }

        const pendingWithdrawalsCount = dataWithdrawals.withdrawals ? dataWithdrawals.withdrawals.length : 0;
        const pendingClaimsCount = dataClaims.claims ? dataClaims.claims.filter((c: any) => c.status === "pending_review").length : 0;
        const unconfiguredCount = dataStores.stores ? dataStores.stores.length : 0;

        setCounts({
          pendingWithdrawals: pendingWithdrawalsCount,
          pendingClaims: pendingClaimsCount,
          pendingOffers: 0,
          activeStores: dataEarnings.totals ? dataEarnings.totals.activeStores : 0,
          activeCoupons: dataEarnings.totals ? dataEarnings.totals.activeCoupons : 0,
          unconfiguredStores: unconfiguredCount,
        });

        if (dataAudit.logs && dataAudit.logs.length > 0) {
          setActivities(
            dataAudit.logs.slice(0, 5).map((log: any) => ({
              id: log.id,
              title: `${log.action.replace(/_/g, " ")} (${log.actorEmail})`,
              time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: "conversion",
            }))
          );
        } else {
          setActivities([]);
        }
      } catch (err) {
        console.error("Failed to load dashboard data from DB:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  // Action queues sorted by urgency / pending count descending
  const actionQueues: ActionQueueItem[] = [
    {
      title: "Pending withdrawals",
      subtitle: "Shopper payout requests waiting",
      href: "/admin/withdrawals",
      count: counts.pendingWithdrawals,
      isUrgent: counts.pendingWithdrawals > 5,
    },
    {
      title: "Missing cashback claims",
      subtitle: "Shopper transaction claims",
      href: "/admin/claims",
      count: counts.pendingClaims,
      isUrgent: counts.pendingClaims > 5,
    },
    {
      title: "Store link health check",
      subtitle: "Unmapped stores missing network configuration",
      href: "/admin/stores",
      count: counts.unconfiguredStores,
      isUrgent: counts.unconfiguredStores > 0,
    },
    {
      title: "Submitted offers",
      subtitle: "Community coupon submissions",
      href: "/admin/coupons",
      count: counts.pendingOffers,
      isUrgent: counts.pendingOffers > 10,
    },
  ].sort((a, b) => b.count - a.count);

  const rangeLabel = dateRange === "today" ? "Today's" : `${dateRange.toUpperCase()}`;

  return (
    <>
      <AdminHeader
        title="Overview"
        breadcrumbs={[]}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <main className="p-5 space-y-5 max-w-7xl mx-auto w-full font-body text-ink">
        {loading ? (
          <div className="space-y-5 animate-pulse">
            {/* Metric Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 bg-paper-raised border border-rule rounded-[4px] space-y-3">
                  <div className="h-3 w-20 bg-paper-sunken rounded-[3px]" />
                  <div className="h-6 w-28 bg-paper-sunken rounded-[3px]" />
                  <div className="h-3 w-16 bg-paper-sunken rounded-[3px]" />
                </div>
              ))}
            </div>

            {/* Catalog Strip Skeleton */}
            <div className="p-3 bg-paper-raised border border-rule rounded-[4px] flex items-center justify-between">
              <div className="h-4 w-64 bg-paper-sunken rounded-[3px]" />
              <div className="h-4 w-28 bg-paper-sunken rounded-[3px]" />
            </div>

            {/* Action Queues Skeleton */}
            <div className="space-y-2">
              <div className="h-5 w-32 bg-paper-sunken rounded-[3px]" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3.5 bg-paper-raised border border-rule rounded-[4px] flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 bg-paper-sunken rounded-[3px]" />
                      <div className="h-3 w-24 bg-paper-sunken rounded-[3px]" />
                    </div>
                    <div className="h-6 w-8 bg-paper-sunken rounded-[3px]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Imports & Shortcuts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3">
                <div className="h-5 w-24 bg-paper-sunken rounded-[3px]" />
                <div className="space-y-2">
                  <div className="h-8 bg-paper-sunken/60 rounded-[3px] w-full" />
                  <div className="h-8 bg-paper-sunken/60 rounded-[3px] w-full" />
                  <div className="h-8 bg-paper-sunken/60 rounded-[3px] w-full" />
                </div>
              </div>

              <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3">
                <div className="h-5 w-24 bg-paper-sunken rounded-[3px]" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-paper-sunken/60 rounded-[3px]" />
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-paper-sunken rounded-[3px]" />
                <div className="h-4 w-28 bg-paper-sunken rounded-[3px]" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-paper-sunken/60 rounded-[3px] w-full" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Metric Cards — 5 Columns including Ads Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3 bg-paper-raised border border-rule rounded-[4px] space-y-2 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] text-muted font-medium uppercase tracking-wider">{rangeLabel} clicks</div>
                    <div className="font-display font-bold text-[20px] text-ink tabular-nums leading-tight">
                      {metrics.clicksCount.toLocaleString()}
                    </div>
                  </div>
                  <Sparkline data={metrics.sparklineClicks} color="var(--ink)" />
                </div>
                <div className="text-[11px] text-muted font-mono">
                  {metrics.clicksDelta >= 0 ? `+${metrics.clicksDelta}%` : `${metrics.clicksDelta}%`} vs previous
                </div>
              </div>

              <div className="p-3 bg-paper-raised border border-rule rounded-[4px] space-y-2 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] text-muted font-medium uppercase tracking-wider">{rangeLabel} conv.</div>
                    <div className="font-display font-bold text-[20px] text-ink tabular-nums leading-tight">
                      {metrics.conversionsCount.toLocaleString()}
                    </div>
                  </div>
                  <Sparkline data={metrics.sparklineConvs} color="var(--ink)" />
                </div>
                <div className="text-[11px] text-muted font-mono">
                  {metrics.conversionsDelta >= 0 ? `+${metrics.conversionsDelta}%` : `${metrics.conversionsDelta}%`} vs previous
                </div>
              </div>

              <div className="p-3 bg-paper-raised border border-rule rounded-[4px] space-y-2 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] text-muted font-medium uppercase tracking-wider">{rangeLabel} gross comm.</div>
                    <div className="font-display font-bold text-[20px] text-money tabular-nums leading-tight">
                      {formatMoney({ amountMinor: metrics.grossCommissionMinor, currency: default_currency, exchangeRate: currency_exchange_rate })}
                    </div>
                  </div>
                  <Sparkline data={metrics.sparklineGross} color="var(--money)" />
                </div>
                <div className="text-[11px] text-muted font-mono">
                  {metrics.grossCommissionDelta >= 0 ? `+${metrics.grossCommissionDelta}%` : `${metrics.grossCommissionDelta}%`} vs previous
                </div>
              </div>

              <div className="p-3 bg-paper-raised border border-rule rounded-[4px] space-y-2 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] text-muted font-medium uppercase tracking-wider">{rangeLabel} ads rev.</div>
                    <div className="font-display font-bold text-[20px] text-money tabular-nums leading-tight">
                      {formatMoney({ amountMinor: metrics.adsRevenueMinor, currency: default_currency, exchangeRate: currency_exchange_rate })}
                    </div>
                  </div>
                  <Sparkline data={metrics.sparklineAds} color="var(--money)" />
                </div>
                <div className="text-[11px] text-muted font-mono">
                  {metrics.adsRevenueDelta >= 0 ? `+${metrics.adsRevenueDelta}%` : `${metrics.adsRevenueDelta}%`} vs previous
                </div>
              </div>

              <div className="p-3 bg-paper-raised border border-rule rounded-[4px] space-y-2 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] text-muted font-medium uppercase tracking-wider">{rangeLabel} net profit</div>
                    <div className="font-display font-bold text-[20px] text-money tabular-nums leading-tight">
                      {formatMoney({ amountMinor: metrics.netEarningsMinor, currency: default_currency, exchangeRate: currency_exchange_rate })}
                    </div>
                  </div>
                  <Sparkline data={metrics.sparklineNet} color="var(--money)" />
                </div>
                <div className="text-[11px] text-muted font-mono">
                  {metrics.netEarningsDelta >= 0 ? `+${metrics.netEarningsDelta}%` : `${metrics.netEarningsDelta}%`} vs previous
                </div>
              </div>
            </div>

            {/* Catalog Inventory Strip */}
            <div className="p-3 bg-paper-raised border border-rule rounded-[4px] flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-4">
                <span className="text-muted font-medium">Published catalog:</span>
                <span className="text-ink font-semibold">{counts.activeStores} active stores</span>
                <span className="text-muted">•</span>
                <span className="text-ink font-semibold">{counts.activeCoupons.toLocaleString()} active offers</span>
              </div>
              <Link href="/admin/stores" className="text-muted hover:text-ink transition-colors font-medium">
                Manage catalog →
              </Link>
            </div>

            {/* Action Queues (Calibrated urgency badges) */}
            <div className="space-y-2">
              <h2 className="font-display font-semibold text-[16px] text-ink">Action queues</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {actionQueues.map((item, idx) => {
                  const hasCount = item.count > 0;
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      className={`p-3.5 border rounded-[4px] transition-colors flex items-center justify-between ${
                        hasCount
                          ? "bg-paper-raised border-rule hover:border-ink"
                          : "bg-paper-sunken/40 border-rule opacity-50 hover:opacity-100"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-[13px] text-ink">{item.title}</div>
                        <div className="text-[11px] text-muted">{item.subtitle}</div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded font-mono font-bold text-[12px] ${
                          hasCount
                            ? item.isUrgent
                              ? "bg-urgent text-white"
                              : "bg-ink text-paper"
                            : "bg-paper-sunken text-muted border border-rule"
                        }`}
                      >
                        {item.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Imports & Shortcuts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-[15px] text-ink">Imports & Feeds</h3>
                  <Link href="/admin/import-sources" className="text-[12px] text-muted hover:text-ink transition-colors font-medium">
                    Manage &rarr;
                  </Link>
                </div>
                <div className="space-y-2 text-[12px]">
                  {networkStatuses.length > 0 ? (
                    networkStatuses.map((net) => (
                      <div key={net.id} className="flex items-center justify-between py-1 border-b border-rule/50">
                        <span className="font-medium text-ink">{net.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
                            net.status === "completed" || net.status === "healthy"
                              ? "bg-money/10 border-money/20 text-money"
                              : net.status === "running"
                              ? "bg-accent-bg border-accent/20 text-ink"
                              : "bg-paper-sunken border-rule text-muted"
                          }`}
                        >
                          {net.status === "running"
                            ? "Syncing..."
                            : `Healthy (${formatRelativeTime(net.lastSyncedAt)})`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-muted text-[12px]">No active import networks configured.</div>
                  )}

                  {isDemoMode && (
                    <div className="flex items-center justify-between py-1">
                      <span>Automated Demo Reset Job</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono text-muted border border-rule bg-paper-sunken">
                        Scheduled (Daily 00:00)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3">
                <h3 className="font-display font-semibold text-[15px] text-ink">Shortcuts</h3>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <Link href="/admin/earnings" className="p-2.5 bg-paper-sunken border border-rule rounded hover:bg-paper-raised transition-colors font-medium flex items-center justify-between">
                    <span>Detailed earnings</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                  <Link href="/admin/stores" className="p-2.5 bg-paper-sunken border border-rule rounded hover:bg-paper-raised transition-colors font-medium flex items-center justify-between">
                    <span>Manage stores</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                  <Link href="/admin/networks" className="p-2.5 bg-paper-sunken border border-rule rounded hover:bg-paper-raised transition-colors font-medium flex items-center justify-between">
                    <span>Test networks</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                  <Link href="/admin/settings" className="p-2.5 bg-paper-sunken border border-rule rounded hover:bg-paper-raised transition-colors font-medium flex items-center justify-between">
                    <span>Platform settings</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[15px] text-ink">Recent activity</h3>
                <Link href="/admin/audit-log" className="text-[12px] text-muted hover:text-ink font-medium transition-colors">
                  View full audit log →
                </Link>
              </div>

              <div className="space-y-2 text-[12px] font-body">
                {activities.map((act) => (
                  <div key={act.id} className="p-2.5 bg-paper-sunken/60 border border-rule rounded flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink inline-block" />
                      <span className="text-ink font-medium">{act.title}</span>
                    </div>
                    <span className="text-muted font-mono text-[11px]">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
