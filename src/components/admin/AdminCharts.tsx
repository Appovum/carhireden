// ═══════════════════════════════════════════════════════════════════
// CouponPilot — System Token Responsive SVG Analytics Charts
// Clean, high-performance charts styled using CSS variables.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React from "react";
import { formatMoney } from "@/lib/money";
import { useSiteSettings } from "@/hooks";

interface TimeSeriesPoint {
  label: string;
  value: number;
  prevValue?: number;
}

interface DualAxisPoint {
  label: string;
  clicks: number;
  conversions: number;
}

interface BarPoint {
  label: string;
  valueMinor: number;
}

// 1. Revenue & Net Profit Over Time (Line / Area Chart with Previous Period)
export function RevenueOverTimeChart({ data }: { data: TimeSeriesPoint[] }) {
  if (!data || data.length === 0) return null;

  const height = 200;
  const width = 600;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const maxVal = Math.max(...data.map((d) => Math.max(d.value, d.prevValue || 0)), 100);

  const getX = (index: number) => paddingLeft + (index / (data.length - 1)) * (width - paddingLeft - paddingRight);
  const getY = (val: number) => height - paddingBottom - (val / maxVal) * (height - paddingTop - paddingBottom);

  const currentPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.value)}`)
    .join(" ");

  const prevPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.prevValue || 0)}`)
    .join(" ");

  const areaPath = `${currentPath} L ${getX(data.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`;

  return (
    <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3 font-body">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-[15px] text-ink">Gross Commission & Revenue</h3>
          <p className="text-[12px] text-muted">12-week current period vs. previous period comparison</p>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-ink inline-block" />
            <span className="text-ink font-medium">Current Period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-muted inline-block border-t border-dashed" />
            <span className="text-muted">Previous Period</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          {/* Grid lines & Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height - paddingBottom - pct * (height - paddingTop - paddingBottom);
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-rule" strokeWidth="1" />
                <text x={paddingLeft - 6} y={y + 3} textAnchor="end" className="text-[9px] fill-muted font-mono">
                  ${Math.round((maxVal * pct))}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="var(--ink)" fillOpacity="0.04" />

          {/* Previous period line */}
          <path d={prevPath} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />

          {/* Current period line in neutral high contrast ink */}
          <path d={currentPath} fill="none" stroke="var(--ink)" strokeWidth="2.5" />

          {/* X-Axis Labels */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(d.value)} r="3" fill="var(--ink)" />
              {i % 2 === 0 && (
                <text x={getX(i)} y={height - 8} textAnchor="middle" className="text-[9px] fill-muted font-mono uppercase">
                  {d.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// 2. Clicks vs Conversions Dual-Axis Chart with Left & Right Y-Axes
export function ClicksVsConversionsChart({ data }: { data: DualAxisPoint[] }) {
  if (!data || data.length === 0) return null;

  const height = 200;
  const width = 600;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 20;
  const paddingBottom = 30;

  const maxClicks = Math.max(...data.map((d) => d.clicks), 100);
  const maxConversions = Math.max(...data.map((d) => d.conversions), 5);

  const getX = (index: number) => paddingLeft + (index / (data.length - 1)) * (width - paddingLeft - paddingRight);
  const getClickY = (val: number) => height - paddingBottom - (val / maxClicks) * (height - paddingTop - paddingBottom);
  const getConvY = (val: number) => height - paddingBottom - (val / maxConversions) * (height - paddingTop - paddingBottom);

  const clicksPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getClickY(d.clicks)}`).join(" ");
  const convPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getConvY(d.conversions)}`).join(" ");

  return (
    <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3 font-body">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-[15px] text-ink">Clicks vs. Conversions</h3>
          <p className="text-[12px] text-muted">Dual-axis traffic volume (left) against merchant sales (right)</p>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-ink inline-block" />
            <span className="text-ink font-medium">Clicks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-money inline-block" />
            <span className="text-ink font-medium">Conversions</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          {/* Dual Y-Axes Grid Lines */}
          {[0, 0.33, 0.66, 1].map((pct, idx) => {
            const y = height - paddingBottom - pct * (height - paddingTop - paddingBottom);
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-rule" strokeWidth="1" />
                {/* Left Axis: Clicks */}
                <text x={paddingLeft - 6} y={y + 3} textAnchor="end" className="text-[9px] fill-muted font-mono">
                  {Math.round(maxClicks * pct)}
                </text>
                {/* Right Axis: Conversions */}
                <text x={width - paddingRight + 6} y={y + 3} textAnchor="start" className="text-[9px] fill-muted font-mono">
                  {Math.round(maxConversions * pct)}
                </text>
              </g>
            );
          })}

          {/* Clicks Line (Neutral Ink) */}
          <path d={clicksPath} fill="none" stroke="var(--ink)" strokeWidth="2" />
          {/* Conversions Line (High-contrast Money accent) */}
          <path d={convPath} fill="none" stroke="var(--money)" strokeWidth="2.5" />

          {/* Data Points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getClickY(d.clicks)} r="3" fill="var(--ink)" />
              <circle cx={getX(i)} cy={getConvY(d.conversions)} r="3" fill="var(--money)" />
              {i % 2 === 0 && (
                <text x={getX(i)} y={height - 8} textAnchor="middle" className="text-[9px] fill-muted font-mono uppercase">
                  {d.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// 3. Top Stores Horizontal Bar Chart (Neutral Ink Bars)
export function CommissionByStoreChart({ data }: { data: BarPoint[] }) {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.valueMinor), 1);

  return (
    <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3 font-body">
      <div>
        <h3 className="font-display font-semibold text-[15px] text-ink">Top Stores by Commission</h3>
        <p className="text-[12px] text-muted">Highest grossing merchant partners</p>
      </div>

      <div className="space-y-2.5 pt-1">
        {data.slice(0, 5).map((item, idx) => {
          const pct = Math.round((item.valueMinor / maxVal) * 100);
          return (
            <div key={idx} className="space-y-1 text-[13px]">
              <div className="flex items-center justify-between text-ink">
                <span className="font-medium truncate max-w-[200px]">{item.label}</span>
                <span className="font-mono tabular-nums text-money font-semibold">
                  {formatMoney({ amountMinor: item.valueMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)}
                </span>
              </div>
              <div className="w-full bg-paper-sunken h-2 rounded-full overflow-hidden border border-rule">
                <div className="bg-ink h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. Commission by Category Breakdown (Neutral Ink Bars)
export function CommissionByCategoryChart({ data }: { data: BarPoint[] }) {
  const { default_currency, currency_exchange_rate } = useSiteSettings();
  if (!data || data.length === 0) return null;

  const totalVal = data.reduce((acc, d) => acc + d.valueMinor, 0) || 1;

  return (
    <div className="bg-paper-raised border border-rule rounded-[4px] p-4 space-y-3 font-body">
      <div>
        <h3 className="font-display font-semibold text-[15px] text-ink">Commission by Category</h3>
        <p className="text-[12px] text-muted">Category revenue distribution</p>
      </div>

      <div className="space-y-2.5 pt-1">
        {data.slice(0, 5).map((item, idx) => {
          const pct = Math.round((item.valueMinor / totalVal) * 100);
          return (
            <div key={idx} className="space-y-1 text-[13px]">
              <div className="flex items-center justify-between text-ink">
                <span className="font-medium truncate max-w-[200px]">{item.label}</span>
                <span className="font-mono tabular-nums text-ink">{pct}% ({formatMoney({ amountMinor: item.valueMinor, currency: default_currency }, "en-US", 2, currency_exchange_rate)})</span>
              </div>
              <div className="w-full bg-paper-sunken h-2 rounded-full overflow-hidden border border-rule">
                <div className="bg-ink h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
