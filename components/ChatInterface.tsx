import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Loader2, Trash2, RefreshCw, AlertCircle, Mic, MicOff } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  onRetry: () => void;
  isProcessing: boolean;
  hasKnowledge: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  onClearChat, 
  onRetry,
  isProcessing, 
  hasKnowledge 
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition. Please try Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${transcript}` : transcript;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-900 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-medium text-gray-200">AI Assistant</h2>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors border border-transparent hover:border-red-500/20"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-8">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Ready to chat</h3>
            <p className="text-gray-400 max-w-md">
              {hasKnowledge 
                ? "Ask me anything about the documents you've uploaded." 
                : "Please upload some documents in the 'Knowledge Base' tab to start RAG chatting."}
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600' 
                  : msg.isError 
                    ? 'bg-red-900/50 border border-red-600 text-red-500' 
                    : 'bg-emerald-600'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : msg.isError ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col gap-2`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : msg.isError 
                      ? 'bg-red-950/40 border border-red-500/30 text-red-200 rounded-tl-none'
                      : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                    {msg.text}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse align-middle" />
                    )}
                  </p>
                </div>

                {/* Retry Button (Only for the latest message if it's an error) */}
                {msg.isError && index === messages.length - 1 && (
                  <button 
                    onClick={onRetry}
                    disabled={isProcessing}
                    className="self-start flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors mt-1 px-2 py-1 hover:bg-red-900/30 rounded"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry Request
                  </button>
                )}

                {/* Sources / Context Display */}
                {msg.relatedChunks && msg.relatedChunks.length > 0 && (
                  <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-3 text-xs">
                    <p className="text-gray-500 font-semibold mb-2 flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      Referenced Context
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {msg.relatedChunks.map((chunk, idx) => (
                        <div key={idx} className="bg-gray-900 border border-gray-700 p-2 rounded min-w-[150px] max-w-[200px] shrink-0">
                          <p className="text-blue-400 font-medium truncate mb-1">{chunk.sourceFile}</p>
                          <p className="text-gray-500 line-clamp-3 italic">{chunk.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex max-w-[75%] flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700 rounded-tl-none">
                <p className="text-gray-400 text-sm animate-pulse">Searching knowledge base...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center gap-2">
          
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing || !hasKnowledge}
              placeholder={hasKnowledge ? "Ask a question about your documents..." : "Upload documents to start chatting"}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-full py-3 pl-5 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isProcessing || !hasKnowledge}
              className={`absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all duration-200 ${
                isListening 
                  ? 'text-white bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Speak"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isProcessing || !hasKnowledge}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full disabled:opacity-50 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        {!hasKnowledge && (
          <p className="text-center text-xs text-yellow-500 mt-2">
            Warning: Knowledge base is empty.
          </p>
        )}
      </div>
    </div>
  );
};