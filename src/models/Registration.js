const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    registrationId: {
      type: String,
      required: true,
      unique: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    status: {
      type: String,
      enum: ['registered', 'dropped', 'completed'],
      default: 'registered',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    droppedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

registrationSchema.index({ student: 1, course: 1, status: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
