import mongoose from "mongoose";
import { env } from "../config/env";
import User from "../models/User";
import Vehicle from "../models/Vehicle";
import EmergencySession from "../models/EmergencySession";

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

async function seed() {
  await connectDB();

  try {
    // Create or find a hospital driver
    let driver1 = await User.findOne({ email: "driver1@example.com" });
    if (!driver1) {
      driver1 = await User.create({
        name: "Ramesh Kumar",
        email: "driver1@example.com",
        password: "password123",
        role: "driver",
        phone: "+91 9876543210"
      });
    }

    let driver2 = await User.findOne({ email: "driver2@example.com" });
    if (!driver2) {
      driver2 = await User.create({
        name: "Suresh Singh",
        email: "driver2@example.com",
        password: "password123",
        role: "driver",
        phone: "+91 9876543211"
      });
    }

    // Create dummy vehicles
    await Vehicle.deleteMany({ plateNumber: { $in: ["MH12-AB-1234", "MH14-CD-5678"] } });

    const amb1 = await Vehicle.create({
      type: "ambulance",
      plateNumber: "MH12-AB-1234",
      driverId: driver1._id,
      status: "available",
      location: { lat: 18.5204, lng: 73.8567 } // Pune center
    });

    const amb2 = await Vehicle.create({
      type: "ambulance",
      plateNumber: "MH14-CD-5678",
      driverId: driver2._id,
      status: "en-route",
      location: { lat: 18.5300, lng: 73.8400 } // Near hospital
    });

    // Create an active session for amb2 to simulate the "Emergency" toggle
    let dummyUser = await User.findOne({ email: "patient@example.com" });
    if (!dummyUser) {
      dummyUser = await User.create({
        name: "Amit Patel",
        email: "patient@example.com",
        password: "password123",
        role: "user",
        phone: "+91 9999900000"
      });
    }

    // Clear old test sessions
    await EmergencySession.deleteMany({ userId: dummyUser._id });

    await EmergencySession.create({
      userId: dummyUser._id,
      vehicleId: amb2._id,
      status: "active",
      priority: "critical",
      origin: { lat: 18.5300, lng: 73.8400 },
      destination: { lat: 18.5314, lng: 73.8446 },
    });

    console.log("✅ Dummy ambulances and an active emergency session seeded successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    process.exit();
  }
}

seed();
