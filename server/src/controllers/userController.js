const queries = require('../database/queries');
const db = require('../database/db');
const { notifyUserWithPersistence } = require('../socket');
const { getPagination } = require('../utils/pagination');

function safeUser(u) {
    if (!u) return null;
    const { password_hash, refresh_token, ...safe } = u;
    return safe;
}

// GET /api/users
exports.getUsers = (req, res, next) => {
    try {
        const { role, department, section, is_active, search } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        let sql = `
            SELECT u.id, u.email, u.name, u.role, u.department, u.section, u.roll_number,
                   u.batch, u.current_semester, u.mentor_id, u.is_active, u.last_login, u.created_at,
                   m.name as mentor_name, m.email as mentor_email
            FROM users u
            LEFT JOIN users m ON m.id = u.mentor_id
            WHERE 1=1
        `;
        const params = [];

        if (req.user.role === 'mentor') {
            sql += ' AND u.mentor_id = ? AND u.role = ?';
            params.push(req.user.id, 'student');
        } else {
            if (role !== undefined) {
                if (!['student', 'mentor', 'admin'].includes(role)) {
                    return res.status(400).json({ success: false, message: 'Invalid role filter.' });
                }
                sql += ' AND u.role = ?'; params.push(role);
            }
        }

        if (department) { sql += ' AND u.department = ?'; params.push(department); }
        if (section) { sql += ' AND u.section = ?'; params.push(section); }
        if (is_active !== undefined) { sql += ' AND u.is_active = ?'; params.push(is_active === 'true' || is_active === '1' ? 1 : 0); }
        else { sql += ' AND u.is_active = 1'; }

        if (search) {
            const s = `%${search.replace(/[%_\\]/g, '\\$&').slice(0, 80)}%`;
            sql += " AND (u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.department LIKE ? ESCAPE '\\')";
            params.push(s, s, s);
        }

        const total = db.prepare(`SELECT COUNT(*) as n FROM (${sql})`).get(...params).n;
        sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, skip);

        const users = db.prepare(sql).all(...params).map(u => ({
            ...safeUser(u),
            mentor: u.mentor_id ? { id: u.mentor_id, name: u.mentor_name, email: u.mentor_email } : null,
        }));

        return res.json({
            success: true,
            data: users,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/:id
exports.getUserById = (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const user = queries.findUserById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (req.user.role !== 'admin') {
            if (req.user.role === 'student' && req.user.id !== userId) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
            if (req.user.role === 'mentor') {
                if (req.user.id !== userId) {
                    // Check if this student is assigned to this mentor
                    const s = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(userId);
                    if (!s || s.mentor_id !== req.user.id) {
                        return res.status(403).json({ success: false, message: 'Access denied.' });
                    }
                }
            }
        }

        let mentorInfo = null;
        if (user.mentor_id) mentorInfo = safeUser(queries.findUserById(user.mentor_id));

        return res.json({ success: true, data: { ...safeUser(user), mentor: mentorInfo } });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/:id
exports.updateUser = (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const { name, department, section, batch, roll_number, email, current_semester, is_active, role } = req.body;

        const isAdmin = req.user.role === 'admin';
        if (!isAdmin && req.user.id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const updates = {};
        if (name) updates.name = name.trim();

        // Only admins may edit the structural fields that drive attendance lookups,
        // section reports and role/activation. A student self-editing can change
        // their display name only — never their department/section/roll.
        if (isAdmin) {
            if (department !== undefined) updates.department = department;
            if (section !== undefined) updates.section = section;
            if (batch !== undefined) updates.batch = batch;
            if (email !== undefined) updates.email = String(email).trim().toLowerCase();
            if (roll_number !== undefined) updates.roll_number = Number(roll_number);
            if (current_semester !== undefined) {
                const sem = Number(current_semester);
                if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
                    return res.status(400).json({ success: false, message: 'Semester must be an integer between 1 and 8.' });
                }
                updates.current_semester = sem;
            }
            if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
            if (role !== undefined) {
                if (!['student', 'mentor', 'admin'].includes(role)) {
                    return res.status(400).json({ success: false, message: 'Invalid role.' });
                }
                updates.role = role;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update.' });
        }

        const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
        updates.id = userId;
        const result = db.prepare(`UPDATE users SET ${fields} WHERE id = @id`).run(updates);

        if (result.changes === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const user = queries.findUserById(userId);
        return res.json({ success: true, data: safeUser(user) });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/:studentId/assign-mentor
exports.assignMentor = (req, res, next) => {
    try {
        const studentId = Number(req.params.studentId);
        const { mentorId } = req.body;

        const student = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
        const mentor = db.prepare('SELECT * FROM users WHERE id = ? AND role = ? AND is_active = 1').get(Number(mentorId), 'mentor');

        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        if (!mentor)  return res.status(404).json({ success: false, message: 'Mentor not found' });

        const oldMentorId = student.mentor_id;

        db.prepare('UPDATE users SET mentor_id = ? WHERE id = ?').run(Number(mentorId), studentId);

        // Notify old mentor
        if (oldMentorId && oldMentorId !== Number(mentorId)) {
            notifyUserWithPersistence(oldMentorId, {
                type: 'system:announcement',
                title: 'Student Reassigned',
                message: `${student.name} has been reassigned to another mentor.`,
                metadata: { studentId },
            });
        }
        // Notify new mentor
        notifyUserWithPersistence(Number(mentorId), {
            type: 'system:announcement',
            title: 'New Student Assigned',
            message: `${student.name} has been assigned to you as a mentee.`,
            metadata: { studentId },
        });

        const updatedStudent = safeUser(queries.findUserById(studentId));
        return res.json({ success: true, message: 'Mentor assigned successfully', data: { student: updatedStudent, mentor: safeUser(queries.findUserById(Number(mentorId))) } });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/:id
exports.deleteUser = (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const user = queries.findUserById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);

        if (user.role === 'student') {
            db.prepare("UPDATE diary_entries SET status = 'archived' WHERE student_id = ?").run(userId);
        } else if (user.role === 'mentor') {
            db.prepare('UPDATE users SET mentor_id = NULL WHERE mentor_id = ?').run(userId);
        }

        return res.json({ success: true, message: 'User deactivated successfully' });
    } catch (error) {
        next(error);
    }
};
