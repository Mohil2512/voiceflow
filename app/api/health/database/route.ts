import { NextResponse } from 'next/server';
import clientPromise from '@/lib/database/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ 
        connected: false,
        message: 'MongoDB Atlas connection string not provided',
        error: 'MONGODB_URI environment variable is missing'
      }, { status: 500 });
    }

    // Try to connect with a timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('MongoDB Atlas connection timeout after 10000ms')), 10000)
    );
    const client = await Promise.race([clientPromise, timeoutPromise]);
    
    // Perform a simple command to check connection
    await client.db('admin').command({ ping: 1 });
    
    // Test access to our collections
    const dbNames = ['voiceflow_auth', 'voiceflow_profiles', 'voiceflow_activities'];
    const dbStatus = await Promise.all(dbNames.map(async (dbName) => {
      try {
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        return { name: dbName, accessible: true, collections: collections.length };
      } catch (e) {
        return { name: dbName, accessible: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }));
    
    return NextResponse.json({ 
      connected: true,
      message: 'Successfully connected to MongoDB Atlas',
      databases: dbStatus
    });
  } catch (error) {
    console.error('MongoDB Atlas connection error:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Unknown database error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'MongoDB Atlas connection timed out - check network connectivity';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'MongoDB Atlas authentication failed - check credentials';
        statusCode = 401;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({ 
      connected: false, 
      message: 'Failed to connect to MongoDB Atlas',
      error: errorMessage
    }, { 
      status: statusCode 
    });
  }
}