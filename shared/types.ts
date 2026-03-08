// Shared types used by both client and server

export interface Coordinates {
  lat: number;
  lng: number;
}

export type UserRole = "admin" | "driver" | "user";
export type VehicleStatus = "available" | "en-route" | "busy" | "offline";
export type SessionStatus = "pending" | "active" | "resolved" | "cancelled";
export type PriorityLevel = "critical" | "high" | "medium" | "low";
