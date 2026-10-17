const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    course: {
      type: String,
      required: true,
    },
    program: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    gpa: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'On Hold', 'Graduated'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
