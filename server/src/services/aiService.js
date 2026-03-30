const OpenAI = require('openai');
const logger = require('../utils/logger');

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.AI_MODEL || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 5000);
const PROMPT_VERSION = 'v1';

if (!GROQ_API_KEY) {
    logger.warn('[AI] GROQ_API_KEY is not set — AI analysis disabled, using keyword-based fallback only.');
}

const client = GROQ_API_KEY ? new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: GROQ_BASE_URL,
}) : null;

const DANGER_KEYWORDS = [
    'suicide', 'suicidal', 'kill myself', 'end my life', 'self-harm', 'self harm',
    'hurt myself', 'hopeless', 'no reason to live', 'give up on life', 'can\'t go on',
    'abuse', 'harassed', 'ragging', 'assault', 'violence', 'threatened',
];

const WARNING_KEYWORDS = [
    'depressed', 'depression', 'anxiety', 'anxious', 'stressed', 'overwhelmed',
    'struggling', 'difficulty', 'failing', 'failed', 'burnout', 'exhausted',
    'cannot focus', 'can\'t focus', 'demotivated', 'pressure', 'low marks',
];

const POSITIVE_KEYWORDS = [
    'improved', 'happy', 'confident', 'achieved', 'productive', 'motivated',
    'good marks', 'scored well', 'completed', 'progressed', 'successful',
];

function extractJsonObject(raw = '') {
    if (!raw || typeof raw !== 'string') return null;
    try {
        return JSON.parse(raw);
    } catch { }
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

function normalizeSentiment(value) {
    const v = String(value || '').toLowerCase().trim();
    if (['positive', 'neutral', 'negative'].includes(v)) return v;
    return 'neutral';
}

function normalizeRisk(value) {
    const v = String(value || '').toLowerCase().trim();
    if (v === 'low') return 'low';
    if (v === 'medium') return 'medium';
    if (v === 'high') return 'high';
    if (v === 'critical') return 'critical';
    return 'low';
}

function sentimentToScore(sentiment) {
    if (sentiment === 'positive') return 0.6;
    if (sentiment === 'negative') return -0.6;
    return 0;
}

function riskToScore(riskLevel) {
    if (riskLevel === 'critical') return 88;
    if (riskLevel === 'high') return 70;
    if (riskLevel === 'medium') return 45;
    return 18;
}

function calculateRiskScore(subjectRatings, mood, attendancePct, weeklyDifficulty) {
    // Factor 1 — Subject performance (weight: 35%)
    let subjectRisk;
    if (!subjectRatings || subjectRatings.length === 0) {
        subjectRisk = ((5 - (mood || 3)) / 4) * 100; // fall back to mood-based
    } else {
        const avgRating = subjectRatings.reduce((s, r) => s + (Number(r.rating) || 3), 0) / subjectRatings.length;
        subjectRisk = ((5 - avgRating) / 4) * 100;
    }

    // Factor 2 — Mood (weight: 25%)
    const moodVal = mood != null ? mood : 3;
    const moodRisk = ((5 - moodVal) / 4) * 100;

    // Factor 3 — Attendance (weight: 25%)
    let attendanceRisk;
    if (attendancePct == null) {
        attendanceRisk = 30;
    } else if (attendancePct >= 90) {
        attendanceRisk = 0;
    } else if (attendancePct >= 75) {
        attendanceRisk = 20;
    } else if (attendancePct >= 60) {
        attendanceRisk = 55;
    } else if (attendancePct >= 50) {
        attendanceRisk = 75;
    } else {
        attendanceRisk = 100;
    }

    // Factor 4 — Weekly difficulty (weight: 15%)
    const diff = weeklyDifficulty != null ? weeklyDifficulty : 5;
    const diffRisk = ((diff - 1) / 9) * 100;

    const raw = (subjectRisk * 0.35) + (moodRisk * 0.25) + (attendanceRisk * 0.25) + (diffRisk * 0.15);
    return Math.min(100, Math.max(0, Math.round(raw)));
}

function riskScoreToLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
}

function scanKeywords(text) {
    const lower = String(text || '').toLowerCase();
    const detected = [];
    let dangerCount = 0;
    let warningCount = 0;

    DANGER_KEYWORDS.forEach((kw) => {
        if (lower.includes(kw)) {
            detected.push({ word: kw, severity: 'danger' });
            dangerCount++;
        }
    });
    WARNING_KEYWORDS.forEach((kw) => {
        if (lower.includes(kw)) {
            detected.push({ word: kw, severity: 'warning' });
            warningCount++;
        }
    });
    POSITIVE_KEYWORDS.forEach((kw) => {
        if (lower.includes(kw)) detected.push({ word: kw, severity: 'neutral' });
    });

    return { detected, dangerCount, warningCount };
}

function fallbackAnalyzeEntry(text, extras = {}, consecutiveHighCount = 0) {
    const { detected, dangerCount, warningCount } = scanKeywords(text);
    const lower = String(text || '').toLowerCase();

    let positiveHits = 0;
    let negativeHits = 0;
    POSITIVE_KEYWORDS.forEach((kw) => { if (lower.includes(kw)) positiveHits++; });
    WARNING_KEYWORDS.forEach((kw) => { if (lower.includes(kw)) negativeHits++; });
    DANGER_KEYWORDS.forEach((kw) => { if (lower.includes(kw)) negativeHits += 2; });

    const sentiment = positiveHits > negativeHits ? 'positive' : negativeHits > positiveHits ? 'negative' : 'neutral';
    let riskLevel = 'low';
    if (dangerCount > 0) riskLevel = 'high';
    else if (warningCount >= 3) riskLevel = 'medium';

    if (consecutiveHighCount >= 3) riskLevel = 'critical';

    const concerns = detected
        .filter((k) => k.severity !== 'neutral')
        .slice(0, 4)
        .map((k) => k.word);

    return {
        summary: `Student diary indicates ${sentiment} sentiment with ${riskLevel} risk signals. Monitor recent concerns and provide guidance.`,
        sentiment,
        risk: riskLevel,
        concerns,
        confidence: 0.56,
        promptVersion: PROMPT_VERSION,
        sentimentScore: sentimentToScore(sentiment),
        riskScore: riskToScore(riskLevel),
        keywords: detected,
        flagged: ['medium', 'high', 'critical'].includes(riskLevel),
    };
}

async function callGroqJson(systemPrompt, userPrompt) {
    if (!client) return null;
    const aiCallPromise = client.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    });
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`AI timeout after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS);
    });
    const completion = await Promise.race([aiCallPromise, timeoutPromise]);

    const content = completion?.choices?.[0]?.message?.content || '';
    return extractJsonObject(content);
}

async function analyzeEntry(text, studentId, extras = {}, consecutiveHighCount = 0) {
    const fallback = fallbackAnalyzeEntry(text, extras, consecutiveHighCount);

    let modelResult = null;
    try {
        modelResult = await callGroqJson(
            'You are an educational wellbeing assistant. Return strict JSON only.',
            `Analyze this student diary and return:
{
  "summary": "string",
  "sentiment": "positive|neutral|negative",
  "risk": "low|medium|high",
  "concerns": ["string"]
}
Keep concerns short and specific.
Diary:
${text}

Context:
${JSON.stringify({
                attendancePercentage: extras.attendancePercentage,
                avgSubjectRating: extras.avgSubjectRating,
                emotionalRating: extras.emotionalRating,
                consecutiveHighCount,
            })}`
        );
    } catch (error) {
        logger.warn({ event: 'ai_fallback', studentId: String(studentId), error: error.message }, '[AI] Groq analyze failed — using keyword fallback');
    }

    const sentiment = normalizeSentiment(modelResult?.sentiment || fallback.sentiment);
    let riskLevel = normalizeRisk(modelResult?.risk || fallback.risk);
    if (consecutiveHighCount >= 3 && riskLevel !== 'critical') riskLevel = 'critical';

    const keyConcerns = Array.isArray(modelResult?.concerns)
        ? modelResult.concerns.slice(0, 6).map((c) => String(c).trim()).filter(Boolean)
        : fallback.concerns;

    const summary = String(modelResult?.summary || fallback.summary).slice(0, 1800);
    const { detected, dangerCount, warningCount } = scanKeywords(text);

    // Calculate numeric risk score using weighted formula
    const riskScore = calculateRiskScore(
        extras.subjectRatings || null,
        extras.emotionalRating != null ? extras.emotionalRating : null,
        extras.attendancePercentage != null ? extras.attendancePercentage : null,
        extras.weeklyDifficulty != null ? extras.weeklyDifficulty : null
    );
    // Sync riskLevel to numeric score if score indicates higher risk
    const calculatedLevel = riskScoreToLevel(riskScore);
    if (consecutiveHighCount < 3) {
        riskLevel = calculatedLevel;
    }

    return {
        sentiment,
        sentimentScore: sentimentToScore(sentiment),
        summary,
        riskLevel,
        riskScore,
        keyConcerns,
        confidence: modelResult ? 0.78 : fallback.confidence,
        promptVersion: modelResult?.promptVersion || fallback.promptVersion || PROMPT_VERSION,
        keywords: detected,
        flagged: ['medium', 'high', 'critical'].includes(riskLevel) || dangerCount > 0,
        historicalRiskFactor: Math.min(1, consecutiveHighCount / 4),
        riskFactors: {
            sentimentFactor: sentiment === 'negative' ? 70 : sentiment === 'neutral' ? 35 : 10,
            attendanceFactor: extras.attendancePercentage < 75 ? 65 : 15,
            understandingFactor: extras.avgSubjectRating ? Math.max(0, (5 - extras.avgSubjectRating) * 20) : 20,
            marksFactor: warningCount > 2 ? 65 : 20,
            consecutiveFactor: Math.min(100, consecutiveHighCount * 30),
            keywordFactor: Math.min(100, dangerCount * 45 + warningCount * 15),
        },
        analysisVersion: modelResult ? '4.0-groq' : '4.0-fallback',
        analyzedAt: new Date(),
    };
}

async function generateMentorSuggestion(entry) {
    const fallback = {
        supportiveResponse: `Thank you for sharing this update. I appreciate your honesty. Let's work together on a practical plan for this week and focus on one manageable step at a time.`,
        suggestedGuidance: [
            'Schedule a short check-in this week',
            'Set 2 focused academic goals for the next 7 days',
            'Encourage wellbeing routine and help-seeking if stress persists',
        ],
        confidence: 0.6,
        promptVersion: PROMPT_VERSION,
    };

    try {
        const modelResult = await callGroqJson(
            'You are a compassionate mentor assistant. Return strict JSON.',
            `Generate an optional mentor reply and guidance for this diary.
Return:
{
  "supportiveResponse": "string",
  "suggestedGuidance": ["string"]
}
Entry Context:
${JSON.stringify({
                content: entry.content,
                summary: entry.aiAnalysis?.summary,
                sentiment: entry.aiAnalysis?.sentiment,
                riskLevel: entry.aiAnalysis?.riskLevel,
                concerns: entry.aiAnalysis?.keyConcerns || [],
            })}`
        );

        if (!modelResult) return fallback;
        return {
            supportiveResponse: String(modelResult.supportiveResponse || fallback.supportiveResponse).trim(),
            suggestedGuidance: Array.isArray(modelResult.suggestedGuidance)
                ? modelResult.suggestedGuidance.slice(0, 5).map((g) => String(g).trim()).filter(Boolean)
                : fallback.suggestedGuidance,
            confidence: typeof modelResult.confidence === 'number'
                ? Math.max(0, Math.min(1, modelResult.confidence))
                : 0.76,
            promptVersion: modelResult.promptVersion || PROMPT_VERSION,
        };
    } catch (error) {
        logger.warn({ event: 'ai_fallback', context: 'mentor_suggestion', error: error.message }, '[AI] Mentor suggestion failed — using fallback');
        return fallback;
    }
}

function deriveTrend(values = []) {
    if (values.length < 2) return 'stable';
    const first = values[0];
    const last = values[values.length - 1];
    if (last > first + 0.12) return 'up';
    if (last < first - 0.12) return 'down';
    return 'stable';
}

async function generateWeeklyInsights(entries = []) {
    const sentiments = entries.map((e) => e.aiAnalysis?.sentiment || 'neutral');
    const sentimentScores = sentiments.map((s) => sentimentToScore(s));
    const riskScores = entries.map((e) => (e.aiAnalysis?.riskScore ?? riskToScore(e.aiAnalysis?.riskLevel || 'low')) / 100);

    const sentimentTrend = deriveTrend(sentimentScores);
    const riskTrend = deriveTrend(riskScores.map((v) => -v)) === 'up' ? 'decreasing' : deriveTrend(riskScores) === 'up' ? 'increasing' : 'stable';

    const recentCount = entries.length;
    const engagementLevel = recentCount >= 4 ? 'high' : recentCount >= 2 ? 'medium' : 'low';

    const fallbackInsight = `Recent entries show ${sentimentTrend} sentiment momentum with ${riskTrend} risk trend. Engagement appears ${engagementLevel}. Continue regular submissions and mentor check-ins to sustain progress.`;

    let insightParagraph = fallbackInsight;
    try {
        const modelResult = await callGroqJson(
            'You are an educational insights assistant. Return strict JSON only.',
            `Given recent diary metadata, write one concise insight paragraph for student wellbeing and mentoring.
Return:
{
  "insightParagraph": "string"
}
Data:
${JSON.stringify(entries.map((e) => ({
                createdAt: e.createdAt,
                sentiment: e.aiAnalysis?.sentiment,
                riskLevel: e.aiAnalysis?.riskLevel,
                summary: e.aiAnalysis?.summary,
                concerns: e.aiAnalysis?.keyConcerns || [],
            })))}`
        );
        if (modelResult?.insightParagraph) {
            insightParagraph = String(modelResult.insightParagraph).trim();
        }
    } catch (error) {
        logger.warn({ event: 'ai_fallback', context: 'weekly_insights', error: error.message }, '[AI] Weekly insight generation failed — using fallback');
    }

    return {
        sentimentTrend,
        engagementLevel,
        riskTrend,
        insightParagraph,
        confidence: insightParagraph === fallbackInsight ? 0.58 : 0.77,
        promptVersion: PROMPT_VERSION,
    };
}

module.exports = {
    analyzeEntry,
    generateMentorSuggestion,
    generateWeeklyInsights,
};
