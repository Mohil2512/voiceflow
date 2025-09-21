import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

if (!process.env.MONGODB_URI && process.env.NODE_ENV !== 'development') {
  console.warn('Missing MongoDB URI - database operations will be limited')
}

const uri = process.env.MONGODB_URI || ''

// MongoDB client options - enhanced for Vercel compatibility
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority' as const,
  // SSL/TLS options for better compatibility
  ssl: true,
  tlsAllowInvalidCertificates: false,
  tlsInsecure: false,
}

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

// Only create MongoDB connection if URI is available
if (uri && process.env.MONGODB_URI) {
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
}

// Export a module-scoped MongoClient promise for NextAuth
export default clientPromise

// Database connections for our three databases with error handling
export const getDatabases = async () => {
  if (!clientPromise) {
    throw new Error('MongoDB connection not initialized - check MONGODB_URI environment variable')
  }
  
  try {
    const client = await clientPromise
    
    return {
      auth: client.db('voiceflow_auth'),
      profiles: client.db('voiceflow_profiles'), 
      activities: client.db('voiceflow_activities')
    }
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    throw new Error('Database connection unavailable')
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