import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { cosineSimilarity } from './cosineSimilarity';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Load from environment variable ONLY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PORT = 3001;

app.post('/api/generate-concept', async (req, res) => {
  try {
    const { rawInput, topRelevantConcepts = [], sourceContext } = req.body;
    
    if (!rawInput) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const relevantConceptsContext = topRelevantConcepts.length > 0 
      ? `\n\nFor context, here are some existing concepts in the user's vault that might be related:\n${JSON.stringify(topRelevantConcepts, null, 2)}`
      : '';

    const systemInstruction = `
      You are Smriti, an AI memory synthesizer.
      Your task is to take a raw user input and distill it into a structured knowledge item.
      
      Extract the core concept as the "title", and create a 1-2 sentence "summary".
      
      KNOWLEDGE LINKING & QUALITY RULES:
      1. Keep generated content highly readable, concise, and information-dense. 
      2. AVOID generic filler, long paragraphs, repetitive definitions, and phrases like "In conclusion".
      3. If your generated content naturally relates to any of the existing concepts provided below, you MUST weave a markdown link directly inline within the text. 
         Format: [Concept Title](/knowledge/ID)
      4. ONLY link to concepts from the provided list. Do NOT hallucinate links or IDs. 
      5. Never force a link if it doesn't fit naturally. Never link a concept to itself.

      CONTENT STRUCTURE:
      You MUST structure the "fullContent" field strictly using these markdown headings (include them exactly as written):
      ### Explanation
      (Provide a short, clear explanation of the concept, beyond the 1-2 sentence summary. Keep it brief and avoid unnecessary fluff.)
      
      ### Example
      (Provide one strong, concrete example. Omit this section entirely if not useful.)
      
      ### Memory Hook
      (Provide a mnemonic, visual anchor, or analogy to help remember it. Omit this section entirely if a good one doesn't exist.)
      ${relevantConceptsContext}
    `;

    // 1. Generate text structured output
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `User Input: ${rawInput}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Refined concept title extracted from input. MUST NOT BE EMPTY." },
            summary: { type: Type.STRING, description: "1-2 sentence core distillation." },
            fullContent: { type: Type.STRING, description: "Detailed structured explanation of the concept, including inline markdown links." },
            relatedConceptIds: { 
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of IDs of the provided existing concepts that are genuinely related to this new concept. Do not include hallucinated IDs."
            }
          },
          required: ["title", "summary", "fullContent", "relatedConceptIds"]
        }
      }
    });

    const resultText = response.text || '{}';
    const parsedData = JSON.parse(resultText);

    // Backend Validation Step
    if (!parsedData.title || parsedData.title.trim().length === 0) {
      throw new Error("Validation Failed: Generated concept title is empty.");
    }

    if (parsedData.fullContent && parsedData.fullContent.length > 2000) {
      throw new Error("Validation Failed: Generated explanation is excessively long.");
    }

    // Filter hallucinated links
    if (parsedData.relatedConceptIds && parsedData.relatedConceptIds.length > 0) {
      const validIds = new Set(topRelevantConcepts.map((c: any) => c.id));
      parsedData.relatedConceptIds = parsedData.relatedConceptIds.filter((id: string) => validIds.has(id));
    }

    // 2. Generate an embedding for it
    const embedContents = `Title: ${parsedData.title}\n\nSummary: ${parsedData.summary}\n\nContent: ${parsedData.fullContent}` + 
      (sourceContext ? `\n\nSource: ${sourceContext}` : '');

    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: embedContents
    });
    
    if (embedResponse.embeddings && embedResponse.embeddings.length > 0) {
      parsedData.embedding = embedResponse.embeddings[0].values;
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate concept' });
  }
});

app.post('/api/search', async (req, res) => {
  try {
    const { query, concepts } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    if (!concepts || !Array.isArray(concepts)) {
      return res.status(400).json({ error: 'Concepts array is required for fallback search' });
    }

    // Embed the query
    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: query
    });
    
    const queryEmbedding = embedResponse.embeddings?.[0]?.values;
    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding for query');
    }

    const queryLower = query.toLowerCase();

    // Compute cosine similarity for each concept
    const results = concepts.map((concept: any) => {
      let similarity = 0;
      let matchReason = '';

      if (concept.embedding && Array.isArray(concept.embedding)) {
        try {
          similarity = cosineSimilarity(queryEmbedding, concept.embedding);
        } catch (e) {
          console.error(`Error calculating similarity for concept ${concept.id}:`, e);
        }
      }
      
      const titleLower = concept.title.toLowerCase();
      
      // Heavy boost for exact title matches (ensures they are #1)
      if (titleLower === queryLower) {
        similarity += 1.0; 
        matchReason = 'Exact match';
      } else if (titleLower.includes(queryLower)) {
        similarity += 0.3; // Keyword boost
        matchReason = 'Keyword match';
      } else if (concept.summary && concept.summary.toLowerCase().includes(queryLower)) {
        similarity += 0.1;
        matchReason = 'Keyword in summary';
      } else {
        matchReason = 'Semantic match';
      }
      
      return {
        ...concept,
        similarity,
        matchReason
      };
    });

    // Sort by similarity descending
    results.sort((a: any, b: any) => b.similarity - a.similarity);
    
    // Filter out noisy weak matches (threshold raised to 0.65 for pure semantic)
    // Note: keyword matches will easily clear this because of the boost.
    const filteredResults = results.filter((r: any) => r.similarity > 0.65);

    // Deduplicate by id just in case
    const seenIds = new Set();
    const dedupedResults = [];
    for (const r of filteredResults) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        dedupedResults.push(r);
      }
    }

    // Remove the large embedding arrays before sending back to frontend
    const cleanedResults = dedupedResults.map((r: any) => {
      const { embedding, ...rest } = r;
      return rest;
    });

    res.json(cleanedResults);
  } catch (error: any) {
    console.error('Gemini API Error (search):', error);
    res.status(500).json({ error: 'Failed to perform semantic search' });
  }
});

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
      CRITICAL: Questions MUST test deep understanding and application, not trivial wording.
      CRITICAL: For multiple choice, provide exactly 4 options. Make the incorrect options plausible but definitively wrong.
      Do not repeat identical questions if a concept appears twice.
    `;

    const contents = `Generate questions for these concepts:\n\n` + 
      concepts.map((c: any) => `ID: ${c.id}\nTitle: ${c.title}\nContent: ${c.fullContent}`).join('\n\n---\n\n');

    let parsedData = [];
    try {
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
      parsedData = JSON.parse(resultText);
    } catch (apiError) {
      console.warn('Gemini question generation failed, using fallback:', apiError);
      // Fallback: Generate basic direct recall questions if API fails
      parsedData = concepts.map((c: any) => ({
        id: c.id,
        conceptTitle: c.title,
        type: 'direct_recall',
        question: `What is the core meaning of ${c.title}?`,
        options: null,
        correctAnswer: c.summary,
        explanation: 'This is the foundational definition of the concept.'
      }));
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini API Error (generate-questions):', error);
    res.status(500).json({ error: 'Failed to generate review questions' });
  }
});

app.post('/api/embed', async (req, res) => {
  try {
    const { title, summary, fullContent, sourceContext } = req.body;
    if (!title || !summary || !fullContent) {
      return res.status(400).json({ error: 'Title, summary, and fullContent are required' });
    }

    const embedContents = `Title: ${title}\n\nSummary: ${summary}\n\nContent: ${fullContent}` + 
      (sourceContext ? `\n\nSource: ${sourceContext}` : '');

    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: embedContents
    });
    
    if (embedResponse.embeddings && embedResponse.embeddings.length > 0) {
      res.json({ embedding: embedResponse.embeddings[0].values });
    } else {
      throw new Error('No embeddings returned');
    }
  } catch (error: any) {
    console.error('Gemini API Error (embed):', error);
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
});

app.post('/api/regenerate-concept', async (req, res) => {
  try {
    const { title, summary, fullContent } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const systemInstruction = `
      You are Smriti, an AI memory synthesizer.
      Your task is to refine and improve an existing knowledge concept.
      
      Keep the core concept title as the "title" (you can improve it if needed), and write a clear 1-2 sentence "summary".
      
      KNOWLEDGE LINKING & QUALITY RULES:
      1. Keep generated content highly readable, concise, and information-dense. 
      2. AVOID generic filler, long paragraphs, repetitive definitions, and phrases like "In conclusion".
      3. Do NOT include markdown links to other concepts unless they are already present in the source text.

      CONTENT STRUCTURE:
      You MUST structure the "fullContent" field strictly using these markdown headings (include them exactly as written):
      ### Explanation
      (Provide a short, clear explanation of the concept, beyond the 1-2 sentence summary. Keep it brief and avoid unnecessary fluff.)
      
      ### Example
      (Provide one strong, concrete example. Omit this section entirely if not useful.)
      
      ### Memory Hook
      (Provide a mnemonic, visual anchor, or analogy to help remember it. Omit this section entirely if a good one doesn't exist.)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Improve and refine this concept:\nTitle: ${title}\nSummary: ${summary}\nContent: ${fullContent}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Refined concept title." },
            summary: { type: Type.STRING, description: "1-2 sentence core distillation." },
            fullContent: { type: Type.STRING, description: "Detailed structured explanation of the concept." }
          },
          required: ["title", "summary", "fullContent"]
        }
      }
    });

    const resultText = response.text || '{}';
    const parsedData = JSON.parse(resultText);

    // Backend Validation Step
    if (!parsedData.title || parsedData.title.trim().length === 0) {
      throw new Error("Validation Failed: Generated concept title is empty.");
    }
    
    res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini API Error (regenerate):', error);
    res.status(500).json({ error: error.message || 'Failed to regenerate concept' });
  }
});

app.post('/api/extract-concepts', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Rough check on the backend just to prevent accidental abuse
    if (text.length > 20000) {
      return res.status(400).json({ error: 'Text exceeds maximum character limit' });
    }

    const systemInstruction = `
      You are Smriti, an AI memory synthesizer.
      Your task is to analyze the user's raw pasted text and extract only the genuinely distinct, valuable concepts.
      
      RULES:
      1. Extract concepts that are meaningful to learn and remember.
      2. Do NOT extract trivial facts, generic sentences, or duplicate ideas.
      3. If a single concept is discussed across multiple paragraphs, combine it into ONE concept.
      4. For each concept, provide a clear "title" and a 1-sentence "summary" capturing its essence.
      5. Return an empty array if no distinct, valuable concepts can be found.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Extract distinct concepts from the following text:\n\n${text}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The core concept title." },
              summary: { type: Type.STRING, description: "A 1-sentence distillation of the concept." }
            },
            required: ["title", "summary"]
          }
        }
      }
    });

    const resultText = response.text || '[]';
    const parsedData = JSON.parse(resultText);

    res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini API Error (extract-concepts):', error);
    res.status(500).json({ error: error.message || 'Failed to extract concepts' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
