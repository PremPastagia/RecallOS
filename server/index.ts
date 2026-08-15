import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Load from environment variable ONLY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PORT = 3001;

app.post('/api/generate-concept', async (req, res) => {
  try {
    const { title, content, existingConcepts } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const systemInstruction = `
      You are Smriti, an AI memory synthesizer.
      Your task is to take a raw concept title and description and distill it into a structured knowledge item.
      
      CRITICAL DUPLICATE DETECTION:
      The user currently has these existing concepts in their vault:
      ${JSON.stringify(existingConcepts)}
      
      If the user's input is a clear duplicate or is fundamentally the same as one of the existing concepts, 
      set "isDuplicate" to true and provide the "duplicateOfId" corresponding to the existing concept's ID.
      Otherwise, generate a completely new structured knowledge item.
      
      Keep summaries concise (1-2 sentences). Keep fullContent highly readable and information-dense.
    `;

    // We use gemini-3.6-flash as instructed by the Antigravity skill
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Title: ${title}\n\nUser Description: ${content || 'No detailed description provided.'}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isDuplicate: { 
              type: Type.BOOLEAN, 
              description: "True if this concept already exists in the user's vault" 
            },
            duplicateOfId: { 
              type: Type.STRING, 
              description: "If isDuplicate is true, provide the ID of the existing concept",
              nullable: true
            },
            title: { type: Type.STRING, description: "Refined concept title" },
            summary: { type: Type.STRING, description: "1-2 sentence core distillation" },
            fullContent: { type: Type.STRING, description: "Detailed explanation of the concept" },
            relatedConceptIds: { 
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of IDs of existing concepts that this concept is closely related to"
            }
          },
          required: ["isDuplicate", "title", "summary", "fullContent", "relatedConceptIds"]
        }
      }
    });

    const resultText = response.text || '{}';
    const parsedData = JSON.parse(resultText);

    res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to generate concept' });
  }
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { concepts } = req.body;
    if (!concepts || !Array.isArray(concepts)) {
      return res.status(400).json({ error: 'Concepts array is required' });
    }

    const systemInstruction = `
      You are Smriti, an AI memory test generator.
      For the provided list of concepts, generate exactly one review question for each concept.
      Vary the question type between "multiple_choice" and "direct_recall".
      Keep questions challenging but concise. Do not test trivial wording; test fundamental understanding.
      For multiple choice, provide exactly 4 options.
    `;

    const contents = `Generate questions for these concepts:\n\n` + 
      concepts.map((c: any) => `ID: ${c.id}\nTitle: ${c.title}\nContent: ${c.fullContent}`).join('\n\n---\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "The ID of the concept this question is for" },
              conceptTitle: { type: Type.STRING, description: "The title of the concept" },
              type: { type: Type.STRING, description: "Either 'multiple_choice' or 'direct_recall'" },
              question: { type: Type.STRING, description: "The question text" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: "4 options if multiple choice, otherwise empty or null" 
              },
              correctAnswer: { type: Type.STRING, description: "The correct answer or concept essence" },
              explanation: { type: Type.STRING, description: "A concise 1-sentence explanation of why the answer is correct" }
            },
            required: ["id", "conceptTitle", "type", "question", "correctAnswer", "explanation"]
          }
        }
      }
    });

    const resultText = response.text || '[]';
    const parsedData = JSON.parse(resultText);

    res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini API Error (generate-questions):', error);
    res.status(500).json({ error: 'Failed to generate review questions' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
