require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const audioDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}
// Serve generated audio files
app.use('/audio', express.static(audioDir));

// Serve the frontend files starting from the parent directory
app.use('/', express.static(path.join(__dirname, '..')));

// Generate TTS Alert via ElevenLabs
app.post('/api/generate-alert', async (req, res) => {
    try {
        const { text } = req.body;
        // You can change the voice ID
        const voiceId = '21m00Tcm4TlvDq8ikWAM'; 
        
        console.log(`Calling ElevenLabs API for text: "${text}"`);
        
        const response = await axios({
            method: 'post',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            data: {
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    similarity_boost: 0.5,
                    stability: 0.5
                }
            },
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });

        // Save file locally
        const fileName = `alert_${Date.now()}.mp3`;
        const filePath = path.join(audioDir, fileName);
        fs.writeFileSync(filePath, response.data);

        console.log(`Generated audio saved to ${filePath}`);
        res.json({ audio_url: `/audio/${fileName}` });
    } catch (error) {
        console.error('ElevenLabs API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate audio' });
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Vehicle receiver registers its presence
    socket.on('register_vehicle', (data) => {
        socket.join(`vehicle_${data.vehicleId}`);
        console.log(`Vehicle ${data.vehicleId} registered`);
    });

    // Ambulance dashboard sends its location continuously
    socket.on('ambulance_location_update', (data) => {
        // Broadcast ambulance location to all connected vehicle receivers
        socket.broadcast.emit('ambulance_location', data);
    });

    // Dashboard broadcasts the exact locations of the static vehicles
    socket.on('sync_vehicles', (data) => {
        socket.broadcast.emit('vehicle_locations', data);
    });

    // Ambulance sends a targeted alert to a specific vehicle
    socket.on('send_alert', (data) => {
        console.log(`Dispatching alert to vehicle_${data.vehicleId}`);
        io.to(`vehicle_${data.vehicleId}`).emit('receive_alert', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`WebSocket & Web Server running on http://localhost:${PORT}`);
    console.log(`Ambulance Dashboard: http://localhost:${PORT}/ambulance-dashboard/`);
    console.log(`Vehicle Receiver: http://localhost:${PORT}/vehicle-receiver/`);
});
