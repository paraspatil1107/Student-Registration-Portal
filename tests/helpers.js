const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Course = require('../src/models/Course');
const { generateToken } = require('../src/utils/generateToken');

const api = () => request(app);

let counter = 0;

const createUser = async (overrides = {}) => {
  counter += 1;
  const user = await User.create({
    name: `User ${counter}`,
    email: `user${counter}@test.edu`,
    password: await bcrypt.hash('Password1', 4),
    role: 'student',
    ...overrides,
  });
  return { user, token: generateToken(user), auth: { Authorization: `Bearer ${generateToken(user)}` } };
};

const createAdmin = () => createUser({ role: 'admin' });

const createCourse = (overrides = {}) => {
  counter += 1;
  return Course.create({
    courseCode: `CS${100 + counter}`,
    courseName: `Course ${counter}`,
    description: 'A sample course used in tests.',
    credits: 3,
    instructor: 'Dr. Test',
    capacity: 30,
    ...overrides,
  });
};

module.exports = { api, createUser, createAdmin, createCourse };
