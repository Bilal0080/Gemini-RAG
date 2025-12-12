import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { KnowledgeManager } from './components/KnowledgeManager';
import { AppView, DocumentChunk, UploadedFile, ChatMessage } from './types';
import { generateEmbedding, generateRAGResponse } from './services/geminiService';
import { findRelevantChunks } from './services/vectorUtils';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.KNOWLEDGE);
  
  // Knowledge Base State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);

  // Check if API Key is available
  const isApiReady = !!process.env.API_KEY;

  // Handlers for Knowledge Base
  const handleAddFile = (file: UploadedFile) => {
    setFiles(prev => [...prev, file]);
  };

  const handleUpdateFileStatus = (name: string, status: UploadedFile['status'], chunkCount?: number, description?: string) => {
    setFiles(prev => prev.map(f => {
      if (f.name === name) {
        return { 
          ...f, 
          status, 
          chunkCount: chunkCount !== undefined ? chunkCount : f.chunkCount,
          description: description || f.description
        };
      }
      return f;
    }));
  };

  const handleAddChunks = (newChunks: DocumentChunk[]) => {
    setChunks(prev => [...prev, ...newChunks]);
  };

  // Shared logic for processing a user query (used by sendMessage and retry)
  const processQuery = async (text: string) => {
    setIsProcessingMessage(true);
    const botMsgId = (Date.now() + 1).toString();

    try {
      // 1. Embed the user query
      const queryEmbedding = await generateEmbedding(text);

      // 2. Find relevant chunks
      const relevantChunks = findRelevantChunks(queryEmbedding, chunks, 5);

      // 3. Prepare initial bot message (empty)
      const botMessage: ChatMessage = {
        id: botMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
        relatedChunks: relevantChunks,
        isStreaming: true
      };
      
      // Add the empty message to UI and stop the "Analyzing" loader
      setMessages(prev => [...prev, botMessage]);
      setIsProcessingMessage(false);

      // 4. Generate Streaming Answer
      const stream = await generateRAGResponse(text, relevantChunks);
      
      let fullText = "";
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId ? { ...msg, text: fullText } : msg
        ));
      }

      // 5. Finalize message (remove streaming flag)
      setMessages(prev => prev.map(msg => 
        msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
      ));

    } catch (error: any) {
      console.error("Chat error:", error);
      setIsProcessingMessage(false);
      
      let errorMsg = "An unexpected error occurred.";
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      
      if (errorMsg.includes("429")) {
        errorMsg = "Rate limit exceeded. Please wait a moment and try again.";
      } else if (errorMsg.includes("401") || errorMsg.includes("API key")) {
        errorMsg = "Invalid API Key. Please check your configuration.";
      }

      // Check if we already created the bot message (error during stream) or not (error during embedding)
      setMessages(prev => {
        const existingMsg = prev.find(m => m.id === botMsgId);
        if (existingMsg) {
          // Update existing message to show error
          return prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false, isError: true, text: m.text + `\n\n[Error: ${errorMsg}]` } : m);
        } else {
          // Add new error message
          const errorMessage: ChatMessage = {
            id: botMsgId,
            role: 'model',
            text: `Error: ${errorMsg}`,
            timestamp: Date.now(),
            isError: true
          };
          return [...prev, errorMessage];
        }
      });
    }
  };

  // Handler for Chat
  const handleSendMessage = async (text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMessage]);
    await processQuery(text);
  };

  const handleRetry = async () => {
    if (isProcessingMessage) return;

    // 1. Remove the last message if it's an error
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg?.isError) {
        return prev.slice(0, -1);
      }
      return prev;
    });

    // 2. Find the last user message to retry
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (lastUserMessage) {
      await processQuery(lastUserMessage.text);
    }
  };

  const handleClearChat = () => {
    if (messages.length > 0 && window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView}
        onChangeView={setCurrentView}
        files={files}
        totalChunks={chunks.length}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-gray-900 relative">
        {!isApiReady && (
          <div className="absolute inset-0 z-50 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-lg border border-red-500/50 shadow-2xl max-w-md text-center">
              <h2 className="text-xl font-bold text-red-400 mb-2">API Key Missing</h2>
              <p className="text-gray-300 mb-4">
                The <code className="bg-gray-900 px-1 py-0.5 rounded text-gray-200">API_KEY</code> environment variable is missing. 
                Please configure the environment with a valid Google Gemini API Key to use this application.
              </p>
            </div>
          </div>
        )}

        {currentView === AppView.KNOWLEDGE ? (
          <KnowledgeManager 
            onAddFile={handleAddFile} 
            onUpdateFileStatus={handleUpdateFileStatus}
            onAddChunks={handleAddChunks}
            isApiReady={isApiReady}
          />
        ) : (
          <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onRetry={handleRetry}
            isProcessing={isProcessingMessage}
            hasKnowledge={chunks.length > 0}
          />
        )}
      </main>
    </div>
  );
};

export default App;