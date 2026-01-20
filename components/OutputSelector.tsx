
import React from 'react';
import { OutputType, OutputEligibility, OutputExecutionState, OutputExecutionStatus } from '../types';
import { OUTPUT_METADATA } from '../constants';

interface OutputSelectorProps {
  onSelect: (type: OutputType) => void;
  isGenerating: boolean;
  selectedType?: OutputType;
  disabled?: boolean;
  outputEligibility?: OutputEligibility[];
  outputExecutionStatus?: OutputExecutionStatus[];
}

const OutputSelector: React.FC<OutputSelectorProps> = ({ onSelect, isGenerating, selectedType, disabled = false, outputEligibility = [], outputExecutionStatus = [] }) => {
  const getEligibility = (type: OutputType): OutputEligibility | undefined => {
    return outputEligibility.find(e => e.type === type);
  };

  const getExecutionStatus = (type: OutputType): OutputExecutionStatus | undefined => {
    return outputExecutionStatus.find(e => e.type === type);
  };

  const getExecutionStateIcon = (state: OutputExecutionState): string => {
    switch (state) {
      case OutputExecutionState.IN_PROGRESS:
        return '⏳';
      case OutputExecutionState.COMPLETED:
        return '✅';
      case OutputExecutionState.FAILED:
        return '❌';
      case OutputExecutionState.REQUESTED:
        return '⏸️';
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-5xl mx-auto">
      {(Object.entries(OUTPUT_METADATA) as [OutputType, any][]).map(([type, meta]) => {
        const eligibility = getEligibility(type);
        const isEligible = eligibility?.eligible ?? true;
        const executionStatus = getExecutionStatus(type);
        const isDisabled = isGenerating || disabled || !isEligible;
        
        return (
          <button
            key={type}
            disabled={isDisabled}
            onClick={() => onSelect(type)}
            className={`
              flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-300 relative
              ${selectedType === type 
                ? 'bg-[#112240] border-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.2)]' 
                : 'bg-[#112240] border-[#233554] hover:border-[#64ffda] opacity-80 hover:opacity-100'}
              ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
              disabled:opacity-40
            `}
            title={!isEligible ? eligibility?.reason : meta.description}
          >
            <div className="text-[#64ffda] mb-3">{meta.icon}</div>
            <span className="text-sm font-medium text-[#ccd6f6]">{meta.label}</span>
            <p className="text-[10px] text-[#8892b0] mt-1 text-center">
              {!isEligible ? eligibility?.reason : meta.description}
            </p>
            {executionStatus && executionStatus.state !== OutputExecutionState.IDLE && (
              <div className="absolute top-2 right-2 text-lg" title={`Execution state: ${executionStatus.state}`}>
                {getExecutionStateIcon(executionStatus.state)}
              </div>
            )}
            {!isEligible && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400" title="Not eligible"></div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default OutputSelector;
