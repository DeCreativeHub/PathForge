// netlify/functions/deepseek.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  // ⚠️ Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // The API key is stored as environment variable – never exposed to the browser
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration: API key missing' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Build a request that DeepSeek understands (OpenAI style)
  const deepseekBody = {
    model: 'deepseek-chat',       // or 'deepseek-reasoner' for reasoning tasks
    messages: body.messages,
    max_tokens: body.max_tokens || 1024,
    temperature: body.temperature || 0.7,
  };

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deepseekBody),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek API error:', response.status, err);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'AI service error', detail: err }),
      };
    }

    const data = await response.json();
    // DeepSeek returns the assistant message inside data.choices[0].message.content
    const content = data.choices?.[0]?.message?.content || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
