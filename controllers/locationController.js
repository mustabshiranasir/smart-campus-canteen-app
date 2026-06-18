import UserLocation from '../models/UserLocation.js';

export const updateMyLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, heading, speed, isSharing } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    const location = await UserLocation.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role,
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        isSharing: isSharing !== undefined ? isSharing : true,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: location });
  } catch (error) {
    next(error);
  }
};

export const getMyLocation = async (req, res, next) => {
  try {
    const location = await UserLocation.findOne({ userId: req.user._id });
    res.status(200).json({ success: true, data: location });
  } catch (error) {
    next(error);
  }
};

export const stopSharingLocation = async (req, res, next) => {
  try {
    await UserLocation.findOneAndUpdate(
      { userId: req.user._id },
      { isSharing: false, lastUpdated: new Date() }
    );
    res.status(200).json({ success: true, message: 'Location sharing stopped' });
  } catch (error) {
    next(error);
  }
};

export const getAllSharedLocations = async (req, res, next) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const locations = await UserLocation.find({
      isSharing: true,
      role: { $in: ['student', 'faculty'] },
      lastUpdated: { $gte: fiveMinutesAgo },
    })
      .populate('userId', 'name email role profilePicture')
      .sort({ lastUpdated: -1 });

    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
};
