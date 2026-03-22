/**
 * AI service — production-grade test suite
 *
 * Coverage:
 *  - Happy path (keyword fallback, no GROQ_API_KEY)
 *  - Groq API mocked success path
 *  - Groq API failure / rejection / malformed response
 *  - Edge cases: null, empty, long input, emojis, mixed sentiment, missing fields
 *  - Strict structure + type assertions
 *  - Performance safety with large inputs
 */

// Hoist the openai mock so the module is never loaded with a real client.
jest.mock('openai');

const {
    analyzeEntry,
    generateMentorSuggestion,
    generateWeeklyInsights,
} = require('../src/services/aiService');

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Returns a fresh aiService instance where the Groq client is active and
 * chat.completions.create is replaced with `mockCreate`.
 *
 * Uses jest.isolateModules so that the module-level `client` variable is
 * re-evaluated with GROQ_API_KEY set, without affecting other test suites.
 */
function loadServiceWithGroq(mockCreate) {
    let service;
    jest.isolateModules(() => {
        const OpenAI = require('openai');
        OpenAI.mockImplementation(() => ({
            chat: { completions: { create: mockCreate } },
        }));
        process.env.GROQ_API_KEY = 'test-groq-key';
        service = require('../src/services/aiService');
        delete process.env.GROQ_API_KEY;
    });
    return service;
}

// ─── analyzeEntry — keyword fallback ──────────────────────────────────────────

describe('analyzeEntry — keyword fallback (no GROQ_API_KEY)', () => {

    // --- Structure & types ---

    it('returns an object with all required fields and correct types', async () => {
        const result = await analyzeEntry(
            'This week I focused on data structures and algorithms. I made good progress.',
            'student123'
        );

        expect(result).toMatchObject({
            sentiment:            expect.stringMatching(/^(positive|neutral|negative)$/),
            sentimentScore:       expect.any(Number),
            summary:              expect.any(String),
            riskLevel:            expect.stringMatching(/^(low|medium|high|critical)$/),
            riskScore:            expect.any(Number),
            keyConcerns:          expect.any(Array),
            confidence:           expect.any(Number),
            keywords:             expect.any(Array),
            flagged:              expect.any(Boolean),
            analysisVersion:      '4.0-fallback',
            promptVersion:        expect.any(String),
            historicalRiskFactor: expect.any(Number),
            riskFactors:          expect.any(Object),
            analyzedAt:           expect.any(Date),
        });

        expect(result.sentimentScore).toBeGreaterThanOrEqual(-1);
        expect(result.sentimentScore).toBeLessThanOrEqual(1);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.summary.length).toBeGreaterThan(0);
    });

    // --- Sentiment detection ---

    it('detects positive sentiment for upbeat content', async () => {
        const result = await analyzeEntry(
            'I am happy and confident this week. I improved a lot and scored well. I feel motivated and productive.',
            'student_pos'
        );
        expect(result.sentiment).toBe('positive');
        expect(result.sentimentScore).toBeGreaterThan(0);
        expect(result.flagged).toBe(false);
        expect(result.riskLevel).toBe('low');
    });

    it('detects negative sentiment when warning keywords dominate', async () => {
        const result = await analyzeEntry(
            'I feel overwhelmed, stressed, and anxious. I am struggling with assignments and feel burnout. Exhausted from the pressure.',
            'student_neg'
        );
        expect(result.sentiment).toBe('negative');
        expect(result.sentimentScore).toBeLessThan(0);
        expect(['medium', 'high', 'critical']).toContain(result.riskLevel);
        expect(result.flagged).toBe(true);
    });

    it('returns neutral sentiment when no keyword signal is present', async () => {
        const result = await analyzeEntry(
            'Attended lectures and submitted my weekly report. The coursework was manageable.',
            'student_neutral'
        );
        expect(result.sentiment).toBe('neutral');
        expect(result.sentimentScore).toBe(0);
        expect(result.riskLevel).toBe('low');
        expect(result.flagged).toBe(false);
    });

    // --- Risk escalation ---

    it('flags and sets high risk when a danger keyword appears', async () => {
        const result = await analyzeEntry(
            'I have been feeling hopeless lately and do not know what to do anymore.',
            'student_danger'
        );
        expect(result.riskLevel).toBe('high');
        expect(result.flagged).toBe(true);
        expect(result.keywords.map((k) => k.word)).toContain('hopeless');
    });

    it('escalates to critical risk and riskScore 88 when consecutiveHighCount >= 3', async () => {
        const result = await analyzeEntry(
            'Still struggling and feeling depressed.',
            'student_consec',
            {},
            3
        );
        expect(result.riskLevel).toBe('critical');
        expect(result.riskScore).toBe(88);
        expect(result.flagged).toBe(true);
    });

    // --- riskFactors ---

    it('riskFactors object contains all expected numeric keys with non-negative values', async () => {
        const result = await analyzeEntry(
            'I had a productive week and completed my goals.',
            'student_factors',
            { attendancePercentage: 90, avgSubjectRating: 4, emotionalRating: 4 }
        );
        const expectedKeys = [
            'sentimentFactor', 'attendanceFactor', 'understandingFactor',
            'marksFactor', 'consecutiveFactor', 'keywordFactor',
        ];
        expectedKeys.forEach((key) => {
            expect(typeof result.riskFactors[key]).toBe('number');
            expect(result.riskFactors[key]).toBeGreaterThanOrEqual(0);
        });
    });

    it('low attendance raises attendanceFactor compared to high attendance', async () => {
        const high = await analyzeEntry('Normal week.', 'sA', { attendancePercentage: 90 });
        const low  = await analyzeEntry('Normal week.', 'sB', { attendancePercentage: 60 });
        expect(low.riskFactors.attendanceFactor).toBeGreaterThan(high.riskFactors.attendanceFactor);
    });

    it('historicalRiskFactor stays within [0, 1]', async () => {
        const result = await analyzeEntry('Fine week.', 'sZ', {}, 2);
        expect(result.historicalRiskFactor).toBeGreaterThanOrEqual(0);
        expect(result.historicalRiskFactor).toBeLessThanOrEqual(1);
    });

    // --- Edge cases ---

    it('handles empty string without throwing and returns low risk', async () => {
        await expect(analyzeEntry('', 'student_empty')).resolves.toMatchObject({
            sentiment: expect.stringMatching(/^(positive|neutral|negative)$/),
            riskLevel: 'low',
            flagged:   false,
        });
    });

    it('handles null text without throwing', async () => {
        await expect(analyzeEntry(null, 'student_null')).resolves.toMatchObject({
            sentiment:       expect.stringMatching(/^(positive|neutral|negative)$/),
            analysisVersion: '4.0-fallback',
        });
    });

    it('handles very long diary entries (10 000+ chars) within 500 ms', async () => {
        const longEntry = 'I had a good day and made real progress on my studies. '.repeat(185);
        const start = Date.now();
        const result = await analyzeEntry(longEntry, 'student_long');
        expect(Date.now() - start).toBeLessThan(500);
        expect(result.summary.length).toBeLessThanOrEqual(1800);
        expect(result).toMatchObject({
            sentiment:       expect.stringMatching(/^(positive|neutral|negative)$/),
            analysisVersion: '4.0-fallback',
        });
    });

    it('handles mixed sentiment (positive + negative keywords) and returns valid shape', async () => {
        const result = await analyzeEntry(
            'I am happy and motivated but also overwhelmed and stressed by the workload.',
            'student_mixed'
        );
        expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
        expect(result.keywords.length).toBeGreaterThan(0);
        expect(typeof result.flagged).toBe('boolean');
    });

    it('handles special characters and emojis without throwing', async () => {
        const result = await analyzeEntry(
            '😊 Feeling great! 🎉 Completed my project. Chars: <>&"\'/\\',
            'student_emoji'
        );
        expect(result).toMatchObject({
            sentiment: expect.stringMatching(/^(positive|neutral|negative)$/),
            flagged:   expect.any(Boolean),
        });
    });

    it('handles missing extras fields gracefully (no attendancePercentage)', async () => {
        const result = await analyzeEntry('Normal week.', 'sX');
        expect(typeof result.riskFactors.attendanceFactor).toBe('number');
        expect(typeof result.riskFactors.understandingFactor).toBe('number');
    });

    it('handles partially filled extras (only attendancePercentage)', async () => {
        const result = await analyzeEntry('Normal week.', 'sY', { attendancePercentage: 80 });
        expect(typeof result.riskFactors.understandingFactor).toBe('number');
        expect(result.riskFactors.understandingFactor).toBeGreaterThanOrEqual(0);
    });
});

// ─── analyzeEntry — Groq API mocked ───────────────────────────────────────────

describe('analyzeEntry — Groq API mocked', () => {

    it('uses Groq result and sets analysisVersion to 4.0-groq on success', async () => {
        const mockCreate = jest.fn().mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        summary:   'AI-generated summary',
                        sentiment: 'positive',
                        risk:      'low',
                        concerns:  ['time management'],
                    }),
                },
            }],
        });

        const { analyzeEntry: analyze } = loadServiceWithGroq(mockCreate);
        const result = await analyze('I had a great productive week!', 'student_groq');

        expect(result.analysisVersion).toBe('4.0-groq');
        expect(result.summary).toBe('AI-generated summary');
        expect(result.sentiment).toBe('positive');
        expect(result.confidence).toBe(0.78);
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('falls back to keyword analysis when Groq API call rejects', async () => {
        const mockCreate = jest.fn().mockRejectedValueOnce(new Error('Groq API unavailable'));

        const { analyzeEntry: analyze } = loadServiceWithGroq(mockCreate);
        const result = await analyze('I feel happy and motivated this week.', 'student_groq_fail');

        expect(result.analysisVersion).toBe('4.0-fallback');
        expect(result.sentiment).toMatch(/^(positive|neutral|negative)$/);
        expect(result.riskLevel).toMatch(/^(low|medium|high|critical)$/);
        expect(result.flagged).toBe(false);
    });

    it('falls back when Groq returns malformed JSON', async () => {
        const mockCreate = jest.fn().mockResolvedValueOnce({
            choices: [{ message: { content: 'NOT VALID JSON {{{{' } }],
        });

        const { analyzeEntry: analyze } = loadServiceWithGroq(mockCreate);
        const result = await analyze('I feel good.', 'student_bad_json');

        expect(result.analysisVersion).toBe('4.0-fallback');
        expect(result.sentiment).toMatch(/^(positive|neutral|negative)$/);
    });

    it('falls back when Groq returns empty content', async () => {
        const mockCreate = jest.fn().mockResolvedValueOnce({
            choices: [{ message: { content: '' } }],
        });

        const { analyzeEntry: analyze } = loadServiceWithGroq(mockCreate);
        const result = await analyze('Normal week.', 'student_empty_groq');

        expect(result.analysisVersion).toBe('4.0-fallback');
    });

    it('normalises unexpected sentiment values from Groq to neutral', async () => {
        const mockCreate = jest.fn().mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        summary:   'Some summary',
                        sentiment: 'VERY_POSITIVE', // not a valid value
                        risk:      'low',
                        concerns:  [],
                    }),
                },
            }],
        });

        const { analyzeEntry: analyze } = loadServiceWithGroq(mockCreate);
        const result = await analyze('Good week!', 'student_norm');

        expect(result.sentiment).toBe('neutral');
    });

    it('escalates to critical even when Groq says high, if consecutiveHighCount >= 3', async () => {
        const mockCreate = jest.fn().mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        summary:   'Bad week',
                        sentiment: 'negative',
                        risk:      'high',
                        concerns:  ['stress'],
                    }),
                },
            }],
        });

        const { analyzeEntry: analyze } = loadServiceWithGroq(mockCreate);
        const result = await analyze('Tough week again.', 'student_critical', {}, 3);

        expect(result.riskLevel).toBe('critical');
        expect(result.flagged).toBe(true);
    });
});

// ─── generateMentorSuggestion — keyword fallback ──────────────────────────────

describe('generateMentorSuggestion — keyword fallback (no GROQ_API_KEY)', () => {
    const sampleEntry = {
        content: 'I am feeling stressed and overwhelmed this week.',
        aiAnalysis: {
            summary:     'Student shows signs of stress.',
            sentiment:   'negative',
            riskLevel:   'medium',
            keyConcerns: ['stress', 'overwhelmed'],
        },
    };

    it('returns an object with all required fields and correct types', async () => {
        const result = await generateMentorSuggestion(sampleEntry);

        expect(result).toMatchObject({
            supportiveResponse: expect.any(String),
            suggestedGuidance:  expect.any(Array),
            confidence:         expect.any(Number),
            promptVersion:      expect.any(String),
        });
        expect(result.supportiveResponse.length).toBeGreaterThan(10);
        expect(result.suggestedGuidance.length).toBeGreaterThan(0);
        result.suggestedGuidance.forEach((g) => expect(typeof g).toBe('string'));
    });

    it('confidence is within [0, 1]', async () => {
        const result = await generateMentorSuggestion(sampleEntry);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('works when entry has no aiAnalysis field', async () => {
        const result = await generateMentorSuggestion({ content: 'I had a good week.' });
        expect(typeof result.supportiveResponse).toBe('string');
        expect(result.supportiveResponse.length).toBeGreaterThan(0);
    });

    it('works when entry has empty content string', async () => {
        const result = await generateMentorSuggestion({ content: '' });
        expect(typeof result.supportiveResponse).toBe('string');
        expect(Array.isArray(result.suggestedGuidance)).toBe(true);
    });

    it('works when entry is an empty object (no content, no aiAnalysis)', async () => {
        await expect(generateMentorSuggestion({})).resolves.toMatchObject({
            supportiveResponse: expect.any(String),
            suggestedGuidance:  expect.any(Array),
        });
    });
});

// ─── generateMentorSuggestion — Groq API mocked ───────────────────────────────

describe('generateMentorSuggestion — Groq API mocked', () => {

    it('uses Groq response when API succeeds', async () => {
        const mockCreate = jest.fn().mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({
                        supportiveResponse: 'Great job this week! Keep it up.',
                        suggestedGuidance:  ['Review your notes', 'Set clear goals'],
                        confidence:         0.85,
                    }),
                },
            }],
        });

        const { generateMentorSuggestion: suggest } = loadServiceWithGroq(mockCreate);
        const result = await suggest({ content: 'Good week overall.' });

        expect(result.supportiveResponse).toBe('Great job this week! Keep it up.');
        expect(result.suggestedGuidance).toEqual(['Review your notes', 'Set clear goals']);
        expect(result.confidence).toBe(0.85);
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('falls back gracefully when Groq mentor suggestion call rejects', async () => {
        const mockCreate = jest.fn().mockRejectedValueOnce(new Error('Network error'));

        const { generateMentorSuggestion: suggest } = loadServiceWithGroq(mockCreate);
        const result = await suggest({ content: 'Difficult week with many challenges.' });

        expect(typeof result.supportiveResponse).toBe('string');
        expect(result.supportiveResponse.length).toBeGreaterThan(10);
        expect(Array.isArray(result.suggestedGuidance)).toBe(true);
        expect(result.suggestedGuidance.length).toBeGreaterThan(0);
    });
});

// ─── generateWeeklyInsights — keyword fallback ────────────────────────────────

describe('generateWeeklyInsights — keyword fallback (no GROQ_API_KEY)', () => {

    it('returns object with all required fields for an empty entry list', async () => {
        const result = await generateWeeklyInsights([]);

        expect(result).toMatchObject({
            sentimentTrend:   'stable',
            engagementLevel:  'low',
            riskTrend:        'stable',
            insightParagraph: expect.any(String),
            confidence:       expect.any(Number),
            promptVersion:    expect.any(String),
        });
        expect(result.insightParagraph.length).toBeGreaterThan(20);
        expect(result.confidence).toBeLessThan(1); // fallback confidence is 0.58
    });

    it('detects high engagement when 4+ entries are provided', async () => {
        const entries = Array.from({ length: 4 }, (_, i) => ({
            createdAt: new Date(),
            aiAnalysis: { sentiment: 'positive', riskLevel: 'low', riskScore: 18, summary: `Week ${i + 1}` },
        }));
        expect((await generateWeeklyInsights(entries)).engagementLevel).toBe('high');
    });

    it('detects medium engagement for 2–3 entries', async () => {
        const entries = [1, 2].map(() => ({
            createdAt: new Date(),
            aiAnalysis: { sentiment: 'neutral', riskLevel: 'low', riskScore: 18 },
        }));
        expect((await generateWeeklyInsights(entries)).engagementLevel).toBe('medium');
    });

    it('detects increasing risk trend when risk scores rise', async () => {
        const entries = [
            { createdAt: new Date(), aiAnalysis: { sentiment: 'neutral',  riskLevel: 'low',    riskScore: 18 } },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'neutral',  riskLevel: 'medium', riskScore: 45 } },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'negative', riskLevel: 'high',   riskScore: 70 } },
        ];
        expect((await generateWeeklyInsights(entries)).riskTrend).toBe('increasing');
    });

    it('detects decreasing risk trend when risk scores fall', async () => {
        const entries = [
            { createdAt: new Date(), aiAnalysis: { sentiment: 'negative', riskLevel: 'high',   riskScore: 70 } },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'neutral',  riskLevel: 'medium', riskScore: 45 } },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'positive', riskLevel: 'low',    riskScore: 18 } },
        ];
        expect((await generateWeeklyInsights(entries)).riskTrend).toBe('decreasing');
    });

    it('handles entries missing aiAnalysis without throwing', async () => {
        const entries = [
            { createdAt: new Date() },
            { createdAt: new Date(), aiAnalysis: null },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'positive', riskLevel: 'low', riskScore: 18 } },
        ];
        await expect(generateWeeklyInsights(entries)).resolves.toMatchObject({
            sentimentTrend:  expect.any(String),
            engagementLevel: expect.any(String),
            riskTrend:       expect.any(String),
        });
    });

    it('handles mixed sentiments without throwing and returns valid trend', async () => {
        const entries = [
            { createdAt: new Date(), aiAnalysis: { sentiment: 'positive', riskLevel: 'low',  riskScore: 18 } },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'negative', riskLevel: 'high', riskScore: 70 } },
            { createdAt: new Date(), aiAnalysis: { sentiment: 'neutral',  riskLevel: 'low',  riskScore: 18 } },
        ];
        const result = await generateWeeklyInsights(entries);
        expect(['up', 'down', 'stable']).toContain(result.sentimentTrend);
    });

    it('produces a non-empty insightParagraph', async () => {
        const entries = [{
            createdAt: new Date(),
            aiAnalysis: { sentiment: 'positive', riskLevel: 'low', riskScore: 18, summary: 'Good week' },
        }];
        expect((await generateWeeklyInsights(entries)).insightParagraph.length).toBeGreaterThan(20);
    });

    it('returns fallback confidence (0.58) when using the fallback path', async () => {
        expect((await generateWeeklyInsights([])).confidence).toBe(0.58);
    });
});

// ─── generateWeeklyInsights — Groq API mocked ─────────────────────────────────

describe('generateWeeklyInsights — Groq API mocked', () => {

    it('uses Groq insightParagraph on success and returns higher confidence', async () => {
        const mockCreate = jest.fn().mockResolvedValueOnce({
            choices: [{
                message: {
                    content: JSON.stringify({ insightParagraph: 'AI-generated weekly insight.' }),
                },
            }],
        });

        const { generateWeeklyInsights: insights } = loadServiceWithGroq(mockCreate);
        const result = await insights([{
            createdAt: new Date(),
            aiAnalysis: { sentiment: 'positive', riskLevel: 'low', riskScore: 18, summary: 'Good week' },
        }]);

        expect(result.insightParagraph).toBe('AI-generated weekly insight.');
        expect(result.confidence).toBeGreaterThan(0.58);
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('falls back gracefully when Groq weekly insights call rejects', async () => {
        const mockCreate = jest.fn().mockRejectedValueOnce(new Error('Groq timeout'));

        const { generateWeeklyInsights: insights } = loadServiceWithGroq(mockCreate);
        const result = await insights([{
            createdAt: new Date(),
            aiAnalysis: { sentiment: 'neutral', riskLevel: 'low', riskScore: 18 },
        }]);

        expect(typeof result.insightParagraph).toBe('string');
        expect(result.insightParagraph.length).toBeGreaterThan(20);
        expect(result.confidence).toBe(0.58);
    });
});

// ─── Performance ──────────────────────────────────────────────────────────────

describe('Performance — large inputs', () => {

    it('analyzeEntry completes in < 200 ms for a 10 000-char entry', async () => {
        const longText = 'I studied hard and made good progress every day. '.repeat(200);
        const start = Date.now();
        await analyzeEntry(longText, 'perf_student');
        expect(Date.now() - start).toBeLessThan(200);
    });

    it('generateWeeklyInsights completes in < 500 ms for 100 entries', async () => {
        const entries = Array.from({ length: 100 }, (_, i) => ({
            createdAt: new Date(),
            aiAnalysis: {
                sentiment: (['positive', 'neutral', 'negative'])[i % 3],
                riskLevel: (['low', 'medium', 'high'])[i % 3],
                riskScore: ([18, 45, 70])[i % 3],
                summary:   `Week ${i + 1} summary`,
            },
        }));
        const start = Date.now();
        await generateWeeklyInsights(entries);
        expect(Date.now() - start).toBeLessThan(500);
    });

    it('generateMentorSuggestion completes in < 100 ms', async () => {
        const start = Date.now();
        await generateMentorSuggestion({
            content: 'I had a good week and learned a lot.',
            aiAnalysis: { sentiment: 'positive', riskLevel: 'low', keyConcerns: [] },
        });
        expect(Date.now() - start).toBeLessThan(100);
    });
});
