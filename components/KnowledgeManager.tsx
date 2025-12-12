import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, Loader2, Info } from 'lucide-react';
import { chunkText } from '../services/vectorUtils';
import { generateEmbedding, generateSummary } from '../services/geminiService';
import { DocumentChunk, UploadedFile } from '../types';

interface KnowledgeManagerProps {
  onAddFile: (file: UploadedFile) => void;
  onUpdateFileStatus: (name: string, status: UploadedFile['status'], chunkCount?: number, description?: string) => void;
  onAddChunks: (chunks: DocumentChunk[]) => void;
  isApiReady: boolean;
}

export const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({ 
  onAddFile, 
  onUpdateFileStatus, 
  onAddChunks,
  isApiReady 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!isApiReady) {
      setErrorMsg("API Key is missing. Cannot process files.");
      return;
    }

    if (file.type !== "text/plain" && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setErrorMsg(`Unsupported file type: ${file.name}. Only .txt and .md supported currently.`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    onAddFile({ name: file.name, size: file.size, status: 'processing', chunkCount: 0 });

    try {
      const text = await file.text();
      const rawChunks = chunkText(text, file.name);
      
      const processedChunks: DocumentChunk[] = [];
      
      // Process embeddings
      for (let i = 0; i < rawChunks.length; i++) {
        const raw = rawChunks[i];
        try {
          // Delay slightly to be kind to the rate limiter if needed
          await new Promise(r => setTimeout(r, 100)); 
          const embedding = await generateEmbedding(raw.content);
          processedChunks.push({ ...raw, embedding });
        } catch (e) {
          console.error(`Failed to embed chunk ${i} of ${file.name}`, e);
        }
      }

      // Generate Summary
      let summary = "";
      try {
        summary = await generateSummary(text);
      } catch (e) {
        console.warn("Failed to generate summary", e);
      }

      onAddChunks(processedChunks);
      onUpdateFileStatus(file.name, 'indexed', processedChunks.length, summary);
    } catch (err) {
      console.error(err);
      onUpdateFileStatus(file.name, 'error');
      setErrorMsg(`Failed to process ${file.name}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 bg-gray-900 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-white mb-6">Manage Knowledge Base</h2>
        
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-400" />
            Add Documents
          </h3>
          
          <div 
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".txt,.md"
              onChange={handleFileChange}
            />
            
            {isProcessing ? (
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-300 font-medium">Processing document & generating embeddings...</p>
                <p className="text-sm text-gray-500 mt-2">Generating AI summary...</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-lg text-gray-200 font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">Supported files: .txt, .md (Plain text only)</p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{errorMsg}</p>
            </div>
          )}
        </div>

        <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-400 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-300 mb-1">How it works</h4>
              <p className="text-sm text-blue-200/70 leading-relaxed">
                1. Documents are split into small chunks on your device.<br/>
                2. We use Gemini <code>text-embedding-004</code> to create vector representations for each chunk.<br/>
                3. We generate a short <strong>AI summary</strong> of the document content.<br/>
                4. When you chat, we find the most relevant chunks to answer your question.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};