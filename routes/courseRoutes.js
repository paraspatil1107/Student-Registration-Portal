const express = require('express');
const mongoose = require('mongoose');
const Course = require('../models/Course');

const router = express.Router();
const courseMemory = global.__courseMemory || (global.__courseMemory = [
  { _id: 'course-1', code: 'CS101', title: 'Introduction to Programming', creditHours: 3, instructor: 'Dr. Sharma', seatsAvailable: 30 },
  { _id: 'course-2', code: 'MATH120', title: 'Calculus I', creditHours: 4, instructor: 'Prof. Rao', seatsAvailable: 25 },
  { _id: 'course-3', code: 'ENG205', title: 'Communication Skills', creditHours: 2, instructor: 'Ms. Nair', seatsAvailable: 40 },
  { _id: 'course-4', code: 'BIO210', title: 'Biology Fundamentals', creditHours: 3, instructor: 'Dr. Singh', seatsAvailable: 20 },
]);

router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const courses = await Course.find().sort({ title: 1 });
      return res.json(courses);
    }

    return res.json(courseMemory);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch courses.', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = {
      code: req.body.code,
      title: req.body.title,
      creditHours: Number(req.body.creditHours),
      instructor: req.body.instructor,
      seatsAvailable: Number(req.body.seatsAvailable),
    };

    if (!payload.code || !payload.title || !payload.instructor) {
      return res.status(400).json({ message: 'Course code, title, and instructor are required.' });
    }

    if (mongoose.connection.readyState === 1) {
      const course = await Course.create(payload);
      return res.status(201).json(course);
    }

    payload._id = `course-${Date.now()}`;
    courseMemory.push(payload);
    return res.status(201).json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create course.', error: error.message });
  }
});

module.exports = router;
