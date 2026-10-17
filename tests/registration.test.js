const Registration = require('../src/models/Registration');
const Waitlist = require('../src/models/Waitlist');
const { api, createUser, createAdmin, createCourse } = require('./helpers');

const register = (auth, courseId) => api().post('/api/registrations').set(auth).send({ courseId });

describe('course registration rules', () => {
  it('registers a student and reports credits', async () => {
    const { auth } = await createUser();
    const course = await createCourse({ credits: 4 });

    const res = await register(auth, course._id);
    expect(res.status).toBe(201);
    expect(res.body.registration.registrationId).toMatch(/^REG-\d{4}-\d{6}$/);

    const mine = await api().get('/api/registrations/my-courses').set(auth);
    expect(mine.body).toMatchObject({ totalCourses: 1, totalCredits: 4 });
  });

  it('rejects a missing or malformed course id', async () => {
    const { auth } = await createUser();
    expect((await api().post('/api/registrations').set(auth).send({})).status).toBe(400);
    expect((await register(auth, 'abc')).status).toBe(400);
  });

  it('prevents duplicate registration', async () => {
    const { auth } = await createUser();
    const course = await createCourse();
    await register(auth, course._id);

    const res = await register(auth, course._id);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already registered/);
  });

  it('enforces capacity', async () => {
    const course = await createCourse({ capacity: 1 });
    const first = await createUser();
    const second = await createUser();
    await register(first.auth, course._id);

    const res = await register(second.auth, course._id);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/capacity is full/);
  });

  it('enforces the credit limit', async () => {
    const { auth } = await createUser({ maxCredits: 6 });
    const a = await createCourse({ credits: 4 });
    const b = await createCourse({ credits: 3 });
    await register(auth, a._id);

    const res = await register(auth, b._id);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Credit limit exceeded/);
  });

  it('blocks closed courses', async () => {
    const { auth } = await createUser();
    const course = await createCourse({ status: 'closed' });
    expect((await register(auth, course._id)).status).toBe(400);
  });

  it('requires prerequisites, and accepts a completed one', async () => {
    const { user, auth } = await createUser();
    const intro = await createCourse({ courseName: 'Intro' });
    const advanced = await createCourse({ prerequisites: [intro._id] });

    const blocked = await register(auth, advanced._id);
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toMatch(/Intro/);

    await Registration.create({ registrationId: 'REG-T-9', student: user._id, course: intro._id, status: 'completed' });
    expect((await register(auth, advanced._id)).status).toBe(201);
  });

  it('detects schedule conflicts on shared days', async () => {
    const { auth } = await createUser();
    const morning = await createCourse({ schedule: { days: ['Mon', 'Wed'], startTime: '09:00', endTime: '10:30' } });
    const overlapping = await createCourse({ schedule: { days: ['Wed'], startTime: '10:00', endTime: '11:00' } });
    const otherDay = await createCourse({ schedule: { days: ['Tue'], startTime: '09:00', endTime: '10:30' } });
    await register(auth, morning._id);

    const conflict = await register(auth, overlapping._id);
    expect(conflict.status).toBe(400);
    expect(conflict.body.message).toMatch(/Schedule conflict/);
    expect((await register(auth, otherDay._id)).status).toBe(201);
  });

  it('records drops in history', async () => {
    const { auth } = await createUser();
    const course = await createCourse();
    await register(auth, course._id);

    expect((await api().delete(`/api/registrations/${course._id}`).set(auth)).status).toBe(200);

    const history = await api().get('/api/registrations/history').set(auth);
    expect(history.body[0]).toMatchObject({ status: 'dropped' });
    expect(history.body[0].droppedAt).toBeTruthy();
  });
});

describe('waitlist', () => {
  it('only lets students join when the course is full', async () => {
    const { auth } = await createUser();
    const course = await createCourse({ capacity: 5 });

    const res = await api().post('/api/waitlist').set(auth).send({ courseId: course._id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/open seats/);
  });

  it('promotes the first waiting student when a seat opens and renumbers the queue', async () => {
    const course = await createCourse({ capacity: 1 });
    const enrolled = await createUser();
    const firstInLine = await createUser();
    const secondInLine = await createUser();
    await register(enrolled.auth, course._id);

    const join1 = await api().post('/api/waitlist').set(firstInLine.auth).send({ courseId: course._id });
    const join2 = await api().post('/api/waitlist').set(secondInLine.auth).send({ courseId: course._id });
    expect(join1.body.waitlist.position).toBe(1);
    expect(join2.body.waitlist.position).toBe(2);

    await api().delete(`/api/registrations/${course._id}`).set(enrolled.auth);

    expect(await Registration.exists({ student: firstInLine.user._id, course: course._id, status: 'registered' })).toBeTruthy();
    const remaining = await Waitlist.findOne({ student: secondInLine.user._id, course: course._id });
    expect(remaining).toMatchObject({ status: 'waiting', position: 1 });
  });

  it('renumbers the queue when someone leaves', async () => {
    const course = await createCourse({ capacity: 1 });
    const enrolled = await createUser();
    const a = await createUser();
    const b = await createUser();
    await register(enrolled.auth, course._id);
    await api().post('/api/waitlist').set(a.auth).send({ courseId: course._id });
    await api().post('/api/waitlist').set(b.auth).send({ courseId: course._id });

    expect((await api().delete(`/api/waitlist/${course._id}`).set(a.auth)).status).toBe(200);

    const mine = await api().get('/api/waitlist/my-waitlist').set(b.auth);
    expect(mine.body[0].position).toBe(1);
  });
});

describe('wishlist', () => {
  it('adds, lists with availability, and removes', async () => {
    const { auth } = await createUser();
    const course = await createCourse();

    expect((await api().post('/api/wishlist').set(auth).send({ courseId: course._id })).status).toBe(201);
    expect((await api().post('/api/wishlist').set(auth).send({ courseId: course._id })).status).toBe(400);

    const list = await api().get('/api/wishlist').set(auth);
    expect(list.body[0]).toMatchObject({ isFull: false, isRegistered: false, enrolledCount: 0 });

    expect((await api().delete(`/api/wishlist/${course._id}`).set(auth)).status).toBe(200);
    expect((await api().delete('/api/wishlist/bad-id').set(auth)).status).toBe(400);
  });
});

describe('admin', () => {
  it('reports dashboard stats that count only active registrations', async () => {
    const { auth } = await createAdmin();
    const student = await createUser();
    const a = await createCourse();
    const b = await createCourse();
    await register(student.auth, a._id);
    await register(student.auth, b._id);
    await api().delete(`/api/registrations/${b._id}`).set(student.auth);

    const res = await api().get('/api/admin/dashboard').set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalStudents: 1, totalCourses: 2, totalRegistrations: 1 });
    expect(res.body.enrollmentStats).toHaveLength(1);
  });

  it('can mark a registration completed', async () => {
    const { auth } = await createAdmin();
    const student = await createUser();
    const course = await createCourse();
    const { body } = await register(student.auth, course._id);

    const res = await api()
      .patch(`/api/admin/registrations/${body.registration._id}`)
      .set(auth)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect((await api().patch(`/api/admin/registrations/${body.registration._id}`).set(auth).send({ status: 'bogus' })).status).toBe(400);
  });

  it('lists students with their current load', async () => {
    const { auth } = await createAdmin();
    const student = await createUser();
    const course = await createCourse({ credits: 4 });
    await register(student.auth, course._id);

    const res = await api().get('/api/admin/students').set(auth);
    expect(res.body[0]).toMatchObject({ enrolledCourses: 1, enrolledCredits: 4 });
    expect(res.body[0].password).toBeUndefined();
  });
});
