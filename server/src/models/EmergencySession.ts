import mongoose, { Schema, Document } from "mongoose";

export interface IEmergencySession extends Document {
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId | null;
  status: "pending" | "active" | "resolved" | "cancelled";
  priority: "critical" | "high" | "medium" | "low";
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number } | null;
  resolvedAt: Date | null;
  callerPhone?: string;
  callerName?: string;
  callDetails?: string;
  callReceivedAt?: Date;
  source?: "app" | "102-call" | "hospital";
}

const EmergencySessionSchema = new Schema<IEmergencySession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", default: null },
    status: { type: String, enum: ["pending", "active", "resolved", "cancelled"], default: "pending" },
    priority: { type: String, enum: ["critical", "high", "medium", "low"], default: "medium" },
    origin: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    destination: {
      lat: { type: Number },
      lng: { type: Number },
    },
    resolvedAt: { type: Date, default: null },
    callerPhone: { type: String },
    callerName: { type: String },
    callDetails: { type: String },
    callReceivedAt: { type: Date },
    source: { type: String, enum: ["app", "102-call", "hospital"], default: "app" },
  },
  { timestamps: true }
);

export default mongoose.model<IEmergencySession>("EmergencySession", EmergencySessionSchema);
