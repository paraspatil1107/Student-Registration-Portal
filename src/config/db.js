const mongoose = require('mongoose');

const connectDB = async (uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_course_db') => {
  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = { connectDB };
