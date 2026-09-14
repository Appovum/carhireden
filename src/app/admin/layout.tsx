// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Layout Shell
// Persistent collapsible sidebar layout matching public design tokens.
// ═══════════════════════════════════════════════════════════════════

import React from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireAdminSession } from "@/lib/auth/requireAuth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession("/admin");

  return (
    <div className="min-h-screen bg-paper text-ink font-body flex">
      {/* Persistent Collapsible Sidebar */}
      <AdminSidebar />

      {/* Main Content Body */}
      <div className="flex-1 ml-60 transition-all duration-200 min-w-0 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}
