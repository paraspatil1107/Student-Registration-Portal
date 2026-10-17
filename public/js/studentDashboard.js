const token = getToken();
const user = getUser();

if (!token || !user || user.role !== 'student') {
  redirectToLogin();
}

setPageTitle('Student Dashboard');

const $ = (id) => document.getElementById(id);

const courseList = $('courseList');
const myCourses = $('myCourses');
const courseSearch = $('courseSearch');
const courseFilter = $('courseFilter');
const wishlistGrid = $('wishlistGrid');
const waitlistGrid = $('waitlistGrid');
const historyTableBody = $('historyTableBody');
const notificationList = $('notificationList');
const scheduleConflictBanner = $('scheduleConflictBanner');
const sidebarLinks = document.querySelectorAll('.sidebar-link');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const daySlots = Object.fromEntries(DAYS.map((day) => [day, $(`day-${day}`)]));
const semesterValue = 'Fall 2026';

// Everything the page renders from; refreshed by loadStudentData().
const state = {
  profile: user,
  courses: [],
  myCourses: { courses: [], totalCredits: 0, totalCourses: 0 },
  wishlist: [],
  waitlist: [],
  history: [],
};

const maxCreditLimit = () => state.profile.maxCredits || 24;
const empty = (text) => `<p class="empty-state">${escapeHtml(text)}</p>`;

const scheduleText = (schedule) => {
  if (!schedule || !schedule.days || !schedule.days.length) return 'Schedule TBA';
  const time = schedule.startTime && schedule.endTime ? ` · ${schedule.startTime}-${schedule.endTime}` : '';
  return `${schedule.days.join('/')}${time}${schedule.location ? ` · ${schedule.location}` : ''}`;
};

const seatBar = (course) => {
  const enrolled = course.enrolledCount || 0;
  const ratio = course.capacity ? enrolled / course.capacity : 0;
  const tone = ratio >= 1 ? 'full' : ratio >= 0.8 ? 'almost' : '';
  return `
    <div class="seat-bar ${tone}" aria-hidden="true"><div style="width:${Math.min(ratio * 100, 100)}%"></div></div>
    <p class="text-muted" style="font-size:0.82rem;margin:0">${enrolled} / ${course.capacity} seats filled${
      ratio >= 1 ? ' · <span class="badge badge-danger">Full</span>' : ''
    }</p>
  `;
};

const primaryActionFor = (course, { isRegistered, isWaitlisted }) => {
  if (isRegistered) return '<button disabled class="btn btn-secondary">Enrolled</button>';
  if (isWaitlisted) return '<button disabled class="btn btn-secondary">On waitlist</button>';
  if (course.status && course.status !== 'active') return `<button disabled class="btn btn-secondary">${escapeHtml(course.status)}</button>`;
  if ((course.enrolledCount || 0) >= course.capacity) {
    return `<button data-action="waitlist" data-id="${course._id}" class="btn btn-warning">Join waitlist</button>`;
  }
  return `<button data-action="register" data-id="${course._id}" class="btn btn-primary">Register</button>`;
};

const lookups = () => ({
  registered: new Set(state.myCourses.courses.map((c) => c._id)),
  wishlisted: new Set(state.wishlist.map((item) => item.course._id)),
  waitlisted: new Set(state.waitlist.filter((i) => i.status === 'waiting').map((item) => item.course._id)),
});

const updateProfileSummary = () => {
  const profile = state.profile;
  const displayName = profile.name || 'Student';
  const displayId = profile.id ? `NS-${profile.id.slice(-6).toUpperCase()}` : '-';
  const completed = state.history.filter((h) => h.status === 'completed').length;

  $('studentName').textContent = displayName;
  $('studentId').textContent = displayId;
  $('currentSemester').textContent = semesterValue;
  $('profileName').textContent = displayName;
  $('profileEmail').textContent = profile.email || '-';
  $('profileId').textContent = displayId;
  $('profileSemester').textContent = semesterValue;
  $('profileCreditLimit').textContent = maxCreditLimit();
  $('profileCompleted').textContent = completed;
  $('profileJoinDate').textContent = profile.createdAt ? formatDate(profile.createdAt) : '-';
  $('avatarInitial').textContent = displayName.charAt(0).toUpperCase();
  $('maxCredits').textContent = maxCreditLimit();
};

const renderInstructorFilter = () => {
  const selected = courseFilter.value;
  const instructors = [...new Set(state.courses.map((course) => course.instructor))].sort();
  courseFilter.innerHTML =
    '<option value="">All instructors</option>' +
    instructors.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  courseFilter.value = instructors.includes(selected) ? selected : '';
};

const renderCourses = () => {
  const search = courseSearch.value.trim().toLowerCase();
  const instructor = courseFilter.value;
  const { registered, wishlisted, waitlisted } = lookups();

  const visible = state.courses.filter((course) => {
    const haystack = `${course.courseCode} ${course.courseName} ${course.instructor}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!instructor || course.instructor === instructor);
  });

  if (!visible.length) {
    courseList.innerHTML = empty(state.courses.length ? 'No courses match your search.' : 'No courses have been published yet.');
    return;
  }

  courseList.innerHTML = visible
    .map((course) => {
      const isWishlisted = wishlisted.has(course._id);
      const prereqs = (course.prerequisites || []).map((p) => p.courseCode).filter(Boolean);
      return `
        <article class="course-card">
          <h4>${escapeHtml(course.courseCode)} · ${escapeHtml(course.courseName)}</h4>
          <p>${escapeHtml(course.description)}</p>
          <div class="course-meta">
            <span>👤 ${escapeHtml(course.instructor)}</span>
            <span>🎓 ${course.credits} credits</span>
            <span>🕒 ${escapeHtml(scheduleText(course.schedule))}</span>
            ${prereqs.length ? `<span>🔗 Requires ${escapeHtml(prereqs.join(', '))}</span>` : ''}
          </div>
          ${seatBar(course)}
          <div class="card-actions">
            ${primaryActionFor(course, { isRegistered: registered.has(course._id), isWaitlisted: waitlisted.has(course._id) })}
            <button data-action="${isWishlisted ? 'unwishlist' : 'wishlist'}" data-id="${course._id}" class="btn btn-secondary"
              aria-pressed="${isWishlisted}">${isWishlisted ? '♥ Saved' : '♡ Save'}</button>
          </div>
        </article>
      `;
    })
    .join('');
};

const renderMyCourses = () => {
  const { courses, totalCredits, totalCourses } = state.myCourses;
  const limit = maxCreditLimit();

  $('totalCredits').textContent = totalCredits;
  $('enrolledCount').textContent = totalCourses;
  $('pendingRegistrations').textContent = Math.max(0, limit - totalCredits);
  $('progressCredits').textContent = `${totalCredits} / ${limit}`;
  $('progressFill').style.width = `${Math.min((totalCredits / limit) * 100, 100)}%`;
  $('waitlistCount').textContent = state.waitlist.filter((i) => i.status === 'waiting').length;

  myCourses.innerHTML = courses.length
    ? courses
        .map(
          (course) => `
            <article class="course-card">
              <h4>${escapeHtml(course.courseCode)} · ${escapeHtml(course.courseName)}</h4>
              <div class="course-meta">
                <span>👤 ${escapeHtml(course.instructor)}</span>
                <span>🎓 ${course.credits} credits</span>
                <span>🕒 ${escapeHtml(scheduleText(course.schedule))}</span>
              </div>
              <div class="card-actions">
                <button data-action="drop" data-id="${course._id}" class="btn btn-danger">Drop</button>
              </div>
            </article>
          `
        )
        .join('')
    : empty('You have not registered for any courses yet. Browse the catalog below.');
};

// Only courses with a real schedule go on the timetable; the rest are listed underneath it.
const renderWeeklySchedule = () => {
  const courses = state.myCourses.courses;
  const buckets = Object.fromEntries(DAYS.map((day) => [day, []]));
  const unscheduled = [];

  courses.forEach((course) => {
    const s = course.schedule || {};
    if (!s.days || !s.days.length || !s.startTime || !s.endTime) {
      unscheduled.push(course);
      return;
    }
    s.days.forEach((day) => buckets[day] && buckets[day].push(course));
  });

  let hasConflicts = false;
  DAYS.forEach((day) => {
    const container = daySlots[day];
    if (!container) return;
    const slots = buckets[day].sort((a, b) => parseTimeToMinutes(a.schedule.startTime) - parseTimeToMinutes(b.schedule.startTime));

    if (!slots.length) {
      container.innerHTML = '<p class="text-muted text-center" style="font-size:0.8rem; margin-top:1rem;">No classes</p>';
      return;
    }

    const conflicted = new Set();
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i].schedule;
        const b = slots[j].schedule;
        if (parseTimeToMinutes(a.startTime) < parseTimeToMinutes(b.endTime) && parseTimeToMinutes(b.startTime) < parseTimeToMinutes(a.endTime)) {
          conflicted.add(slots[i]._id);
          conflicted.add(slots[j]._id);
          hasConflicts = true;
        }
      }
    }

    container.innerHTML = slots
      .map(
        (course) => `
          <div class="timetable-card ${conflicted.has(course._id) ? 'conflict' : ''}">
            <div class="timetable-code">${escapeHtml(course.courseCode)}</div>
            <div style="font-weight: 600;">${escapeHtml(course.courseName)}</div>
            <div class="timetable-time">🕒 ${escapeHtml(course.schedule.startTime)} - ${escapeHtml(course.schedule.endTime)}</div>
            <div class="timetable-room">📍 ${escapeHtml(course.schedule.location || 'TBD')} · ${escapeHtml(course.instructor)}</div>
            ${conflicted.has(course._id) ? '<span class="badge badge-danger" style="margin-top:0.3rem;">⚠️ Conflict</span>' : ''}
          </div>
        `
      )
      .join('');
  });

  const notes = [];
  if (hasConflicts) notes.push('<span class="badge badge-danger">⚠️ Schedule conflict detected</span>');
  if (unscheduled.length) {
    notes.push(`<span class="badge badge-warning">Time TBA: ${unscheduled.map((c) => escapeHtml(c.courseCode)).join(', ')}</span>`);
  }
  scheduleConflictBanner.innerHTML = notes.join(' ');
};

// Builds the activity feed from real registration history, newest first.
const renderNotifications = () => {
  const events = state.history
    .filter((item) => item.course)
    .flatMap((item) => {
      const list = [{ when: item.registeredAt, title: `Registered for ${item.course.courseCode}`, detail: item.course.courseName }];
      if (item.status === 'dropped' && item.droppedAt) {
        list.push({ when: item.droppedAt, title: `Dropped ${item.course.courseCode}`, detail: item.course.courseName });
      }
      if (item.status === 'completed') {
        list.push({ when: item.updatedAt, title: `Completed ${item.course.courseCode}`, detail: item.course.courseName });
      }
      return list;
    })
    .concat(
      state.waitlist
        .filter((item) => item.status === 'waiting')
        .map((item) => ({ when: item.requestedAt, title: `Waitlisted for ${item.course.courseCode}`, detail: `Position #${item.position}` }))
    )
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, 6);

  $('notificationCount').textContent = String(events.length);
  notificationList.innerHTML = events.length
    ? events
        .map(
          (event) => `
            <div class="course-card">
              <h4>${escapeHtml(event.title)}</h4>
              <p>${escapeHtml(event.detail)}</p>
              <p class="text-muted">${formatDate(event.when)}</p>
            </div>
          `
        )
        .join('')
    : empty('No activity yet.');
};

const renderWishlist = () => {
  if (!state.wishlist.length) {
    wishlistGrid.innerHTML = empty('Your wishlist is empty. Use ♡ Save on any course to bookmark it.');
    return;
  }

  const { waitlisted } = lookups();
  wishlistGrid.innerHTML = state.wishlist
    .map((item) => {
      const course = { ...item.course, enrolledCount: item.enrolledCount };
      return `
        <article class="course-card">
          <h4>${escapeHtml(course.courseCode)} · ${escapeHtml(course.courseName)}</h4>
          <div class="course-meta">
            <span>👤 ${escapeHtml(course.instructor)}</span>
            <span>🎓 ${course.credits} credits</span>
          </div>
          ${seatBar(course)}
          <div class="card-actions">
            ${primaryActionFor(course, { isRegistered: item.isRegistered, isWaitlisted: waitlisted.has(course._id) })}
            <button data-action="unwishlist" data-id="${course._id}" class="btn btn-secondary">Remove</button>
          </div>
        </article>
      `;
    })
    .join('');
};

const renderWaitlist = () => {
  if (!state.waitlist.length) {
    waitlistGrid.innerHTML = empty('You are not on any waitlists.');
    return;
  }

  waitlistGrid.innerHTML = state.waitlist
    .map((item) => {
      const isWaiting = item.status === 'waiting';
      return `
        <article class="course-card">
          <h4>${escapeHtml(item.course.courseCode)} · ${escapeHtml(item.course.courseName)}</h4>
          <p><strong>Status:</strong> ${
            isWaiting
              ? `<span class="badge badge-warning">Position #${item.position}</span>`
              : '<span class="badge badge-success">Enrolled from waitlist</span>'
          }</p>
          ${isWaiting ? `<button data-action="leave-waitlist" data-id="${item.course._id}" class="btn btn-danger">Leave waitlist</button>` : ''}
        </article>
      `;
    })
    .join('');
};

const renderRegistrationHistory = () => {
  if (!state.history.length) {
    historyTableBody.innerHTML = '<tr><td colspan="7" class="text-muted text-center">No registration records found.</td></tr>';
    return;
  }

  const badges = {
    registered: '<span class="badge badge-success">Registered</span>',
    dropped: '<span class="badge badge-danger">Dropped</span>',
    completed: '<span class="badge badge-primary">Completed</span>',
  };

  historyTableBody.innerHTML = state.history
    .map(
      (item) => `
        <tr>
          <td><strong>${escapeHtml(item.registrationId)}</strong></td>
          <td>${escapeHtml(item.course ? item.course.courseName : 'Deleted course')}</td>
          <td><code>${escapeHtml(item.course ? item.course.courseCode : 'N/A')}</code></td>
          <td>${item.course ? item.course.credits : 0}</td>
          <td>${formatDate(item.registeredAt)}</td>
          <td>${badges[item.status] || escapeHtml(item.status)}</td>
          <td>${formatDate(item.droppedAt)}</td>
        </tr>
      `
    )
    .join('');
};

const renderAll = () => {
  updateProfileSummary();
  renderInstructorFilter();
  renderCourses();
  renderMyCourses();
  renderWishlist();
  renderWaitlist();
  renderWeeklySchedule();
  renderNotifications();
  renderRegistrationHistory();
};

const loadStudentData = async () => {
  try {
    const [me, courses, mine, wishlist, waitlist, history] = await Promise.all([
      authFetch('/api/auth/me'),
      authFetch('/api/courses'),
      authFetch('/api/registrations/my-courses'),
      authFetch('/api/wishlist'),
      authFetch('/api/waitlist/my-waitlist'),
      authFetch('/api/registrations/history'),
    ]);

    Object.assign(state, { profile: me.user, courses, myCourses: mine, wishlist, waitlist, history });
    renderAll();
  } catch (error) {
    console.error(error);
    showToast(error.message, 'error');
  }
};

const courseById = (id) =>
  state.courses.find((c) => c._id === id) || state.myCourses.courses.find((c) => c._id === id) || { courseCode: 'this course' };

// One delegated click handler for every course action button on the page.
const actions = {
  async register(id) {
    const course = courseById(id);
    const current = state.myCourses.totalCredits;
    const confirmed = await showConfirm({
      title: `Register for ${course.courseCode}?`,
      message: `${course.courseName}\nInstructor: ${course.instructor}\nCredits: ${current} → ${current + course.credits} of ${maxCreditLimit()}`,
      confirmText: 'Confirm registration',
    });
    if (!confirmed) return;
    await authFetch('/api/registrations', { method: 'POST', body: JSON.stringify({ courseId: id }) });
    showToast(`Registered for ${course.courseCode}.`, 'success');
  },
  async drop(id) {
    const course = courseById(id);
    const confirmed = await showConfirm({
      title: `Drop ${course.courseCode}?`,
      message: 'Your seat will go to the next student on the waitlist.',
      confirmText: 'Drop course',
      danger: true,
    });
    if (!confirmed) return;
    await authFetch(`/api/registrations/${id}`, { method: 'DELETE' });
    showToast(`Dropped ${course.courseCode}.`, 'success');
  },
  async waitlist(id) {
    const course = courseById(id);
    const confirmed = await showConfirm({
      title: `Join the waitlist for ${course.courseCode}?`,
      message: 'This course is full. You will be enrolled automatically when a seat opens.',
      confirmText: 'Join waitlist',
    });
    if (!confirmed) return;
    const res = await authFetch('/api/waitlist', { method: 'POST', body: JSON.stringify({ courseId: id }) });
    showToast(res.message, 'success');
  },
  async 'leave-waitlist'(id) {
    await authFetch(`/api/waitlist/${id}`, { method: 'DELETE' });
    showToast('Left the waitlist.', 'success');
  },
  async wishlist(id) {
    await authFetch('/api/wishlist', { method: 'POST', body: JSON.stringify({ courseId: id }) });
    showToast('Saved to wishlist.', 'success');
  },
  async unwishlist(id) {
    await authFetch(`/api/wishlist/${id}`, { method: 'DELETE' });
    showToast('Removed from wishlist.', 'success');
  },
};

document.querySelector('.page-content').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;

  button.disabled = true;
  try {
    await actions[button.dataset.action](button.dataset.id);
    await loadStudentData();
  } catch (error) {
    showToast(error.message, 'error', 6000);
  } finally {
    button.disabled = false;
  }
});

courseSearch.addEventListener('input', debounce(renderCourses, 150));
courseFilter.addEventListener('change', renderCourses);
$('logoutBtn').addEventListener('click', logoutCurrentUser);

$('notificationButton').addEventListener('click', () => {
  window.location.hash = '#notifications';
  sidebarLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#notifications'));
});

sidebarLinks.forEach((link) => {
  link.addEventListener('click', () => {
    sidebarLinks.forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

updateProfileSummary();
loadStudentData();
