// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Re-encrypt network credentials stored as plaintext
//
// Earlier versions wrote affiliate API tokens into
// Network.apiCredentialsEncrypted as plain JSON. This one-time script
// finds those rows and re-encrypts them with AES-256-GCM. Safe to run
// repeatedly — already-encrypted rows are skipped.
//
// Usage:  node --env-file=.env --import tsx scripts/reencrypt-network-credentials.ts
// ═══════════════════════════════════════════════════════════════════

import { db } from "../src/lib/db";
import { encryptSecret } from "../src/lib/security/crypto";

async function main() {
  const networks = await db.network.findMany({
    select: { id: true, slug: true, apiCredentialsEncrypted: true },
  });

  let converted = 0;
  for (const net of networks) {
    const value = net.apiCredentialsEncrypted?.trim();
    if (!value) continue;

    // Encrypted values are "iv:authTag:ciphertext"; plaintext is raw JSON.
    if (!value.startsWith("{") && !value.startsWith("[")) {
      console.log(`  ${net.slug}: already encrypted, skipping`);
      continue;
    }

    try {
      JSON.parse(value);
    } catch {
      console.log(`  ${net.slug}: unrecognised value, leaving untouched`);
      continue;
    }

    await db.network.update({
      where: { id: net.id },
      data: { apiCredentialsEncrypted: encryptSecret(value) },
    });
    console.log(`  ${net.slug}: re-encrypted`);
    converted += 1;
  }

  console.log(`\n✓ Done. ${converted} network credential record(s) re-encrypted.`);
}

main()
  .catch((e) => {
    console.error("Re-encryption failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
