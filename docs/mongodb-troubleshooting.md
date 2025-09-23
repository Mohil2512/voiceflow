# MongoDB Atlas Connection Error Handling Guide

This guide will help you troubleshoot MongoDB Atlas connection issues in Voiceflow.

## Common Issues and Solutions

### 1. Connection String Format

Ensure your connection string in `.env.local` is properly formatted:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&ssl=true
```

Make sure:
- Replace `<username>` with your actual MongoDB Atlas username
- Replace `<password>` with your actual password (without angle brackets)
- Replace `<cluster>` with your cluster identifier

### 2. Password Contains Special Characters

If your password contains special characters, you need to URL encode it. For example:
- `@` becomes `%40`
- `#` becomes `%23`
- `&` becomes `%26`

### 3. Network Access

Ensure your IP address has been added to the IP Whitelist in MongoDB Atlas:
1. Go to Network Access in MongoDB Atlas
2. Click "Add IP Address"
3. Add your current IP address or allow access from anywhere (0.0.0.0/0) for development

### 4. User Authentication

Verify your database user has the correct permissions:
1. Go to Database Access in MongoDB Atlas
2. Check if the user exists and has appropriate permissions
3. If needed, reset the password and update your .env.local file

### 5. SSL/TLS Issues

MongoDB Atlas requires SSL connections. Make sure:
1. Your connection string includes `ssl=true`
2. Your MongoDB client options include proper SSL settings

### 6. Database Names

Voiceflow uses three databases that will be created automatically:
- `voiceflow_auth`
- `voiceflow_profiles`
- `voiceflow_activities`

### 7. Testing the Connection

To test your connection, start the app and visit:
```
http://localhost:3000/api/health/database
```

This should return a JSON response with connection status.

## Debugging Steps

If you're still experiencing issues:

1. Check the server logs for specific error messages
2. Verify your MongoDB Atlas service is running
3. Test your connection string with MongoDB Compass
4. Check if your MongoDB Atlas cluster has any active alerts
5. Temporarily try with a new database user to rule out authentication issues

For more help, refer to the [MongoDB Atlas documentation](https://docs.atlas.mongodb.com/) or reach out to support.