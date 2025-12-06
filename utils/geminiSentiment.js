// utils/geminiSentiment.js
// Gemini Flash API integration for sentiment analysis

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Analyze sentiment of comments/posts for a Divide
 * @param {Object} params
 * @param {string} params.divideTitle - The divide question/title
 * @param {string} params.optionA - First option text
 * @param {string} params.optionB - Second option text  
 * @param {Array} params.comments - Array of comment objects with { content, createdAt }
 * @param {Array} params.posts - Array of social post objects with { content, createdAt }
 * @returns {Object} Sentiment analysis result
 */
export async function analyzeDivideSentiment({ divideTitle, optionA, optionB, comments = [], posts = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('[Gemini] No API key configured');
    return { error: 'Gemini API key not configured' };
  }

  // Combine and format content for analysis
  const allContent = [
    ...comments.map(c => ({ type: 'comment', text: c.content, date: c.createdAt })),
    ...posts.map(p => ({ type: 'post', text: p.content, date: p.createdAt })),
  ];

  if (allContent.length === 0) {
    return {
      optionA: { score: 50, confidence: 0, label: 'neutral', sampleSize: 0 },
      optionB: { score: 50, confidence: 0, label: 'neutral', sampleSize: 0 },
      themes: [],
      error: null,
    };
  }

  // Build the prompt
  const contentText = allContent
    .slice(0, 100) // Limit to 100 most recent to manage token usage
    .map((c, i) => `[${c.type} ${i + 1}]: ${c.text}`)
    .join('\n');

  const prompt = `Analyze the sentiment of user comments and posts about a social strategy game.

DIVIDE:
Question: "${divideTitle}"
Option A: "${optionA}"
Option B: "${optionB}"

USER CONTENT TO ANALYZE:
${contentText}

Analyze the sentiment and provide a JSON response with this exact structure:
{
  "optionA": {
    "score": <number 0-100, where 0=very negative sentiment toward this option, 50=neutral, 100=very positive>,
    "confidence": <number 0-100, how confident in this assessment>,
    "reasoning": "<brief explanation>"
  },
  "optionB": {
    "score": <number 0-100>,
    "confidence": <number 0-100>,
    "reasoning": "<brief explanation>"
  },
  "themes": [
    {"text": "<key theme/topic mentioned>", "count": <approx mentions>, "sentiment": "positive|negative|neutral"}
  ],
  "summary": "<1-2 sentence overall sentiment summary>"
}

Return ONLY the JSON, no other text.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', response.status, errorText);
      return { error: `Gemini API error: ${response.status}` };
    }

    const data = await response.json();
    
    // Extract the text response
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      console.error('[Gemini] No text in response:', data);
      return { error: 'No response from Gemini' };
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = textResponse;
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    const analysis = JSON.parse(jsonStr.trim());
    
    // Add labels based on scores
    const getLabel = (score) => {
      if (score >= 70) return 'bullish';
      if (score <= 30) return 'bearish';
      if (score >= 45 && score <= 55) return 'neutral';
      return 'mixed';
    };

    return {
      optionA: {
        score: analysis.optionA?.score || 50,
        confidence: analysis.optionA?.confidence || 0,
        label: getLabel(analysis.optionA?.score || 50),
        sampleSize: allContent.length,
        reasoning: analysis.optionA?.reasoning || '',
      },
      optionB: {
        score: analysis.optionB?.score || 50,
        confidence: analysis.optionB?.confidence || 0,
        label: getLabel(analysis.optionB?.score || 50),
        sampleSize: allContent.length,
        reasoning: analysis.optionB?.reasoning || '',
      },
      themes: analysis.themes || [],
      summary: analysis.summary || '',
      rawAnalysis: textResponse,
      error: null,
    };

  } catch (err) {
    console.error('[Gemini] Analysis error:', err);
    return { error: err.message };
  }
}

/**
 * Quick sentiment check for a single piece of text
 * @param {string} text - Text to analyze
 * @returns {Object} { score: 0-100, label: string }
 */
export async function quickSentiment(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return { score: 50, label: 'neutral', error: 'No API key' };
  }

  const prompt = `Rate the sentiment of this text on a scale of 0-100 (0=very negative, 50=neutral, 100=very positive).
Text: "${text}"
Respond with ONLY a JSON object: {"score": <number>, "label": "<positive|negative|neutral>"}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
      }),
    });

    if (!response.ok) {
      return { score: 50, label: 'neutral', error: 'API error' };
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let jsonStr = textResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const result = JSON.parse(jsonStr.trim());
    
    return {
      score: result.score || 50,
      label: result.label || 'neutral',
      error: null,
    };
  } catch (err) {
    return { score: 50, label: 'neutral', error: err.message };
  }
}

export default { analyzeDivideSentiment, quickSentiment };
