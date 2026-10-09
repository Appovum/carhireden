// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Application secret
//
// The one place the app reads its master secret. Everything that encrypts
// data or signs a token (encryption at rest, password reset links) goes
// through here, so a missing secret fails the same way everywhere.
//
// There is deliberately NO default value. A built-in fallback would be public
// (this code ships to every buyer) and would silently replace your secret on
// a misconfigured install, letting anyone who reads the code sign tokens.
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns the configured secret, or throws when none is set.
 * APP_SECRET is the supported name; NEXTAUTH_SECRET and JWT_SECRET are
 * accepted for installs that already use one of them.
 */
export function getAppSecret(): string {
  const secret = process.env.APP_SECRET || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "[SECURITY CRITICAL] APP_SECRET environment variable is not configured. " +
        "Set it in .env (generate one with: openssl rand -hex 32) and restart the app."
    );
  }
  return secret;
}
