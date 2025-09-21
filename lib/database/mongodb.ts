import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI

// MongoDB client options - simplified for better compatibility
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority' as const,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

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

// Export a module-scoped MongoClient promise for NextAuth
export default clientPromise

// Database connections for our three databases
export const getDatabases = async () => {
  const client = await clientPromise
  
  return {
    auth: client.db('voiceflow_auth'),
    profiles: client.db('voiceflow_profiles'), 
    activities: client.db('voiceflow_activities')
  }
}

// Mongoose connections for type-safe operations
const MONGOOSE_CONNECTIONS: { [key: string]: mongoose.Connection } = {}

export const getMongooseConnection = async (dbName: string) => {
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

// Collection helper functions
export const getUserCollection = async () => {
  const databases = await getDatabases()
  return databases.auth.collection('users')
}

export const getProfileCollection = async () => {
  const databases = await getDatabases()
  return databases.profiles.collection('profiles')
}

export const getActivityCollection = async () => {
  const databases = await getDatabases()
  return databases.activities.collection('activities')
}