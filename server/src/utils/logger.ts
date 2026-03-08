export function log(level: "info" | "warn" | "error", message: string) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}
