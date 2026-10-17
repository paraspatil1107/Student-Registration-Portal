const Course = require('../models/Course');
const Registration = require('../models/Registration');

const getCourses = async (req, res) => {
  try {
    const { search, filter } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { courseName: { $regex: search, $options: 'i' } },
        { courseCode: { $regex: search, $options: 'i' } },
        { instructor: { $regex: search, $options: 'i' } },
      ];
    }

    if (filter) {
      query.instructor = { $regex: filter, $options: 'i' };
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch courses.', error: error.message });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }
    res.json(course);
  } catch (error) {
    return res.status(400).json({ message: 'Invalid course ID.' });
  }
};

const addCourse = async (req, res) => {
  try {
    const { courseCode, courseName, description, credits, instructor, capacity } = req.body;

    if (!courseCode || !courseName || !description || !credits || !instructor || !capacity) {
      return res.status(400).json({ message: 'All course fields are required.' });
    }

    const course = await Course.create({
      courseCode,
      courseName,
      description,
      credits,
      instructor,
      capacity,
    });

    res.status(201).json(course);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Course code already exists.' });
    }
    res.status(500).json({ message: 'Unable to create course.', error: error.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    res.json(course);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid course ID.' });
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

    await Registration.deleteMany({ course: req.params.id });
    res.json({ message: 'Course deleted successfully.' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }
    res.status(500).json({ message: 'Unable to delete course.', error: error.message });
  }
};

module.exports = { getCourses, getCourseById, addCourse, updateCourse, deleteCourse };
