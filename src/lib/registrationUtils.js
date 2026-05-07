import { base44 } from "@/api/base44Client";

// ─── Service Code Prefix Map ───────────────────────────────────────────────
export const SERVICE_CODE_MAP = {
  "Mini MCU": "A",
  "Vitamin C Injection": "B",
  "Vaccine Influenza": "C",
  "Eye Check Airdoc": "D",
  "Eye Check Autoref": "E",
};

export function getServicePrefix(service) {
  // Accept service object or name string
  if (typeof service === "object") return service.service_code || "X";
  return SERVICE_CODE_MAP[service] || "X";
}

export function formatQueueNumber(prefix, sequence) {
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

export async function getNextQueueSequence(serviceId) {
  const existingQueues = await base44.entities.Queue.filter({ service_id: serviceId });
  if (!existingQueues || existingQueues.length === 0) return 1;
  const maxSeq = Math.max(...existingQueues.map(q => q.queue_sequence || 0));
  return maxSeq + 1;
}

export function generateRegistrationNumber(sequence) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `REG${dateStr}${String(sequence).padStart(4, "0")}`;
}

// ─── Quota Category Logic ──────────────────────────────────────────────────
/**
 * Determine quota category for a given service and sequence number.
 * @param {object} service - Service record with quota fields
 * @param {number} sequence - The queue sequence (1-based)
 * @returns {{ category: string, displayStatus: string } | null} null if quota is full
 */
export function determineQuotaCategory(service, sequence) {
  if (service.is_unlimited) {
    return { category: "FULL_FREE", displayStatus: "FREE" };
  }

  const fullFree = service.full_free_quota || 0;
  const ccRp1 = service.cc_rp1_quota || 0;
  const fullPaid = service.full_paid_quota || 0;

  if (sequence <= fullFree) {
    return { category: "FULL_FREE", displayStatus: "FREE" };
  } else if (sequence <= fullFree + ccRp1) {
    return { category: "CC_RP_1", displayStatus: "PAID" };
  } else if (sequence <= fullFree + ccRp1 + fullPaid) {
    return { category: "FULL_PAID", displayStatus: "PAID" };
  }
  return null; // quota full
}

/**
 * Check if a service is full (no more slots available)
 */
export function isServiceFull(service) {
  if (service.is_unlimited) return false;
  const total = (service.full_free_quota || 0) + (service.cc_rp1_quota || 0) + (service.full_paid_quota || 0);
  if (total === 0) return false;
  return (service.used_total || 0) >= total;
}

/**
 * Get remaining quota breakdown for a service
 */
export function getServiceRemainingQuota(service) {
  if (service.is_unlimited) {
    return { full_free: Infinity, cc_rp1: 0, full_paid: 0, total: Infinity };
  }
  const usedTotal = service.used_total || 0;
  const fullFree = service.full_free_quota || 0;
  const ccRp1 = service.cc_rp1_quota || 0;
  const fullPaid = service.full_paid_quota || 0;

  const usedFF = service.used_full_free || 0;
  const usedCC = service.used_cc_rp1 || 0;
  const usedFP = service.used_full_paid || 0;

  return {
    full_free: Math.max(0, fullFree - usedFF),
    cc_rp1: Math.max(0, ccRp1 - usedCC),
    full_paid: Math.max(0, fullPaid - usedFP),
    total: Math.max(0, fullFree + ccRp1 + fullPaid - usedTotal),
  };
}

// ─── Display Labels ────────────────────────────────────────────────────────
export const QUOTA_CATEGORY_LABELS = {
  FULL_FREE: "Tanpa Syarat",
  CC_RP_1: "Dengan CC Rp 1",
  FULL_PAID: "Berbayar Penuh",
};

export const QUOTA_CATEGORY_FULL_LABELS = {
  FULL_FREE: "Free - Tanpa Syarat",
  CC_RP_1: "Paid - CC Rp 1",
  FULL_PAID: "Paid - Berbayar Penuh",
};

export const QUOTA_CATEGORY_COLORS = {
  FULL_FREE: "bg-green-100 text-green-700 border-green-200",
  CC_RP_1: "bg-blue-100 text-blue-700 border-blue-200",
  FULL_PAID: "bg-orange-100 text-orange-700 border-orange-200",
};

export const PAYMENT_DISPLAY_COLORS = {
  FREE: "bg-green-100 text-green-700 border-green-200",
  PAID: "bg-orange-100 text-orange-700 border-orange-200",
};

export const PARTICIPANT_STATUS_LABELS = {
  REGISTERED: "Terdaftar",
  PARTIALLY_COMPLETED: "Sebagian Selesai",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const PARTICIPANT_STATUS_COLORS = {
  REGISTERED: "bg-blue-100 text-blue-700",
  PARTIALLY_COMPLETED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

// Legacy compat
export const SLOT_TYPE_COLORS = {
  FREE: "bg-green-100 text-green-700 border-green-200",
  PAID: "bg-orange-100 text-orange-700 border-orange-200",
};

export const PAYMENT_STATUS_LABELS = {
  VERIFIED_OUTSIDE_SYSTEM: "Terverifikasi (Luar Sistem)",
  PENDING_MANUAL_CONFIRMATION: "Menunggu Konfirmasi Manual",
  NOT_REQUIRED: "Tidak Diperlukan",
};

export const PARTICIPANT_CATEGORY_LABELS = {
  FREE_CHECK: "FREE CHECK",
  PAYMENT: "PAYMENT",
};

export const PARTICIPANT_CATEGORY_COLORS = {
  FREE_CHECK: "bg-green-100 text-green-700 border-green-200",
  PAYMENT: "bg-orange-100 text-orange-700 border-orange-200",
};