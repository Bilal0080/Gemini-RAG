export interface DocumentChunk {
  id: string;
  sourceFile: string;
  content: string;
  embedding: number[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  // If the model used chunks to answer, we list them here for transparency
  relatedChunks?: DocumentChunk[]; 
  isError?: boolean;
  isStreaming?: boolean;
}

export interface UploadedFile {
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  chunkCount: number;
  description?: string;
}

export enum AppView {
  CHAT = 'CHAT',
  KNOWLEDGE = 'KNOWLEDGE',
}