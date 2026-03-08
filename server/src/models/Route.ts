import mongoose, { Schema, Document } from "mongoose";

export interface IRoute extends Document {
  sessionId: mongoose.Types.ObjectId;
  path: { lat: number; lng: number }[];
  estimatedTime: number;
  distance: number;
}

const RouteSchema = new Schema<IRoute>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "EmergencySession", required: true },
    path: [{ lat: Number, lng: Number }],
    estimatedTime: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IRoute>("Route", RouteSchema);
