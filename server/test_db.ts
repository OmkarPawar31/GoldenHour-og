import mongoose from 'mongoose';
import Vehicle from './src/models/Vehicle';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://goldenhour:p96WIDibq86JsNzA@goldenhour.np5fnid.mongodb.net/goldenhour?appName=goldenhour').then(async () => {
    try {
        const d = Date.now().toString();
        let driver = await User.create({
            name: 'Test Driver',
            email: 'testdriver' + d + '@hospital.com',
            password: 'password123',
            role: 'driver',
            phone: '1234567890'
        });
        console.log('Driver created:', driver._id);
        let amb = await Vehicle.create({
            type: 'ambulance',
            plateNumber: 'TEST-' + d,
            driverId: driver._id,
            status: 'available',
            location: { lat: 18.5314, lng: 73.8446 },
        });
        console.log('Ambulance created:', amb._id);
    } catch (e) {
        console.error('Validation error:', e);
    }
    process.exit();
}).catch(console.error);
