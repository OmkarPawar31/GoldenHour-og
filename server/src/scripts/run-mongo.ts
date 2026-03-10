import { MongoMemoryServer } from 'mongodb-memory-server';

async function startMongo() {
    const mongoServer = await MongoMemoryServer.create({
        instance: {
            port: 27017,
            dbName: 'goldenhour',
        },
    });

    const uri = mongoServer.getUri();
    console.log(`MongoDB Memory Server started at: ${uri}`);
    console.log(`Port: 27017`);
    console.log(`Database: goldenhour`);

    process.on('SIGINT', async () => {
        await mongoServer.stop();
        process.exit(0);
    });
}

startMongo().catch(err => {
    console.error('Failed to start MongoDB Memory Server:', err);
});
