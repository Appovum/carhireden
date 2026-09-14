// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin System Audit Log Manager
// Route: /admin/audit-log
// Real dynamic database fetching from Prisma via /api/admin/audit-log.
// ═══════════════════════════════════════════════════════════════════

"use client";

import React, { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminTable, ColumnDef } from "@/components/admin/AdminTable";

interface AuditLogRow {
  id: string;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  detailsJson: string;
  createdAt: string;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewLog, setViewLog] = useState<AuditLogRow | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit-log");
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to load audit logs from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns: ColumnDef<AuditLogRow>[] = [
    { key: "actorEmail", header: "Actor", sortable: true },
    { key: "action", header: "Action", sortable: true },
    { key: "resource", header: "Resource", sortable: true },
    { key: "createdAt", header: "Timestamp", sortable: true },
    {
      key: "actions",
      header: "Details",
      sortable: false,
      render: (r) => (
        <button
          onClick={() => setViewLog(r)}
          className="px-2 py-1 bg-paper-sunken border border-rule text-ink text-[11px] font-mono rounded hover:bg-paper-raised transition-colors"
        >
          View JSON diff
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Audit log"
        breadcrumbs={[{ label: "System", href: "/admin/settings" }, { label: "Audit log" }]}
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full font-body text-ink">
        <AdminTable
          columns={columns}
          data={logs}
          loading={loading}
          searchPlaceholder="Search audit trail by actor or action..."
          searchField={(r) => `${r.actorEmail} ${r.action} ${r.resource}`}
          exportFilename="audit_log_export.csv"
          pageSize={10}
        />

        {/* JSON Diff Viewer Modal */}
        {viewLog && (
          <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-paper-raised border border-rule rounded-[4px] p-6 max-w-lg w-full space-y-4 font-body">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <h3 className="font-display font-semibold text-[16px]">Audit payload details</h3>
                <button onClick={() => setViewLog(null)} className="text-muted hover:text-ink">
                  ✕
                </button>
              </div>

              <div className="p-3 bg-paper-sunken border border-rule font-code text-[12px] text-ink rounded overflow-x-auto">
                <pre>{JSON.stringify(JSON.parse(viewLog.detailsJson || "{}"), null, 2)}</pre>
              </div>

              <button
                onClick={() => setViewLog(null)}
                className="w-full py-2 bg-ink text-paper font-medium text-[13px] rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
