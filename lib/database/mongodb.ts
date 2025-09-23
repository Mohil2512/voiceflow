import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

if (!process.env.MONGODB_URI && process.env.NODE_ENV !== 'development') {
  console.warn('Missing MongoDB URI - database operations will be limited')
}

const uri = process.env.MONGODB_URI || ''

// MongoDB client options - optimized for MongoDB Atlas
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000, // Increased timeout for Atlas connections
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000, // Increased timeout for Atlas connections
  retryWrites: true,
  retryReads: true,
  w: 'majority' as const,
  ssl: true, // Required for Atlas
  // Choose one TLS option, but not both
  tlsAllowInvalidCertificates: process.env.NODE_ENV === 'development' // For development only
  // useUnifiedTopology is removed as it's deprecated in MongoDB Driver v4.0.0+
}

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

// Only create MongoDB connection if URI is available
if (uri && process.env.MONGODB_URI) {
  // Check if the connection string contains a password placeholder
  if (uri.includes('<db_password>')) {
    console.error('MongoDB URI contains placeholder <db_password>. Replace it with your actual password in .env.local');
  }
  
  try {
    if (process.env.NODE_ENV === 'development') {
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
      const globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>
      }

      if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options)
        globalWithMongo._mongoClientPromise = client.connect()
      }
      clientPromise = globalWithMongo._mongoClientPromise
    } else {
      // In production mode, it's best to not use a global variable.
      client = new MongoClient(uri, options)
      clientPromise = client.connect()
    }
    console.log('MongoDB client initialized successfully');
  } catch (initError) {
    console.error('Failed to initialize MongoDB client:', initError);
  }
}

// Export a module-scoped MongoClient promise for NextAuth
export default clientPromise

// Database connections for our three databases with enhanced error handling for MongoDB Atlas
export const getDatabases = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MongoDB connection not initialized - MONGODB_URI environment variable is missing')
  }
  
  // Check for placeholder passwords in connection string
  if (process.env.MONGODB_URI.includes('<db_password>')) {
    throw new Error('MongoDB Atlas connection string contains placeholder <db_password>. Please replace it with your actual password in .env.local');
  }
  
  if (!clientPromise) {
    try {
      // If MongoDB connection is not initialized yet, initialize it now
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
      console.log('Creating new MongoDB Atlas connection...');
    } catch (initError) {
      console.error('Failed to initialize MongoDB client:', initError);
      let errorMsg = 'Could not initialize MongoDB Atlas connection';
      
      if (initError instanceof Error) {
        // Provide more specific error messages based on common failure patterns
        if (initError.message.includes('invalid schema')) {
          errorMsg = 'Invalid MongoDB connection string format. Check your MONGODB_URI in .env.local';
        } else if (initError.message.includes('ENOTFOUND') || initError.message.includes('failed to connect')) {
          errorMsg = 'Could not reach MongoDB Atlas cluster. Check your network connection and cluster availability';
        } else {
          errorMsg += ': ' + initError.message;
        }
      }
      
      throw new Error(errorMsg);
    }
  }
  
  try {
    // Get the client instance with timeout handling
    const client = await Promise.race([
      clientPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB Atlas connection timed out after 15000ms')), 15000)
      )
    ]) as MongoClient;
    
    // Test the connection by pinging with a timeout
    await Promise.race([
      client.db('admin').command({ ping: 1 }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB Atlas ping timed out')), 10000)
      )
    ]);
    
    // Return the database instances
    return {
      auth: client.db('voiceflow_auth'),
      profiles: client.db('voiceflow_profiles'), 
      activities: client.db('voiceflow_activities')
    }
  } catch (error) {
    console.error('MongoDB Atlas connection failed:', error);
    
    // Provide more specific error information for debugging
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        throw new Error('MongoDB Atlas connection timed out - check network connectivity and Atlas status');
      } else if (error.message.includes('authentication') || error.message.includes('SCRAM')) {
        throw new Error('MongoDB Atlas authentication failed - check username and password in your connection string');
      } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
        throw new Error('MongoDB Atlas SSL/TLS connection issue - check your SSL settings and certificates');
      } else if (error.message.includes('TopologyDescription')) {
        throw new Error('MongoDB Atlas server selection failed - check if your IP address is allowed in Atlas Network Access');
      }
    }
    
    throw new Error('Failed to connect to MongoDB Atlas: ' + 
      (error instanceof Error ? error.message : 'Unknown database error') + 
      '. See docs/mongodb-troubleshooting.md for help.');
  }
}

// Mongoose connections for type-safe operations
const MONGOOSE_CONNECTIONS: { [key: string]: mongoose.Connection } = {}

export const getMongooseConnection = async (dbName: string) => {
  if (!uri || !process.env.MONGODB_URI) {
    throw new Error('MongoDB URI not available for Mongoose connection')
  }

  if (MONGOOSE_CONNECTIONS[dbName]) {
    return MONGOOSE_CONNECTIONS[dbName]
  }

  const baseUri = uri.split('/').slice(0, -1).join('/') // Remove database name from URI
  const connection = mongoose.createConnection(`${baseUri}/${dbName}`)
  
  MONGOOSE_CONNECTIONS[dbName] = connection
  return connection
}

// Utility functions for database operations
export const connectToAuthDB = () => getMongooseConnection('voiceflow_auth')
export const connectToProfilesDB = () => getMongooseConnection('voiceflow_profiles')
export const connectToActivitiesDB = () => getMongooseConnection('voiceflow_activities')

// Collection helper functions with error handling
export const getUserCollection = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MongoDB URI not available')
    }
    const databases = await getDatabases()
    return databases.auth.collection('users')
  } catch (error) {
    console.error('Failed to get user collection:', error)
    throw error
  }
}

export const getProfileCollection = async () => {
  try {
    const databases = await getDatabases()
    return databases.profiles.collection('profiles')
  } catch (error) {
    console.error('Failed to get profile collection:', error)
    throw error
  }
}

export const getActivityCollection = async () => {
  const databases = await getDatabases()
  return databases.activities.collection('activities')
}