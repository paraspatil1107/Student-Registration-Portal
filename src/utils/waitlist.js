const Waitlist = require('../models/Waitlist');

// Renumbers the remaining waiting students for a course as 1, 2, 3...
const reorderWaitlist = async (courseId) => {
  const remaining = await Waitlist.find({ course: courseId, status: 'waiting' }).sort({ position: 1, requestedAt: 1 });
  await Promise.all(
    remaining.map((entry, index) => {
      if (entry.position === index + 1) return null;
      entry.position = index + 1;
      return entry.save();
    })
  );
};

module.exports = { reorderWaitlist };
