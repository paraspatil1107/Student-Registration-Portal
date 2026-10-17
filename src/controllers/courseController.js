const Course = require('../models/Course');
const Registration = require('../models/Registration');
const Waitlist = require('../models/Waitlist');
const Wishlist = require('../models/Wishlist');
const { escapeRegex } = require('../utils/escapeRegex');

const EDITABLE_FIELDS = [
  'courseCode',
  'courseName',
  'description',
  'credits',
  'instructor',
  'capacity',
  'department',
  'semester',
  'status',
  'prerequisites',
  'schedule',
];

const pickCourseFields = (body) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

// Adds live enrolledCount / seatsLeft to each course so the UI can show "Full" and the waitlist button.
const withEnrollment = async (courses) => {
  const counts = await Registration.aggregate([
    { $match: { course: { $in: courses.map((c) => c._id) }, status: 'registered' } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [c._id.toString(), c.count]));

  return courses.map((course) => {
    const enrolledCount = countById.get(course._id.toString()) || 0;
    return { ...course, enrolledCount, seatsLeft: Math.max(0, course.capacity - enrolledCount) };
  });
};

const getCourses = async (req, res) => {
  try {
    const { search, filter } = req.query;
    const query = {};

    if (typeof search === 'string' && search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [{ courseName: pattern }, { courseCode: pattern }, { instructor: pattern }];
    }

    if (typeof filter === 'string' && filter.trim()) {
      query.instructor = new RegExp(`^${escapeRegex(filter.trim())}$`, 'i');
    }

    const courses = await Course.find(query)
      .populate('prerequisites', 'courseCode courseName')
      .sort({ courseCode: 1 })
      .lean();
    res.json(await withEnrollment(courses));
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch courses.', error: error.message });
  }
};

const getCourseById = async (req, res) => {
  const course = await Course.findById(req.params.id).populate('prerequisites', 'courseCode courseName').lean();
  if (!course) {
    return res.status(404).json({ message: 'Course not found.' });
  }
  const [withCounts] = await withEnrollment([course]);
  res.json(withCounts);
};

const addCourse = async (req, res) => {
  try {
    const course = await Course.create(pickCourseFields(req.body));
    res.status(201).json(course);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Course code already exists.' });
    }
    res.status(500).json({ message: 'Unable to create course.', error: error.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const updates = pickCourseFields(req.body);
    if (updates.prerequisites && updates.prerequisites.includes(req.params.id)) {
      return res.status(400).json({ message: 'A course cannot be its own prerequisite.' });
    }

    const course = await Course.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    res.json(course);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Course code already exists.' });
    }
    res.status(500).json({ message: 'Unable to update course.', error: error.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    await Promise.all([
      Registration.deleteMany({ course: course._id }),
      Waitlist.deleteMany({ course: course._id }),
      Wishlist.deleteMany({ course: course._id }),
      Course.updateMany({ prerequisites: course._id }, { $pull: { prerequisites: course._id } }),
    ]);
    res.json({ message: 'Course deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete course.', error: error.message });
  }
};

module.exports = { getCourses, getCourseById, addCourse, updateCourse, deleteCourse };
