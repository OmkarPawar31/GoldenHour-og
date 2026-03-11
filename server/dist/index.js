"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const socket_1 = require("./config/socket");
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const emergency_routes_1 = __importDefault(require("./routes/emergency.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const tracking_routes_1 = __importDefault(require("./routes/tracking.routes"));
const hospital_routes_1 = __importDefault(require("./routes/hospital.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/emergency", emergency_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/tracking", tracking_routes_1.default);
app.use("/api/hospital", hospital_routes_1.default);
// Error handler
app.use(error_middleware_1.errorHandler);
async function start() {
    await (0, db_1.connectDB)();
    (0, socket_1.initSocket)(server);
    server.listen(env_1.env.PORT, () => {
        console.log(`Server running on port ${env_1.env.PORT}`);
    });
}
start();
