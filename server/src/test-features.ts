/**
 * Integration test — runs against mongodb-memory-server.
 * Usage:  npx ts-node-dev src/test-features.ts
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";
import http from "http";
import cors from "cors";
import { initSocket } from "./config/socket";
import authRoutes from "./routes/auth.routes";
import emergencyRoutes from "./routes/emergency.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import trackingRoutes from "./routes/tracking.routes";
import { errorHandler } from "./middleware/error.middleware";
import User from "./models/User";
import Vehicle from "./models/Vehicle";

const PORT = 5111; // use a different port so it doesn't clash
const BASE = `http://localhost:${PORT}/api`;

/* ── helpers ── */
let passed = 0;
let failed = 0;

function ok(label: string) {
  passed++;
  console.log(`  ✅  ${label}`);
}
function fail(label: string, detail?: string) {
  failed++;
  console.error(`  ❌  ${label}${detail ? " — " + detail : ""}`);
}

async function api(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/* ── main ── */
async function main() {
  /* 1. Start in-memory Mongo + Express */
  console.log("\n🔧  Starting in-memory MongoDB...");
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log("   MongoDB ready at", mongod.getUri());

  const app = express();
  const server = http.createServer(app);
  app.use(cors());
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/emergency", emergencyRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/tracking", trackingRoutes);
  app.use(errorHandler);
  initSocket(server);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`   Server listening on port ${PORT}\n`);

  /* ═══════════════════════════════════════════════
     FEATURE 1 — Authentication
     ═══════════════════════════════════════════════ */
  console.log("━━━  FEATURE 1: Authentication  ━━━");

  // 1a. Register
  const reg = await api("POST", "/auth/register", {
    name: "Test User",
    email: "test@golden.hr",
    password: "Password123!",
    role: "user",
    phone: "9876543210",
  });
  if (reg.status === 201 && reg.json.token) ok("Register — 201 + token returned");
  else fail("Register", `status=${reg.status} body=${JSON.stringify(reg.json)}`);

  // 1b. Duplicate register
  const dup = await api("POST", "/auth/register", {
    name: "Dup",
    email: "test@golden.hr",
    password: "Password123!",
    role: "user",
  });
  if (dup.status === 400) ok("Duplicate register rejected — 400");
  else fail("Duplicate register", `status=${dup.status}`);

  // 1c. Login
  const login = await api("POST", "/auth/login", {
    email: "test@golden.hr",
    password: "Password123!",
  });
  const userToken = login.json.token as string;
  if (login.status === 200 && userToken) ok("Login — 200 + token returned");
  else fail("Login", `status=${login.status} body=${JSON.stringify(login.json)}`);

  // 1d. Wrong password
  const bad = await api("POST", "/auth/login", {
    email: "test@golden.hr",
    password: "wrong",
  });
  if (bad.status === 401) ok("Wrong password — 401");
  else fail("Wrong password", `status=${bad.status}`);

  // 1e. Profile (authenticated)
  const prof = await api("GET", "/users/profile", undefined, userToken);
  if (prof.status === 200 && prof.json.user?.email === "test@golden.hr")
    ok("GET /profile — returns user data");
  else fail("GET /profile", `status=${prof.status} body=${JSON.stringify(prof.json)}`);

  // 1f. Profile without token
  const noAuth = await api("GET", "/users/profile");
  if (noAuth.status === 401) ok("GET /profile without token — 401");
  else fail("GET /profile without token", `status=${noAuth.status}`);

  /* ═══════════════════════════════════════════════
     FEATURE 2 — Emergency Workflow + Tracking + Admin
     ═══════════════════════════════════════════════ */
  console.log("\n━━━  FEATURE 2: Emergency Workflow  ━━━");

  // Create a test vehicle for tracking
  // Need the user's _id for driverId
  const dbUser = await User.findOne({ email: "test@golden.hr" });
  const testVehicle = await Vehicle.create({
    type: "ambulance",
    plateNumber: "MH-12-AB-1234",
    driverId: dbUser!._id,
    status: "available",
    location: { lat: 18.5204, lng: 73.8567 },
  });
  const vehicleId = testVehicle._id.toString();

  // 2a. Create emergency
  const em = await api(
    "POST",
    "/emergency",
    {
      origin: { lat: 18.5204, lng: 73.8567 },
      destination: { lat: 18.5314, lng: 73.8446 },
      vehicleId,
    },
    userToken
  );
  const sessionId = em.json._id || em.json.session?._id;
  if (em.status === 201 && sessionId) ok(`Create emergency — 201 (id=${sessionId?.slice(-8)})`);
  else fail("Create emergency", `status=${em.status} body=${JSON.stringify(em.json)}`);

  // 2b. Get active emergencies
  const active = await api("GET", "/emergency/active", undefined, userToken);
  if (active.status === 200 && Array.isArray(active.json))
    ok(`GET /emergency/active — ${active.json.length} session(s)`);
  else fail("GET /emergency/active", `status=${active.status}`);

  // 2c. Get single emergency
  if (sessionId) {
    const single = await api("GET", `/emergency/${sessionId}`, undefined, userToken);
    if (single.status === 200) ok("GET /emergency/:id — 200");
    else fail("GET /emergency/:id", `status=${single.status}`);
  }

  // 2d. Update location (tracking)
  const loc = await api(
    "POST",
    "/tracking/location",
    { vehicleId, lat: 18.522, lng: 73.855 },
    userToken
  );
  if (loc.status === 200) ok("POST /tracking/location — 200");
  else fail("POST /tracking/location", `status=${loc.status} body=${JSON.stringify(loc.json)}`);

  // 2e. Get tracking info
  if (sessionId) {
    const tinfo = await api("GET", `/tracking/session/${sessionId}`, undefined, userToken);
    if (tinfo.status === 200) ok("GET /tracking/session/:id — 200");
    else fail("GET /tracking/session/:id", `status=${tinfo.status}`);
  }

  // 2f. Resolve emergency
  if (sessionId) {
    const res = await api("PATCH", `/emergency/${sessionId}/resolve`, {}, userToken);
    if (res.status === 200) ok("PATCH /emergency/:id/resolve — 200");
    else fail("PATCH resolve", `status=${res.status} body=${JSON.stringify(res.json)}`);
  }

  // 2g. Verify resolved
  if (sessionId) {
    const after = await api("GET", `/emergency/${sessionId}`, undefined, userToken);
    const afterStatus = after.json.session?.status || after.json.status;
    if (after.status === 200 && afterStatus === "resolved")
      ok("Session status is 'resolved'");
    else fail("Session resolve check", `status=${afterStatus}, http=${after.status}`);
  }

  /* ─── Admin endpoints ─── */
  console.log("\n━━━  FEATURE 2: Admin Endpoints  ━━━");

  // Create an admin user
  const adminUser = new User({
    name: "Admin",
    email: "admin@golden.hr",
    password: "Admin123!",
    role: "admin",
    phone: "9999999999",
  });
  await adminUser.save();

  const adminLogin = await api("POST", "/auth/login", {
    email: "admin@golden.hr",
    password: "Admin123!",
  });
  const adminToken = adminLogin.json.token as string;
  if (adminLogin.status === 200 && adminToken) ok("Admin login — 200");
  else fail("Admin login", `status=${adminLogin.status}`);

  // 2h. Admin dashboard
  const dash = await api("GET", "/admin/dashboard", undefined, adminToken);
  if (dash.status === 200 && typeof dash.json.totalUsers === "number")
    ok(`GET /admin/dashboard — totalUsers=${dash.json.totalUsers}, active=${dash.json.activeEmergencies}`);
  else fail("GET /admin/dashboard", `status=${dash.status} body=${JSON.stringify(dash.json)}`);

  // 2i. Admin users
  const aus = await api("GET", "/admin/users", undefined, adminToken);
  if (aus.status === 200 && Array.isArray(aus.json))
    ok(`GET /admin/users — ${aus.json.length} user(s)`);
  else fail("GET /admin/users", `status=${aus.status}`);

  // 2j. Admin sessions
  const ases = await api("GET", "/admin/sessions", undefined, adminToken);
  if (ases.status === 200 && Array.isArray(ases.json))
    ok(`GET /admin/sessions — ${ases.json.length} session(s)`);
  else fail("GET /admin/sessions", `status=${ases.status}`);

  // 2k. Admin sessions filtered
  const afilt = await api("GET", "/admin/sessions?status=resolved", undefined, adminToken);
  if (afilt.status === 200) ok("GET /admin/sessions?status=resolved — 200");
  else fail("Admin sessions filter", `status=${afilt.status}`);

  // 2l. Non-admin cannot access admin routes
  const noAdmin = await api("GET", "/admin/dashboard", undefined, userToken);
  if (noAdmin.status === 403) ok("Regular user blocked from admin — 403");
  else fail("Admin role check", `status=${noAdmin.status}`);

  /* ═══════════════════════════════════════════════
     SUMMARY
     ═══════════════════════════════════════════════ */
  console.log("\n" + "═".repeat(50));
  console.log(`  RESULTS:  ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log("═".repeat(50) + "\n");

  /* cleanup */
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
