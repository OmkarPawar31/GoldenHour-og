"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const env_1 = require("../config/env");
async function register(req, res) {
    try {
        const { name, email, password, role, phone } = req.body;
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }
        const allowedRoles = ["admin", "driver", "user", "hospital"];
        const userRole = allowedRoles.includes(role) ? role : "user";
        const user = await User_1.default.create({
            name,
            email,
            password,
            role: userRole,
            phone,
        });
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, env_1.env.JWT_SECRET, { expiresIn: "7d" });
        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Registration failed" });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, env_1.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Login failed" });
    }
}
