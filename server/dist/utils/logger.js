"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
function log(level, message) {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}
