import { MongoClient } from 'mongodb';

// Create a safe MongoDB client that works in both development and production
// and handles missing environment variables gracefully

// Allow build to proceed even if MONGODB_URI is missing
if (!process.env.MONGODB_URI) {
  console.warn('Missing environment variable: "MONGODB_URI". MongoDB features will be disabled.');
}

// Safely get the MongoDB URI
const uri = process.env.MONGODB_URI || '';
const options = {};

// Define global type for MongoDB client
interface GlobalWithMongo extends Global {
  _mongoClientPromise?: Promise<MongoClient>;
}

// Create a safe MongoDB client
const createClient = () => {
  // If no MongoDB URI is provided, return a dummy client
  if (!uri) {
    console.warn('MongoDB URI not available. Using dummy client.');
    return {
      connect: () => Promise.resolve(null),
      db: () => ({}),
    } as unknown as MongoClient;
  }

  try {
    return new MongoClient(uri, options);
  } catch (error) {
    console.error('Failed to create MongoDB client:', error);
    return {
      connect: () => Promise.resolve(null),
      db: () => ({}),
    } as unknown as MongoClient;
  }
};

// Initialize client and client promise
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Handle development vs production environments
if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as unknown as GlobalWithMongo;

  if (!globalWithMongo._mongoClientPromise) {
    client = createClient();
    globalWithMongo._mongoClientPromise = client.connect().catch(err => {
      console.error('Failed to connect to MongoDB:', err);
      return client; // Return the client even if connection fails
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = createClient();
  clientPromise = client.connect().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    return client; // Return the client even if connection fails
  });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;