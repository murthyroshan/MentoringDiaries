const queries = require('../database/queries');
const { getPagination } = require('../utils/pagination');

exports.getMyNotifications = (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const all = queries.getNotificationsByUser(req.user.id);
        const total = all.length;
        const notifications = all.slice(skip, skip + limit);
        const unreadCount = all.filter(n => !n.is_read).length;

        return res.json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

exports.markRead = (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const result = queries.markNotificationRead(id, req.user.id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found.' });
        }
        return res.json({ success: true, message: 'Notification marked as read.' });
    } catch (error) {
        next(error);
    }
};

exports.markAllRead = (req, res, next) => {
    try {
        queries.markAllNotificationsRead(req.user.id);
        return res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};
