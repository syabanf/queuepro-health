import { base44 } from "@/api/base44Client";

export const SERVICE_CODE_MAP = {
  "MCU": "A",
  "Vitamin C Injection": "B",
  "Vaccine Influenza": "C",
  "Eye Check Airdoc": "D",
  "Eye Check Autoref": "E",
};

export function getServicePrefix(serviceName) {
  return SERVICE_CODE_MAP[serviceName] || "X";
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

export const PAYMENT_STATUS_LABELS = {
  VERIFIED_OUTSIDE_SYSTEM: "Terverifikasi (Luar Sistem)",
  PENDING_MANUAL_CONFIRMATION: "Menunggu Konfirmasi Manual",
  NOT_REQUIRED: "Tidak Diperlukan",
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

export const SLOT_TYPE_COLORS = {
  FREE: "bg-green-100 text-green-700 border-green-200",
  PAID: "bg-orange-100 text-orange-700 border-orange-200",
};