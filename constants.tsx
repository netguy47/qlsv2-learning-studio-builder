
import React from 'react';
import { 
  MicrophoneIcon, 
  DocumentTextIcon, 
  Square3Stack3DIcon, 
  ChartBarIcon, 
  PresentationChartBarIcon,
  SpeakerWaveIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { OutputType, SelectableOutputType } from './types';

export interface OutputMetadata {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const OUTPUT_METADATA: Record<SelectableOutputType, OutputMetadata> = {
  [OutputType.PODCAST]: {
    label: 'Podcast',
    description: 'An exploratory audio discussion',
    icon: <MicrophoneIcon className="w-6 h-6" />,
    color: 'teal'
  },
  [OutputType.REPORT]: {
    label: 'Report',
    description: 'A written synthesis',
    icon: <DocumentTextIcon className="w-6 h-6" />,
    color: 'teal'
  },
  [OutputType.AUDIO_REPORT]: {
    label: 'Audio Report',
    description: 'Narrated report summary',
    icon: <SpeakerWaveIcon className="w-6 h-6" />,
    color: 'teal'
  },
  [OutputType.NOTES]: {
    label: 'Notes',
    description: 'Structured study material',
    icon: <PencilIcon className="w-6 h-6" />,
    color: 'teal'
  },
  [OutputType.INFOGRAPHIC]: {
    label: 'Infographic',
    description: 'Visual data summary',
    icon: <ChartBarIcon className="w-6 h-6" />,
    color: 'teal'
  },
  [OutputType.SLIDEDECK]: {
    label: 'Slide Deck',
    description: 'Presentation format',
    icon: <PresentationChartBarIcon className="w-6 h-6" />,
    color: 'teal'
  },
};
