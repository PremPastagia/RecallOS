import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import { cosineSimilarity } from './cosineSimilarity';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rate-limit all AI endpoints: max 30 requests per 15 min per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a few minutes before trying again.' }
});
app.use('/api', aiLimiter);

// Load from environment variable ONLY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PORT = 3001;

// Health check (excluded from rate limiter — not under /api)
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ─── Quality Validation ───────────────────────────────────────────────────────

const FILLER_PHRASES = [
  'in conclusion', 'as mentioned', 'it is important to note', 'in summary',
  'to summarize', 'needless to say', 'it goes without saying',
  'as i mentioned', 'to put it simply', 'simply put', 'as you can see',
  'at the end of the day', 'having said that', 'that being said'
];

const MEANINGLESS_TITLES = new Set([
  'concept', 'untitled', 'the concept', 'a concept', 'this concept',
  'topic', 'idea', 'the idea', 'a topic', 'new concept', 'unknown', 'term'
]);

interface ConceptData {
  title: string;
  summary: string;
  fullContent: string;
  relatedConceptIds?: string[];
}

function validateConceptQuality(
  data: ConceptData,
  topRelevantConcepts: any[] = []
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const title = (data.title || '').trim();
  const summary = (data.summary || '').trim();
  const fullContent = (data.fullContent || '').trim();

  // Title
  if (title.length < 2) {
    issues.push('Title is missing or too short');
  } else if (title.length > 120) {
    issues.push('Title is excessively long — keep it concise');
  } else if (MEANINGLESS_TITLES.has(title.toLowerCase())) {
    issues.push('Title is not meaningful');
  }

  // Summary
  if (summary.length < 8) {
    issues.push('Summary is missing or too short');
  } else if (summary.length > 450) {
    issues.push('Summary is too long — keep to 1-2 sentences');
  }

  // Content length
  if (fullContent.length > 2000) {
    issues.push('Explanation is excessively long');
  }

  // Filler phrase overuse (only flag when 3+ distinct fillers appear)
  const lowerText = `${summary} ${fullContent}`.toLowerCase();
  const fillerCount = FILLER_PHRASES.filter(p => lowerText.includes(p)).length;
  if (fillerCount >= 3) {
    issues.push('Content contains excessive filler phrases');
  }

  // Invalid linked concept IDs
  if (data.relatedConceptIds && data.relatedConceptIds.length > 0 && topRelevantConcepts.length > 0) {
    const validIds = new Set(topRelevantConcepts.map((c: any) => c.id));
    const invalidCount = data.relatedConceptIds.filter((id: string) => !validIds.has(id)).length;
    if (invalidCount > 0) {
      issues.push('Generated content references invalid concept links');
    }
  }

  return { valid: issues.length === 0, issues };
}

const GENERATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Refined concept title. MUST NOT BE EMPTY.' },
    summary: { type: Type.STRING, description: '1-2 sentence core distillation.' },
    fullContent: { type: Type.STRING, description: 'Detailed structured explanation including inline markdown links.' },
    relatedConceptIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'IDs of genuinely related existing concepts. No hallucinated IDs.'
    }
  },
  required: ['title', 'summary', 'fullContent', 'relatedConceptIds']
};

const REGEN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Refined concept title.' },
    summary: { type: Type.STRING, description: '1-2 sentence core distillation.' },
    fullContent: { type: Type.STRING, description: 'Detailed structured explanation of the concept.' }
  },
  required: ['title', 'summary', 'fullContent']
};

function filterHallucinatedLinks(data: ConceptData, topRelevantConcepts: any[]): void {
  if (data.relatedConceptIds && data.relatedConceptIds.length > 0) {
    const validIds = new Set(topRelevantConcepts.map((c: any) => c.id));
    data.relatedConceptIds = data.relatedConceptIds.filter((id: string) => validIds.has(id));
  }
}

// ─────────────────────────────────────────────────────────────────────────────

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
        responseSchema: GENERATE_SCHEMA
      }
    });

    let parsedData: ConceptData & { embedding?: number[]; qualityNote?: string; requiresReview?: boolean; qualityIssues?: string[] } =
      JSON.parse(response.text || '{}');

    // Filter hallucinated links
    filterHallucinatedLinks(parsedData, topRelevantConcepts);

    // 2. Quality validation with one controlled retry
    let validation = validateConceptQuality(parsedData, topRelevantConcepts);
    let qualityNote: string | undefined;

    if (!validation.valid) {
      console.log('[Quality] Initial validation failed:', validation.issues);
      try {
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `User Input: ${rawInput}\n\nImportant: Your previous response had these quality issues — please fix them: ${validation.issues.join('; ')}. Be concise, meaningful, and avoid filler.`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: GENERATE_SCHEMA
          }
        });

        const retryData: ConceptData = JSON.parse(retryResponse.text || '{}');
        filterHallucinatedLinks(retryData, topRelevantConcepts);
        const retryValidation = validateConceptQuality(retryData, topRelevantConcepts);

        if (!retryValidation.valid) {
          // Both attempts failed — return draft for user review, no embedding generated
          console.warn('[Quality] Retry also failed:', retryValidation.issues);
          return res.json({
            ...retryData,
            requiresReview: true,
            qualityIssues: retryValidation.issues
          });
        }

        parsedData = retryData;
        qualityNote = 'Content was refined during quality check';
      } catch (retryErr) {
        console.warn('[Quality] Retry call failed, returning draft for review:', retryErr);
        return res.json({
          ...parsedData,
          requiresReview: true,
          qualityIssues: validation.issues
        });
      }
    }

    // 3. Generate embedding (only after passing quality)
    const embedContents = `Title: ${parsedData.title}\n\nSummary: ${parsedData.summary}\n\nContent: ${parsedData.fullContent}` +
      (sourceContext ? `\n\nSource: ${sourceContext}` : '');

    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: embedContents
    });

    if (embedResponse.embeddings && embedResponse.embeddings.length > 0) {
      parsedData.embedding = embedResponse.embeddings[0].values;
    }

    if (qualityNote) parsedData.qualityNote = qualityNote;
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
      Vary the question type between "multiple_choice", "direct_recall", and "cloze".
      CRITICAL: Questions MUST test deep understanding and application, not trivial wording.
      CRITICAL: For multiple choice, provide exactly 4 options. Make the incorrect options plausible but definitively wrong.
      CRITICAL: For cloze, take one key sentence from the concept content and replace the most important word or short phrase (2-4 words) with "___". The clozeAnswer must be exactly the blanked-out text.
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
                type: { type: Type.STRING, description: "Either 'multiple_choice', 'direct_recall', or 'cloze'" },
                question: { type: Type.STRING, description: "The question text, or the sentence with ___ for cloze" },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING }, 
                  description: "4 options if multiple choice, otherwise empty" 
                },
                correctAnswer: { type: Type.STRING, description: "The correct answer or concept essence" },
                clozeAnswer: { type: Type.STRING, description: "The exact blanked-out text for cloze questions, empty otherwise" },
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
        clozeAnswer: '',
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
        responseSchema: REGEN_SCHEMA
      }
    });

    let parsedData: ConceptData = JSON.parse(response.text || '{}');

    // Quality validation with one controlled retry
    let validation = validateConceptQuality(parsedData);

    if (!validation.valid) {
      console.log('[Quality/Regen] Initial validation failed:', validation.issues);
      try {
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Improve and refine this concept:\nTitle: ${title}\nSummary: ${summary}\nContent: ${fullContent}\n\nFix these issues in your refinement: ${validation.issues.join('; ')}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: REGEN_SCHEMA
          }
        });
        const retryData: ConceptData = JSON.parse(retryResponse.text || '{}');
        const retryValidation = validateConceptQuality(retryData);

        if (!retryValidation.valid) {
          return res.json({
            ...retryData,
            requiresReview: true,
            qualityIssues: retryValidation.issues
          });
        }
        parsedData = retryData;
      } catch (retryErr) {
        console.warn('[Quality/Regen] Retry failed, returning draft:', retryErr);
        return res.json({
          ...parsedData,
          requiresReview: true,
          qualityIssues: validation.issues
        });
      }
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
