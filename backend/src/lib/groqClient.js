import Groq from 'groq-sdk';

let _client;

export function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return null;
  }
  if (!_client) {
    _client = new Groq({ apiKey: key });
  }
  return _client;
}

export function getGroqModel() {
  return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
}
