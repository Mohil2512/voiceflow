// Network connectivity test for MongoDB Atlas
const dns = require('dns');
const net = require('net');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// Get the MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Extract hostname and port from MongoDB URI
let hostname, port;
try {
  const url = new URL(uri);
  hostname = url.hostname;
  port = url.port || 27017; // Default MongoDB port
} catch (error) {
  console.error('Invalid MongoDB URI format:', error.message);
  process.exit(1);
}

console.log(`\n=========== MongoDB Atlas Network Connectivity Test ===========`);
console.log(`Testing connectivity to: ${hostname}`);

// Test DNS resolution
console.log('\n1. Testing DNS resolution...');
dns.lookup(hostname, (err, address, family) => {
  if (err) {
    console.error(`❌ DNS resolution failed: ${err.message}`);
    console.log('→ This suggests a DNS or network connectivity issue.');
    console.log('→ Check your internet connection and DNS settings.');
  } else {
    console.log(`✅ DNS resolution successful: ${hostname} → ${address} (IPv${family})`);
    
    // Check if this is a MongoDB Atlas hostname
    if (hostname.includes('mongodb.net')) {
      console.log(`\n2. Testing SRV record for MongoDB Atlas...`);
      dns.resolveSrv(`_mongodb._tcp.${hostname}`, (err, addresses) => {
        if (err) {
          console.error(`❌ SRV record lookup failed: ${err.message}`);
          console.log('→ This could indicate a network issue or MongoDB Atlas service problem.');
        } else {
          console.log(`✅ SRV records found: ${addresses.length} records`);
          addresses.forEach((record, i) => {
            console.log(`   Record ${i+1}: ${record.name}:${record.port} (priority: ${record.priority})`);
            
            // Test TCP connection to each SRV record
            testTcpConnection(record.name, record.port);
          });
        }
      });
    } else {
      // Test direct TCP connection for non-SRV connections
      testTcpConnection(hostname, port);
    }
  }
});

// Test TCP connection
function testTcpConnection(host, port) {
  console.log(`\n3. Testing TCP connection to ${host}:${port}...`);
  const socket = new net.Socket();
  const timeout = 5000; // 5 seconds timeout
  
  socket.setTimeout(timeout);
  
  // Connection attempt
  socket.connect(port, host, () => {
    console.log(`✅ TCP connection successful to ${host}:${port}`);
    socket.end();
  });
  
  // Handle timeout
  socket.on('timeout', () => {
    console.error(`❌ TCP connection timed out after ${timeout}ms`);
    console.log('→ This suggests a network firewall issue or IP whitelist problem.');
    console.log('→ Make sure your IP address is whitelisted in MongoDB Atlas Network Access settings.');
    socket.destroy();
  });
  
  // Handle errors
  socket.on('error', (err) => {
    console.error(`❌ TCP connection error: ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      console.log('→ Connection refused - the server actively rejected the connection.');
      console.log('→ Check if the server is running and the port is correct.');
    } else if (err.code === 'ETIMEDOUT') {
      console.log('→ Connection timed out - no response from server.');
      console.log('→ This likely indicates a firewall issue or IP whitelist problem.');
    } else {
      console.log(`→ Error code: ${err.code}`);
    }
  });
  
  // Cleanup
  socket.on('close', (hadError) => {
    if (!hadError) {
      console.log('→ Connection closed successfully after test.');
    }
  });
}

// Print recommendations at the end
setTimeout(() => {
  console.log('\n=========== Recommendations ===========');
  console.log('If connectivity tests failed, try these steps:');
  console.log('1. Check your internet connection');
  console.log('2. Make sure your MongoDB Atlas cluster is active');
  console.log('3. Add your current IP address to MongoDB Atlas IP whitelist:');
  console.log('   - Go to MongoDB Atlas → Network Access → Add IP Address');
  console.log('   - Add your current IP or use 0.0.0.0/0 for unrestricted access (development only)');
  console.log('4. Verify username and password in your connection string');
  console.log('5. Check if your network/firewall allows outbound connections to port 27017');
}, 10000); // Wait 10 seconds for all async operations to complete