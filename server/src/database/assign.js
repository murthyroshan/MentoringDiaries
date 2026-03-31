const path = require('path');
const db = require(path.join(__dirname, 'db'));

const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get('testuser@gmail.com');
const mentor = db.prepare('SELECT id, email FROM users WHERE email = ?').get('testmentor@gmail.com');

console.log('User:', user);
console.log('Mentor:', mentor);

if (user && mentor) {
    db.prepare('UPDATE users SET mentor_id = ? WHERE id = ?').run(mentor.id, user.id);
    console.log('Assigned testuser to testmentor successfully.');
} else {
    console.log('Could not assign. One or both users not found.');
}
