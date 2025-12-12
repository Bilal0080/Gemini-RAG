import { DocumentChunk } from '../types';

/**
 * Intelligent text chunking that respects sentence and paragraph boundaries.
 * 
 * Strategy:
 * 1. Split text into logical "units" (paragraphs, then sentences if paragraphs are too long).
 * 2. Aggregate units into chunks until chunkSize is reached.
 * 3. When a chunk is full, maintain a set amount of overlap from the end of the previous chunk
 *    to start the next one, preserving context across boundaries.
 */
export const chunkText = (text: string, sourceFile: string, chunkSize: number = 800, overlap: number = 100): Omit<DocumentChunk, 'embedding'>[] => {
  const chunks: Omit<DocumentChunk, 'embedding'>[] = [];
  
  if (!text || text.trim().length === 0) return [];

  // 1. Split text into smallest atomic units (sentences) while preserving paragraph flows
  // Regex explanation: Match sequences ending in punctuation (.!?) followed by space or end of string, OR any remaining text.
  // This helps split by sentences.
  const splitIntoUnits = (str: string): string[] => {
    // First, normalize newlines but keep double newlines as paragraph markers
    const normalized = str.replace(/\r\n/g, '\n');
    
    // Split by paragraphs first
    const paragraphs = normalized.split(/\n\s*\n/);
    
    const units: string[] = [];
    
    for (const p of paragraphs) {
      const trimmedP = p.replace(/\s+/g, ' ').trim();
      if (!trimmedP) continue;
      
      // If paragraph fits in a chunk, treat it as a unit (preferred for context)
      // We use a threshold slightly lower than chunkSize to allow for combinations
      if (trimmedP.length < chunkSize * 0.5) {
        units.push(trimmedP);
      } else {
        // Paragraph is large, split into sentences
        const sentences = trimmedP.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
        
        if (sentences) {
          for (const s of sentences) {
             const trimmedS = s.trim();
             if (trimmedS) {
               // If a single sentence is massive (unlikely in normal text), hard split it
               if (trimmedS.length > chunkSize) {
                 let i = 0;
                 while (i < trimmedS.length) {
                   units.push(trimmedS.slice(i, i + chunkSize));
                   i += chunkSize;
                 }
               } else {
                 units.push(trimmedS);
               }
             }
          }
        } else {
          // Fallback if regex fails (unlikely)
          units.push(trimmedP);
        }
      }
    }
    return units;
  };

  const units = splitIntoUnits(text);
  
  // 2. Build chunks
  let currentChunkUnits: string[] = [];
  let currentChunkLength = 0;
  
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const unitLength = unit.length;
    
    // Check if adding this unit exceeds chunkSize
    // Account for spaces between units (approx 1 char per unit)
    if (currentChunkLength + unitLength + 1 > chunkSize && currentChunkUnits.length > 0) {
      // Finalize current chunk
      chunks.push({
        id: `${sourceFile}-${chunks.length}-${Date.now()}`,
        sourceFile,
        content: currentChunkUnits.join(' '),
      });
      
      // Calculate Overlap for the next chunk
      // We want to keep the *last* N chars worth of units to start the new chunk
      let overlapUnits: string[] = [];
      let overlapCurrentLength = 0;
      
      // Iterate backwards through the current chunk units to find what fits in 'overlap'
      for (let j = currentChunkUnits.length - 1; j >= 0; j--) {
        const u = currentChunkUnits[j];
        if (overlapCurrentLength + u.length > overlap) break;
        
        overlapUnits.unshift(u);
        overlapCurrentLength += u.length + 1;
      }
      
      // Start new chunk with overlap units + current unit
      currentChunkUnits = [...overlapUnits, unit];
      currentChunkLength = overlapCurrentLength + unitLength + 1;
      
    } else {
      // Add unit to current chunk
      currentChunkUnits.push(unit);
      currentChunkLength += unitLength + 1;
    }
  }
  
  // Add any remaining text as the last chunk
  if (currentChunkUnits.length > 0) {
    chunks.push({
      id: `${sourceFile}-${chunks.length}-${Date.now()}`,
      sourceFile,
      content: currentChunkUnits.join(' '),
    });
  }
  
  return chunks;
};

// Calculate cosine similarity between two vectors
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Retrieve top K most similar chunks
export const findRelevantChunks = (
  queryEmbedding: number[],
  chunks: DocumentChunk[],
  topK: number = 5
): DocumentChunk[] => {
  const scoredChunks = chunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  // Sort by score descending
  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, topK).map(item => item.chunk);
};