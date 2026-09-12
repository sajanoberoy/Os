import { GoogleGenAI } from '@google/genai';
import { ChatResponsePayload, RAGRetrievalResult, SourceCitation } from '../types.js';

export class RAGGenerator {
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }

  public async generateAnswer(retrieval: RAGRetrievalResult): Promise<ChatResponsePayload> {
    const startTime = Date.now();
    const { officialChunks, query } = retrieval;

    // Prepare official source citations
    const sources: SourceCitation[] = [];

    for (const item of officialChunks) {
      sources.push({
        id: item.chunk.id,
        title: item.chunk.source,
        pageOrSection: item.chunk.pageOrSection,
        type: 'official',
        snippet: item.chunk.content.slice(0, 160) + '...',
        relevanceScore: item.score,
      });
    }

    // Format official context for prompt
    const officialContextText = officialChunks.length > 0
      ? officialChunks.map(c => `[DOCUMENT: ${c.chunk.source} | ${c.chunk.pageOrSection}]\n${c.chunk.content}`).join('\n\n')
      : 'NO_OFFICIAL_DOCUMENTS_FOUND';

    const systemInstruction = `You are a knowledgeable, friendly, and articulate university advisor assistant.
Students, faculty, and visitors ask you questions regarding campus rules, academic policies, fees, deadlines, facilities, procedures, and official notices.

CRITICAL COMMUNICATION RULES:
1. Conversational Greetings: If the user simply says "Hi", "Hello", or similar greetings, reply with a warm, brief greeting and offer your help (e.g., "Hello! How can I help you with campus information today?"). Do not look for documents if it's just a greeting.
2. Direct & Pinpointed: For actual questions, answer exactly what is asked directly in your opening sentences. Do not start with robotic filler like "Based on the provided documents" or repeat the user's question.
3. Human & Conversational: Write naturally in clear, reader-friendly prose as if explaining things in person at a campus helpdesk.
4. Specifics & Numbers: Always extract and highlight exact details from the provided source information—including percentages, deadlines, office rooms, contact numbers/emails, fee amounts, and required forms.
5. Readability: Use short paragraphs (2-3 sentences max). When listing requirements or steps, use clean bullet points.
6. Missing Information: If the provided documents do not mention the answer, politely state: "I don't have this specific detail in our campus records. I recommend checking with the relevant department coordinator or the student administration desk." Never make up ungrounded policies or numbers.`;

    const userPrompt = `STUDENT QUESTION: "${query}"

==================================================
OFFICIAL SOURCE INFORMATION (Includes custom administrative documents):
${officialContextText}

==================================================
INSTRUCTIONS:
Provide a direct, human-like, and pinpointed answer to the student's question based strictly on the source information above. If there are immediate steps to follow, summarize them concisely.`;

    let officialAnswer = '';
    let nextSteps: string[] = [];
    let fullTextAnswer = '';
    let modelUsed = 'gemini-3.1-flash-lite';

    if (this.aiClient) {
      const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
      for (const modelName of modelsToTry) {
        try {
          modelUsed = modelName;
          const response = await this.aiClient.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction,
              temperature: 0.2,
            }
          });

          fullTextAnswer = response.text || '';
          if (fullTextAnswer.trim()) {
            const stepsMatch = fullTextAnswer.match(/(?:ACTIONABLE|RECOMMENDED)?\s*NEXT\s*STEPS[:\s\n]+([\s\S]*?)(?=(?:SOURCES|$))/i);
            if (stepsMatch && stepsMatch[1].trim()) {
              const stepLines = stepsMatch[1].split('\n').map(l => l.replace(/^[-*•\d.]+\s*/, '').trim()).filter(l => l.length > 5);
              nextSteps = stepLines;
              officialAnswer = fullTextAnswer.replace(/(?:ACTIONABLE|RECOMMENDED)?\s*NEXT\s*STEPS[:\s\n]+[\s\S]*$/i, '').trim();
            } else {
              officialAnswer = fullTextAnswer.trim();
            }
            break;
          }
        } catch (err: any) {
          console.warn(`[RAG Generator] Model ${modelName} failed:`, err?.message || err);
          if (err?.message?.includes('resource_exhausted') || err?.message?.includes('quota') || err?.message?.includes('rate limit')) {
            modelUsed = 'Gemini Quota Exceeded (Using RAG Fallback)';
          }
        }
      }
    }

    // Fallback deterministic grounded builder if API was offline or parsing was empty
    if (!officialAnswer) {
      if (officialChunks.length > 0) {
        const synthesized = officialChunks.map(c => `From **${c.chunk.source}** (${c.chunk.pageOrSection}):\n${c.chunk.content}`).join('\n\n');
        officialAnswer = synthesized.slice(0, 1500) + (synthesized.length > 1500 ? '...' : '');
      } else {
        officialAnswer = "Hello! Here is the relevant campus information based on official university records. Please let me know if you need specific details on admissions, examinations, hostels, or deadlines.";
      }

      fullTextAnswer = officialAnswer;
      modelUsed = this.aiClient ? 'Gemini RAG Fallback' : 'Local Grounded Engine';
    }

    const groundingStatus: 'fully_grounded' | 'partially_grounded' | 'no_official_source' = officialChunks.length > 0 ? 'fully_grounded' : 'no_official_source';

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      question: query,
      officialAnswer,
      nextSteps: nextSteps.length > 0 ? nextSteps : undefined,
      fullTextAnswer,
      sources,
      groundingStatus,
      timestamp: new Date().toISOString(),
      latencyMs,
      modelUsed,
    };
  }
}

export const ragGenerator = new RAGGenerator();
