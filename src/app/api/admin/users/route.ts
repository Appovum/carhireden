// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Admin Users & Ledger API Route (Full CRUD)
// Route: GET/POST/PUT/DELETE /api/admin/users
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/session";

export async function GET() {
  try {
    const users = await db.user.findMany({
      include: {
        walletEntries: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedUsers = users.map((u) => {
      let pendingMinor = 0;
      let confirmedMinor = 0;
      let paidMinor = 0;

      for (const entry of u.walletEntries) {
        if (entry.bucket === "pending") pendingMinor += entry.amountMinor;
        if (entry.bucket === "confirmed") confirmedMinor += entry.amountMinor;
        if (entry.bucket === "paid") paidMinor += entry.amountMinor;
      }

      return {
        id: u.id,
        email: u.email,
        name: u.name || "Shopper User",
        role: u.role,
        referralCode: u.referralCode,
        pendingMinor,
        confirmedMinor,
        paidMinor,
        createdAt: u.createdAt.toISOString().slice(0, 10),
      };
    });

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, amountMinor, bucket = "confirmed", description, email, password, name, role = "user" } = body;

    // Handle Manual Ledger Adjustment
    if (action === "adjust" || (userId && amountMinor && description)) {
      if (!userId || amountMinor === undefined || !description) {
        return NextResponse.json({ success: false, error: "userId, amountMinor, and description are required for adjustment" }, { status: 400 });
      }

      const entry = await db.walletEntry.create({
        data: {
          userId,
          type: "adjustment",
          bucket: bucket as any,
          amountMinor: parseInt(amountMinor, 10),
          currency: "USD",
          description,
        },
      });

      await db.auditLog.create({
        data: {
          userId,
          action: "admin_manual_ledger_adjustment",
          resource: "user",
          resourceId: userId,
          detailsJson: JSON.stringify({ amountMinor, bucket, description }),
        },
      });

      return NextResponse.json({ success: true, entry });
    }

    // Handle Create New User
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required to create a user." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ success: false, error: "An account with this email already exists." }, { status: 400 });
    }

    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || null,
        passwordHash: hashPassword(password),
        role: role || "user",
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Users POST error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process request" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ids, action, email, name, role, password } = body;

    // Bulk actions
    if (Array.isArray(ids) && action) {
      if (action === "delete") {
        await db.user.deleteMany({ where: { id: { in: ids } } });
      } else if (action === "make_admin") {
        await db.user.updateMany({ where: { id: { in: ids } }, data: { role: "admin" } });
      } else if (action === "make_user") {
        await db.user.updateMany({ where: { id: { in: ids } }, data: { role: "user" } });
      }
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (email) dataToUpdate.email = email.toLowerCase().trim();
    if (name !== undefined) dataToUpdate.name = name;
    if (role) dataToUpdate.role = role;
    if (password) dataToUpdate.passwordHash = hashPassword(password);

    const updatedUser = await db.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Users PUT error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to delete user" }, { status: 500 });
  }
}
