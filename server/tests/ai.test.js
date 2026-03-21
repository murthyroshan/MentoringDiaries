/**
 * AI service fallback tests.
 *
 * GROQ_API_KEY is intentionally absent in the test environment (setup.js does
 * not set it), so every call that would reach Groq instead uses the
 * keyword-based heuristic fallback.  These tests verify that the fallback path
 * produces valid, correctly-shaped results without any external dependency.
 */

const { analyzeEntry, generateMentorSuggestion, generateWeeklyInsights } = require('../src/services/aiService');

// ─── analyzeEntry ─────────────────────────────────────────────────────────────

describe('analyzeEntry — keyword fallback (no GROQ_API_KEY)', () => {
    it('returns a valid analysis object with all required fields', async () => {
        const result = await analyzeEntry(
            'This week I focused on data structures and algorithms. I made good progress.',
            'student123'
        );

        expect(result).toMatchObject({
            sentiment: expect.stringMatching(/^(positive|neutral|negative)$/),
            sentimentScore: expect.any(Number),
            summary: expect.any(String),
            riskLevel: expect.stringMatching(/^(low|medium|high|critical)$/),
            riskScore: expect.any(Number),
            keyConcerns: expect.any(Array),
            confidence: expect.any(Number),
            keywords: expect.any(Array),
            flagged: expect.any(Boolean),
            analysisVersion: '4.0-fallback',
        });
    });

    it('detects positive sentiment for upbeat content', async () => {
        const result = await analyzeEntry(
            'I am happy and confident this week. I improved a lot and scored well on my tests. I feel motivated and productive.',
            'student_pos'
        );
        expect(result.sentiment).toBe('positive');
        expect(result.flagged).toBe(false);
        expect(result.riskLevel).toBe('low');
    });

    it('detects negative sentiment and medium risk for several warning keywords', async () => {
        const result = await analyzeEntry(
            'I feel overwhelmed, stressed, and anxious. I am struggling with my assignments and feel burnout. The pressure is too much. I am exhausted.',
            'student_neg'
        );
        expect(result.sentiment).toBe('negative');
        // 4+ warning keywords → medium risk
        expect(['medium', 'high', 'critical']).toContain(result.riskLevel);
        expect(result.flagged).toBe(true);
    });

    it('detects high risk and flags entry when a danger keyword is present', async () => {
        const result = await analyzeEntry(
            'I have been feeling hopeless lately and do not know what to do anymore.',
            'student_danger'
        );
        expect(result.riskLevel).toBe('high');
        expect(result.flagged).toBe(true);
        const words = result.keywords.map((k) => k.word);
        expect(words).toContain('hopeless');
    });

    it('escalates to critical risk when consecutiveHighCount >= 3', async () => {
        const result = await analyzeEntry(
            'Another difficult week. I am still struggling and feeling depressed.',
            'student_consec',
            {},
            3  // consecutiveHighCount
        );
        expect(result.riskLevel).toBe('critical');
        expect(result.flagged).toBe(true);
    });

    it('neutral content with no keywords returns low risk and not flagged', async () => {
        const result = await analyzeEntry(
            'This week I attended lectures and completed my lab assignments on time. Nothing unusual happened.',
            'student_neutral'
        );
        expect(result.riskLevel).toBe('low');
        expect(result.flagged).toBe(false);
        expect(result.confidence).toBeLessThan(1);
    });

    it('riskFactors object is present with numeric values', async () => {
        const result = await analyzeEntry(
            'I had a productive week and completed my goals successfully.',
            'student_factors',
            { attendancePercentage: 90, avgSubjectRating: 4, emotionalRating: 4 }
        );
        const rf = result.riskFactors;
        expect(typeof rf.sentimentFactor).toBe('number');
        expect(typeof rf.attendanceFactor).toBe('number');
        expect(typeof rf.understandingFactor).toBe('number');
        expect(typeof rf.marksFactor).toBe('number');
        expect(typeof rf.consecutiveFactor).toBe('number');
        expect(typeof rf.keywordFactor).toBe('number');
    });

    it('low attendance raises attendanceFactor', async () => {
        const highAttendance = await analyzeEntry('Normal week.', 'sA', { attendancePercentage: 90 });
        const lowAttendance  = await analyzeEntry('Normal week.', 'sB', { attendancePercentage: 60 });
        expect(lowAttendance.riskFactors.attendanceFactor).toBeGreaterThan(highAttendance.riskFactors.attendanceFactor);
    });
});

// ─── generateMentorSuggestion ─────────────────────────────────────────────────

describe('generateMentorSuggestion — fallback (no GROQ_API_KEY)', () => {
    const sampleEntry = {
        content: 'I am feeling stressed and overwhelmed this week.',
        aiAnalysis: {
            summary: 'Student shows signs of stress.',
            sentiment: 'negative',
            riskLevel: 'medium',
            keyConcerns: ['stress', 'overwhelmed'],
        },
    };

    it('returns an object with supportiveResponse and suggestedGuidance', async () => {
        const result = await generateMentorSuggestion(sampleEntry);
        expect(typeof result.supportiveResponse).toBe('string');
        expect(result.supportiveResponse.length).toBeGreaterThan(10);
        expect(Array.isArray(result.suggestedGuidance)).toBe(true);
        expect(result.suggestedGuidance.length).toBeGreaterThan(0);
    });

    it('returns a numeric confidence between 0 and 1', async () => {
        const result = await generateMentorSuggestion(sampleEntry);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('works when entry has no aiAnalysis', async () => {
        const result = await generateMentorSuggestion({ content: 'I had a good week overall.' });
        expect(typeof result.supportiveResponse).toBe('string');
    });
});

// ─── generateWeeklyInsights ───────────────────────────────────────────────────

describe('generateWeeklyInsights — fallback (no GROQ_API_KEY)', () => {
    it('returns stable trends and low engagement for an empty entry list', async () => {
        const result = await generateWeeklyInsights([]);
        expect(result.sentimentTrend).toBe('stable');
        expect(result.engagementLevel).toBe('low');
        expect(result.riskTrend).toBe('stable');
        expect(typeof result.insightParagraph).toBe('string');
    });

    it('detects high engagement when 4+ entries are provided', async () => {
        const entries = Array.from({ length: 4 }, (_, i) => ({
            createdAt: new Date(),
            aiAnalysis: { sentiment: 'positive', riskLevel: 'low', riskScore: 18, summary: `Week ${i + 1}` },
        }));
        const result = await generateWeeklyInsights(entries);
        expect(result.engagementLevel).toBe('high');
    });

    it('reports increasing risk trend when risk scores rise', async () => {
        const entries = [
            { createdAt: new Date(), aiAnalysis: { sentiment: 'neutral', riskLevel: 'low',    riskScore: 18 } },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'neutral', riskLevel: 'medium', riskScore: 45 } },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'negative', riskLevel: 'high',   riskScore: 70 } },
        ];
        const result = await generateWeeklyInsights(entries);
        expect(result.riskTrend).toBe('increasing');
    });

    it('produces a non-empty insightParagraph string', async () => {
        const entries = [
            { createdAt: new Date(), aiAnalysis: { sentiment: 'positive', riskLevel: 'low', riskScore: 18, summary: 'Good week' } },
        ];
        const result = await generateWeeklyInsights(entries);
        expect(result.insightParagraph.length).toBeGreaterThan(20);
    });

    it('confidence is < 1 when using the fallback path', async () => {
        const result = await generateWeeklyInsights([]);
        // No Groq → fallback confidence is 0.58
        expect(result.confidence).toBeLessThan(1);
    });
});
