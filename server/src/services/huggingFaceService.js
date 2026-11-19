/**
 * Hugging Face NLP Service: Incident Zero-Shot Classification
 * Model: facebook/bart-large-mnli
 * Human-in-the-Loop Directive: If confidence score < 0.60 (60%),
 * set requiresManualVerification = true.
 * Graceful Degradation: Wrapped in try-catch with timeout fallback.
 */

const CANDIDATE_LABELS = [
  'Medical Emergency',
  'Fire Hazard',
  'Flash Flood',
  'Trapped in Building',
  'Road Blockage'
];

// Mapping model labels to core disaster categories
const LABEL_MAPPING = {
  'Medical Emergency': 'Medical',
  'Fire Hazard': 'Fire',
  'Flash Flood': 'Flood',
  'Trapped in Building': 'Trapped',
  'Road Blockage': 'Blockage'
};

// Base severity scores per category
const CATEGORY_BASE_SEVERITY = {
  'Trapped': 0.95,
  'Medical': 0.85,
  'Fire': 0.80,
  'Flood': 0.75,
  'Blockage': 0.50
};

export async function classifyIncident(description) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const timeoutMs = 4500;

  if (apiKey && apiKey.trim() !== '') {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(
        'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: description,
            parameters: { candidate_labels: CANDIDATE_LABELS },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        if (data.labels && data.scores && data.scores.length > 0) {
          const topLabel = data.labels[0];
          const topScore = parseFloat(data.scores[0]);
          const category = LABEL_MAPPING[topLabel] || 'General';

          const requiresManualVerification = topScore < 0.60;
          const baseSev = CATEGORY_BASE_SEVERITY[category] || 0.5;
          const severityScore = parseFloat(Math.min(1.0, baseSev * (0.8 + 0.2 * topScore)).toFixed(2));

          return {
            category,
            confidenceScore: parseFloat(topScore.toFixed(4)),
            severityScore,
            requiresManualVerification,
            source: 'HuggingFace-API (facebook/bart-large-mnli)',
          };
        }
      } else {
        console.warn(`[Hugging Face Warning] API responded with status ${response.status}. Using intelligent fallback.`);
      }
    } catch (err) {
      console.warn(`[Hugging Face Graceful Fallback] ${err.message}. Using rule-based NLP classifier.`);
    }
  }

  // Graceful Fallback Classifier with simulated confidence & Human-in-the-Loop check
  return fallbackRuleClassifier(description);
}

function fallbackRuleClassifier(text) {
  const lower = text.toLowerCase();
  let category = 'General';
  let confidenceScore = 0.50; // Default lower confidence -> triggers manual verification!

  if (lower.includes('bleed') || lower.includes('heart') || lower.includes('injury') || lower.includes('unconscious') || lower.includes('doctor') || lower.includes('oxygen') || lower.includes('medic')) {
    category = 'Medical';
    confidenceScore = lower.includes('critical') || lower.includes('urgent') ? 0.88 : 0.68;
  } else if (lower.includes('fire') || lower.includes('smoke') || lower.includes('burn') || lower.includes('flame') || lower.includes('explosion')) {
    category = 'Fire';
    confidenceScore = lower.includes('spreading') || lower.includes('huge') ? 0.91 : 0.72;
  } else if (lower.includes('flood') || lower.includes('water') || lower.includes('drown') || lower.includes('submerged') || lower.includes('river')) {
    category = 'Flood';
    confidenceScore = lower.includes('rising') || lower.includes('swept') ? 0.90 : 0.65;
  } else if (lower.includes('trapped') || lower.includes('rubble') || lower.includes('collapse') || lower.includes('stuck') || lower.includes('debris')) {
    category = 'Trapped';
    confidenceScore = lower.includes('under') ? 0.89 : 0.64;
  } else if (lower.includes('blocked') || lower.includes('tree') || lower.includes('landslide') || lower.includes('road')) {
    category = 'Blockage';
    confidenceScore = 0.70;
  } else {
    // Ambiguous text: deliberate low confidence (< 0.60) to activate Human-in-the-Loop!
    category = 'General';
    confidenceScore = 0.45;
  }

  const requiresManualVerification = confidenceScore < 0.60;
  const baseSev = CATEGORY_BASE_SEVERITY[category] || 0.40;
  const severityScore = parseFloat(Math.min(1.0, baseSev * (0.8 + 0.2 * confidenceScore)).toFixed(2));

  return {
    category,
    confidenceScore: parseFloat(confidenceScore.toFixed(4)),
    severityScore,
    requiresManualVerification,
    source: 'Intelligent Rule-Based Fallback (Offline Mode)',
  };
}
