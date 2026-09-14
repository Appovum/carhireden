// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Reusable Dense Admin Data Table Component
// Target ~44px row height, multi-sort, pagination, bulk selection, CSV export.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useMemo } from "react";

export interface ColumnDef<T> {
  key: string;
  header: string;
  isNumeric?: boolean;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface BulkAction<T> {
  label: string;
  onClick: (selectedRows: T[]) => void;
  isDestructive?: boolean;
}

export interface EmptyStateConfig {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface AdminTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchField?: (row: T) => string;
  statusField?: (row: T) => string;
  statusOptions?: string[];
  bulkActions?: BulkAction<T>[];
  emptyState?: EmptyStateConfig;
  exportFilename?: string;
  pageSize?: number;
}

export function AdminTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  searchPlaceholder = "Search records...",
  searchField,
  statusField,
  statusOptions = [],
  bulkActions = [],
  emptyState = {
    title: "No records found",
    description: "No data matches your current search or filter criteria.",
  },
  exportFilename = "export.csv",
  pageSize = 10,
}: AdminTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Prune stale selected IDs against active data prop
  const activeSelectedIds = useMemo(() => {
    if (selectedIds.size === 0) return selectedIds;
    const validIds = new Set(data.map((d) => d.id));
    const next = new Set<string>();
    selectedIds.forEach((id) => {
      if (validIds.has(id)) next.add(id);
    });
    return next;
  }, [data, selectedIds]);

  // Search and Filter Logic
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (searchField && searchTerm) {
        const val = searchField(row).toLowerCase();
        if (!val.includes(searchTerm.toLowerCase())) return false;
      }
      if (statusField && statusFilter !== "all") {
        if (statusField(row) !== statusFilter) return false;
      }
      return true;
    });
  }, [data, searchField, searchTerm, statusField, statusFilter]);

  // Sorting Logic
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey];
      const valB = (b as Record<string, unknown>)[sortKey];

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      return sortDirection === "asc"
        ? String(valA || "").localeCompare(String(valB || ""))
        : String(valB || "").localeCompare(String(valA || ""));
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination Calculation
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Handle Header Sort Click
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else setSortKey(null);
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Bulk Selection Logic
  const allSelected = paginatedData.length > 0 && paginatedData.every((r) => activeSelectedIds.has(r.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((r) => r.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(activeSelectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = columns.map((c) => c.header).join(",");
    const rows = sortedData.map((row) =>
      columns
        .map((c) => {
          const val = (row as Record<string, unknown>)[c.key];
          return `"${String(val ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = exportFilename;
    link.click();
  };

  const selectedRows = useMemo(() => {
    return data.filter((r) => activeSelectedIds.has(r.id));
  }, [data, activeSelectedIds]);

  return (
    <div className="space-y-3 font-body text-ink">
      {/* Control Bar: Search, Status Filter, Export CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-paper-raised border border-rule p-3 rounded-[4px]">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {searchField && (
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="bg-paper-sunken border border-rule rounded-[3px] px-3 py-1.5 text-[13px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-focus-ring w-full sm:w-64"
            />
          )}

          {statusField && statusOptions.length > 0 && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-paper-sunken border border-rule rounded-[3px] px-3 py-1.5 text-[13px] text-ink capitalize focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-paper-sunken border border-rule hover:bg-paper-raised text-ink text-[12px] font-medium rounded-[3px] transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Bulk Action Floating Bar */}
      {activeSelectedIds.size > 0 && bulkActions.length > 0 && (
        <div className="bg-ink text-paper px-4 py-2 rounded-[3px] flex items-center justify-between text-[13px] font-medium">
          <span>{activeSelectedIds.size} record(s) selected</span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  action.onClick(selectedRows);
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-1 rounded text-[12px] transition-colors ${
                  action.isDestructive
                    ? "bg-urgent text-white hover:bg-urgent/90"
                    : "bg-paper text-ink hover:bg-paper-sunken"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-paper-raised border border-rule rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-paper-sunken text-muted text-[12px] font-medium border-b border-rule font-body">
              <tr>
                {bulkActions.length > 0 && (
                  <th className="p-3 w-10 sticky left-0 bg-paper-sunken z-10 border-r border-rule">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-rule text-ink focus:ring-0"
                    />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`p-3 ${col.isNumeric ? "text-right" : "text-left"} ${
                      col.sortable !== false ? "cursor-pointer hover:text-ink transition-colors select-none" : ""
                    } ${idx === 0 && bulkActions.length === 0 ? "sticky left-0 bg-paper-sunken z-10 border-r border-rule" : ""}`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${col.isNumeric ? "justify-end" : ""}`}>
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span className="text-[11px] opacity-60">
                          {sortKey === col.key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-rule font-body">
              {loading ? (
                Array.from({ length: pageSize > 6 ? 6 : pageSize }).map((_, rIdx) => (
                  <tr key={rIdx} className="h-[44px] animate-pulse">
                    {bulkActions.length > 0 && (
                      <td className="p-3 sticky left-0 bg-paper-raised z-10 border-r border-rule">
                        <div className="w-4 h-4 bg-paper-sunken rounded-[2px]" />
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td
                        key={col.key || cIdx}
                        className={`p-3 ${cIdx === 0 && bulkActions.length === 0 ? "sticky left-0 bg-paper-raised z-10 border-r border-rule" : ""}`}
                      >
                        <div
                          className={`h-4 bg-paper-sunken rounded-[3px] ${
                            col.isNumeric ? "ml-auto w-12" : cIdx === 0 ? "w-44" : cIdx === 1 ? "w-28" : "w-20"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row, rIdx) => (
                  <tr key={row.id ? `${row.id}_${rIdx}` : `row_${rIdx}`} className="hover:bg-paper-sunken/40 transition-colors h-[44px]">
                    {bulkActions.length > 0 && (
                      <td className="p-3 sticky left-0 bg-paper-raised z-10 border-r border-rule">
                        <input
                          type="checkbox"
                          checked={activeSelectedIds.has(row.id)}
                          onChange={() => toggleSelectRow(row.id)}
                          className="rounded border-rule text-ink focus:ring-0"
                        />
                      </td>
                    )}
                    {columns.map((col, idx) => (
                      <td
                        key={col.key}
                        className={`p-3 ${col.isNumeric ? "text-right font-mono tabular-nums" : "text-ink"} ${
                          idx === 0 && bulkActions.length === 0
                            ? "sticky left-0 bg-paper-raised z-10 border-r border-rule font-medium"
                            : ""
                        }`}
                      >
                        {col.render ? col.render(row) : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)} className="p-8 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <h3 className="font-display font-semibold text-[16px] text-ink">{emptyState.title}</h3>
                      <p className="text-[13px] text-muted">{emptyState.description}</p>
                      {emptyState.actionLabel && emptyState.onAction && (
                        <button
                          onClick={emptyState.onAction}
                          className="px-4 py-2 bg-ink text-paper font-medium text-[13px] rounded-[3px] hover:bg-ink/90 transition-colors mt-2"
                        >
                          {emptyState.actionLabel}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedData.length > pageSize && (
          <div className="px-4 py-2.5 bg-paper-sunken border-t border-rule flex items-center justify-between text-[12px] text-muted">
            <div>
              Showing <span className="font-medium text-ink">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium text-ink">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{" "}
              <span className="font-medium text-ink">{sortedData.length}</span> records
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-paper border border-rule rounded text-ink font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-sunken transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-[11px]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-paper border border-rule rounded text-ink font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-sunken transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
