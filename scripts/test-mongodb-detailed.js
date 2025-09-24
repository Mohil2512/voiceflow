// MongoDB connection test script with detailed error reporting
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// Test MongoDB connection
async function testConnection() {
  console.log('=========== MongoDB Connection Test ===========');
  
  // Check for environment variables
  if (!process.env.MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in environment variables');
    console.log('- Check that .env.local file exists with MONGODB_URI');
    console.log('- Ensure the file is in the correct location');
    return;
  }

  // Check if the connection string has placeholder values
  if (process.env.MONGODB_URI.includes('<')) {
    console.error('❌ ERROR: MONGODB_URI contains placeholders (like <password>)');
    console.log('- Replace all placeholders with actual values');
    return;
  }

  // Extract the hostname from URI for DNS testing
  let hostname;
  try {
    const uri = new URL(process.env.MONGODB_URI);
    hostname = uri.hostname;
    console.log(`MongoDB hostname: ${hostname}`);
  } catch (error) {
    console.error('❌ ERROR: Invalid MongoDB URI format:', error.message);
    return;
  }

  console.log('Testing MongoDB connection...');
  const maskedUri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log(`Connection string (masked): ${maskedUri}`);

  // MongoDB client options with better error handling and SSL fixes
  const options = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    maxPoolSize: 10,
    retryWrites: true,
    tls: true, // Using tls instead of ssl
    tlsAllowInvalidCertificates: true, // For debugging purposes
    tlsAllowInvalidHostnames: true // For debugging purposes
    // Removed directConnection as it's not compatible with SRV URIs
  };

  // Connect to MongoDB
  const client = new MongoClient(process.env.MONGODB_URI, options);
  
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Check databases
    const adminDb = client.db('admin');
    const result = await adminDb.command({ ping: 1 });
    console.log(`✅ MongoDB server responded with: ${JSON.stringify(result)}`);
    
    // List all databases for verification
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
    
    // Check our specific databases
    console.log('\nChecking application-specific databases:');
    const voiceflowDbs = ['voiceflow_auth', 'voiceflow_profiles', 'voiceflow_activities'];
    
    for (const dbName of voiceflowDbs) {
      try {
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        console.log(`✅ Database '${dbName}' - found ${collections.length} collections`);
        collections.forEach(coll => {
          console.log(`  - Collection: ${coll.name}`);
        });
      } catch (err) {
        console.error(`❌ Error accessing database '${dbName}':`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // Provide more detailed error information
    if (error.message.includes('timed out')) {
      console.log('\n⚠️ TIMEOUT ERROR: MongoDB server could not be reached.');
      console.log('Possible causes:');
      console.log('1. Network connectivity issues');
      console.log('2. MongoDB Atlas IP whitelist restrictions');
      console.log('3. MongoDB Atlas cluster is paused or down');
      console.log('4. Incorrect connection string');
      
      // Test DNS resolution for the MongoDB server
      console.log('\nTesting DNS resolution for MongoDB server...');
      const dns = require('dns');
      dns.lookup(hostname, (err, address, family) => {
        if (err) {
          console.error(`❌ DNS resolution failed for ${hostname}: ${err.message}`);
          console.log('→ This suggests a network connectivity or DNS issue.');
        } else {
          console.log(`✅ DNS resolved ${hostname} to ${address} (IPv${family})`);
          console.log('→ This suggests the issue is not DNS-related.');
        }
      });
    } else if (error.message.includes('authentication')) {
      console.log('\n⚠️ AUTHENTICATION ERROR: Failed to authenticate with MongoDB.');
      console.log('Possible causes:');
      console.log('1. Incorrect username or password in connection string');
      console.log('2. User does not have appropriate permissions');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️ CONNECTION REFUSED: The MongoDB server actively refused the connection.');
      console.log('Possible causes:');
      console.log('1. MongoDB is not running on the specified host/port');
      console.log('2. Firewall is blocking the connection');
    } else {
      console.log('\n⚠️ GENERAL CONNECTION ERROR:');
      console.log(`Error type: ${error.name}`);
      console.log(`Error message: ${error.message}`);
      console.log(`Error code: ${error.code || 'N/A'}`);
    }
  } finally {
    await client.close();
    console.log('\nConnection test completed.');
  }
}

testConnection().catch(console.error);