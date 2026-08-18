const mongoose = require('mongoose');

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is missing. Add it to .env or Vercel Environment Variables.'
    );
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 7000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60000
    }).catch(error => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;
  return mongoose.connection;
}

module.exports = connectDB;
