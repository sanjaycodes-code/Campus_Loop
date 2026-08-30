const mongoose = require('mongoose');

let isConnecting = false;

const connectDB = async (retryCount = 0) => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: MONGO_URI is not defined in your .env file.');
    return;
  }

  if (isConnecting) return;
  isConnecting = true;

  try {
    const conn = await mongoose.connect(mongoUri, {
      family: 4, // Force IPv4
      tls: true,
      tlsAllowInvalidCertificates: true, // Fixes Windows / Node 24 OpenSSL TLS alert 80
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`\x1b[32mMongoDB Connected: ${conn.connection.host}\x1b[0m`);
    isConnecting = false;
  } catch (error) {
    isConnecting = false;
    console.error(`\x1b[33mDatabase Connection Warning: ${error.message}. Retrying in 2 seconds... (Attempt ${retryCount + 1})\x1b[0m`);

    if (retryCount < 5) {
      setTimeout(() => {
        connectDB(retryCount + 1);
      }, 2000);
    } else {
      console.error('\x1b[31mFailed to connect to MongoDB Atlas after multiple attempts.\x1b[0m');
    }
  }
};

module.exports = connectDB;
