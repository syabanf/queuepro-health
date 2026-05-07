/**
 * QR token and URL utilities for queue verification.
 */

/**
 * Generate a cryptographically secure random token.
 * Format: 32-char hex string, not predictable.
 */
export function generateQrToken() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build the QR code image URL for a given token.
 * Encodes a verification payload as a URL-safe string.
 * Uses qrserver.com free API (no external lib needed).
 */
export function buildQrCodeUrl(qrToken, size = 120) {
  // The QR data is the token — the booth operator's scanner resolves it against the DB.
  const data = encodeURIComponent(`QUEUE:${qrToken}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}&margin=4`;
}

/**
 * Parse the raw QR scan result string.
 * Returns the token if format is valid, null otherwise.
 */
export function parseQrScan(rawValue) {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  // Support both "QUEUE:<token>" format and raw token
  if (trimmed.startsWith("QUEUE:")) {
    return trimmed.slice(6).trim() || null;
  }
  // Accept 32-char hex token directly
  if (/^[0-9a-f]{32}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return null;
}