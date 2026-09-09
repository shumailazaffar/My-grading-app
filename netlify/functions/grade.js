// This function runs on Netlify's server, never in the visitor's browser.
// Uses Google's Gemini API — it has a genuine free tier (no credit card needed)
// that supports image understanding, which is what we need here.
// Get a free key at https://aistudio.google.com/app/apikey and set it as
// GEMINI_API_KEY in Netlify's Environment Variables.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request body' }) };
  }

  const { accessCode, systemPrompt, images, referenceImages, model, apiKey } = body;

  // Optional class access-code check. Set ACCESS_CODE in Netlify env vars to enable it.
  // Skipped for anyone who supplied their own Gemini key — they're not spending
  // your quota, so there's nothing to protect them from.
  if (!apiKey && process.env.ACCESS_CODE && accessCode !== process.env.ACCESS_CODE) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Wrong access code.' }) };
  }

  const geminiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'No Gemini API key available — either the server is missing GEMINI_API_KEY, or paste your own key on the setup page.' }) };
  }

  if (!Array.isArray(images) || images.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No images provided.' }) };
  }

  const parts = [{ text: systemPrompt }];

  if (Array.isArray(referenceImages) && referenceImages.length > 0) {
    parts.push({ text: 'Reference answer-key photo(s) (correct answers):' });
    referenceImages.forEach(img => parts.push({ inline_data: { mime_type: img.media_type, data: img.data } }));
  }

  parts.push({ text: "Student's answer sheet photo(s) — grade these:" });
  images.forEach(img => parts.push({ inline_data: { mime_type: img.media_type, data: img.data } }));

  parts.push({ text: "Now respond with the grading JSON as instructed." });

  // Only allow models from the dropdown when using the shared server key — nobody
  // should be able to rack up unexpected charges on your account. Anyone using
  // their OWN key is spending their own money, so let them request any model.
  const ALLOWED_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview'
  ];
  const chosenModel = apiKey ? (model || 'gemini-3.5-flash') : (ALLOWED_MODELS.includes(model) ? model : 'gemini-3.5-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${geminiKey}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 3000 }
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: data.error?.message || 'Gemini API error' }) };
    }

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    if (!text) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Empty response from Gemini.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ content: [{ type: 'text', text }] }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
