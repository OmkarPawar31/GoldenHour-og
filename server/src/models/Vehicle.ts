import mongoose, { Schema, Document } from "mongoose";

export interface IVehicle extends Document {
  type: "ambulance" | "private";
  plateNumber: string;
  driverId: mongoose.Types.ObjectId;
  status: "available" | "en-route" | "busy" | "offline";
  location: { lat: number; lng: number };
}

const VehicleSchema = new Schema<IVehicle>(
  {
    type: { type: String, enum: ["ambulance", "private"], required: true },
    plateNumber: { type: String, required: true, unique: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["available", "en-route", "busy", "offline"], default: "offline" },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IVehicle>("Vehicle", VehicleSchema);
