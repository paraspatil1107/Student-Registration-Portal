const token = getToken();
const user = getUser();

if (!token || !user || user.role !== 'admin') {
  redirectToLogin();
}

setPageTitle('Admin Dashboard');

const $ = (id) => document.getElementById(id);

const courseForm = $('courseForm');
const dashboardSearch = $('dashboardSearch');
const registrationFilter = $('registrationFilter');

const state = { courses: [], students: [], registrations: [] };

const empty = (text) => `<p class="empty-state">${escapeHtml(text)}</p>`;

const renderStats = (stats) => {
  const cards = [
    ['Students', stats.totalStudents],
    ['Courses', stats.totalCourses],
    ['Active registrations', stats.totalRegistrations],
    ['On waitlists', stats.totalWaitlisted],
  ];
  $('dashboardStats').innerHTML = cards
    .map(([label, value]) => `<div class="stat-card"><h4>${label}</h4><strong>${value ?? 0}</strong></div>`)
    .join('');

  const top = (stats.enrollmentStats || []).slice(0, 4);
  $('enrollmentList').innerHTML = top.length
    ? top
        .map((item) => {
          const pct = item.capacity ? Math.min((item.count / item.capacity) * 100, 100) : 0;
          return `
            <div class="enrollment-item">
              <h4>${escapeHtml(item.courseCode)} · ${escapeHtml(item.course)}</h4>
              <p><strong>${item.count}</strong> / ${item.capacity} seats filled</p>
              <div class="progress-track"><div style="width: ${pct}%"></div></div>
            </div>
          `;
        })
        .join('')
    : empty('No enrollments yet.');
};

const statusBadge = (status) => {
  const tone = { active: 'success', registered: 'success', completed: 'primary', closed: 'danger', dropped: 'danger', inactive: 'warning' };
  return `<span class="badge badge-${tone[status] || 'primary'}">${escapeHtml(status)}</span>`;
};

const renderCourses = () => {
  const search = dashboardSearch.value.trim().toLowerCase();
  const courses = state.courses.filter((course) =>
    `${course.courseCode} ${course.courseName} ${course.instructor} ${course.department}`.toLowerCase().includes(search)
  );

  $('courseTable').innerHTML = courses.length
    ? `
      <table>
        <thead>
          <tr><th>Code</th><th>Name</th><th>Instructor</th><th>Credits</th><th>Seats</th><th>Schedule</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${courses
            .map(
              (course) => `
                <tr>
                  <td><strong>${escapeHtml(course.courseCode)}</strong></td>
                  <td>${escapeHtml(course.courseName)}${
                    course.prerequisites && course.prerequisites.length
                      ? `<br /><small class="text-muted">Requires ${escapeHtml(course.prerequisites.map((p) => p.courseCode).join(', '))}</small>`
                      : ''
                  }</td>
                  <td>${escapeHtml(course.instructor)}</td>
                  <td>${course.credits}</td>
                  <td>${course.enrolledCount} / ${course.capacity}</td>
                  <td>${
                    course.schedule && course.schedule.days && course.schedule.days.length
                      ? `${escapeHtml(course.schedule.days.join('/'))} ${escapeHtml(course.schedule.startTime || '')}-${escapeHtml(course.schedule.endTime || '')}`
                      : '<span class="text-muted">TBA</span>'
                  }</td>
                  <td>${statusBadge(course.status)}</td>
                  <td>
                    <button data-action="edit" data-id="${course._id}" class="btn btn-secondary small-btn">Edit</button>
                    <button data-action="delete" data-id="${course._id}" class="btn btn-danger small-btn">Delete</button>
                  </td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `
    : empty(state.courses.length ? 'No courses match your search.' : 'No courses yet. Add one above or run npm run seed.');
};

const renderPrerequisiteOptions = () => {
  $('prerequisites').innerHTML = state.courses
    .map((course) => `<option value="${course._id}">${escapeHtml(course.courseCode)} · ${escapeHtml(course.courseName)}</option>`)
    .join('');
};

const renderStudents = () => {
  $('studentTable').innerHTML = state.students.length
    ? `
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Courses</th><th>Credits</th><th>Joined</th></tr></thead>
        <tbody>
          ${state.students
            .map(
              (student) => `
                <tr>
                  <td>${escapeHtml(student.name)}</td>
                  <td>${escapeHtml(student.email)}</td>
                  <td>${student.enrolledCourses}</td>
                  <td>${student.enrolledCredits} / ${student.maxCredits}</td>
                  <td>${formatDate(student.createdAt)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `
    : empty('No students have signed up yet.');
};

const renderRegistrations = () => {
  const status = registrationFilter.value;
  const rows = state.registrations.filter((reg) => !status || reg.status === status);

  $('registrationTable').innerHTML = rows.length
    ? `
      <table>
        <thead><tr><th>ID</th><th>Student</th><th>Course</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (reg) => `
                <tr>
                  <td><code>${escapeHtml(reg.registrationId)}</code></td>
                  <td>${escapeHtml(reg.student ? reg.student.name : 'Deleted user')}</td>
                  <td>${escapeHtml(reg.course ? `${reg.course.courseCode} · ${reg.course.courseName}` : 'Deleted course')}</td>
                  <td>${formatDate(reg.registeredAt)}</td>
                  <td>${statusBadge(reg.status)}</td>
                  <td>${
                    reg.status === 'registered'
                      ? `<button data-action="complete" data-id="${reg._id}" class="btn btn-secondary small-btn">Mark completed</button>`
                      : ''
                  }</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `
    : empty('No registrations to show.');
};

const loadAdminData = async () => {
  try {
    const [stats, courses, students, registrations] = await Promise.all([
      authFetch('/api/admin/dashboard'),
      authFetch('/api/courses'),
      authFetch('/api/admin/students'),
      authFetch('/api/admin/registrations'),
    ]);
    Object.assign(state, { courses, students, registrations });

    renderStats(stats);
    renderCourses();
    renderPrerequisiteOptions();
    renderStudents();
    renderRegistrations();
  } catch (error) {
    console.error(error);
    showToast(error.message, 'error');
  }
};

const actions = {
  async edit(id) {
    const course = state.courses.find((item) => item._id === id);
    if (!course) return;

    const updated = await showFormModal({
      title: `Edit ${course.courseCode}`,
      submitText: 'Save changes',
      fields: [
        { name: 'courseName', label: 'Course name', type: 'text', value: course.courseName, required: true },
        { name: 'description', label: 'Description', type: 'textarea', value: course.description },
        { name: 'instructor', label: 'Instructor', type: 'text', value: course.instructor, required: true },
        { name: 'credits', label: 'Credits', type: 'number', value: course.credits, min: 1, max: 6 },
        { name: 'capacity', label: 'Capacity', type: 'number', value: course.capacity, min: 1, max: 500 },
        { name: 'status', label: 'Status', type: 'select', value: course.status, options: ['active', 'inactive', 'closed'] },
      ],
    });
    if (!updated) return;

    await authFetch(`/api/courses/${id}`, { method: 'PUT', body: JSON.stringify(updated) });
    showToast(`${course.courseCode} updated.`, 'success');
  },
  async delete(id) {
    const course = state.courses.find((item) => item._id === id);
    const confirmed = await showConfirm({
      title: `Delete ${course ? course.courseCode : 'course'}?`,
      message: 'This permanently removes the course along with its registrations, waitlist and wishlist entries.',
      confirmText: 'Delete course',
      danger: true,
    });
    if (!confirmed) return;

    await authFetch(`/api/courses/${id}`, { method: 'DELETE' });
    showToast('Course deleted.', 'success');
  },
  async complete(id) {
    await authFetch(`/api/admin/registrations/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) });
    showToast('Registration marked completed.', 'success');
  },
};

document.querySelector('.admin-page').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;

  button.disabled = true;
  try {
    await actions[button.dataset.action](button.dataset.id);
    await loadAdminData();
  } catch (error) {
    showToast(error.message, 'error', 6000);
  } finally {
    button.disabled = false;
  }
});

courseForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const days = [...document.querySelectorAll('#dayPicker input:checked')].map((input) => input.value);
  const payload = {
    courseCode: $('courseCode').value.trim(),
    courseName: $('courseName').value.trim(),
    description: $('description').value.trim(),
    credits: Number($('credits').value),
    instructor: $('instructor').value.trim(),
    capacity: Number($('capacity').value),
    prerequisites: [...$('prerequisites').selectedOptions].map((option) => option.value),
  };
  if ($('department').value.trim()) payload.department = $('department').value.trim();
  if (days.length) {
    payload.schedule = {
      days,
      startTime: $('startTime').value,
      endTime: $('endTime').value,
      location: $('location').value.trim() || 'TBD',
    };
  }

  const submit = courseForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await authFetch('/api/courses', { method: 'POST', body: JSON.stringify(payload) });
    courseForm.reset();
    showToast(`${payload.courseCode.toUpperCase()} added.`, 'success');
    await loadAdminData();
  } catch (error) {
    showToast(error.message, 'error', 7000);
  } finally {
    submit.disabled = false;
  }
});

dashboardSearch.addEventListener('input', debounce(renderCourses, 150));
registrationFilter.addEventListener('change', renderRegistrations);
$('logoutBtn').addEventListener('click', logoutCurrentUser);
$('adminName').textContent = user ? user.name : 'Administrator';

loadAdminData();
