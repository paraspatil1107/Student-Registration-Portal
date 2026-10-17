const Registration = require('../src/models/Registration');
const Waitlist = require('../src/models/Waitlist');
const Wishlist = require('../src/models/Wishlist');
const { api, createUser, createAdmin, createCourse } = require('./helpers');

const validCourse = {
  courseCode: 'cs301',
  courseName: 'Computer Networks',
  description: 'Layers, protocols, routing and sockets.',
  credits: 4,
  instructor: 'Dr. Network',
  capacity: 40,
  schedule: { days: ['Mon', 'Wed'], startTime: '09:00', endTime: '10:30', location: 'Hall 1' },
};

describe('course catalog', () => {
  it('lets an admin create a course with a schedule', async () => {
    const { auth } = await createAdmin();
    const res = await api().post('/api/courses').set(auth).send(validCourse);

    expect(res.status).toBe(201);
    expect(res.body.courseCode).toBe('CS301');
    expect(res.body.schedule.days).toEqual(['Mon', 'Wed']);
  });

  it('blocks students from creating courses', async () => {
    const { auth } = await createUser();
    const res = await api().post('/api/courses').set(auth).send(validCourse);
    expect(res.status).toBe(403);
  });

  it('validates course fields', async () => {
    const { auth } = await createAdmin();
    const res = await api()
      .post('/api/courses')
      .set(auth)
      .send({ ...validCourse, credits: 0, capacity: -5, schedule: { startTime: '11:00', endTime: '10:00' } });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Credits/);
    expect(res.body.message).toMatch(/Capacity/);
    expect(res.body.message).toMatch(/End time must be after start time/);
  });

  it('returns 409 for a duplicate course code', async () => {
    const { auth } = await createAdmin();
    await api().post('/api/courses').set(auth).send(validCourse);
    const res = await api().post('/api/courses').set(auth).send(validCourse);
    expect(res.status).toBe(409);
  });

  it('lists courses with live enrollment counts', async () => {
    const course = await createCourse({ capacity: 2 });
    const { user } = await createUser();
    await Registration.create({ registrationId: 'REG-T-1', student: user._id, course: course._id });

    const res = await api().get('/api/courses');

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ enrolledCount: 1, seatsLeft: 1 });
  });

  it('treats search input literally instead of as a regex', async () => {
    await createCourse({ courseName: 'C++ (Advanced)' });
    await createCourse({ courseName: 'Biology' });

    const res = await api().get('/api/courses').query({ search: '++ (' });

    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.courseName)).toEqual(['C++ (Advanced)']);
  });

  it('returns 400 for a malformed course id and 404 for a missing one', async () => {
    expect((await api().get('/api/courses/not-an-id')).status).toBe(400);
    expect((await api().get('/api/courses/507f1f77bcf86cd799439011')).status).toBe(404);
  });

  it('only updates whitelisted fields', async () => {
    const { auth } = await createAdmin();
    const course = await createCourse();

    const res = await api()
      .put(`/api/courses/${course._id}`)
      .set(auth)
      .send({ capacity: 99, createdAt: '2000-01-01', _id: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(200);
    expect(res.body.capacity).toBe(99);
    expect(res.body._id).toBe(course._id.toString());
    expect(new Date(res.body.createdAt).getFullYear()).not.toBe(2000);
  });

  it('removes registrations, waitlists, wishlists and prerequisite links when a course is deleted', async () => {
    const { auth } = await createAdmin();
    const { user } = await createUser();
    const course = await createCourse();
    const dependent = await createCourse({ prerequisites: [course._id] });
    await Registration.create({ registrationId: 'REG-T-2', student: user._id, course: course._id });
    await Waitlist.create({ student: user._id, course: course._id, position: 1 });
    await Wishlist.create({ student: user._id, course: course._id });

    const res = await api().delete(`/api/courses/${course._id}`).set(auth);

    expect(res.status).toBe(200);
    expect(await Registration.countDocuments({ course: course._id })).toBe(0);
    expect(await Waitlist.countDocuments({ course: course._id })).toBe(0);
    expect(await Wishlist.countDocuments({ course: course._id })).toBe(0);
    const refreshed = await api().get(`/api/courses/${dependent._id}`);
    expect(refreshed.body.prerequisites).toEqual([]);
  });
});
