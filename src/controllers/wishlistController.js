const Wishlist = require('../models/Wishlist');
const Course = require('../models/Course');
const Registration = require('../models/Registration');

const addToWishlist = async (req, res) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const existing = await Wishlist.findOne({
      student: req.user._id,
      course: courseId,
    });

    if (existing) {
      return res.status(400).json({ message: 'Course is already in your wishlist.' });
    }

    const wishlistItem = await Wishlist.create({
      student: req.user._id,
      course: courseId,
    });

    res.status(201).json({ message: 'Added to wishlist.', item: wishlistItem });
  } catch (error) {
    res.status(500).json({ message: 'Unable to add to wishlist.', error: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ student: req.user._id })
      .populate('course')
      .sort({ createdAt: -1 });

    const itemsWithAvailability = await Promise.all(
      wishlist.map(async (item) => {
        if (!item.course) return null;
        const activeEnrolled = await Registration.countDocuments({
          course: item.course._id,
          status: 'registered',
        });
        const isRegistered = await Registration.exists({
          student: req.user._id,
          course: item.course._id,
          status: 'registered',
        });

        return {
          _id: item._id,
          course: item.course,
          enrolledCount: activeEnrolled,
          isFull: activeEnrolled >= item.course.capacity,
          isRegistered: Boolean(isRegistered),
          addedAt: item.createdAt,
        };
      })
    );

    res.json(itemsWithAvailability.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch wishlist.', error: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { courseId } = req.params;

    const deleted = await Wishlist.findOneAndDelete({
      student: req.user._id,
      course: courseId,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Wishlist item not found.' });
    }

    res.json({ message: 'Removed from wishlist.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to remove from wishlist.', error: error.message });
  }
};

module.exports = { addToWishlist, getWishlist, removeFromWishlist };
