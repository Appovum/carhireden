// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Earnings & Revenue Analytics Dashboard
// Route: /admin/earnings
// High-density analytics screen with live organic DB analytics.
// SVG line icons (no emojis).
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";
import {
  RevenueOverTimeChart,
  ClicksVsConversionsChart,
  CommissionByStoreChart,
  CommissionByCategoryChart,
} from "@/components/admin/AdminCharts";
import { formatMoney } from "@/lib/money";
import { useSiteSettings } from "@/hooks";

interface CouponEarningsRow {
  id: string;
  couponTitle: string;
  storeName: string;
  clicks: number;
  conversions: number;
  epcMinor: number;
  commissionMinor: number;
}

interface StoreEarningsRow {
  id: string;
  storeName: string;
  clicks: number;
  conversions: number;
  conversionRatePct: number;
  commissionMinor: number;
  cashbackMinor: number;
  netProfitMinor: number;
}

interface ConversionRow {
  id: string;
  transactionId: string;
  storeName: string;
  saleAmountMinor: number;
  commissionMinor: number;
  cashbackMinor: number;
  status: "confirmed" | "pending" | "declined";
  date: string;
}

export default function AdminEarningsPage() {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  const [dateRange, setDateRange] = useState("90d");
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    clicks: 0,
    clicksDelta: 0,
    conversions: 0,
    conversionsDelta: 0,
    conversionRate: 0,
    conversionRateDelta: 0,
    grossCommissionMinor: 0,
    grossCommissionDelta: 0,
    cashbackPaidMinor: 0,
    cashbackPaidDelta: 0,
    netProfitMinor: 0,
    netProfitDelta: 0,
  });

  const [topCoupons, setTopCoupons] = useState<CouponEarningsRow[]>([]);
  const [topStores, setTopStores] = useState<StoreEarningsRow[]>([]);
  const [recentConversions, setRecentConversions] = useState<ConversionRow[]>([]);

  const [revenueChartPoints, setRevenueChartPoints] = useState<any[]>([]);
  const [clicksVsConvPoints, setClicksVsConvPoints] = useState<any[]>([]);
  const [topStoresBar, setTopStoresBar] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/earnings?range=${dateRange}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMetrics(data.metrics);
          setTopCoupons(data.topCoupons);
          setTopStores(data.topStores);
          setRecentConversions(data.recentConversions);
          setRevenueChartPoints(data.revenueChartPoints);
          setClicksVsConvPoints(data.clicksVsConvPoints);
          setTopStoresBar(data.topStoresBar);
          setCategoryBreakdown(data.categoryBreakdown);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dateRange]);

  // Sentence Case Column Definitions
  const couponColumns: ColumnDef<CouponEarningsRow>[] = [
    { key: "couponTitle", header: "Coupon title", sortable: true },
    { key: "storeName", header: "Store name", sortable: true },
    { key: "clicks", header: "Clicks", isNumeric: true, sortable: true },
    { key: "conversions", header: "Conversions", isNumeric: true, sortable: true },
    {
      key: "epcMinor",
      header: "EPC",
      isNumeric: true,
      sortable: true,
      render: (r) => formatMoney({ amountMinor: r.epcMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate),
    },
    {
      key: "commissionMinor",
      header: "Gross commission",
      isNumeric: true,
      sortable: true,
      render: (r) => (
        <span className="text-money font-semibold font-mono tabular-nums">
          {formatMoney({ amountMinor: r.commissionMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
        </span>
      ),
    },
  ];

  const storeColumns: ColumnDef<StoreEarningsRow>[] = [
    { key: "storeName", header: "Store name", sortable: true },
    { key: "clicks", header: "Clicks", isNumeric: true, sortable: true },
    { key: "conversions", header: "Conversions", isNumeric: true, sortable: true },
    {
      key: "conversionRatePct",
      header: "Conversion rate",
      isNumeric: true,
      sortable: true,
      render: (r) => `${r.conversionRatePct.toFixed(1)}%`,
    },
    {
      key: "commissionMinor",
      header: "Gross commission",
      isNumeric: true,
      sortable: true,
      render: (r) => (
        <span className="text-money font-semibold font-mono tabular-nums">
          {formatMoney({ amountMinor: r.commissionMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
        </span>
      ),
    },
    {
      key: "cashbackMinor",
      header: "Cashback paid",
      isNumeric: true,
      sortable: true,
      render: (r) => formatMoney({ amountMinor: r.cashbackMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate),
    },
    {
      key: "netProfitMinor",
      header: "Net profit",
      isNumeric: true,
      sortable: true,
      render: (r) => (
        <span className="text-money font-semibold font-mono tabular-nums">
          {formatMoney({ amountMinor: r.netProfitMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
        </span>
      ),
    },
  ];

  const conversionColumns: ColumnDef<ConversionRow>[] = [
    { key: "transactionId", header: "Transaction ID", sortable: true },
    { key: "storeName", header: "Store name", sortable: true },
    {
      key: "saleAmountMinor",
      header: "Sale amount",
      isNumeric: true,
      sortable: true,
      render: (r) => formatMoney({ amountMinor: r.saleAmountMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate),
    },
    {
      key: "commissionMinor",
      header: "Commission",
      isNumeric: true,
      sortable: true,
      render: (r) => (
        <span className="text-money font-semibold font-mono tabular-nums">
          {formatMoney({ amountMinor: r.commissionMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
        </span>
      ),
    },
    {
      key: "cashbackMinor",
      header: "Cashback",
      isNumeric: true,
      sortable: true,
      render: (r) => formatMoney({ amountMinor: r.cashbackMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-medium border uppercase ${
            r.status === "confirmed"
              ? "bg-paper-sunken border-rule text-ink"
              : r.status === "pending"
              ? "bg-paper-sunken border-rule text-muted"
              : "bg-urgent/10 border-urgent/20 text-urgent"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    { key: "date", header: "Date", sortable: true },
  ];

  return (
    <>
      <AdminHeader
        title="Earnings & Revenue Analytics"
        breadcrumbs={[{ label: "Revenue", href: "/admin/earnings" }, { label: "Earnings" }]}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        {/* Reconciliation Note Banner with SVG Line Icon */}
        <div className="p-3 bg-paper-sunken border border-rule rounded-[3px] flex items-center justify-between text-[13px] text-muted">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              Affiliate networks confirm transactions on varying reconciliation schedules; recent figures adjust automatically upon final network reconciliation.
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase">Live Sync Active</span>
        </div>

        {/* Metric Strip — 6 Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[12px] text-muted font-medium">Clicks</div>
            <div className="font-display font-bold text-[24px] text-ink tabular-nums">
              {metrics.clicks.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted font-mono">
              {metrics.clicksDelta >= 0 ? `+${metrics.clicksDelta}%` : `${metrics.clicksDelta}%`} vs previous period
            </div>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[12px] text-muted font-medium">Conversions</div>
            <div className="font-display font-bold text-[24px] text-ink tabular-nums">
              {metrics.conversions.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted font-mono">
              {metrics.conversionsDelta >= 0 ? `+${metrics.conversionsDelta}%` : `${metrics.conversionsDelta}%`} vs previous period
            </div>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[12px] text-muted font-medium">Conversion Rate</div>
            <div className="font-display font-bold text-[24px] text-ink tabular-nums">
              {metrics.conversionRate.toFixed(2)}%
            </div>
            <div className="text-[11px] text-muted font-mono">
              {metrics.conversionRateDelta >= 0 ? `+${metrics.conversionRateDelta}%` : `${metrics.conversionRateDelta}%`} vs previous period
            </div>
          </div>

          {/* Money Figures use --money */}
          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[12px] text-muted font-medium">Gross Commission</div>
            <div className="font-display font-bold text-[24px] text-money tabular-nums">
              {formatMoney({ amountMinor: metrics.grossCommissionMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
            </div>
            <div className="text-[11px] text-muted font-mono">
              {metrics.grossCommissionDelta >= 0 ? `+${metrics.grossCommissionDelta}%` : `${metrics.grossCommissionDelta}%`} vs previous period
            </div>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[12px] text-muted font-medium">Cashback Paid</div>
            <div className="font-display font-bold text-[24px] text-money tabular-nums">
              {formatMoney({ amountMinor: metrics.cashbackPaidMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
            </div>
            <div className="text-[11px] text-muted font-mono">
              {metrics.cashbackPaidDelta >= 0 ? `+${metrics.cashbackPaidDelta}%` : `${metrics.cashbackPaidDelta}%`} vs previous period
            </div>
          </div>

          <div className="p-4 bg-paper-raised border border-rule rounded-[4px] space-y-1">
            <div className="text-[12px] text-muted font-medium">Net Profit</div>
            <div className="font-display font-bold text-[24px] text-money tabular-nums">
              {formatMoney({ amountMinor: metrics.netProfitMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
            </div>
            <div className="text-[11px] text-muted font-mono">
              {metrics.netProfitDelta >= 0 ? `+${metrics.netProfitDelta}%` : `${metrics.netProfitDelta}%`} vs previous period
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueOverTimeChart data={revenueChartPoints} />
          <ClicksVsConversionsChart data={clicksVsConvPoints} />
          <CommissionByStoreChart data={topStoresBar} />
          <CommissionByCategoryChart data={categoryBreakdown} />
        </div>

        {/* Data Tables Section */}
        <div className="space-y-8 pt-4">
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-[18px] text-ink">Top Earning Coupons</h2>
            <AdminTable
              columns={couponColumns}
              data={topCoupons}
              searchPlaceholder="Search coupons..."
              searchField={(r) => `${r.couponTitle} ${r.storeName}`}
              exportFilename="top_earning_coupons.csv"
            />
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-semibold text-[18px] text-ink">Top Earning Stores</h2>
            <AdminTable
              columns={storeColumns}
              data={topStores}
              searchPlaceholder="Search stores..."
              searchField={(r) => r.storeName}
              exportFilename="top_earning_stores.csv"
            />
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-semibold text-[18px] text-ink">Recent Conversions</h2>
            <AdminTable
              columns={conversionColumns}
              data={recentConversions}
              searchPlaceholder="Search transactions..."
              searchField={(r) => `${r.transactionId} ${r.storeName}`}
              statusField={(r) => r.status}
              statusOptions={["confirmed", "pending", "declined"]}
              exportFilename="recent_conversions.csv"
            />
          </div>
        </div>
      </main>
    </>
  );
}
