const Notification = require('../models/Notification');
const { idsEqual } = require('../utils/accessControl');
const { getPagination } = require('../utils/pagination');

exports.getMyNotifications = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = { user: req.user._id };

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Notification.countDocuments(query),
            Notification.countDocuments({ user: req.user._id, read: false }),
        ]);

        res.json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

exports.markRead = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
        if (!idsEqual(notification.user, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        notification.read = true;
        await notification.save();
        res.json({ success: true, data: notification, message: 'Notification marked as read.' });
    } catch (error) {
        next(error);
    }
};

exports.markAllRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};

