const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
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
    position: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'enrolled', 'cancelled'],
      default: 'waiting',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

waitlistSchema.index({ student: 1, course: 1, status: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
