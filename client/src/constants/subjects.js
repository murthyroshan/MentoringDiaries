// Shared subject list per semester — mirrors server/src/constants/subjects.js
export const SUBJECTS = {
    CSE: {
        1: ['Engineering Mathematics I', 'Engineering Physics', 'Engineering Chemistry', 'Programming in C', 'Engineering Graphics', 'English Communication'],
        2: ['Engineering Mathematics II', 'Engineering Physics Lab', 'Data Structures', 'Digital Logic Design', 'Object Oriented Programming', 'Environmental Science'],
        3: ['Discrete Mathematics', 'Computer Organization', 'Database Management Systems', 'Operating Systems', 'Design & Analysis of Algorithms', 'Web Technologies'],
        4: ['Theory of Computation', 'Computer Networks', 'Software Engineering', 'Microprocessors', 'Formal Languages & Automata', 'Object Oriented Design'],
        5: ['Compiler Design', 'Machine Learning', 'Cloud Computing', 'Information Security', 'Mobile Application Development', 'Open Elective I'],
        6: ['Artificial Intelligence', 'Big Data Analytics', 'Distributed Systems', 'Deep Learning', 'Blockchain Technology', 'Open Elective II'],
        7: ['Project Phase I', 'Internet of Things', 'Natural Language Processing', 'Professional Elective I', 'Professional Elective II', 'Seminar'],
        8: ['Project Phase II', 'Professional Elective III', 'Entrepreneurship Development', 'Industry Internship'],
    },
    ECE: {
        1: ['Engineering Mathematics I', 'Engineering Physics', 'Engineering Chemistry', 'Basic Electrical Engineering', 'Engineering Graphics', 'English Communication'],
        2: ['Engineering Mathematics II', 'Electronic Devices', 'Network Theory', 'Digital Electronics', 'Signal Processing', 'Environmental Science'],
        3: ['Analog Circuits', 'Electromagnetic Theory', 'Control Systems', 'Microcontrollers', 'Communication Systems', 'VLSI Design'],
        4: ['Digital Signal Processing', 'Antenna & Propagation', 'Embedded Systems', 'Wireless Communication', 'Linear Integrated Circuits', 'PCB Design'],
        5: ['Digital Image Processing', 'Radar & TV Systems', 'Optical Fiber Communication', 'Microwave Engineering', 'Open Elective I', 'Elective I'],
        6: ['Satellite Communication', 'IoT & Applications', 'MEMS Technology', 'Biomedical Electronics', 'Open Elective II', 'Elective II'],
        7: ['Project Phase I', 'Advanced Communication', 'Robotics', 'Professional Elective I', 'Professional Elective II', 'Seminar'],
        8: ['Project Phase II', 'Professional Elective III', 'Entrepreneurship Development', 'Industry Internship'],
    },
    DEFAULT: {
        1: ['Mathematics I', 'Physics', 'Chemistry', 'Core Subject I', 'Core Subject II', 'Communication Skills'],
        2: ['Mathematics II', 'Core Subject III', 'Core Subject IV', 'Core Subject V', 'Lab I', 'Environmental Science'],
        3: ['Core Subject VI', 'Core Subject VII', 'Core Subject VIII', 'Core Subject IX', 'Lab II', 'Professional Elective I'],
        4: ['Core Subject X', 'Core Subject XI', 'Core Subject XII', 'Elective I', 'Lab III', 'Seminar'],
        5: ['Advanced Subject I', 'Advanced Subject II', 'Advanced Subject III', 'Elective II', 'Lab IV', 'Open Elective'],
        6: ['Advanced Subject IV', 'Advanced Subject V', 'Elective III', 'Elective IV', 'Lab V', 'Mini Project'],
        7: ['Project Phase I', 'Elective V', 'Elective VI', 'Industrial Training', 'Seminar'],
        8: ['Project Phase II', 'Elective VII', 'Entrepreneurship', 'Internship'],
    },
};

export function getSubjectsForSemester(department = '', semester = 1) {
    const deptKey = Object.keys(SUBJECTS).find(
        k => k.toLowerCase() === (department || '').toLowerCase()
    ) || 'DEFAULT';
    return SUBJECTS[deptKey]?.[semester] || SUBJECTS.DEFAULT[semester] || [];
}

export const SKILL_CATEGORIES = ['Technical', 'Communication', 'Leadership', 'Soft Skills', 'Other'];
export const SKILL_SOURCES = ['college', 'external', 'self-learned', 'internship', 'project'];
export const EVENT_TYPES = ['technical', 'cultural', 'sports', 'workshop', 'hackathon', 'seminar', 'other'];
export const ACHIEVEMENTS = ['participated', 'winner', 'runner-up', 'special-mention', 'coordinator', 'volunteer', 'other'];
export const EXAM_TYPES = [{ value: 'mid1', label: 'Mid Semester I' }, { value: 'mid2', label: 'Mid Semester II' }, { value: 'endsem', label: 'End Semester' }];
