import { GoogleGenAI } from '@google/genai';

async function testEmbeddings() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: 'Hello, this is a test for embeddings.'
    });
    console.log('Embeddings work!', response.embeddings?.length);
  } catch (error) {
    console.error('Failed embeddings:', error);
  }
}

testEmbeddings();
