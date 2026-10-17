const User = require('../models/User');
const Registration = require('../models/Registration');
const Course = require('../models/Course');

const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    res.json(students);
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

const getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCourses = await Course.countDocuments();
    const totalRegistrations = await Registration.countDocuments();

    const enrollmentStats = await Registration.aggregate([
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'courseInfo',
        },
      },
      {
        $project: {
          course: { $arrayElemAt: ['$courseInfo.courseName', 0] },
          count: 1,
        },
      },
    ]);

    res.json({
      totalStudents,
      totalCourses,
      totalRegistrations,
      enrollmentStats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch dashboard data.', error: error.message });
  }
};

module.exports = { getAllStudents, getAllRegistrations, getDashboardStats };
