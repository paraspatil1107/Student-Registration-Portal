const token = getToken();
const user = getUser();

if (!token || !user || user.role !== 'student') {
  redirectToLogin();
}

setPageTitle('Student Dashboard');

const courseList = document.getElementById('courseList');
const myCourses = document.getElementById('myCourses');
const courseSearch = document.getElementById('courseSearch');
const courseFilter = document.getElementById('courseFilter');
const logoutBtn = document.getElementById('logoutBtn');
const totalCredits = document.getElementById('totalCredits');
const enrolledCount = document.getElementById('enrolledCount');
const remainingCredits = document.getElementById('pendingRegistrations');
const currentSemester = document.getElementById('currentSemester');
const progressCredits = document.getElementById('progressCredits');
const progressFill = document.getElementById('progressFill');
const maxCredits = document.getElementById('maxCredits');
const cgpaValue = document.getElementById('cgpaValue');
const upcomingClasses = document.getElementById('upcomingClasses');
const notificationCount = document.getElementById('notificationCount');
const notificationList = document.getElementById('notificationList');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileId = document.getElementById('profileId');
const profileDepartment = document.getElementById('profileDepartment');
const profileSemester = document.getElementById('profileSemester');
const profileYear = document.getElementById('profileYear');
const profileAdvisor = document.getElementById('profileAdvisor');
const profileJoinDate = document.getElementById('profileJoinDate');
const studentName = document.getElementById('studentName');
const studentId = document.getElementById('studentId');
const avatarInitial = document.getElementById('avatarInitial');
const notificationButton = document.getElementById('notificationButton');
const sidebarLinks = document.querySelectorAll('.sidebar-link');

const semesterValue = 'Fall 2026';
const maxCreditLimit = 24;

const updateProfileSummary = () => {
  const displayName = user.name || 'Student';
  const displayId = user.id ? user.id.slice(-6).toUpperCase() : 'NS-000000';

  studentName.textContent = displayName;
  studentId.textContent = displayId;
  currentSemester.textContent = semesterValue;
  profileName.textContent = displayName;
  profileEmail.textContent = user.email || 'student@example.com';
  profileId.textContent = displayId;
  profileDepartment.textContent = 'Computer Science';
  profileSemester.textContent = semesterValue;
  profileYear.textContent = '3';
  profileAdvisor.textContent = 'Dr. A. Sharma';
  profileJoinDate.textContent = 'August 2024';
  avatarInitial.textContent = displayName.charAt(0).toUpperCase();
  maxCredits.textContent = maxCreditLimit;
  cgpaValue.textContent = 'N/A';
};

const renderCourses = (courses, registeredIds = new Set(), wishlistSet = new Set(), waitlistSet = new Set()) => {
  courseList.innerHTML = courses.length
    ? courses
        .map((course) => {
          const isRegistered = registeredIds.has(course._id);
          const isWishlisted = wishlistSet.has(course._id);
          const isWaitlisted = waitlistSet.has(course._id);
          const isFull = (course.enrolledCount || 0) >= course.capacity;

          let primaryAction = '';
          if (isRegistered) {
            primaryAction = `<button disabled class="btn btn-secondary">Enrolled</button>`;
          } else if (isWaitlisted) {
            primaryAction = `<button disabled class="btn btn-warning">On Waitlist</button>`;
          } else if (isFull) {
            primaryAction = `<button data-waitlist-id="${course._id}" class="btn btn-warning waitlist-btn">Join Waitlist</button>`;
          } else {
            primaryAction = `<button data-course-id="${course._id}" class="btn btn-primary register-btn">Register</button>`;
          }

          const bookmarkAction = isWishlisted
            ? `<button data-remove-wishlist-id="${course._id}" class="btn btn-secondary">♥ Saved</button>`
            : `<button data-wishlist-id="${course._id}" class="btn btn-secondary wishlist-btn">♡ Wishlist</button>`;

          return `
            <div class="course-card">
              <h4>${course.courseCode} - ${course.courseName}</h4>
              <p>${course.description}</p>
              <p><strong>Instructor:</strong> ${course.instructor}</p>
              <p><strong>Credits:</strong> ${course.credits}</p>
              <p><strong>Capacity:</strong> ${course.capacity} ${isFull ? '<span class="badge badge-danger">Full</span>' : ''}</p>
              <div class="card-actions">
                ${primaryAction}
                ${bookmarkAction}
              </div>
            </div>
          `;
        })
        .join('')
    : '<p class="text-muted">No courses found.</p>';

  const selectedInstructor = courseFilter?.value || '';
  const instructorValues = [...new Set(courses.map((course) => course.instructor))];
  if (courseFilter) {
    courseFilter.innerHTML = '<option value="">All instructors</option>' + instructorValues.map((value) => `<option value="${value}">${value}</option>`).join('');
    courseFilter.value = selectedInstructor;
  }

  attachCourseActionEvents(courses);
};

const renderMyCourses = (data) => {
  const courseCount = data.totalCourses || 0;
  const credits = data.totalCredits || 0;
  const remaining = Math.max(0, maxCreditLimit - credits);

  totalCredits.textContent = credits;
  enrolledCount.textContent = courseCount;
  remainingCredits.textContent = remaining;
  progressCredits.textContent = `${credits} / ${maxCreditLimit}`;
  progressFill.style.width = `${Math.min((credits / maxCreditLimit) * 100, 100)}%`;

  if (!data.courses.length) {
    myCourses.innerHTML = '<p class="text-muted">No registered courses yet.</p>';
    return;
  }

  myCourses.innerHTML = data.courses
    .map(
      (course) => `
        <div class="course-card">
          <h4>${course.courseCode} - ${course.courseName}</h4>
          <p>${course.instructor}</p>
          <p>Credits: ${course.credits}</p>
          <button data-drop-id="${course._id}" class="btn btn-danger">Drop</button>
        </div>
      `
    )
    .join('');

  document.querySelectorAll('[data-drop-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = btn.dataset.dropId;
      try {
        const confirmed = await showConfirm({
          title: 'Confirm Drop',
          message: 'Are you sure you want to drop this course? This action can affect your credit load.',
          confirmText: 'Drop Course',
          cancelText: 'Cancel',
        });

        if (!confirmed) {
          return;
        }

        await authFetch(`/api/registrations/${courseId}`, { method: 'DELETE' });
        showToast('Course dropped successfully.', 'success');
        loadStudentData();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
};

const daySlots = {
  Mon: document.getElementById('day-Mon'),
  Tue: document.getElementById('day-Tue'),
  Wed: document.getElementById('day-Wed'),
  Thu: document.getElementById('day-Thu'),
  Fri: document.getElementById('day-Fri'),
};
const scheduleConflictBanner = document.getElementById('scheduleConflictBanner');

const defaultDayPresets = [
  ['Mon', 'Wed'],
  ['Tue', 'Thu'],
  ['Mon', 'Wed', 'Fri'],
  ['Tue', 'Thu'],
  ['Wed', 'Fri'],
];
const defaultTimePresets = [
  { startTime: '10:00', endTime: '11:30', display: '10:00 AM - 11:30 AM' },
  { startTime: '11:30', endTime: '13:00', display: '11:30 AM - 01:00 PM' },
  { startTime: '14:00', endTime: '15:30', display: '02:00 PM - 03:30 PM' },
  { startTime: '15:30', endTime: '17:00', display: '03:30 PM - 05:00 PM' },
];

const renderWeeklySchedule = (registeredCourses) => {
  Object.values(daySlots).forEach((el) => {
    if (el) el.innerHTML = '';
  });
  if (scheduleConflictBanner) scheduleConflictBanner.innerHTML = '';

  if (!registeredCourses || !registeredCourses.length) {
    Object.values(daySlots).forEach((el) => {
      if (el) el.innerHTML = '<p class="text-muted text-center" style="font-size:0.8rem; margin-top:1rem;">No classes</p>';
    });
    return;
  }

  const dayBuckets = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
  let hasConflicts = false;

  registeredCourses.forEach((course, index) => {
    let days = course.schedule && course.schedule.days && course.schedule.days.length
      ? course.schedule.days
      : defaultDayPresets[index % defaultDayPresets.length];

    let timePreset = defaultTimePresets[index % defaultTimePresets.length];
    let startTime = (course.schedule && course.schedule.startTime) || timePreset.startTime;
    let endTime = (course.schedule && course.schedule.endTime) || timePreset.endTime;
    let location = (course.schedule && course.schedule.location) || `Hall ${101 + index * 4}`;
    let timeDisplay = `${startTime} - ${endTime}`;

    days.forEach((dayKey) => {
      const key = dayKey.slice(0, 3);
      if (dayBuckets[key]) {
        dayBuckets[key].push({
          course,
          startTime,
          endTime,
          timeDisplay,
          location,
        });
      }
    });
  });

  Object.keys(dayBuckets).forEach((dayKey) => {
    const slots = dayBuckets[dayKey];
    const container = daySlots[dayKey];
    if (!container) return;

    if (!slots.length) {
      container.innerHTML = '<p class="text-muted text-center" style="font-size:0.8rem; margin-top:1rem;">No classes</p>';
      return;
    }

    const conflictedCourses = new Set();
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const s1 = slots[i];
        const s2 = slots[j];
        const start1 = parseTimeToMinutes(s1.startTime);
        const end1 = parseTimeToMinutes(s1.endTime);
        const start2 = parseTimeToMinutes(s2.startTime);
        const end2 = parseTimeToMinutes(s2.endTime);

        if (start1 !== null && end1 !== null && start2 !== null && end2 !== null && start1 < end2 && start2 < end1) {
          conflictedCourses.add(s1.course._id);
          conflictedCourses.add(s2.course._id);
          hasConflicts = true;
        }
      }
    }

    container.innerHTML = slots
      .map((item) => {
        const isConflict = conflictedCourses.has(item.course._id);
        return `
          <div class="timetable-card ${isConflict ? 'conflict' : ''}">
            <div class="timetable-code">${item.course.courseCode}</div>
            <div style="font-weight: 600;">${item.course.courseName}</div>
            <div class="timetable-time">🕒 ${item.timeDisplay}</div>
            <div class="timetable-room">📍 ${item.location} · ${item.course.instructor}</div>
            ${isConflict ? '<span class="badge badge-danger" style="margin-top:0.3rem;">⚠️ Conflict</span>' : ''}
          </div>
        `;
      })
      .join('');
  });

  if (hasConflicts && scheduleConflictBanner) {
    scheduleConflictBanner.innerHTML = '<span class="badge badge-danger" style="font-size:0.85rem; padding:0.4rem 0.8rem;">⚠️ Schedule Conflict Detected</span>';
  }
};

const renderNotifications = (courses) => {
  if (!courses.length) {
    notificationCount.textContent = '0';
    notificationList.innerHTML = '<p class="text-muted">No notifications yet.</p>';
    return;
  }

  const notifications = courses.slice(0, 3).map((course, index) => ({
    title: `Registered for ${course.courseCode}`,
    message: `Your registration for ${course.courseName} is confirmed.`,
    time: `${2 + index}h ago`,
  }));

  notificationCount.textContent = `${notifications.length}`;
  notificationList.innerHTML = notifications
    .map(
      (notification) => `
        <div class="course-card">
          <h4>${notification.title}</h4>
          <p>${notification.message}</p>
          <p class="text-muted">${notification.time}</p>
        </div>
      `
    )
    .join('');
};

const wishlistGrid = document.getElementById('wishlistGrid');
const waitlistGrid = document.getElementById('waitlistGrid');

const attachCourseActionEvents = (courses) => {
  document.querySelectorAll('.register-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = btn.dataset.courseId;
      const targetCourse = courses.find((c) => c._id === courseId);
      if (!targetCourse) return;

      const currentCreds = parseInt(totalCredits.textContent || '0', 10);
      const newCreds = currentCreds + (targetCourse.credits || 0);

      const confirmed = await showConfirm({
        title: `Register for ${targetCourse.courseCode}?`,
        message: `Course: ${targetCourse.courseName}\nCredits: ${targetCourse.credits}\nInstructor: ${targetCourse.instructor}\nCurrent Credits: ${currentCreds} ➔ New Total: ${newCreds}/${maxCreditLimit} Credits`,
        confirmText: 'Confirm Registration',
        cancelText: 'Cancel',
      });

      if (!confirmed) return;

      try {
        await authFetch('/api/registrations', {
          method: 'POST',
          body: JSON.stringify({ courseId }),
        });
        showToast('Course registered successfully!', 'success');
        loadStudentData();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  document.querySelectorAll('.wishlist-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = btn.dataset.wishlistId;
      try {
        await authFetch('/api/wishlist', {
          method: 'POST',
          body: JSON.stringify({ courseId }),
        });
        showToast('Course added to wishlist!', 'success');
        loadStudentData();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  document.querySelectorAll('[data-remove-wishlist-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = btn.dataset.removeWishlistId;
      try {
        await authFetch(`/api/wishlist/${courseId}`, { method: 'DELETE' });
        showToast('Removed from wishlist.', 'info');
        loadStudentData();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  document.querySelectorAll('.waitlist-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = btn.dataset.waitlistId;
      const targetCourse = courses.find((c) => c._id === courseId);
      const confirmed = await showConfirm({
        title: `Join Waitlist for ${targetCourse ? targetCourse.courseCode : 'Course'}?`,
        message: `This course is currently at full capacity. Joining the waitlist will place you in queue for an available seat.`,
        confirmText: 'Join Waitlist',
        cancelText: 'Cancel',
      });

      if (!confirmed) return;

      try {
        const res = await authFetch('/api/waitlist', {
          method: 'POST',
          body: JSON.stringify({ courseId }),
        });
        showToast(res.message || 'Joined waitlist successfully!', 'success');
        loadStudentData();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  document.querySelectorAll('[data-leave-waitlist-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = btn.dataset.leaveWaitlistId;
      try {
        await authFetch(`/api/waitlist/${courseId}`, { method: 'DELETE' });
        showToast('Left waitlist queue.', 'info');
        loadStudentData();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
};

const renderWishlist = (wishlistItems, allCourses) => {
  if (!wishlistGrid) return;
  if (!wishlistItems || !wishlistItems.length) {
    wishlistGrid.innerHTML = '<p class="text-muted">Your wishlist is currently empty.</p>';
    return;
  }

  wishlistGrid.innerHTML = wishlistItems
    .map((item) => {
      const course = item.course;
      if (!course) return '';
      return `
        <div class="course-card">
          <h4>${course.courseCode} - ${course.courseName}</h4>
          <p>${course.description}</p>
          <p><strong>Instructor:</strong> ${course.instructor}</p>
          <p><strong>Credits:</strong> ${course.credits}</p>
          <p><strong>Status:</strong> ${
            item.isRegistered
              ? '<span class="badge badge-success">Enrolled</span>'
              : item.isFull
              ? '<span class="badge badge-danger">Course Full</span>'
              : '<span class="badge badge-success">Available</span>'
          }</p>
          <div class="card-actions">
            ${
              item.isRegistered
                ? '<button disabled class="btn btn-secondary">Enrolled</button>'
                : item.isFull
                ? `<button data-waitlist-id="${course._id}" class="btn btn-warning waitlist-btn">Join Waitlist</button>`
                : `<button data-course-id="${course._id}" class="btn btn-primary register-btn">Register</button>`
            }
            <button data-remove-wishlist-id="${course._id}" class="btn btn-danger">Remove</button>
          </div>
        </div>
      `;
    })
    .join('');
};

const renderWaitlist = (waitlistItems) => {
  if (!waitlistGrid) return;
  if (!waitlistItems || !waitlistItems.length) {
    waitlistGrid.innerHTML = '<p class="text-muted">You are not currently in any waitlists.</p>';
    return;
  }

  waitlistGrid.innerHTML = waitlistItems
    .map((item) => {
      const course = item.course;
      if (!course) return '';
      const isWaiting = item.status === 'waiting';
      return `
        <div class="course-card">
          <h4>${course.courseCode} - ${course.courseName}</h4>
          <p><strong>Instructor:</strong> ${course.instructor}</p>
          <p><strong>Credits:</strong> ${course.credits}</p>
          <p><strong>Waitlist Position:</strong> ${
            isWaiting
              ? `<span class="badge badge-warning">Position #${item.position} in Queue</span>`
              : `<span class="badge badge-success">Enrolled</span>`
          }</p>
          ${isWaiting ? `<button data-leave-waitlist-id="${course._id}" class="btn btn-danger">Leave Waitlist</button>` : ''}
        </div>
      `;
    })
    .join('');
};

const loadStudentData = async () => {
  try {
    const courses = await authFetch('/api/courses');
    const myData = await authFetch('/api/registrations/my-courses');
    const wishlistItems = await authFetch('/api/wishlist').catch(() => []);
    const waitlistItems = await authFetch('/api/waitlist/my-waitlist').catch(() => []);

    let filteredCourses = courses;
    const search = courseSearch.value.trim().toLowerCase();
    if (search) {
      filteredCourses = filteredCourses.filter((course) => {
        return `${course.courseCode} ${course.courseName} ${course.instructor}`.toLowerCase().includes(search);
      });
    }

    const filterValue = courseFilter.value;
    if (filterValue) {
      filteredCourses = filteredCourses.filter((course) => course.instructor === filterValue);
    }

    const registeredIds = new Set(myData.courses.map((course) => course._id));
    const wishlistSet = new Set(wishlistItems.map((item) => (item.course ? item.course._id : null)));
    const waitlistSet = new Set(waitlistItems.filter((i) => i.status === 'waiting').map((item) => (item.course ? item.course._id : null)));

    renderCourses(filteredCourses, registeredIds, wishlistSet, waitlistSet);
    renderMyCourses(myData);
    renderWishlist(wishlistItems, courses);
    renderWaitlist(waitlistItems);
    attachCourseActionEvents(courses);
    renderWeeklySchedule(myData.courses);
    renderNotifications(myData.courses);
    loadRegistrationHistory();
  } catch (error) {
    console.error(error);
    showToast(error.message, 'error');
  }
};

const historyTableBody = document.getElementById('historyTableBody');

const renderRegistrationHistory = (historyItems) => {
  if (!historyTableBody) return;

  if (!historyItems || !historyItems.length) {
    historyTableBody.innerHTML = '<tr><td colspan="7" class="text-muted text-center">No registration records found.</td></tr>';
    return;
  }

  historyTableBody.innerHTML = historyItems
    .map((item) => {
      const regId = item.registrationId || item._id.slice(-8).toUpperCase();
      const courseCode = item.course ? item.course.courseCode : 'N/A';
      const courseName = item.course ? item.course.courseName : 'Unknown Course';
      const credits = item.course ? item.course.credits : 0;
      const regDate = item.registeredAt ? new Date(item.registeredAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
      const dropDate = item.droppedAt ? new Date(item.droppedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

      let statusBadge = '<span class="badge badge-success">Registered</span>';
      if (item.status === 'dropped') {
        statusBadge = '<span class="badge badge-danger">Dropped</span>';
      } else if (item.status === 'completed') {
        statusBadge = '<span class="badge badge-primary">Completed</span>';
      }

      return `
        <tr>
          <td><strong>${regId}</strong></td>
          <td>${courseName}</td>
          <td><code>${courseCode}</code></td>
          <td>${credits}</td>
          <td>${regDate}</td>
          <td>${statusBadge}</td>
          <td>${dropDate}</td>
        </tr>
      `;
    })
    .join('');
};

const loadRegistrationHistory = async () => {
  try {
    const history = await authFetch('/api/registrations/history');
    renderRegistrationHistory(history);
  } catch (error) {
    console.error('Failed to fetch registration history:', error);
  }
};

courseSearch?.addEventListener('input', loadStudentData);
courseFilter?.addEventListener('change', loadStudentData);
logoutBtn?.addEventListener('click', () => {
  logoutCurrentUser();
});

notificationButton?.addEventListener('click', () => {
  window.location.hash = '#notifications';
  sidebarLinks.forEach((link) => link.classList.remove('active'));
  document.querySelector('.sidebar-link[href="#notifications"]')?.classList.add('active');
});

sidebarLinks.forEach((link) => {
  link.addEventListener('click', () => {
    sidebarLinks.forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

updateProfileSummary();
loadStudentData();
