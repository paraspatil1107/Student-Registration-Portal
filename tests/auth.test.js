const User = require('../src/models/User');
const { api, createUser } = require('./helpers');

describe('POST /api/auth/register', () => {
  it('creates a student and returns a token without the password', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Paras Patil', email: 'Paras@Test.edu', password: 'Secret123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Paras Patil', email: 'paras@test.edu', role: 'student' });
    expect(res.body.user.password).toBeUndefined();

    const saved = await User.findOne({ email: 'paras@test.edu' });
    expect(saved.password).not.toBe('Secret123');
  });

  it('ignores a role sent by the client, so nobody can self-register as admin', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Mallory', email: 'mallory@test.edu', password: 'Secret123', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('student');
  });

  it('rejects an invalid email and weak password with field messages', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'A', email: 'nope', password: 'short' });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('rejects a duplicate email with 409', async () => {
    const { user } = await createUser();
    const res = await api().post('/api/auth/register').send({ name: 'Copy', email: user.email, password: 'Secret123' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await api().post('/api/auth/register').send({ name: 'Login User', email: 'login@test.edu', password: 'Secret123' });
  });

  it('returns a token for correct credentials', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'LOGIN@test.edu', password: 'Secret123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('returns 401 for a wrong password', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'login@test.edu', password: 'Wrong1234' });

    expect(res.status).toBe(401);
  });
});

describe('protected routes', () => {
  it('reject requests without a token', async () => {
    const res = await api().get('/api/registrations/my-courses');
    expect(res.status).toBe(401);
  });

  it('reject a tampered token', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  it('return the current user from /api/auth/me', async () => {
    const { user, auth } = await createUser();
    const res = await api().get('/api/auth/me').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('forbid students from admin routes', async () => {
    const { auth } = await createUser();
    const res = await api().get('/api/admin/dashboard').set(auth);
    expect(res.status).toBe(403);
  });
});
