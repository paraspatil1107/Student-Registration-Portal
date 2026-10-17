const Waitlist = require('../models/Waitlist');
const Course = require('../models/Course');
const Registration = require('../models/Registration');
const { reorderWaitlist } = require('../utils/waitlist');

const joinWaitlist = async (req, res) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const isAlreadyRegistered = await Registration.exists({
      student: req.user._id,
      course: courseId,
      status: 'registered',
    });

    if (isAlreadyRegistered) {
      return res.status(400).json({ message: 'You are already enrolled in this course.' });
    }

    const enrolled = await Registration.countDocuments({ course: courseId, status: 'registered' });
    if (enrolled < course.capacity) {
      return res.status(400).json({ message: 'This course still has open seats. Register directly instead.' });
    }

    const existingWait = await Waitlist.findOne({
      student: req.user._id,
      course: courseId,
      status: 'waiting',
    });

    if (existingWait) {
      return res.status(400).json({ message: `You are already on the waitlist for this course (Position #${existingWait.position}).` });
    }

    const currentWaiters = await Waitlist.countDocuments({
      course: courseId,
      status: 'waiting',
    });

    const position = currentWaiters + 1;

    const waitlistItem = await Waitlist.create({
      student: req.user._id,
      course: courseId,
      position,
      status: 'waiting',
    });

    res.status(201).json({
      message: `Successfully joined waitlist for ${course.courseCode}. Your position is #${position}.`,
      waitlist: waitlistItem,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to join waitlist.', error: error.message });
  }
};

const getMyWaitlist = async (req, res) => {
  try {
    const waitlist = await Waitlist.find({ student: req.user._id, status: { $ne: 'cancelled' } })
      .populate('course')
      .sort({ requestedAt: -1 });

    res.json(waitlist.filter((item) => item.course));
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch waitlist.', error: error.message });
  }
};

const leaveWaitlist = async (req, res) => {
  try {
    const { courseId } = req.params;

    const deleted = await Waitlist.findOneAndDelete({
      student: req.user._id,
      course: courseId,
      status: 'waiting',
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Waitlist entry not found.' });
    }

    await reorderWaitlist(courseId);

    res.json({ message: 'Successfully removed from waitlist.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to leave waitlist.', error: error.message });
  }
};

module.exports = { joinWaitlist, getMyWaitlist, leaveWaitlist };
