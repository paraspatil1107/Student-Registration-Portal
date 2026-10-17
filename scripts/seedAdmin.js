// Creates the admin account and a sample course catalog. Safe to run more than once.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Course = require('../src/models/Course');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@college.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const sampleCourses = [
  {
    courseCode: 'CS101',
    courseName: 'Introduction to Programming',
    description: 'Problem solving with variables, control flow, functions and arrays in JavaScript.',
    credits: 4,
    instructor: 'Dr. A. Sharma',
    capacity: 60,
    department: 'Computer Science',
    schedule: { days: ['Mon', 'Wed'], startTime: '09:00', endTime: '10:30', location: 'Hall 101' },
  },
  {
    courseCode: 'CS201',
    courseName: 'Data Structures',
    description: 'Stacks, queues, linked lists, trees, heaps, hashing and their complexity analysis.',
    credits: 4,
    instructor: 'Dr. A. Sharma',
    capacity: 50,
    department: 'Computer Science',
    prerequisiteCodes: ['CS101'],
    schedule: { days: ['Tue', 'Thu'], startTime: '09:00', endTime: '10:30', location: 'Hall 104' },
  },
  {
    courseCode: 'CS220',
    courseName: 'Database Management Systems',
    description: 'Relational modelling, SQL, normalization, indexing, transactions and NoSQL basics.',
    credits: 3,
    instructor: 'Prof. R. Kulkarni',
    capacity: 45,
    department: 'Computer Science',
    schedule: { days: ['Mon', 'Wed'], startTime: '11:00', endTime: '12:30', location: 'Lab 2' },
  },
  {
    courseCode: 'CS240',
    courseName: 'Web Development',
    description: 'HTML, CSS, JavaScript, REST APIs with Express.js and deploying full-stack apps.',
    credits: 3,
    instructor: 'Ms. P. Nair',
    capacity: 3,
    department: 'Computer Science',
    schedule: { days: ['Fri'], startTime: '14:00', endTime: '17:00', location: 'Lab 4' },
  },
  {
    courseCode: 'CS310',
    courseName: 'Operating Systems',
    description: 'Processes, threads, scheduling, memory management, file systems and concurrency.',
    credits: 4,
    instructor: 'Dr. S. Iyer',
    capacity: 40,
    department: 'Computer Science',
    prerequisiteCodes: ['CS201'],
    schedule: { days: ['Tue', 'Thu'], startTime: '11:00', endTime: '12:30', location: 'Hall 202' },
  },
  {
    courseCode: 'MA201',
    courseName: 'Discrete Mathematics',
    description: 'Logic, sets, relations, combinatorics, graph theory and proof techniques.',
    credits: 3,
    instructor: 'Prof. M. Rao',
    capacity: 70,
    department: 'Mathematics',
    schedule: { days: ['Mon', 'Wed'], startTime: '10:00', endTime: '11:30', location: 'Hall 110' },
  },
  {
    courseCode: 'HS101',
    courseName: 'Professional Communication',
    description: 'Technical writing, presentations, interviews and workplace communication skills.',
    credits: 2,
    instructor: 'Ms. K. Desai',
    capacity: 80,
    department: 'Humanities',
    schedule: { days: ['Fri'], startTime: '10:00', endTime: '12:00', location: 'Hall 005' },
  },
];

const seed = async () => {
  await connectDB();

  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    console.log(`Admin ${ADMIN_EMAIL} already exists.`);
  } else {
    await User.create({
      name: 'System Admin',
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: 'admin',
    });
    console.log(`Admin created: ${ADMIN_EMAIL}`);
  }

  let created = 0;
  for (const { prerequisiteCodes = [], ...course } of sampleCourses) {
    const prerequisites = await Course.find({ courseCode: { $in: prerequisiteCodes } }).distinct('_id');
    const result = await Course.updateOne(
      { courseCode: course.courseCode },
      { $setOnInsert: { ...course, prerequisites } },
      { upsert: true }
    );
    created += result.upsertedCount;
  }
  console.log(`Sample courses: ${created} created, ${sampleCourses.length - created} already present.`);

  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
