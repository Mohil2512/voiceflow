// MongoDB connection test script
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    return;
  }

  console.log('Testing MongoDB connection...');
  console.log(`Connection string (partially masked): ${process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  const options = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    ssl: true,
    tlsAllowInvalidCertificates: true, // For testing only
    useUnifiedTopology: true
  };

  const client = new MongoClient(process.env.MONGODB_URI, options);

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB Atlas!');
    
    // Test the database ping
    const adminDb = client.db('admin');
    const pingResult = await adminDb.command({ ping: 1 });
    console.log('Ping successful:', pingResult);

    // List all databases
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => {
      console.log(` - ${db.name}`);
    });
    
  } catch (error) {
    console.error('MongoDB connection failed:');
    console.error(error);
    
    if (error.message.includes('authentication')) {
      console.error('\nPossible authentication error. Check username and password.');
    } else if (error.message.includes('SSL')) {
      console.error('\nPossible SSL/TLS issue. Try different SSL options.');
    } else if (error.message.includes('timed out')) {
      console.error('\nConnection timed out. Check network and firewall settings.');
    }
  } finally {
    await client.close();
    console.log('Test completed.');
  }
}

testConnection();