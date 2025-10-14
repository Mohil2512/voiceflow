import { MongoClient, type Db } from 'mongodb'
import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI || ''

// Mock database helper - returns empty collections that don't throw errors
const createMockDatabases = () => {
  // Create a chainable cursor mock that supports .find().sort().limit().toArray()
  const createMockCursor = () => {
    const cursor = {
      toArray: async () => [],
      sort: () => cursor,
      limit: () => cursor,
      skip: () => cursor,
      project: () => cursor,
      count: async () => 0
    }
    return cursor
  }
  
  const mockCollection = {
    find: () => createMockCursor(),
    findOne: async () => null,
    insertOne: async () => ({ insertedId: 'mock-id', acknowledged: true }),
    insertMany: async () => ({ insertedIds: {}, insertedCount: 0, acknowledged: true }),
    updateOne: async () => ({ matchedCount: 0, modifiedCount: 0, acknowledged: true, upsertedId: null, upsertedCount: 0 }),
    updateMany: async () => ({ matchedCount: 0, modifiedCount: 0, acknowledged: true }),
    deleteOne: async () => ({ deletedCount: 0, acknowledged: true }),
    deleteMany: async () => ({ deletedCount: 0, acknowledged: true }),
    countDocuments: async () => 0,
    aggregate: () => createMockCursor(),
    createIndex: async () => 'mock-index',
    dropIndex: async () => ({ ok: 1 })
  }
  
  const mockDb = {
    collection: () => mockCollection,
    admin: () => ({ ping: async () => ({ ok: 1 }) }),
    command: async () => ({ ok: 1 })
  }
  
  return {
    auth: mockDb as unknown as Db,
    profiles: mockDb as unknown as Db,
    activities: mockDb as unknown as Db
  }
}

// Build MongoDB client options depending on connection type (Atlas vs Local)
const buildMongoOptions = (connectionUri: string) => {
  const isAtlas = connectionUri.startsWith('mongodb+srv://') || connectionUri.includes('.mongodb.net')

  if (isAtlas) {
    // Options optimized for MongoDB Atlas with better timeout settings
    return {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 25000,
      connectTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true,
      w: 'majority' as const,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      maxIdleTimeMS: 30000,
      maxConnecting: 2
    }
  }

  // Local MongoDB defaults (no TLS)
  return {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 15000,
    retryWrites: true,
    retryReads: true,
    w: 'majority' as const
  }
}

const options = buildMongoOptions(uri)

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Initialize clientPromise based on MongoDB URI availability
if (uri && process.env.MONGODB_URI) {
  // Check if the connection string contains a password placeholder
  if (uri.includes('<db_password>')) {
    console.error('MongoDB URI contains placeholder <db_password>. Replace it with your actual password in .env.local');
    clientPromise = Promise.reject(new Error('Invalid MongoDB URI'))
  } else {
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
      clientPromise = Promise.reject(initError)
    }
  }
} else {
  // Create a rejected promise if no URI
  console.warn('MongoDB URI not provided - database operations will fail')
  clientPromise = Promise.reject(new Error('MongoDB URI not provided'))
}

// Export a module-scoped MongoClient promise for NextAuth
export default clientPromise

// Database connections for our three databases with enhanced error handling for MongoDB Atlas
export const getDatabases = async () => {
  // Check if MongoDB is properly configured
  if (!process.env.MONGODB_URI) {
    console.warn('MongoDB URI not found - returning mock database objects')
    return createMockDatabases()
  }
  
  try {
    // Use real MongoDB connection
    if (!clientPromise) {
      throw new Error('MongoDB client not initialized')
    }
    
    const client = await clientPromise
    const authDb = client.db('voiceflow_auth')
    const profilesDb = client.db('voiceflow_profiles') 
    const activitiesDb = client.db('voiceflow_activities')
    
    return {
      auth: authDb,
      profiles: profilesDb,
      activities: activitiesDb
    }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    console.warn('Falling back to mock databases')
    return createMockDatabases()
  }
}

// Mongoose connections for type-safe operations
const MONGOOSE_CONNECTIONS: { [key: string]: mongoose.Connection } = {}

export const getMongooseConnection = async (dbName: string) => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MongoDB URI not configured')
  }
  
  if (MONGOOSE_CONNECTIONS[dbName]) {
    return MONGOOSE_CONNECTIONS[dbName]
  }

  try {
    const connection = mongoose.createConnection(process.env.MONGODB_URI, {
      dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true
    })
    
    MONGOOSE_CONNECTIONS[dbName] = connection
    console.log(`Mongoose connection established for database: ${dbName}`)
    return connection
  } catch (error) {
    console.error(`Failed to connect to MongoDB database ${dbName}:`, error)
    throw error
  }
}

// Utility functions for database operations
export const connectToAuthDB = () => getMongooseConnection('voiceflow_auth')
export const connectToProfilesDB = () => getMongooseConnection('voiceflow_profiles')
export const connectToActivitiesDB = () => getMongooseConnection('voiceflow_activities')

// Collection helper functions with error handling
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