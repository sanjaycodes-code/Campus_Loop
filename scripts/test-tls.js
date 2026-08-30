const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose
  .connect(process.env.MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 5000,
  })
  .then((conn) => {
    console.log('SUCCESS: Connected to MongoDB Atlas host:', conn.connection.host);
    process.exit(0);
  })
  .catch((err) => {
    console.log('Connect error:', err.message);
    process.exit(1);
  });
