const User = require('../models/User');
const Registration = require('../models/Registration');
const Course = require('../models/Course');
const Waitlist = require('../models/Waitlist');

const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 }).lean();

    const loads = await Registration.aggregate([
      { $match: { status: 'registered' } },
      { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $group: { _id: '$student', courses: { $sum: 1 }, credits: { $sum: '$course.credits' } } },
    ]);
    const loadById = new Map(loads.map((l) => [l._id.toString(), l]));

    res.json(
      students.map((student) => {
        const load = loadById.get(student._id.toString());
        return { ...student, enrolledCourses: load ? load.courses : 0, enrolledCredits: load ? load.credits : 0 };
      })
    );
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch students.', error: error.message });
  }
};

const getAllRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find()
      .populate('student', 'name email')
      .populate('course', 'courseCode courseName')
      .sort({ registeredAt: -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch registrations.', error: error.message });
  }
};

// Lets an admin mark a registration completed (counts toward prerequisites) or dropped.
const updateRegistrationStatus = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }

    registration.status = req.body.status;
    registration.droppedAt = req.body.status === 'dropped' ? new Date() : undefined;
    await registration.save();

    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update registration.', error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [totalStudents, totalCourses, totalRegistrations, totalWaitlisted] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Course.countDocuments(),
      Registration.countDocuments({ status: 'registered' }),
      Waitlist.countDocuments({ status: 'waiting' }),
    ]);

    const enrollmentStats = await Registration.aggregate([
      { $match: { status: 'registered' } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'courseInfo' } },
      { $unwind: '$courseInfo' },
      {
        $project: {
          course: '$courseInfo.courseName',
          courseCode: '$courseInfo.courseCode',
          capacity: '$courseInfo.capacity',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      totalStudents,
      totalCourses,
      totalRegistrations,
      totalWaitlisted,
      enrollmentStats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch dashboard data.', error: error.message });
  }
};

module.exports = { getAllStudents, getAllRegistrations, updateRegistrationStatus, getDashboardStats };
