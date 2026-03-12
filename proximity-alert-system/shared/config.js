const CONFIG = {
    // The server handles both WebSockets and static file serving
    SERVER_URL: 'http://localhost:3001',
    MAPS_API_KEY: 'AIzaSyAWENJNDOZkOGFuYpFMgAn_jK6qDHVMddo',
    
    // Core parameters for Proximity system
    ALERT_DISTANCE_THRESHOLD: 300, // Distance in meters to trigger alert
    ALERT_COOLDOWN: 30000,         // Cooldown in ms: do not re-alert within 30 seconds
};
