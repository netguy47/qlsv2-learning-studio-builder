import React from 'react';
import { Provenance } from '../types';

interface ProvenanceDisplayProps {
  provenance: Provenance[];
}

const ProvenanceDisplay: React.FC<ProvenanceDisplayProps> = ({ provenance }) => {
  if (!provenance || provenance.length === 0) {
    return (
      <div className="bg-[#112240]/30 border border-[#233554] rounded-lg p-4">
        <p className="text-[#8892b0] text-sm">No provenance recorded.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-[#112240]/30 border border-[#233554] rounded-lg p-4 space-y-3">
      <h4 className="text-[#64ffda] text-xs font-bold uppercase tracking-widest mb-3">
        Source Provenance
      </h4>
      {provenance.map((prov, index) => (
        <div key={index} className="bg-[#0a192f]/50 rounded p-3 border border-[#233554]/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#64ffda]/10 text-[#64ffda] text-[10px] font-bold uppercase px-2 py-0.5 rounded">
              {prov.source_type}
            </span>
            {prov.source_url && (
              <a
                href={prov.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8892b0] hover:text-[#64ffda] text-xs underline truncate max-w-[200px]"
              >
                {prov.source_url}
              </a>
            )}
          </div>
          <p className="text-[#495670] text-xs mb-1">
            Retrieved: {formatDate(prov.retrieved_at)}
          </p>
          {prov.notes && (
            <p className="text-[#8892b0] text-xs italic">
              {prov.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProvenanceDisplay;
