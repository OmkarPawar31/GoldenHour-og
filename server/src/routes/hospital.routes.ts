import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import Vehicle from "../models/Vehicle";
import User from "../models/User";
import EmergencySession from "../models/EmergencySession";

const router = Router();
router.use(authMiddleware);

// GET /api/hospital/fleet - all ambulances with driver info + active session
router.get("/fleet", async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await Vehicle.find({ type: "ambulance" }).populate<{
      driverId: { _id: string; name: string; phone: string; email: string };
    }>("driverId", "name phone email");

    // Find active sessions to know which vehicles are transporting patients
    const activeSessions = await EmergencySession.find({
      status: "active",
      vehicleId: { $ne: null },
    }).populate("userId", "name phone");

    const sessionByVehicle: Record<string, any> = {};
    activeSessions.forEach((s) => {
      if (s.vehicleId) {
        sessionByVehicle[s.vehicleId.toString()] = s;
      }
    });

    const fleet = vehicles.map((v) => {
      const session = sessionByVehicle[v._id.toString()];
      return {
        id: v._id,
        plateNumber: v.plateNumber,
        status: v.status,
        location: v.location,
        driver: v.driverId
          ? {
              name: (v.driverId as any).name,
              phone: (v.driverId as any).phone,
              email: (v.driverId as any).email,
            }
          : null,
        hasPatient: !!session,
        session: session
          ? {
              id: session._id,
              patientName: session.callerName || (session.userId as any)?.name || "Unknown",
              patientPhone: (session.userId as any)?.phone || "",
              priority: session.priority,
              origin: session.origin,
              destination: session.destination,
            }
          : null,
      };
    });

    res.json({ fleet });
  } catch (error) {
    console.error("Fleet fetch error:", error);
    res.status(500).json({ message: "Failed to fetch fleet" });
  }
});

// POST /api/hospital/fleet - add a new ambulance
router.post("/fleet", async (req: AuthRequest, res: Response) => {
  try {
    const { plateNumber, driverName, driverPhone, driverEmail, driverPassword } = req.body;

    if (!plateNumber || !driverName || !driverPhone || !driverEmail || !driverPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if plate exists
    const existingVehicle = await Vehicle.findOne({ plateNumber });
    if (existingVehicle) {
      return res.status(400).json({ message: "Ambulance with this plate number already exists" });
    }

    // Check if driver email exists
    let driver = await User.findOne({ email: driverEmail });
    if (!driver) {
      driver = await User.create({
        name: driverName,
        email: driverEmail,
        password: driverPassword,
        role: "driver",
        phone: driverPhone,
      });
    }

    const newAmbulance = await Vehicle.create({
      type: "ambulance",
      plateNumber,
      driverId: driver._id,
      status: "available",
      location: { lat: 18.5314, lng: 73.8446 }, // Default hospital location
    });

    res.status(201).json({ message: "Ambulance added successfully", ambulance: newAmbulance });
  } catch (error) {
    console.error("Add ambulance error:", error);
    res.status(500).json({ message: "Failed to add ambulance" });
  }
});

// GET /api/hospital/stats - bed count, active status are stored client-side;
// this returns live session counts
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const [pending, active, resolved] = await Promise.all([
      EmergencySession.countDocuments({ status: "pending" }),
      EmergencySession.countDocuments({ status: "active" }),
      EmergencySession.countDocuments({ status: "resolved" }),
    ]);

    const [total, available, enRoute, busy] = await Promise.all([
      Vehicle.countDocuments({ type: "ambulance" }),
      Vehicle.countDocuments({ type: "ambulance", status: "available" }),
      Vehicle.countDocuments({ type: "ambulance", status: "en-route" }),
      Vehicle.countDocuments({ type: "ambulance", status: "busy" }),
    ]);

    res.json({
      sessions: { pending, active, resolved },
      vehicles: { total, available, enRoute, busy },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// GET /api/hospital/requests - fetch pending and active requests
router.get("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await EmergencySession.find({ status: { $in: ["pending", "active"] } })
      .populate("userId", "name phone")
      .populate("vehicleId", "plateNumber");

    const requests = sessions.map((s: any) => ({
      id: s._id,
      patientName: s.callerName || s.userId?.name || "Unknown Patient",
      priority: s.priority.charAt(0).toUpperCase() + s.priority.slice(1), // Capitalize
      location: `${s.origin.lat.toFixed(4)}, ${s.origin.lng.toFixed(4)}`,
      carNumber: s.vehicleId?.plateNumber || "N/A",
      status: s.status === "pending" ? "Pending" : "Assigned",
      assignedAmbulance: s.vehicleId ? s.vehicleId._id : null
    }));

    res.json({ requests });
  } catch (error) {
    console.error("Requests fetch error:", error);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});

export default router;
