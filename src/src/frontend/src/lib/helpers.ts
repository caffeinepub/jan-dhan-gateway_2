import type { Citizen, SystemStatus, AccountStatus, AadhaarStatus } from "../backend";
import { SystemStatus as SystemStatusEnum } from "../backend";

// ============= Formatting =============

export function formatINR(amount: bigint): string {
  const numStr = amount.toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);
  
  if (otherNumbers !== "") {
    return "₹" + otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }
  return "₹" + lastThree;
}

export function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000); // Convert nanoseconds to milliseconds
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysSinceLastClaim(lastClaim: bigint | undefined): number {
  if (!lastClaim) return Infinity;
  const now = Date.now();
  const lastClaimMs = Number(lastClaim) / 1_000_000;
  const diffMs = now - lastClaimMs;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function parseDOB(dobString: string): bigint {
  // Handle various date formats: DD/MM/YYYY, DD-MM-YYYY, etc.
  const parts = dobString.split(/[-/]/);
  if (parts.length !== 3) throw new Error("Invalid date format");
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  return BigInt(date.getTime() * 1_000_000); // Convert to nanoseconds
}

// ============= Validation =============

export function isValidCitizenId(id: string): boolean {
  return /^\d{12}$/.test(id);
}

export function canClaim(citizen: Citizen): { eligible: boolean; reason?: string } {
  if (citizen.accountStatus !== "active") {
    return { eligible: false, reason: "Account status is not Active" };
  }
  
  if (citizen.aadhaarStatus !== "linked") {
    return { eligible: false, reason: "Aadhaar is not linked" };
  }
  
  if (citizen.claims >= 3n) {
    return { eligible: false, reason: `Maximum claims (3) reached. Current: ${citizen.claims}` };
  }
  
  const days = daysSinceLastClaim(citizen.lastClaim);
  if (days < 30) {
    return { eligible: false, reason: `Minimum 30 days required. Days since last claim: ${days}` };
  }
  
  return { eligible: true };
}

// ============= Status Helpers =============

export function getSystemStatusColor(status: SystemStatus): string {
  switch (status) {
    case SystemStatusEnum.active:
      return "success";
    case SystemStatusEnum.paused:
      return "warning";
    case SystemStatusEnum.frozen:
      return "destructive";
    default:
      return "muted";
  }
}

export function getSystemStatusLabel(status: SystemStatus): string {
  const statusStr = status.toString();
  return statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
}

export function getAccountStatusColor(status: AccountStatus): "success" | "muted" {
  return status === "active" ? "success" : "muted";
}

export function getAadhaarStatusColor(status: AadhaarStatus): "success" | "warning" {
  return status === "linked" ? "success" : "warning";
}

// ============= Budget Calculation =============

export function calculateBudgetPercentage(remaining: bigint, total: bigint): number {
  if (total === 0n) return 0;
  return Number((remaining * 100n) / total);
}

export const DEFAULT_BUDGET = 10_00_000n; // ₹10,00,000
