const token = getToken();
const user = getUser();

if (!token || !user || user.role !== 'admin') {
  redirectToLogin();
}

setPageTitle('Admin Dashboard');

const courseForm = document.getElementById('courseForm');
const dashboardStats = document.getElementById('dashboardStats');
const dashboardSearch = document.getElementById('dashboardSearch');
const courseTable = document.getElementById('courseTable');
const studentTable = document.getElementById('studentTable');
const registrationTable = document.getElementById('registrationTable');
const enrollmentList = document.getElementById('enrollmentList');
const logoutBtn = document.getElementById('logoutBtn');

let currentCourses = [];

const renderStats = (stats) => {
  dashboardStats.innerHTML = `
    <div class="stat-card">
      <h4>Total Students</h4>
      <strong>${stats.totalStudents}</strong>
    </div>
    <div class="stat-card">
      <h4>Total Courses</h4>
      <strong>${stats.totalCourses}</strong>
    </div>
    <div class="stat-card">
      <h4>Total Registrations</h4>
      <strong>${stats.totalRegistrations}</strong>
    </div>
  `;
};

const renderEnrollmentInsights = (enrollmentStats = []) => {
  if (!enrollmentStats.length) {
    enrollmentList.innerHTML = '<p class="empty-state">No enrollment insights available yet.</p>';
    return;
  }

  const sortedStats = [...enrollmentStats].sort((a, b) => b.count - a.count);

  enrollmentList.innerHTML = sortedStats
    .slice(0, 4)
    .map((item) => `
      <div class="enrollment-item">
        <h4>${item.course || 'Unknown course'}</h4>
        <p><strong>${item.count}</strong> registrations</p>
        <div class="progress-track">
          <div style="width: ${Math.min((item.count / 30) * 100, 100)}%"></div>
        </div>
      </div>
    `)
    .join('');
};

const debounce = (fn, delay = 250) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const filterCourses = () => {
  const search = dashboardSearch?.value.trim().toLowerCase() || '';
  if (!search) {
    return currentCourses;
  }

  return currentCourses.filter((course) => {
    return [course.courseCode, course.courseName, course.instructor, course.description]
      .join(' ')
      .toLowerCase()
      .includes(search);
  });
};

const renderCourses = (courses) => {
  courseTable.innerHTML = courses.length ? `
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Instructor</th>
          <th>Credits</th>
          <th>Capacity</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${courses.map(course => `
          <tr>
            <td>${course.courseCode}</td>
            <td>${course.courseName}</td>
            <td>${course.instructor}</td>
            <td>${course.credits}</td>
            <td>${course.capacity}</td>
            <td>
              <button data-edit-id="${course._id}" class="btn small-btn">Edit</button>
              <button data-delete-id="${course._id}" class="btn btn-danger small-btn">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p>No courses found.</p>';

  document.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const courseId = button.dataset.deleteId;
      try {
        const confirmed = await showConfirm({
          title: 'Confirm Delete',
          message: 'This will permanently delete the course and its registrations.',
          confirmText: 'Delete Course',
          cancelText: 'Cancel',
        });

        if (!confirmed) return;

        await authFetch(`/api/courses/${courseId}`, { method: 'DELETE' });
        showToast('Course deleted successfully.', 'success');
        loadAdminData();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  document.querySelectorAll('[data-edit-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const courseId = button.dataset.editId;
      const course = courses.find((item) => item._id === courseId);
      if (!course) return;

      const updatedData = await showFormModal({
        title: 'Edit Course',
        submitText: 'Save Changes',
        cancelText: 'Cancel',
        fields: [
          { name: 'courseCode', label: 'Course Code', type: 'text', value: course.courseCode, disabled: true },
          { name: 'courseName', label: 'Course Name', type: 'text', value: course.courseName },
          { name: 'description', label: 'Description', type: 'textarea', value: course.description },
          { name: 'credits', label: 'Credits', type: 'number', value: course.credits },
          { name: 'instructor', label: 'Instructor', type: 'text', value: course.instructor },
          { name: 'capacity', label: 'Capacity', type: 'number', value: course.capacity },
        ],
      });

      if (!updatedData) return;

      try {
        await authFetch(`/api/courses/${courseId}`, {
          method: 'PUT',
          body: JSON.stringify(updatedData),
        });
        showToast('Course updated successfully.', 'success');
        loadAdminData();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
};

const renderStudents = (students) => {
  studentTable.innerHTML = students.length ? `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        ${students.map(student => `
          <tr>
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td><span class="badge">${student.role}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p>No students found.</p>';
};

const renderRegistrations = (registrations) => {
  registrationTable.innerHTML = registrations.length ? `
    <table>
      <thead>
        <tr>
          <th>Student</th>
          <th>Course</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${registrations.map(reg => `
          <tr>
            <td>${reg.student?.name || 'N/A'}</td>
            <td>${reg.course?.courseCode || 'N/A'} - ${reg.course?.courseName || 'N/A'}</td>
            <td>${new Date(reg.registeredAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p>No registrations found.</p>';
};

courseForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    courseCode: document.getElementById('courseCode').value,
    courseName: document.getElementById('courseName').value,
    description: document.getElementById('description').value,
    credits: Number(document.getElementById('credits').value),
    instructor: document.getElementById('instructor').value,
    capacity: Number(document.getElementById('capacity').value),
  };

  try {
    await authFetch('/api/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    courseForm.reset();
    loadAdminData();
    showToast('Course added successfully.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

const loadAdminData = async () => {
  try {
    const stats = await authFetch('/api/admin/dashboard');
    renderStats(stats);
  renderEnrollmentInsights(stats.enrollmentStats || []);

    const courses = await authFetch('/api/courses');
    currentCourses = courses;
    renderCourses(filterCourses());

    const students = await authFetch('/api/admin/students');
    renderStudents(students);

    const registrations = await authFetch('/api/admin/registrations');
    renderRegistrations(registrations);
  } catch (error) {
    console.error(error);
    showToast(error.message, 'error');
  }
};

dashboardSearch?.addEventListener('input', debounce(() => {
  renderCourses(filterCourses());
}));

logoutBtn.addEventListener('click', () => {
  logoutCurrentUser();
});

loadAdminData();
