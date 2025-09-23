# MongoDB Atlas Connection Guide

This guide will help you properly configure your MongoDB Atlas connection for Voiceflow.

## Prerequisites

1. A MongoDB Atlas account (sign up at [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register))
2. A MongoDB Atlas cluster (free tier works fine)

## Steps to Configure MongoDB Atlas

1. **Create a Cluster** (if you don't already have one)
   - Login to MongoDB Atlas
   - Create a new cluster (free tier is sufficient)
   - Wait for the cluster to be provisioned (may take a few minutes)

2. **Configure Network Access**
   - In the Atlas dashboard, go to "Network Access" 
   - Click "Add IP Address"
   - For development, you can add `0.0.0.0/0` to allow access from anywhere
   - For production, configure more restricted IP access

3. **Create a Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create a user with a strong password
   - Assign "Read and Write to any database" permissions

4. **Get Your Connection String**
   - Go to your cluster
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string

5. **Configure Your .env File**
   - Create a `.env.local` file in the project root
   - Add your connection string:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
   ```
   - Replace `<username>`, `<password>`, and `<cluster-url>` with your actual values

## Database Structure

Voiceflow uses three databases:
- `voiceflow_auth` - For authentication data
- `voiceflow_profiles` - For user profile data
- `voiceflow_activities` - For posts and other activity data

These databases will be created automatically when the application runs.

## Troubleshooting Connection Issues

If you encounter connection issues:

1. **Check Credentials**: Ensure username and password in the connection string are correct
2. **Network Access**: Verify your IP has been whitelisted in MongoDB Atlas
3. **Database User Permissions**: Confirm the user has appropriate permissions
4. **Connection String Format**: Verify the connection string follows the correct format
5. **SSL Requirements**: MongoDB Atlas requires SSL connections (already configured in the app)

## Testing Your Connection

You can test if your MongoDB Atlas connection is working by:

1. Starting the application: `npm run dev`
2. Visiting: `http://localhost:3000/api/health/database`

This will return a JSON response indicating if the connection is successful.