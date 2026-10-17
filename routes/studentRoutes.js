const express = require('express');
const mongoose = require('mongoose');
const Student = require('../models/Student');

const router = express.Router();
const studentMemory = global.__studentMemory || (global.__studentMemory = [
  {
    _id: 'sample-student-1',
    name: 'Aisha Khan',
    email: 'aisha.khan@example.com',
    studentId: 'STU-1001',
    course: 'CS101',
    program: 'Computer Science',
    year: '2nd Year',
    phone: '9876543210',
    gpa: 3.8,
    status: 'Active',
  },
  {
    _id: 'sample-student-2',
    name: 'Rohit Verma',
    email: 'rohit.verma@example.com',
    studentId: 'STU-1002',
    course: 'MATH120',
    program: 'Data Science',
    year: '1st Year',
    phone: '9123456780',
    gpa: 3.5,
    status: 'Active',
  },
]);

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const students = await Student.find().sort({ createdAt: -1 });
      return res.json(students);
    }

    return res.json(studentMemory.slice().reverse());
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch students.', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      email: req.body.email,
      studentId: req.body.studentId,
      course: req.body.course,
      program: req.body.program,
      year: req.body.year,
      phone: req.body.phone,
      gpa: Number(req.body.gpa || 0),
      status: req.body.status || 'Active',
    };

    if (!payload.name || !payload.email || !payload.studentId || !payload.course) {
      return res.status(400).json({ message: 'Please fill in all required student fields.' });
    }

    if (mongoose.connection.readyState === 1) {
      const student = await Student.create(payload);
      return res.status(201).json(student);
    }

    payload._id = makeId();
    studentMemory.unshift(payload);
    return res.status(201).json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create student record.', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
      return res.json(student);
    }

    const index = studentMemory.findIndex((student) => student._id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    studentMemory[index] = { ...studentMemory[index], ...req.body };
    return res.json(studentMemory[index]);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update student record.', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const student = await Student.findByIdAndDelete(req.params.id);
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
      return res.json({ message: 'Student deleted successfully.' });
    }

    const index = studentMemory.findIndex((student) => student._id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    studentMemory.splice(index, 1);
    return res.json({ message: 'Student deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete student record.', error: error.message });
  }
});

module.exports = router;
