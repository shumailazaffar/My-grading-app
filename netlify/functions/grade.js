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

  const { accessCode, systemPrompt, images, referenceImages } = body;

  // Optional class access-code check. Set ACCESS_CODE in Netlify env vars to enable it.
  if (process.env.ACCESS_CODE && accessCode !== process.env.ACCESS_CODE) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Wrong access code.' }) };
  }

  if (!process.env.GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server is missing GEMINI_API_KEY. Set it in Netlify site settings.' }) };
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

     const model = 'gemini-flash-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2000 }
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

    // Return in the same shape the frontend already expects (a "text" content block)
    return { statusCode: 200, body: JSON.stringify({ content: [{ type: 'text', text }] }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
