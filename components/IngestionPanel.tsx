
import React, { useState } from 'react';
import Button from './Shared/Button';

type DiagnosticLevel = 'info' | 'warning' | 'error';

interface IngestionPanelProps {
  onIngest: (content: string, type: 'url' | 'youtube' | 'text' | 'manual', purpose?: string) => void;
  isProcessing: boolean;
  onDiagnostic?: (stage: string, message: string, level?: DiagnosticLevel) => void;
}

const IngestionPanel: React.FC<IngestionPanelProps> = ({ onIngest, isProcessing, onDiagnostic }) => {
  const [input, setInput] = useState('');
  const [purpose, setPurpose] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const handleIngest = () => {
    onDiagnostic?.('submit event', 'Source submission received.', 'info');
    const normalized = input.trim();
    if (!normalized) {
      onDiagnostic?.('prompt normalization', 'Empty submission. Nothing to ingest.', 'error');
      return;
    }

    if (mode === 'manual') {
      const normalizedPurpose = purpose.trim();
      if (!normalizedPurpose) {
        onDiagnostic?.('validation', 'Manual entry requires a declared purpose.', 'error');
        return;
      }
      onDiagnostic?.('prompt normalization', `Manual entry with purpose: ${normalizedPurpose}`, 'info');
      onIngest(input, 'manual', normalizedPurpose);
    } else {
      let type: 'url' | 'youtube' | 'text' = 'text';
      if (input.includes('youtube.com/') || input.includes('youtu.be/')) {
        type = 'youtube';
      } else if (input.startsWith('http')) {
        type = 'url';
      }

      onDiagnostic?.(
        'prompt normalization',
        `Normalized input length ${normalized.length}. Classified as ${type}.`,
        'info'
      );
      onIngest(input, type);
    }
  };

  return (
    <div className="bg-[#112240] p-8 rounded-xl border border-[#233554] shadow-xl max-w-2xl w-full mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center text-[#ccd6f6]">
        Bring Your Sources
      </h2>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('auto')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'auto' 
              ? 'bg-[#64ffda] text-[#0a192f]' 
              : 'bg-[#0a192f] text-[#8892b0] hover:text-[#ccd6f6]'
          }`}
        >
          Auto-Detect
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'manual' 
              ? 'bg-[#64ffda] text-[#0a192f]' 
              : 'bg-[#0a192f] text-[#8892b0] hover:text-[#ccd6f6]'
          }`}
        >
          Manual Entry
        </button>
      </div>
      
      <div className="space-y-4">
        <textarea
          className="w-full h-48 bg-[#0a192f] border border-[#233554] rounded-lg p-4 text-[#ccd6f6] focus:border-[#64ffda] focus:ring-1 focus:ring-[#64ffda] outline-none transition-all placeholder:text-[#8892b0]"
          placeholder={mode === 'manual' ? "Enter your content here..." : "Paste a website URL, YouTube link, or text material here..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        
        {mode === 'manual' && (
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#8892b0] mb-2">
              Purpose (Required)
            </label>
            <input
              type="text"
              className="w-full bg-[#0a192f] border border-[#233554] rounded-lg p-3 text-[#ccd6f6] focus:border-[#64ffda] focus:ring-1 focus:ring-[#64ffda] outline-none transition-all placeholder:text-[#8892b0]"
              placeholder="What is the purpose of this content? (e.g., 'Research on AI ethics')"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleIngest} 
            isLoading={isProcessing}
            disabled={!input.trim() || (mode === 'manual' && !purpose.trim())}
            className="w-full text-lg"
          >
            {isProcessing ? 'Processing Source...' : 'Initialize Studio'}
          </Button>
          <p className="text-xs text-[#8892b0] text-center italic">
            {mode === 'manual' 
              ? 'Manual entry will be normalized into the Evidence Vault.'
              : 'Metadata will be extracted automatically.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default IngestionPanel;
