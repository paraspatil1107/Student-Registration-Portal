const studentForm = document.getElementById('studentForm');
const courseForm = document.getElementById('courseForm');
const studentList = document.getElementById('studentList');
const courseList = document.getElementById('courseList');
const studentCount = document.getElementById('studentCount');
const courseCount = document.getElementById('courseCount');
const courseSelect = document.getElementById('course');
const resetFormButton = document.getElementById('resetForm');

const fetchJSON = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

const renderStudents = (students) => {
  studentCount.textContent = students.length;

  if (!students.length) {
    studentList.innerHTML = '<div class="empty-state">No student records available.</div>';
    return;
  }

  studentList.innerHTML = students
    .map(
      (student) => `
        <div class="student-card">
          <h4>${student.name}</h4>
          <p class="meta">${student.program} • ${student.year}</p>
          <p class="meta">ID: ${student.studentId}</p>
          <p class="meta">Course: ${student.course}</p>
          <p class="meta">Email: ${student.email}</p>
          <p class="meta">GPA: ${student.gpa || 'N/A'}</p>
          <span class="badge">${student.status}</span>
        </div>
      `
    )
    .join('');
};

const renderCourses = (courses) => {
  courseCount.textContent = courses.length;

  if (!courses.length) {
    courseList.innerHTML = '<div class="empty-state">No courses available.</div>';
    return;
  }

  const options = courses
    .map((course) => `<option value="${course.code}">${course.code} - ${course.title}</option>`)
    .join('');

  courseSelect.innerHTML = `<option value="">Select a course</option>${options}`;

  courseList.innerHTML = courses
    .map(
      (course) => `
        <div class="course-card">
          <h4>${course.code}: ${course.title}</h4>
          <p class="meta">Instructor: ${course.instructor}</p>
          <p class="meta">Credits: ${course.creditHours}</p>
          <p class="meta">Seats: ${course.seatsAvailable}</p>
        </div>
      `
    )
    .join('');
};

const loadStudents = async () => {
  try {
    const students = await fetchJSON('/api/students');
    renderStudents(students);
  } catch (error) {
    console.error(error);
    studentList.innerHTML = '<div class="empty-state">Unable to load students.</div>';
  }
};

const loadCourses = async () => {
  try {
    const courses = await fetchJSON('/api/courses');
    renderCourses(courses);
  } catch (error) {
    console.error(error);
    courseList.innerHTML = '<div class="empty-state">Unable to load courses.</div>';
  }
};

studentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(studentForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await fetchJSON('/api/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    studentForm.reset();
    await loadStudents();
  } catch (error) {
    alert(error.message);
  }
});

courseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(courseForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await fetchJSON('/api/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    courseForm.reset();
    await loadCourses();
  } catch (error) {
    alert(error.message);
  }
});

resetFormButton.addEventListener('click', () => {
  studentForm.reset();
});

loadStudents();
loadCourses();
