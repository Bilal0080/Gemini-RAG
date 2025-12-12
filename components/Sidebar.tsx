import React from 'react';
import { AppView, UploadedFile } from '../types';
import { MessageSquare, Database, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  files: UploadedFile[];
  totalChunks: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, files, totalChunks }) => {
  
  const getStatusIcon = (status: UploadedFile['status']) => {
    switch(status) {
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'indexed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <div className="w-4 h-4 rounded-full border border-gray-500" />;
    }
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
          Gemini RAG
        </h1>
        <p className="text-xs text-gray-500 mt-1">Client-Side Knowledge Base</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        <button
          onClick={() => onChangeView(AppView.CHAT)}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            currentView === AppView.CHAT 
              ? 'bg-blue-600/10 text-blue-400' 
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <MessageSquare className="mr-3 h-5 w-5" />
          Chat
        </button>

        <button
          onClick={() => onChangeView(AppView.KNOWLEDGE)}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            currentView === AppView.KNOWLEDGE 
              ? 'bg-blue-600/10 text-blue-400' 
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Database className="mr-3 h-5 w-5" />
          Knowledge Base
        </button>
      </nav>

      <div className="p-4 bg-gray-950/50 border-t border-gray-800">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Files ({files.length})
          </h3>
          <span className="text-xs text-gray-600">{totalChunks} Chunks</span>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {files.length === 0 && (
            <p className="text-xs text-gray-600 italic">No files indexed.</p>
          )}
          {files.map((file, idx) => (
            <div key={idx} className="group p-2 rounded hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center overflow-hidden">
                  <FileText className="w-3 h-3 text-gray-500 mr-2 shrink-0" />
                  <span className="text-xs text-gray-300 truncate max-w-[120px] font-medium" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <div title={file.status}>
                  {getStatusIcon(file.status)}
                </div>
              </div>
              {file.description && (
                <p className="text-[10px] text-gray-500 pl-5 truncate" title={file.description}>
                  {file.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};