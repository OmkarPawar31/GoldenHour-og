export interface EmergencySession {
  id: string;
  userId: string;
  vehicleId: string | null;
  status: "pending" | "active" | "resolved" | "cancelled";
  priority: "critical" | "high" | "medium" | "low";
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number } | null;
  createdAt: Date;
  resolvedAt: Date | null;
}
