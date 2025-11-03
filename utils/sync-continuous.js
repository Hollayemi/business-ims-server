const { MongoClient } = require("mongodb");

const localUri = "mongodb://127.0.0.1:27017";
const serverUri = "mongodb+srv://stephanyemmitty:_Holla83626@cluster0.pb3wcml.mongodb.net";
const dbName = "business-ims";

async function pollSync() {
    const localClient = new MongoClient(localUri);
    const serverClient = new MongoClient(serverUri);

    await localClient.connect();
    await serverClient.connect();

    const localDb = localClient.db(dbName);
    const serverDb = serverClient.db(dbName);

    console.log("🔄 Polling for changes every 10s...");

    setInterval(async () => {
        const collections = await localDb.listCollections().toArray();

        for (const coll of collections) {
            const name = coll.name;
            const localData = await localDb.collection(name).find().toArray();

            if (localData.length > 0) {
                await serverDb.collection(name).deleteMany({});
                await serverDb.collection(name).insertMany(localData);
                console.log(`✅ Synced ${name}`);
            }
        }
    }, 10000);
}

// pollSync().catch(console.error);
module.exports = { pollSync }