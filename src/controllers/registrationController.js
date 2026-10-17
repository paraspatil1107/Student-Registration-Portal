const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Course = require('../models/Course');
const Waitlist = require('../models/Waitlist');

// Helper to parse time string "HH:MM" into minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

// Helper to check schedule overlap between two courses
const checkScheduleOverlap = (sched1, sched2) => {
  if (!sched1 || !sched2) return false;
  if (!sched1.days || !sched2.days || !sched1.days.length || !sched2.days.length) return false;

  const sharedDays = sched1.days.filter((day) => sched2.days.includes(day));
  if (sharedDays.length === 0) return false;

  const start1 = parseTimeToMinutes(sched1.startTime);
  const end1 = parseTimeToMinutes(sched1.endTime);
  const start2 = parseTimeToMinutes(sched2.startTime);
  const end2 = parseTimeToMinutes(sched2.endTime);

  if (start1 === null || end1 === null || start2 === null || end2 === null) return false;

  return start1 < end2 && start2 < end1;
};

// Helper to generate a unique registration ID format: REG-YYYY-XXXXXX
const generateRegistrationId = async () => {
  const year = new Date().getFullYear();
  const count = await Registration.countDocuments();
  let candidate = `REG-${year}-${String(count + 1).padStart(6, '0')}`;
  let exists = await Registration.findOne({ registrationId: candidate });
  let offset = 1;
  while (exists) {
    candidate = `REG-${year}-${String(count + 1 + offset).padStart(6, '0')}`;
    exists = await Registration.findOne({ registrationId: candidate });
    offset++;
  }
  return candidate;
};

const registerForCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    const course = await Course.findById(courseId).populate('prerequisites');
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    // 1. Course Status Validation
    if (course.status && course.status !== 'active') {
      return res.status(400).json({ message: `Course is not available for registration (Status: ${course.status}).` });
    }

    // 2. Duplicate Registration Check (Active)
    const existingRegistration = await Registration.findOne({
      student: req.user._id,
      course: courseId,
      status: 'registered',
    });

    if (existingRegistration) {
      return res.status(400).json({ message: 'You are already registered for this course.' });
    }

    // 3. Capacity Check (Active)
    const totalRegistrations = await Registration.countDocuments({ course: courseId, status: 'registered' });
    if (totalRegistrations >= course.capacity) {
      return res.status(400).json({ message: 'Course capacity is full.' });
    }

    // Fetch existing active registrations for student
    const studentRegistrations = await Registration.find({ student: req.user._id, status: 'registered' }).populate('course');
    const registeredCourses = studentRegistrations.map((r) => r.course).filter(Boolean);

    // 4. Credit Limit Check
    const currentTotalCredits = registeredCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
    const maxLimit = req.user.maxCredits || 24;
    if (currentTotalCredits + (course.credits || 0) > maxLimit) {
      return res.status(400).json({
        message: `Credit limit exceeded. Current: ${currentTotalCredits} credits, Course: ${course.credits} credits. Maximum limit is ${maxLimit} credits.`,
      });
    }

    // 5. Prerequisites Check
    if (course.prerequisites && course.prerequisites.length > 0) {
      const registeredIds = new Set(registeredCourses.map((c) => c._id.toString()));
      const unfulfilledPrereqs = course.prerequisites.filter((p) => !registeredIds.has(p._id ? p._id.toString() : p.toString()));

      if (unfulfilledPrereqs.length > 0) {
        const prereqNames = unfulfilledPrereqs
          .map((p) => p.courseName || p.courseCode || 'Prerequisite Course')
          .join(', ');
        return res.status(400).json({
          message: `Prerequisite requirements not met. Required prerequisite course(s): ${prereqNames}.`,
        });
      }
    }

    // 6. Schedule Conflict Check
    if (course.schedule && course.schedule.days && course.schedule.days.length > 0) {
      for (const registeredCourse of registeredCourses) {
        if (registeredCourse.schedule && checkScheduleOverlap(course.schedule, registeredCourse.schedule)) {
          return res.status(400).json({
            message: `Schedule conflict detected with ${registeredCourse.courseCode} (${registeredCourse.courseName}). Overlapping times.`,
          });
        }
      }
    }

    const regId = await generateRegistrationId();

    const registration = await Registration.create({
      registrationId: regId,
      student: req.user._id,
      course: courseId,
      status: 'registered',
      registeredAt: new Date(),
    });

    res.status(201).json({ message: 'Course registered successfully.', registration });
  } catch (error) {
    res.status(500).json({ message: 'Unable to register for course.', error: error.message });
  }
};

const getMyCourses = async (req, res) => {
  try {
    const registrations = await Registration.find({ student: req.user._id, status: 'registered' })
      .populate('course')
      .sort({ registeredAt: -1 });

    const courses = registrations.map((item) => item.course).filter(Boolean);
    const totalCredits = courses.reduce((sum, course) => sum + (course.credits || 0), 0);

    res.json({
      courses,
      totalCredits,
      totalCourses: courses.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch registered courses.', error: error.message });
  }
};

const dropCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    const registration = await Registration.findOne({
      student: req.user._id,
      course: courseId,
      status: 'registered',
    });

    if (!registration) {
      return res.status(404).json({ message: 'Active registration not found.' });
    }

    registration.status = 'dropped';
    registration.droppedAt = new Date();
    await registration.save();

    // Auto-promote top student from waitlist if present
    const topWait = await Waitlist.findOne({
      course: courseId,
      status: 'waiting',
    }).sort({ position: 1, requestedAt: 1 });

    if (topWait) {
      const regId = await generateRegistrationId();
      await Registration.create({
        registrationId: regId,
        student: topWait.student,
        course: courseId,
        status: 'registered',
        registeredAt: new Date(),
      });

      topWait.status = 'enrolled';
      await topWait.save();

      // Recalculate positions for remaining waitlisted students
      const remaining = await Waitlist.find({ course: courseId, status: 'waiting' }).sort({ position: 1, requestedAt: 1 });
      for (let i = 0; i < remaining.length; i++) {
        remaining[i].position = i + 1;
        await remaining[i].save();
      }
    }

    res.json({ message: 'Course dropped successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to drop course.', error: error.message });
  }
};

const getRegistrationHistory = async (req, res) => {
  try {
    const history = await Registration.find({ student: req.user._id })
      .populate('course')
      .sort({ registeredAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch registration history.', error: error.message });
  }
};

module.exports = { registerForCourse, getMyCourses, dropCourse, getRegistrationHistory };
