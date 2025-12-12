import { GoogleGenAI } from "@google/genai";
import { DocumentChunk } from "../types";

// Ensure API key is present
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Models
const EMBEDDING_MODEL = "text-embedding-004";
const GENERATION_MODEL = "gemini-2.5-flash";

/**
 * Generates an embedding for a single text string.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!API_KEY) throw new Error("API Key not found");
  
  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });

    if (!response.embeddings || response.embeddings.length === 0) {
      throw new Error("No embedding returned");
    }

    return response.embeddings[0].values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
};

/**
 * Generates a brief summary of the text.
 */
export const generateSummary = async (text: string): Promise<string> => {
  if (!API_KEY) return "";
  
  try {
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      config: {
        systemInstruction: "You are a helpful assistant. Summarize the provided text in 5-8 words. Be concise.",
      },
      contents: `Text to summarize: ${text.slice(0, 5000)}`, // Limit input to save tokens
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "";
  }
};

/**
 * Generates a streaming answer based on context using the RAG pattern.
 */
export const generateRAGResponse = async function* (
  query: string,
  contextChunks: DocumentChunk[]
): AsyncGenerator<string, void, unknown> {
  if (!API_KEY) throw new Error("API Key not found");

  // Construct context string
  const contextText = contextChunks.map(c => `[Source: ${c.sourceFile}]\n${c.content}`).join("\n\n---\n\n");

  const systemPrompt = `You are an intelligent knowledge assistant. Your goal is to answer the user's question accurately using ONLY the provided context below.
  
  Instructions:
  1. Analyze the Context provided.
  2. Answer the User Question based on that Context.
  3. If the answer is not found in the Context, politely state that you cannot answer based on the available information.
  4. Do not make up facts not present in the Context.
  5. Cite the source file name if possible.
  `;

  const userPrompt = `Context:\n${contextText}\n\nUser Question: ${query}`;

  try {
    const response = await ai.models.generateContentStream({
      model: GENERATION_MODEL,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3, 
      },
      contents: userPrompt,
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error generating RAG response:", error);
    throw error;
  }
};