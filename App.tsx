
import React, { useState, useEffect, useCallback } from 'react';
import { OutputType, GeneratedOutput, InternalBaseline, BaselineStatus, FortifiedBaselineState, FortifiedBaselineStatus, BaselineAction, determineOutputEligibility, OutputEligibility, OutputExecutionState, OutputExecutionStatus, UserTier, checkMonetizationEntitlement, MonetizationCheckResult, NotesOutput, ReportOutput, AudioReportOutput, InfographicOutput, SlideDeckOutput, PodcastOutput, SelectableOutputType } from './types';
import IngestionPanel from './components/IngestionPanel';
import OutputSelector from './components/OutputSelector';
import OutputViewer from './components/OutputViewer';
import ProvenanceDisplay from './components/ProvenanceDisplay';
import Button from './components/Shared/Button';
import EnhancedInfographicPanel from './components/panels/InfographicPanel';
import EnhancedSlideDeckPanel from './components/panels/SlideDeckPanel';
import { OUTPUT_METADATA } from './constants';
import { generateLongForm, countWords } from './longform';
import { API_ENDPOINTS, TIMEOUTS } from './config';
import { BookOpenIcon, SparklesIcon, ArchiveBoxIcon, ArrowLeftIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [baseline, setBaseline] = useState<InternalBaseline | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeOutput, setActiveOutput] = useState<GeneratedOutput | null>(null);
  const [savedLibrary, setSavedLibrary] = useState<GeneratedOutput[]>([]);
  const [hydrationActive, setHydrationActive] = useState(false);
  const [generatingType, setGeneratingType] = useState<OutputType | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [preview, setPreview] = useState<{ content: string; length: number; url: string } | null>(null);
  const [useEnhancedPanels, setUseEnhancedPanels] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    id: string;
    stage: string;
    message: string;
    level: 'info' | 'warning' | 'error';
  }[]>([]);
  const [hydrationWarning, setHydrationWarning] = useState<string | null>(null);
  const [duplicateContentWarning, setDuplicateContentWarning] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);
  const [fortifiedStatus, setFortifiedStatus] = useState<FortifiedBaselineStatus | null>(null);
  const [providerInvoked, setProviderInvoked] = useState(false);
  const [outputEligibility, setOutputEligibility] = useState<OutputEligibility[]>([]);
  const [outputExecutionStatus, setOutputExecutionStatus] = useState<OutputExecutionStatus[]>([]);
  const [userTier, setUserTier] = useState<UserTier>(UserTier.FREE);
  const [notesOutput, setNotesOutput] = useState<NotesOutput | null>(null);
  const [reportOutput, setReportOutput] = useState<ReportOutput | null>(null);
  const [audioReportOutput, setAudioReportOutput] = useState<AudioReportOutput | null>(null);
  const [infographicOutput, setInfographicOutput] = useState<InfographicOutput | null>(null);
  const [slideDeckOutput, setSlideDeckOutput] = useState<SlideDeckOutput | null>(null);
  const [podcastOutput, setPodcastOutput] = useState<PodcastOutput | null>(null);
  
  // State tracking to enforce irreversible state transitions
  const [hasInitialized, setHasInitialized] = useState(false); // Prevents UNINITIALIZED from reoccurring
  const [blockedStateReason, setBlockedStateReason] = useState<string | null>(null); // Tracks why system is BLOCKED

  const addDiagnostic = useCallback(
    (stage: string, message: string, level: 'info' | 'warning' | 'error' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setDiagnostics((prev) => [...prev, { id, stage, message, level }]);
    },
    []
  );

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  };

  const computeFortifiedBaselineStatus = useCallback((): FortifiedBaselineStatus => {
    // Check environment readiness
    const requiredEnvVars = ['REACT_APP_API_ENDPOINT'];
    const missingVars = requiredEnvVars.filter(varName => {
      // Check both process.env and window.location for API endpoint
      if (varName === 'REACT_APP_API_ENDPOINT') {
        const hasEnvVar = process.env[varName] !== undefined;
        const hasDefaultEndpoint = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        return !hasEnvVar && !hasDefaultEndpoint;
      }
      return false;
    });
    const environmentReady = missingVars.length === 0;

    // Check baseline presence
    const hasBaseline = baseline !== null;
    const hasScenario = hasBaseline && baseline.content.length > 0;

    // Check provider readiness
    const providersIdle = !providerInvoked;

    // Check evidence vault state
    let evidenceVaultState: 'empty' | 'seeded' | 'populated' = 'empty';
    if (activeOutput) {
      evidenceVaultState = 'populated';
    } else if (savedLibrary.length > 0) {
      evidenceVaultState = 'seeded';
    }

    // Determine overall state and action
    let state: FortifiedBaselineState;
    let message: string;
    let action: BaselineAction;
    let actionGuidance: string;

    // BLOCKED state: Requires external change (env update, redeploy, or user action)
    if (!environmentReady) {
      state = FortifiedBaselineState.BLOCKED;
      message = `Missing required environment variables: ${missingVars.join(', ')}`;
      action = BaselineAction.CONFIGURE_ENVIRONMENT;
      actionGuidance = 'Configure environment variables in .env file and restart the application';
      // Track blocked reason to enforce external change requirement
      if (blockedStateReason !== 'missing_env_vars') {
        setBlockedStateReason('missing_env_vars');
      }
    } 
    // UNINITIALIZED state: One-time pre-evaluation state, cannot reoccur after initial computation
    else if (!hasInitialized) {
      state = FortifiedBaselineState.UNINITIALIZED;
      message = 'System initializing baseline status';
      action = BaselineAction.INITIALIZE_BASELINE;
      actionGuidance = 'Provide a URL, YouTube link, or text to initialize the studio';
      // Mark as initialized to prevent UNINITIALIZED from reoccurring
      setHasInitialized(true);
    }
    // INCOMPLETE state: Baseline exists but insufficient
    else if (!hasBaseline) {
      state = FortifiedBaselineState.INCOMPLETE;
      message = 'No baseline content established';
      action = BaselineAction.INITIALIZE_BASELINE;
      actionGuidance = 'Provide a URL, YouTube link, or text to initialize the studio';
    }
    else if (!hasScenario) {
      state = FortifiedBaselineState.INCOMPLETE;
      message = 'Baseline content is insufficient';
      action = BaselineAction.IMPROVE_BASELINE;
      actionGuidance = 'Provide more comprehensive content or try a different source';
    }
    // READY state: System is fully operational
    else if (providersIdle && evidenceVaultState === 'empty') {
      state = FortifiedBaselineState.READY;
      message = 'System ready for exploration';
      action = BaselineAction.SELECT_OUTPUT_TYPE;
      actionGuidance = 'Select an output type to generate content';
    }
    else if (providersIdle && evidenceVaultState !== 'empty') {
      state = FortifiedBaselineState.READY;
      message = 'System ready with existing outputs';
      action = BaselineAction.REVIEW_OUTPUTS;
      actionGuidance = 'Generate new content or review existing outputs';
    }
    else {
      state = FortifiedBaselineState.READY;
      message = 'System operational';
      action = BaselineAction.GENERATE_CONTENT;
      actionGuidance = 'Continue exploration or generate new content';
    }

    return {
      state,
      environment: {
        ready: environmentReady,
        missingVars
      },
      baselinePresence: {
        hasBaseline,
        hasScenario
      },
      providerReadiness: {
        invoked: providerInvoked,
        idle: providersIdle
      },
      evidenceVault: {
        state: evidenceVaultState,
        itemsCount: savedLibrary.length
      },
      message,
      action,
      actionGuidance,
      timestamp: Date.now()
    };
  }, [baseline, providerInvoked, activeOutput, savedLibrary, hasInitialized, blockedStateReason]);

  useEffect(() => {
    const status = computeFortifiedBaselineStatus();
    setFortifiedStatus(status);
    
    // Compute output eligibility for all output types
    const baselineLength = baseline?.content?.length || 0;
    const evidenceVaultState = activeOutput ? 'populated' : (savedLibrary.length > 0 ? 'seeded' : 'empty');
    
    const eligibility: OutputEligibility[] = [
      determineOutputEligibility(OutputType.PODCAST, status.state, baselineLength, evidenceVaultState),
      determineOutputEligibility(OutputType.AUDIO_REPORT, status.state, baselineLength, evidenceVaultState),
      determineOutputEligibility(OutputType.NOTES, status.state, baselineLength, evidenceVaultState),
      determineOutputEligibility(OutputType.INFOGRAPHIC, status.state, baselineLength, evidenceVaultState),
      determineOutputEligibility(OutputType.SLIDEDECK, status.state, baselineLength, evidenceVaultState),
      determineOutputEligibility(OutputType.REPORT, status.state, baselineLength, evidenceVaultState)
    ];
    
    setOutputEligibility(eligibility);
    
    // Console log in machine-readable JSON format
    console.log('🔒 Fortified Baseline Status:', JSON.stringify(status, null, 2));
    console.log('📊 Output Eligibility:', JSON.stringify(eligibility, null, 2));
  }, [computeFortifiedBaselineStatus, baseline, activeOutput, savedLibrary]);

  const isLikelyImageUrl = (value: string) => /^(https?:\/\/|data:image\/)/i.test(value.trim());

  const normalizeSvgDataUrl = (value: string) => value;

  const normalizeSlideImage = (item: any): string | null => {
    if (!item) return null;
    if (typeof item === 'string') {
      return isLikelyImageUrl(item) ? normalizeSvgDataUrl(item) : null;
    }
    if (typeof item === 'object') {
      const url =
        item.image_url ||
        item.imageUrl ||
        item.url ||
        item.image ||
        item.image_src ||
        item.imageSrc;
      if (typeof url === 'string' && url.trim()) {
        return isLikelyImageUrl(url) ? normalizeSvgDataUrl(url) : null;
      }
      const data =
        item.image_data ||
        item.imageData ||
        item.base64 ||
        item.data;
      if (typeof data === 'string' && data.trim()) {
        const trimmed = data.trim();
        if (/^data:image\//i.test(trimmed)) return trimmed;
        return `data:image/png;base64,${trimmed}`;
      }
    }
    return null;
  };

  useEffect(() => {
    const saved = localStorage.getItem('qlsv2_library');
    if (saved) {
      setSavedLibrary(JSON.parse(saved));
    }
    
    // Initialize output execution status for all output types
    const initialExecutionStatus: OutputExecutionStatus[] = [
      { type: OutputType.PODCAST, state: OutputExecutionState.IDLE, timestamp: Date.now() },
      { type: OutputType.AUDIO_REPORT, state: OutputExecutionState.IDLE, timestamp: Date.now() },
      { type: OutputType.NOTES, state: OutputExecutionState.IDLE, timestamp: Date.now() },
      { type: OutputType.INFOGRAPHIC, state: OutputExecutionState.IDLE, timestamp: Date.now() },
      { type: OutputType.SLIDEDECK, state: OutputExecutionState.IDLE, timestamp: Date.now() },
      { type: OutputType.REPORT, state: OutputExecutionState.IDLE, timestamp: Date.now() }
    ];
    setOutputExecutionStatus(initialExecutionStatus);
  }, []);

  const handleIngest = async (content: string, type: 'url' | 'youtube' | 'text' | 'manual', purpose?: string) => {
    addDiagnostic('submit event', 'Source submission received.', 'info');
    const normalized = content.trim();
    if (!normalized) {
      addDiagnostic('prompt normalization', 'Empty submission. Nothing to ingest.', 'error');
      return;
    }
    
    // Check if system is BLOCKED before allowing any ingestion
    if (fortifiedStatus && fortifiedStatus.state === FortifiedBaselineState.BLOCKED) {
      addDiagnostic('baseline status', `Cannot ingest: system is BLOCKED. ${fortifiedStatus.actionGuidance}`, 'error');
      alert(`System is blocked. ${fortifiedStatus.actionGuidance}`);
      return;
    }
    
    addDiagnostic(
      'prompt normalization',
      `Normalized input length ${normalized.length}. Classified as ${type}.`,
      'info'
    );
    setIsProcessing(true);
    setActiveOutput(null);
    setPreview(null);

    try {
      if (type === 'manual') {
        // Manual entry: Normalize into Evidence Vault schema
        addDiagnostic('tool / retrieval invocation', 'Submitting manual entry with purpose.', 'info');
        const sourceType = 'Manual Entry';
        const response = await fetch('http://localhost:5000/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            source_type: sourceType, 
            input_value: content,
            purpose: purpose || 'Manual entry without declared purpose'
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        if (data.status === BaselineStatus.ERROR || data.status === BaselineStatus.INSUFFICIENT_CONTENT) {
          const message = data.error_message || 'Manual entry insufficient. Provide more content.';
          addDiagnostic('response handling', message, 'warning');
          alert(message);
          setBaseline(null);
          return;
        }
        addDiagnostic('response handling', 'Manual entry baseline response received.', 'info');
        setBaseline({
          content: data.content,
          summary: data.content.substring(0, 500),
          keyPoints: [purpose || 'Manual entry'],
          themes: [sourceType],
          exploratoryQuestions: [],
          provenance: data.provenance,
          status: data.status,
          errorMessage: data.error_message
        });
      } else if (type === 'url') {
        // For URLs, fetch preview first
        addDiagnostic('tool / retrieval invocation', 'Requesting URL preview.', 'info');
        const response = await fetch('http://localhost:5000/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: content })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        addDiagnostic('response handling', 'Preview response received.', 'info');

        setPreview({
          content: data.content,
          length: data.length,
          url: content
        });
      } else if (type === 'youtube') {
        // For YouTube, immediately ingest
        const sourceType = 'YouTube';
        addDiagnostic('tool / retrieval invocation', 'Submitting YouTube ingestion.', 'info');
        const response = await fetch('http://localhost:5000/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_type: sourceType, input_value: content })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        if (data.status === BaselineStatus.ERROR || data.status === BaselineStatus.INSUFFICIENT_CONTENT) {
          const message = data.error_message
            || 'YouTube transcript unavailable. Paste a transcript manually to continue.';
          addDiagnostic('response handling', message, 'warning');
          alert(message);
          setBaseline(null);
          return;
        }
        addDiagnostic('response handling', 'Baseline response received.', 'info');
        setBaseline({
          content: data.content,
          summary: data.content.substring(0, 500),
          keyPoints: [data.source_ref],
          themes: [data.source_type],
          exploratoryQuestions: [],
          provenance: data.provenance,
          status: data.status,
          errorMessage: data.error_message
        });
      } else {
        // For pasted text, immediately ingest
        const sourceType = 'Paste';
        addDiagnostic('tool / retrieval invocation', 'Submitting text ingestion.', 'info');
        const response = await fetch('http://localhost:5000/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_type: sourceType, input_value: content })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        addDiagnostic('response handling', 'Baseline response received.', 'info');
        setBaseline({
          content: data.content,
          summary: data.content.substring(0, 500),
          keyPoints: [data.source_ref],
          themes: [data.source_type],
          exploratoryQuestions: [],
          provenance: data.provenance,
          status: data.status,
          errorMessage: data.error_message
        });
      }
    } catch (error) {
      addDiagnostic('response handling', `Ingestion failed: ${getErrorMessage(error)}`, 'error');
      console.error("Ingestion failed:", error);
      alert("Interpretation of this source failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmBaseline = async () => {
    addDiagnostic('submit event', 'Baseline confirmation submitted.', 'info');
    if (!preview) {
      addDiagnostic('response handling', 'Preview missing. Cannot confirm baseline.', 'error');
      return;
    }
    const extracted = preview.content ?? '';
    const length = extracted.trim().length;
    const forceOkStatus = length > 0 && length < 500;
    if (length === 0) {
      addDiagnostic('response handling', 'No content extracted from URL preview.', 'error');
      alert('No content extracted from this URL. Check robots.txt, CORS, or HTML structure.');
      return;
    }
    if (forceOkStatus) {
      addDiagnostic('response handling', `Preview short (${length} chars). Proceeding with warning.`, 'warning');
    }

    setIsProcessing(true);
    try {
      addDiagnostic('tool / retrieval invocation', 'Submitting URL ingestion.', 'info');
      const response = await fetch('http://localhost:5000/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_type: 'URL', input_value: preview.url })  
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      addDiagnostic('response handling', 'Baseline response received.', 'info');

      if (forceOkStatus) {
        addDiagnostic('response handling', 'Short content override enabled for baseline.', 'warning');
      }
      setBaseline({
        content: data.content,
        summary: data.content.substring(0, 500),
        keyPoints: [data.source_ref],
        themes: [data.source_type],
        exploratoryQuestions: [],
        provenance: data.provenance,
        status: forceOkStatus ? BaselineStatus.OK : data.status,
        errorMessage: forceOkStatus ? undefined : data.error_message
      });
      setPreview(null);
    } catch (error) {
      addDiagnostic('response handling', `Baseline creation failed: ${getErrorMessage(error)}`, 'error');
      console.error("Baseline creation failed:", error);
      alert("Failed to create baseline. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardPreview = () => {
    setPreview(null);
  };

  const executeNotesGeneration = async () => {
    // Check execution state is REQUESTED
    const notesExecutionStatus = outputExecutionStatus.find(s => s.type === OutputType.NOTES);
    if (!notesExecutionStatus || notesExecutionStatus.state !== OutputExecutionState.REQUESTED) {
      addDiagnostic('execution check', 'NOTES generation not in REQUESTED state', 'error');
      return;
    }

    // Set state to IN_PROGRESS
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.NOTES 
          ? { ...status, state: OutputExecutionState.IN_PROGRESS, timestamp: Date.now() }
          : status
      )
    );

    addDiagnostic('notes generation', 'Starting NOTES generation', 'info');

    try {
      if (!baseline) {
        throw new Error('No baseline established');
      }

      // Call text provider to generate notes
      const notesPrompt = `Generate structured notes from the following content. Format as bullet points with key takeaways.\n\n${baseline.content}`;
      const generatedContent = await generateLongForm(notesPrompt, 'article', { minWords: 200, provider: 'codex', shouldHydrate: false });

      // Parse generated content into bullet notes and key takeaways
      const lines = generatedContent.split('\n').filter(line => line.trim());
      const bulletNotes: string[] = [];
      const keyTakeaways: string[] = [];

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
          bulletNotes.push(trimmed.substring(1).trim());
        } else if (trimmed.match(/^(?:Key|Important|Main|Takeaway|Summary)/i)) {
          keyTakeaways.push(trimmed);
        }
      });

      // Create Notes output
      const notesResult: NotesOutput = {
        id: `notes-${Date.now()}`,
        type: OutputType.NOTES,
        title: `Notes from ${baseline.provenance?.[0]?.source_type || 'content'}`,
        bulletNotes: bulletNotes.length > 0 ? bulletNotes : [generatedContent.substring(0, 200)],
        keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : ['Generated from baseline content'],
        provenance: baseline.provenance || [],
        timestamp: Date.now(),
        baselineSnapshot: {
          content: baseline.content.substring(0, 500),
          summary: baseline.summary,
          themes: baseline.themes
        }
      };

      // Set state to COMPLETED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.NOTES 
            ? { ...status, state: OutputExecutionState.COMPLETED, timestamp: Date.now() }
            : status
        )
      );

      // Store result
      setNotesOutput(notesResult);

      // Persist to Evidence Vault (append to savedLibrary)
      const savedLibraryItem: GeneratedOutput = {
        id: notesResult.id,
        type: OutputType.NOTES,
        title: notesResult.title,
        content: JSON.stringify(notesResult),
        timestamp: notesResult.timestamp
      };
      setSavedLibrary(prev => [...prev, savedLibraryItem]);
      localStorage.setItem('qlsv2_library', JSON.stringify([...savedLibrary, savedLibraryItem]));

      addDiagnostic('notes generation', 'NOTES generation completed successfully', 'info');
      console.log('📝 Notes Output Generated:', JSON.stringify(notesResult, null, 2));

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      addDiagnostic('notes generation', `NOTES generation failed: ${errorMessage}`, 'error');
      
      // Set state to FAILED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.NOTES 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage, timestamp: Date.now() }
            : status
        )
      );

      console.error('NOTES generation failed:', error);
      alert(`NOTES generation failed: ${errorMessage}`);
    }
  };

  // Developer-only reset for NOTES execution state (for testing)
  const resetNotesExecutionState = () => {
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.NOTES 
          ? { ...status, state: OutputExecutionState.IDLE, timestamp: Date.now() }
          : status
      )
    );
    setNotesOutput(null);
    console.log('🔄 NOTES execution state reset to IDLE');
  };

  // Developer-only reset for REPORT execution state (for testing)
  const resetReportExecutionState = () => {
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.REPORT 
          ? { ...status, state: OutputExecutionState.IDLE, timestamp: Date.now() }
          : status
      )
    );
    setReportOutput(null);
    console.log('🔄 REPORT execution state reset to IDLE');
  };

  // Developer-only reset for AUDIO REPORT execution state (for testing)
  const resetAudioReportExecutionState = () => {
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.AUDIO_REPORT 
          ? { ...status, state: OutputExecutionState.IDLE, timestamp: Date.now() }
          : status
      )
    );
    setAudioReportOutput(null);
    console.log('🔄 AUDIO REPORT execution state reset to IDLE');
  };

  const executeAudioReportGeneration = async () => {
    // Check execution state is REQUESTED
    const audioReportExecutionStatus = outputExecutionStatus.find(s => s.type === OutputType.AUDIO_REPORT);
    if (!audioReportExecutionStatus || audioReportExecutionStatus.state !== OutputExecutionState.REQUESTED) {
      addDiagnostic('execution check', 'AUDIO REPORT generation not in REQUESTED state', 'error');
      return;
    }

    // Check if REPORT exists
    if (!reportOutput) {
      addDiagnostic('execution check', 'AUDIO REPORT requires a completed REPORT', 'error');
      alert('Please generate a REPORT first before creating an AUDIO REPORT');
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.AUDIO_REPORT 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage: 'No REPORT exists', timestamp: Date.now() }
            : status
        )
      );
      return;
    }

    // Set state to IN_PROGRESS
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.AUDIO_REPORT 
          ? { ...status, state: OutputExecutionState.IN_PROGRESS, timestamp: Date.now() }
          : status
      )
    );

    addDiagnostic('audio report generation', 'Starting AUDIO REPORT generation', 'info');

    try {
      if (!baseline) {
        throw new Error('No baseline established');
      }

      // Prepare audio narration script from REPORT content
      const audioScript = `Audio Report: ${reportOutput.title}. Executive Summary: ${reportOutput.executiveSummary}. Key Findings: ${reportOutput.keyFindings.join('. ')}. Sections: ${reportOutput.sections.map(s => s.title + ': ' + s.content).join('. ')}`;

      // Call TTS provider to generate audio
      addDiagnostic('audio report generation', 'Generating audio narration using TTS provider', 'info');
      
      // Use the backend TTS endpoint
      const ttsResponse = await fetch('http://localhost:5000/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: audioScript,
          provider: '1min.ai',
          voice: 'elevenlabs'
        })
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS provider failed: ${ttsResponse.statusText}`);
      }

      const ttsData = await ttsResponse.json();
      const audioUrl = ttsData.audio_url || ttsData.url;

      if (!audioUrl) {
        throw new Error('No audio URL returned from TTS provider');
      }

      // Create Audio Report output
      const audioReportResult: AudioReportOutput = {
        id: `audio-report-${Date.now()}`,
        type: OutputType.AUDIO_REPORT,
        title: `Audio Report: ${reportOutput.title}`,
        audioUrl,
        duration: ttsData.duration || 0,
        provenance: baseline.provenance || [],
        timestamp: Date.now(),
        baselineSnapshot: {
          content: baseline.content.substring(0, 500),
          summary: baseline.summary,
          themes: baseline.themes
        }
      };

      // Set state to COMPLETED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.AUDIO_REPORT 
            ? { ...status, state: OutputExecutionState.COMPLETED, timestamp: Date.now() }
            : status
        )
      );

      // Store result
      setAudioReportOutput(audioReportResult);

      // Persist to Evidence Vault (append to savedLibrary)
      const savedLibraryItem: GeneratedOutput = {
        id: audioReportResult.id,
        type: OutputType.AUDIO_REPORT,
        title: audioReportResult.title,
        content: audioReportResult.audioUrl,
        timestamp: audioReportResult.timestamp
      };
      setSavedLibrary(prev => [...prev, savedLibraryItem]);
      localStorage.setItem('qlsv2_library', JSON.stringify([...savedLibrary, savedLibraryItem]));

      addDiagnostic('audio report generation', 'AUDIO REPORT generation completed successfully', 'info');
      console.log('🎙️ Audio Report Output Generated:', JSON.stringify(audioReportResult, null, 2));

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      addDiagnostic('audio report generation', `AUDIO REPORT generation failed: ${errorMessage}`, 'error');
      
      // Set state to FAILED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.AUDIO_REPORT 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage, timestamp: Date.now() }
            : status
        )
      );

      console.error('AUDIO REPORT generation failed:', error);
      alert(`AUDIO REPORT generation failed: ${errorMessage}`);
    }
  };

  // Developer-only reset for INFOGRAPHIC execution state (for testing)
  const resetInfographicExecutionState = () => {
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.INFOGRAPHIC 
          ? { ...status, state: OutputExecutionState.IDLE, timestamp: Date.now() }
          : status
      )
    );
    setInfographicOutput(null);
    console.log('🔄 INFOGRAPHIC execution state reset to IDLE');
  };

  // Developer-only reset for SLIDE DECK execution state (for testing)
  const resetSlideDeckExecutionState = () => {
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.SLIDEDECK 
          ? { ...status, state: OutputExecutionState.IDLE, timestamp: Date.now() }
          : status
      )
    );
    setSlideDeckOutput(null);
    console.log('🔄 SLIDE DECK execution state reset to IDLE');
  };

  // Developer-only reset for PODCAST execution state (for testing)
  const resetPodcastExecutionState = () => {
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.PODCAST 
          ? { ...status, state: OutputExecutionState.IDLE, timestamp: Date.now() }
          : status
      )
    );
    setPodcastOutput(null);
    console.log('🔄 PODCAST execution state reset to IDLE');
  };

  const executeInfographicGeneration = async () => {
    // Check execution state is REQUESTED
    const infographicExecutionStatus = outputExecutionStatus.find(s => s.type === OutputType.INFOGRAPHIC);
    if (!infographicExecutionStatus || infographicExecutionStatus.state !== OutputExecutionState.REQUESTED) {
      addDiagnostic('execution check', 'INFOGRAPHIC generation not in REQUESTED state', 'error');
      return;
    }

    // Check if REPORT exists
    if (!reportOutput) {
      addDiagnostic('execution check', 'INFOGRAPHIC requires a completed REPORT', 'error');
      alert('Please generate a REPORT first before creating an INFOGRAPHIC');
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.INFOGRAPHIC 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage: 'No REPORT exists', timestamp: Date.now() }
            : status
        )
      );
      return;
    }

    // Set state to IN_PROGRESS
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.INFOGRAPHIC 
          ? { ...status, state: OutputExecutionState.IN_PROGRESS, timestamp: Date.now() }
          : status
      )
    );

    addDiagnostic('infographic generation', 'Starting INFOGRAPHIC generation', 'info');

    try {
      if (!baseline) {
        throw new Error('No baseline established');
      }

      // Prepare infographic prompt from REPORT content
      const infographicPrompt = `Create a single infographic image summarizing the following report. Title: ${reportOutput.title}. Executive Summary: ${reportOutput.executiveSummary}. Key Findings: ${reportOutput.keyFindings.join('. ')}. Create a visual representation with clear sections for each key finding.`;

      // Call image generation provider
      addDiagnostic('infographic generation', 'Generating infographic image using image provider', 'info');
      
      // Use the backend image generation endpoint
      const imageResponse = await fetch('http://localhost:5000/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: infographicPrompt,
          provider: '1min.ai',
          style: 'infographic'
        })
      });

      if (!imageResponse.ok) {
        throw new Error(`Image provider failed: ${imageResponse.statusText}`);
      }

      const imageData = await imageResponse.json();
      const imageUrl = imageData.image_url || imageData.url;

      if (!imageUrl) {
        throw new Error('No image URL returned from image provider');
      }

      // Create Infographic output
      const infographicResult: InfographicOutput = {
        id: `infographic-${Date.now()}`,
        type: OutputType.INFOGRAPHIC,
        title: `Infographic: ${reportOutput.title}`,
        imageUrl,
        caption: `Visual summary of ${reportOutput.title}`,
        provenance: baseline.provenance || [],
        timestamp: Date.now(),
        baselineSnapshot: {
          content: baseline.content.substring(0, 500),
          summary: baseline.summary,
          themes: baseline.themes
        }
      };

      // Set state to COMPLETED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.INFOGRAPHIC 
            ? { ...status, state: OutputExecutionState.COMPLETED, timestamp: Date.now() }
            : status
        )
      );

      // Store result
      setInfographicOutput(infographicResult);

      // Persist to Evidence Vault (append to savedLibrary)
      const savedLibraryItem: GeneratedOutput = {
        id: infographicResult.id,
        type: OutputType.INFOGRAPHIC,
        title: infographicResult.title,
        content: infographicResult.imageUrl,
        timestamp: infographicResult.timestamp
      };
      setSavedLibrary(prev => [...prev, savedLibraryItem]);
      localStorage.setItem('qlsv2_library', JSON.stringify([...savedLibrary, savedLibraryItem]));

      addDiagnostic('infographic generation', 'INFOGRAPHIC generation completed successfully', 'info');
      console.log('📊 Infographic Output Generated:', JSON.stringify(infographicResult, null, 2));

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      addDiagnostic('infographic generation', `INFOGRAPHIC generation failed: ${errorMessage}`, 'error');
      
      // Set state to FAILED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.INFOGRAPHIC 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage, timestamp: Date.now() }
            : status
        )
      );

      console.error('INFOGRAPHIC generation failed:', error);
      alert(`INFOGRAPHIC generation failed: ${errorMessage}`);
    }
  };

  const executeSlideDeckGeneration = async () => {
    // Check execution state is REQUESTED
    const slideDeckExecutionStatus = outputExecutionStatus.find(s => s.type === OutputType.SLIDEDECK);
    if (!slideDeckExecutionStatus || slideDeckExecutionStatus.state !== OutputExecutionState.REQUESTED) {
      addDiagnostic('execution check', 'SLIDE DECK generation not in REQUESTED state', 'error');
      return;
    }

    // Check if REPORT exists
    if (!reportOutput) {
      addDiagnostic('execution check', 'SLIDE DECK requires a completed REPORT', 'error');
      alert('Please generate a REPORT first before creating a SLIDE DECK');
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.SLIDEDECK 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage: 'No REPORT exists', timestamp: Date.now() }
            : status
        )
      );
      return;
    }

    // Set state to IN_PROGRESS
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.SLIDEDECK 
          ? { ...status, state: OutputExecutionState.IN_PROGRESS, timestamp: Date.now() }
          : status
      )
    );

    addDiagnostic('slide deck generation', 'Starting SLIDE DECK generation', 'info');

    try {
      if (!baseline) {
        throw new Error('No baseline established');
      }

      // Generate logical slide sequence from REPORT content
      const slides: { slideTitle: string; bulletPoints: string[]; imageRef?: string }[] = [];

      // Slide 1: Title slide
      slides.push({
        slideTitle: reportOutput.title,
        bulletPoints: ['Executive Summary', 'Key Findings', 'Detailed Analysis']
      });

      // Slide 2: Executive Summary
      slides.push({
        slideTitle: 'Executive Summary',
        bulletPoints: reportOutput.executiveSummary.split('.').filter(s => s.trim()).slice(0, 5)
      });

      // Slide 3: Key Findings
      slides.push({
        slideTitle: 'Key Findings',
        bulletPoints: reportOutput.keyFindings.slice(0, 5)
      });

      // Slides 4+: Report sections
      reportOutput.sections.forEach(section => {
        slides.push({
          slideTitle: section.title,
          bulletPoints: section.content.split('.').filter(s => s.trim()).slice(0, 5)
        });
      });

      // Create Slide Deck output
      const slideDeckResult: SlideDeckOutput = {
        id: `slide-deck-${Date.now()}`,
        type: OutputType.SLIDEDECK,
        title: `Slide Deck: ${reportOutput.title}`,
        slides,
        provenance: baseline.provenance || [],
        timestamp: Date.now(),
        baselineSnapshot: {
          content: baseline.content.substring(0, 500),
          summary: baseline.summary,
          themes: baseline.themes
        }
      };

      // Set state to COMPLETED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.SLIDEDECK 
            ? { ...status, state: OutputExecutionState.COMPLETED, timestamp: Date.now() }
            : status
        )
      );

      // Store result
      setSlideDeckOutput(slideDeckResult);

      // Persist to Evidence Vault (append to savedLibrary)
      const savedLibraryItem: GeneratedOutput = {
        id: slideDeckResult.id,
        type: OutputType.SLIDEDECK,
        title: slideDeckResult.title,
        content: JSON.stringify(slideDeckResult.slides),
        timestamp: slideDeckResult.timestamp
      };
      setSavedLibrary(prev => [...prev, savedLibraryItem]);
      localStorage.setItem('qlsv2_library', JSON.stringify([...savedLibrary, savedLibraryItem]));

      addDiagnostic('slide deck generation', 'SLIDE DECK generation completed successfully', 'info');
      console.log('📽️ Slide Deck Output Generated:', JSON.stringify(slideDeckResult, null, 2));

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      addDiagnostic('slide deck generation', `SLIDE DECK generation failed: ${errorMessage}`, 'error');
      
      // Set state to FAILED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.SLIDEDECK 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage, timestamp: Date.now() }
            : status
        )
      );

      console.error('SLIDE DECK generation failed:', error);
      alert(`SLIDE DECK generation failed: ${errorMessage}`);
    }
  };

  const executePodcastGeneration = async () => {
    // Check execution state is REQUESTED
    const podcastExecutionStatus = outputExecutionStatus.find(s => s.type === OutputType.PODCAST);
    if (!podcastExecutionStatus || podcastExecutionStatus.state !== OutputExecutionState.REQUESTED) {
      addDiagnostic('execution check', 'PODCAST generation not in REQUESTED state', 'error');
      return;
    }

    // Check if REPORT exists
    if (!reportOutput) {
      addDiagnostic('execution check', 'PODCAST requires a completed REPORT', 'error');
      alert('Please generate a REPORT first before creating a PODCAST');
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.PODCAST 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage: 'No REPORT exists', timestamp: Date.now() }
            : status
        )
      );
      return;
    }

    // Set state to IN_PROGRESS
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.PODCAST 
          ? { ...status, state: OutputExecutionState.IN_PROGRESS, timestamp: Date.now() }
          : status
      )
    );

    addDiagnostic('podcast generation', 'Starting PODCAST generation', 'info');

    try {
      if (!baseline) {
        throw new Error('No baseline established');
      }

      // Generate multi-segment narrative script from REPORT content
      const segments: { segmentTitle: string; narrationText: string }[] = [];

      // Segment 1: Introduction
      segments.push({
        segmentTitle: 'Introduction',
        narrationText: `Welcome to this podcast episode about ${reportOutput.title}. In this episode, we'll explore the key findings and insights from our comprehensive report. Let's dive in.`
      });

      // Segment 2: Executive Summary
      segments.push({
        segmentTitle: 'Executive Summary',
        narrationText: `Here's the executive summary of our report. ${reportOutput.executiveSummary} These are the main takeaways you need to know.`
      });

      // Segment 3: Key Findings
      segments.push({
        segmentTitle: 'Key Findings',
        narrationText: `Now let's look at the key findings. ${reportOutput.keyFindings.join('. ')} These findings highlight the most important aspects of our analysis.`
      });

      // Segments 4+: Report sections
      reportOutput.sections.forEach(section => {
        segments.push({
          segmentTitle: section.title,
          narrationText: section.content
        });
      });

      // Segment N+: Conclusion
      segments.push({
        segmentTitle: 'Conclusion',
        narrationText: `That concludes our exploration of ${reportOutput.title}. Thank you for listening to this podcast episode. We hope you found these insights valuable.`
      });

      // Combine all segments into a single narration script
      const fullNarrationScript = segments.map(s => s.narrationText).join('\n\n');

      // Call TTS provider to generate audio for the full narration
      addDiagnostic('podcast generation', 'Generating podcast audio using TTS provider', 'info');
      
      // Use the backend TTS endpoint
      const ttsResponse = await fetch('http://localhost:5000/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fullNarrationScript,
          provider: '1min.ai',
          voice: 'elevenlabs'
        })
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS provider failed: ${ttsResponse.statusText}`);
      }

      const ttsData = await ttsResponse.json();
      const audioUrl = ttsData.audio_url || ttsData.url;

      if (!audioUrl) {
        throw new Error('No audio URL returned from TTS provider');
      }

      // Create Podcast output
      const podcastResult: PodcastOutput = {
        id: `podcast-${Date.now()}`,
        type: OutputType.PODCAST,
        title: `Podcast: ${reportOutput.title}`,
        segments,
        audioUrl,
        duration: ttsData.duration || 0,
        provenance: baseline.provenance || [],
        timestamp: Date.now(),
        baselineSnapshot: {
          content: baseline.content.substring(0, 500),
          summary: baseline.summary,
          themes: baseline.themes
        }
      };

      // Set state to COMPLETED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.PODCAST 
            ? { ...status, state: OutputExecutionState.COMPLETED, timestamp: Date.now() }
            : status
        )
      );

      // Store result
      setPodcastOutput(podcastResult);

      // Persist to Evidence Vault (append to savedLibrary)
      const savedLibraryItem: GeneratedOutput = {
        id: podcastResult.id,
        type: OutputType.PODCAST,
        title: podcastResult.title,
        content: podcastResult.audioUrl,
        timestamp: podcastResult.timestamp
      };
      setSavedLibrary(prev => [...prev, savedLibraryItem]);
      localStorage.setItem('qlsv2_library', JSON.stringify([...savedLibrary, savedLibraryItem]));

      addDiagnostic('podcast generation', 'PODCAST generation completed successfully', 'info');
      console.log('🎙️ Podcast Output Generated:', JSON.stringify(podcastResult, null, 2));

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      addDiagnostic('podcast generation', `PODCAST generation failed: ${errorMessage}`, 'error');
      
      // Set state to FAILED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.PODCAST 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage, timestamp: Date.now() }
            : status
        )
      );

      console.error('PODCAST generation failed:', error);
      alert(`PODCAST generation failed: ${errorMessage}`);
    }
  };

  const executeReportGeneration = async () => {
    // Check execution state is REQUESTED
    const reportExecutionStatus = outputExecutionStatus.find(s => s.type === OutputType.REPORT);
    if (!reportExecutionStatus || reportExecutionStatus.state !== OutputExecutionState.REQUESTED) {
      addDiagnostic('execution check', 'REPORT generation not in REQUESTED state', 'error');
      return;
    }

    // Set state to IN_PROGRESS
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === OutputType.REPORT 
          ? { ...status, state: OutputExecutionState.IN_PROGRESS, timestamp: Date.now() }
          : status
      )
    );

    addDiagnostic('report generation', 'Starting REPORT generation', 'info');

    try {
      if (!baseline) {
        throw new Error('No baseline established');
      }

      // Call text provider to generate structured report
      const reportPrompt = `Generate a comprehensive structured report from the following content. Include an executive summary, multiple sections with headings, and key findings.\n\n${baseline.content}`;
      const generatedContent = await generateLongForm(reportPrompt, 'article', { minWords: 500, provider: 'codex', shouldHydrate: false });

      // Parse generated content into structured report
      const lines = generatedContent.split('\n').filter(line => line.trim());
      const executiveSummary: string[] = [];
      const sections: { title: string; content: string }[] = [];
      const keyFindings: string[] = [];

      let currentSection: { title: string; content: string } | null = null;

      lines.forEach(line => {
        const trimmed = line.trim();
        
        // Detect executive summary
        if (trimmed.match(/^(?:Executive Summary|Summary|Overview)/i)) {
          executiveSummary.push(trimmed.replace(/^(?:Executive Summary|Summary|Overview):\s*/i, ''));
        }
        // Detect section headers (## or ### markdown style)
        else if (trimmed.match(/^#{2,3}\s+/)) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            title: trimmed.replace(/^#+\s+/, ''),
            content: ''
          };
        }
        // Detect key findings
        else if (trimmed.match(/^(?:Key Finding|Finding|Conclusion|Insight)/i)) {
          keyFindings.push(trimmed);
        }
        // Add content to current section
        else if (currentSection) {
          currentSection.content += (currentSection.content ? ' ' : '') + trimmed;
        }
      });

      // Push last section if exists
      if (currentSection) {
        sections.push(currentSection);
      }

      // Create Report output
      const reportResult: ReportOutput = {
        id: `report-${Date.now()}`,
        type: OutputType.REPORT,
        title: `Report on ${baseline.provenance?.[0]?.source_type || 'content'}`,
        executiveSummary: executiveSummary.length > 0 ? executiveSummary.join(' ') : generatedContent.substring(0, 300),
        sections: sections.length > 0 ? sections : [{ title: 'Overview', content: generatedContent.substring(0, 500) }],
        keyFindings: keyFindings.length > 0 ? keyFindings : ['Generated from baseline content'],
        provenance: baseline.provenance || [],
        timestamp: Date.now(),
        baselineSnapshot: {
          content: baseline.content.substring(0, 500),
          summary: baseline.summary,
          themes: baseline.themes
        }
      };

      // Set state to COMPLETED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.REPORT 
            ? { ...status, state: OutputExecutionState.COMPLETED, timestamp: Date.now() }
            : status
        )
      );

      // Store result
      setReportOutput(reportResult);

      // Persist to Evidence Vault (append to savedLibrary)
      const savedLibraryItem: GeneratedOutput = {
        id: reportResult.id,
        type: OutputType.REPORT,
        title: reportResult.title,
        content: JSON.stringify(reportResult),
        timestamp: reportResult.timestamp
      };
      setSavedLibrary(prev => [...prev, savedLibraryItem]);
      localStorage.setItem('qlsv2_library', JSON.stringify([...savedLibrary, savedLibraryItem]));

      addDiagnostic('report generation', 'REPORT generation completed successfully', 'info');
      console.log('📄 Report Output Generated:', JSON.stringify(reportResult, null, 2));

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      addDiagnostic('report generation', `REPORT generation failed: ${errorMessage}`, 'error');
      
      // Set state to FAILED
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === OutputType.REPORT 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage, timestamp: Date.now() }
            : status
        )
      );

      console.error('REPORT generation failed:', error);
      alert(`REPORT generation failed: ${errorMessage}`);
    }
  };

  const handleSelectOutput = async (type: SelectableOutputType) => {
    addDiagnostic('submit event', `Output generation requested for ${OUTPUT_METADATA[type].label}.`, 'info');
    
    // Check eligibility before allowing execution
    const eligibility = outputEligibility.find(e => e.type === type);
    if (!eligibility || !eligibility.eligible) {
      addDiagnostic('execution check', `Output ${OUTPUT_METADATA[type].label} is not eligible: ${eligibility?.reason || 'Unknown reason'}`, 'error');
      alert(`Cannot generate ${OUTPUT_METADATA[type].label}: ${eligibility?.reason || 'Unknown reason'}`);
      return;
    }
    
    // Check monetization entitlement before allowing execution
    const monetizationCheck: MonetizationCheckResult = checkMonetizationEntitlement(type, userTier);
    if (!monetizationCheck.eligible) {
      addDiagnostic('monetization check', `Output ${OUTPUT_METADATA[type].label} requires ${monetizationCheck.requiredTier || 'higher'} tier`, 'error');
      alert(`Cannot generate ${OUTPUT_METADATA[type].label}: ${monetizationCheck.reason}`);
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === type 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage: monetizationCheck.reason, timestamp: Date.now() }
            : status
        )
      );
      return;
    }
    
    // Update execution status to REQUESTED
    setOutputExecutionStatus(prev => 
      prev.map(status => 
        status.type === type 
          ? { ...status, state: OutputExecutionState.REQUESTED, timestamp: Date.now() }
          : status
      )
    );
    
    if (!baseline) {
      addDiagnostic('model invocation', 'Generation aborted before model invocation.', 'error');
      setOutputExecutionStatus(prev => 
        prev.map(status => 
          status.type === type 
            ? { ...status, state: OutputExecutionState.FAILED, errorMessage: 'No baseline established', timestamp: Date.now() }
            : status
        )
      );
      return;
    }

    // Execute NOTES generation
    if (type === OutputType.NOTES) {
      await executeNotesGeneration();
      return;
    }

    // Execute REPORT generation
    if (type === OutputType.REPORT) {
      await executeReportGeneration();
      return;
    }

    // Execute AUDIO REPORT generation
    if (type === OutputType.AUDIO_REPORT) {
      await executeAudioReportGeneration();
      return;
    }

    // Execute INFOGRAPHIC generation
    if (type === OutputType.INFOGRAPHIC) {
      await executeInfographicGeneration();
      return;
    }

    // Execute SLIDE DECK generation
    if (type === OutputType.SLIDEDECK) {
      await executeSlideDeckGeneration();
      return;
    }

    // Execute PODCAST generation
    if (type === OutputType.PODCAST) {
      await executePodcastGeneration();
      return;
    }

    const retryWithBackoff = async <T,>(fn: () => Promise<T>, attempts = 3, delay = 500): Promise<T> => {
      for (let i = 0; i < attempts; i += 1) {
        try {
          return await fn();
        } catch (err) {
          if (i === attempts - 1) throw err;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
      throw new Error('Retry attempts exhausted.');
    };

    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const getTailLines = (text: string, lineCount = 4): string => {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.slice(-lineCount).join('\n');
    };

    const stitchPodcastSegments = (segments: string[]): string => {
      return segments
        .map((segment, index) => {
          if (index === 0) return segment.trim();

          let cleaned = segment
            .replace(
              /^(Maya|Alex):\s*(Welcome back|Thanks for staying with us|In this next part|Let's move on to|Continuing our discussion).*?[\.!\?]\s*/gi,
              ''
            )
            .replace(/^(Maya|Alex):\s*(So,|Right,|Anyway,)\s*/gi, '')
            .trim();

          cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          return cleaned;
        })
        .join('\n\n');
    };

    let sourceContent = (baseline.content || baseline.summary || '').trim();
    
    // Check if baseline is READY before allowing AI provider invocation
    if (!fortifiedStatus || fortifiedStatus.state !== FortifiedBaselineState.READY) {
      addDiagnostic('baseline status', `Cannot generate: system state is ${fortifiedStatus?.state || 'UNKNOWN'}. ${fortifiedStatus?.nextAction || 'Please establish a baseline first.'}`, 'error');
      alert(`System is not ready for generation. ${fortifiedStatus?.nextAction || 'Please establish a baseline first.'}`);
      return;
    }
    
    // Mark providers as invoked
    setProviderInvoked(true);
    
    if (sourceContent.length < 50) {
      try {
        const hydrateResponse = await fetch('http://localhost:5000/hydrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: sourceContent, content_type: 'general' })
        });
        if (hydrateResponse.ok) {
          const hydrateData = await hydrateResponse.json();
          sourceContent = (hydrateData.content || sourceContent).trim();
          addDiagnostic('hydration', `Short input hydrated to ${sourceContent.length} chars`, 'info');
        }
      } catch (hydrateError) {
        addDiagnostic('hydration', 'Hydration failed for very short input.', 'warning');
      }
    }

    if (sourceContent.length < 50) {
      addDiagnostic('prompt normalization', 'Baseline content missing or too short for generation.', 'error');
      alert("Baseline content is missing or too short to generate outputs. Please re-ingest your source.");
      return;
    }

    const isShortForHydration = sourceContent.length < 500;
    setHydrationActive(
      isShortForHydration &&
      (type === OutputType.SLIDEDECK || type === OutputType.PODCAST || type === OutputType.REPORT)
    );
    setGeneratingType(type);

    console.log('GENERATION INPUT LENGTH:', sourceContent.length);
    console.log('GENERATION INPUT PREVIEW:', sourceContent.slice(0, 500));

    addDiagnostic(
      'prompt normalization',
      `Normalized baseline content length ${sourceContent.length}.`,
      'info'
    );
    setIsGenerating(true);
    try {
      let content: string | string[] = "";
      let audioUrl = undefined;
      let slidePlan: any[] | undefined = undefined;
      let outputPrompt: string | undefined = undefined;
      let outputAnalysis: any | undefined = undefined;
      
      // Hydrate content if short before generation
      let contentToUse = sourceContent;
      if (isShortForHydration && (type === OutputType.PODCAST || type === OutputType.SLIDEDECK || type === OutputType.REPORT)) {
        try {
          const contentType = type === OutputType.PODCAST ? 'podcast' : (type === OutputType.SLIDEDECK ? 'slides' : 'general');
          const hydrateResponse = await fetch('http://localhost:5000/hydrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              content: sourceContent, 
              content_type: contentType 
            })
          });
          if (hydrateResponse.ok) {
            const hydrateData = await hydrateResponse.json();
            contentToUse = hydrateData.content;
            addDiagnostic('hydration', `Content hydrated from ${sourceContent.length} to ${contentToUse.length} chars for ${contentType}`, 'info');
            console.log(`[HYDRATION] Content expanded from ${sourceContent.length} to ${contentToUse.length} characters`);

            // Validate hydration actually expanded content
            if (contentToUse.length <= sourceContent.length) {
              console.warn('[HYDRATION] Content was not actually expanded. Using original.');
              addDiagnostic('hydration', `Hydration failed to expand content (${sourceContent.length} -> ${contentToUse.length}). Using original.`, 'warning');
              setHydrationWarning(`Content hydration failed. Input is too short (${sourceContent.length} chars) for quality slide generation. Add more details (500+ chars recommended).`);
              contentToUse = sourceContent;
            } else {
              setHydrationWarning(null);
            }
          }
        } catch (hydrateError) {
          console.warn('[HYDRATION] Failed to hydrate content, using original:', hydrateError);
          addDiagnostic('hydration', 'Hydration failed, using original content', 'warning');
        }
      }
      
      const requestTts = async (ttsText: string, prefix: string) => {
        addDiagnostic('tool / retrieval invocation', 'Requesting TTS narration.', 'info');
        const response = await fetch('http://localhost:5000/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ttsText, prefix })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        addDiagnostic('response handling', 'TTS narration ready.', 'info');
        return `http://localhost:5000/audio/${data.audio_filename}`;
      };

      if (type === OutputType.REPORT) {
        addDiagnostic('model invocation', 'Invoking longform article generation (sectioned with overlap).', 'info');
        addDiagnostic('tool / retrieval invocation', 'Requesting longform article generation in segments.', 'info');
        const provider = 'codex';
        const sections = ['tactical', 'sonic_rumors', 'capture', 'aftermath'];

        console.group('GENERATION CHECK');
        console.log('GENERATION TIMESTAMP:', new Date().toISOString());
        console.log('PROVIDER:', provider || 'codex');
        console.log('SOURCE LENGTH:', sourceContent.length);
        console.log('SOURCE PREVIEW (first 500 chars):');
        console.log(sourceContent.slice(0, 500));
        console.log('CALLING_PROVIDER_ENDPOINT:', provider === 'codex' ? '/api/codex' : 'https://text.pollinations.ai/');
        console.groupEnd();

        let assembled = '';
        let prevTail = '';
        for (const section of sections) {
          const tailNote = prevTail ? `\n\nContinuation context (last lines from previous section):\n${prevTail}\n` : '';
          const sectionPrompt = `Section focus: ${section}. Source content below.${tailNote}\n${sourceContent}`;
          const segment = await generateLongForm(sectionPrompt, 'article', { minWords: 400, provider, shouldHydrate: isShortForHydration });
          if (!segment || countWords(segment) < 200) {
            throw new Error(`Segment "${section}" returned too short (${countWords(segment)} words).`);
          }
          assembled += `${segment.trim()}\n\n`;
          prevTail = getTailLines(segment, 4);
        }
        content = assembled.trim();

        console.group('GENERATION RESPONSE');
        console.log('RESPONSE_TIMESTAMP:', new Date().toISOString());
        console.log('RESPONSE_WORD_COUNT:', countWords(content));
        console.log('RESPONSE_PREVIEW (first 500 chars):');
        console.log(content.slice(0, 500));
        console.groupEnd();
        if (!content || countWords(content) === 0) {
          throw new Error('Generation returned empty output.');
        }
        try {
          audioUrl = await requestTts(content, 'report');
        } catch (ttsError) {
          addDiagnostic('response handling', `TTS narration failed: ${getErrorMessage(ttsError)}`, 'warning');
        }
        addDiagnostic('response handling', 'Longform article response received.', 'info');
      } else if (type === OutputType.PODCAST) {
        addDiagnostic('model invocation', 'Invoking longform podcast generation (sectioned with overlap).', 'info');
        addDiagnostic('tool / retrieval invocation', 'Requesting longform podcast generation in segments.', 'info');
        const provider = 'codex';
        const sections = ['tactical', 'sonic_rumors', 'capture', 'aftermath'];

        console.group('GENERATION CHECK');
        console.log('GENERATION TIMESTAMP:', new Date().toISOString());
        console.log('PROVIDER:', provider || 'codex');
        console.log('SOURCE LENGTH:', contentToUse.length);
        console.log('SOURCE PREVIEW (first 500 chars):');
        console.log(contentToUse.slice(0, 500));
        console.log('CALLING_PROVIDER_ENDPOINT:', provider === 'codex' ? '/api/codex' : 'https://text.pollinations.ai/');
        console.groupEnd();

        let assembled = '';
        const rawSegments: string[] = [];
        let prevTail = '';
        for (let i = 0; i < sections.length; i += 1) {
          const section = sections[i];
          const tailNote = prevTail
            ? `
CONTINUATION CONTEXT (last lines from previous segment):
"""
${prevTail}
"""
`
            : '';
          const isContinuing = i > 0;
          const handoverPrompt = `
You are continuing a seamless conversation.
Do NOT start with "Welcome back" or "Next up."
Pick up exactly where the previous segment left off.
If Maya was asking a question in the context above, Alex should answer it immediately.
[MID-ROLL GUARD]: isContinuing=${isContinuing}. If true, YOU MUST NOT use any of the following: "Welcome back," "Next topic," "Moving on," "Hi everyone," or any host names in a greeting context. You are mid-sentence. Start the response with a direct counter-point or a continuation of the last thought provided in the context.
`;
          const sectionPrompt = `Section focus: ${section}. Source content below.${tailNote}\n${handoverPrompt}\n${contentToUse}`;
          const segment = await generateLongForm(sectionPrompt, 'podcast', { minWords: 400, provider, shouldHydrate: false });
          if (!segment || countWords(segment) < 200) {
            throw new Error(`Segment "${section}" returned too short (${countWords(segment)} words).`);
          }
          rawSegments.push(segment.trim());
          assembled += `${segment.trim()}\n\n`;
          prevTail = getTailLines(segment, 4);
        }
        content = stitchPodcastSegments(rawSegments).trim() || assembled.trim();

        console.group('GENERATION RESPONSE');
        console.log('RESPONSE_TIMESTAMP:', new Date().toISOString());
        console.log('RESPONSE_WORD_COUNT:', countWords(content));
        console.log('RESPONSE_PREVIEW (first 500 chars):');
        console.log(content.slice(0, 500));
        console.groupEnd();
        if (!content || countWords(content) === 0) {
          throw new Error('Generation returned empty output.');
        }
        try {
          const ttsText = content.replace(/\b(Maya|Alex):/g, '').trim();
          audioUrl = await requestTts(ttsText, 'podcast');
        } catch (ttsError) {
          addDiagnostic('response handling', `TTS narration failed: ${getErrorMessage(ttsError)}`, 'warning');
        }
        addDiagnostic('response handling', 'Longform podcast response received.', 'info');
      } else if (type === OutputType.INFOGRAPHIC) {
        const isInfographicUrl = /^https?:\/\/image\.pollinations\.ai\/prompt\//i.test(sourceContent || '');
        if (isInfographicUrl) {
          addDiagnostic('model invocation', 'Infographic URL provided. Skipping generation.', 'info');
          addDiagnostic('tool / retrieval invocation', 'Infographic generation skipped.', 'info');
          content = sourceContent.trim();
          addDiagnostic('response handling', 'Infographic URL ready for display.', 'info');
        } else {
          addDiagnostic('model invocation', 'Invoking infographic generation model.', 'info');
          addDiagnostic('tool / retrieval invocation', 'Requesting infographic generation.', 'info');
          const response = await retryWithBackoff(
            () =>
              fetchWithTimeout(
                API_ENDPOINTS.INFOGRAPHIC,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    baseline: {
                      content: sourceContent,
                      source_type: baseline.themes[0],
                      source_ref: baseline.keyPoints[0],
                      status: baseline.status,
                      error_message: baseline.errorMessage
                    }
                  })
                },
                TIMEOUTS.INFOGRAPHIC
              ),
            3,
            500
          );
          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Infographic request failed with ${response.status}.`);
          }
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          addDiagnostic('response handling', 'Infographic response received.', 'info');
          content = data.imageUrl || data.image_url;
          outputPrompt = data.prompt;
          outputAnalysis = data.analysis;
        }
      } else if (type === OutputType.SLIDEDECK) {
        const isInfographicUrl = /^https?:\/\/image\.pollinations\.ai\/prompt\//i.test(sourceContent || '');
        if (isInfographicUrl) {
          addDiagnostic('model invocation', 'Slide deck derived from infographic URL. Skipping generation.', 'info');
          addDiagnostic('tool / retrieval invocation', 'Slide deck generation skipped.', 'info');
          content = [sourceContent.trim()];
          addDiagnostic('response handling', 'Slide deck URL ready for display.', 'info');
        } else {
          const safeSourceType = baseline.themes?.[0] || 'manual';
          const safeSourceRef = baseline.keyPoints?.[0] || 'manual';
          addDiagnostic('model invocation', 'Invoking slide deck generation model.', 'info');
          addDiagnostic('tool / retrieval invocation', 'Requesting slide deck generation (this may take 60-90 seconds).', 'info');
          console.group('SLIDE DECK REQUEST');
          console.log('Endpoint:', API_ENDPOINTS.SLIDES);
          console.log('Payload preview:', {
            contentLength: sourceContent.length,
            sourceType: safeSourceType,
            sourceRef: safeSourceRef,
            status: baseline.status
          });
          console.groupEnd();
          const response = await retryWithBackoff(
            () =>
              fetchWithTimeout(
                API_ENDPOINTS.SLIDES,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    baseline: {
                      content: sourceContent,
                      source_type: safeSourceType,
                      source_ref: safeSourceRef,
                      status: baseline.status,
                      error_message: baseline.errorMessage
                    },
                    slide_count: 6,
                    shouldHydrate: isShortForHydration
                  })
                },
                TIMEOUTS.SLIDES
              ),
            3,
            1000
          );
          const rawText = await response.text();
          console.group('SLIDE DECK RESPONSE RAW');
          console.log('Status:', response.status);
          console.log('Body:', rawText);
          console.groupEnd();
          if (!response.ok) {
            throw new Error(rawText || `Slide deck request failed with ${response.status}.`);
          }
          let data: any = {};
          try {
            data = rawText ? JSON.parse(rawText) : {};
          } catch (parseErr) {
            throw new Error(`Failed to parse slide deck response JSON: ${getErrorMessage(parseErr)}`);
          }
          if (data.error) throw new Error(data.error);
          const slidesRaw =
            data.slide_image_urls ||
            data?.data?.slide_image_urls ||
            data.slides ||
            data?.data?.slides ||
            [];

          const normalizedSlides = Array.isArray(slidesRaw)
            ? slidesRaw
                .map((item: any) => normalizeSlideImage(item))
                .filter((url: string | null): url is string => Boolean(url))
            : [];

          // Fallback: some backends return export_data[{ image_url }]
          const exportImages = Array.isArray(data.export_data)
            ? data.export_data
                .map((item: any) => normalizeSlideImage(item))
                .filter((url: string | null): url is string => Boolean(url))
            : [];

          const slides: string[] = [...normalizedSlides, ...exportImages].filter(
            (url, idx, arr) => arr.indexOf(url) === idx
          );

          const rawPlan = data.slide_plan || data?.data?.slide_plan;
          outputPrompt = typeof data.prompt === 'string' ? data.prompt : undefined;
          outputAnalysis = data.analysis;
          const planFromSlides =
            Array.isArray(data.slides) &&
            data.slides.some(
              (item: any) =>
                item &&
                typeof item === 'object' &&
                ('title' in item || 'bullets' in item || 'notes' in item)
            )
              ? data.slides
              : [];

          // Validate slide content for duplicates
          if (planFromSlides.length > 1) {
            const summaries = planFromSlides.map((slide: any) => slide.summary || slide.title || '');
            const uniqueSummaries = new Set(summaries);
            if (uniqueSummaries.size === 1) {
              console.warn('[SLIDE DECK] All slides have identical content. Backend may not be generating unique slides.');
              addDiagnostic('slide validation', 'All slides have identical content - backend may need attention', 'warning');
              setDuplicateContentWarning('All slides have identical content. The backend may not be generating unique slides. Try adding more detailed input.');
            } else {
              setDuplicateContentWarning(null);
            }
          }

          addDiagnostic('response handling', `Slide deck response received with ${slides.length || 0} slides.`, 'info');
          content = slides;
          slidePlan = rawPlan || planFromSlides;
        }
      }

      // Preserve the original type before narrowing
      const outputType: SelectableOutputType = type as SelectableOutputType;

      const newOutput: GeneratedOutput = {
        id: Math.random().toString(36).substr(2, 9),
        type: outputType,
        title: OUTPUT_METADATA[outputType].label,
        content: Array.isArray(content) ? JSON.stringify(content) : content,
        slidePlan: outputType === OutputType.SLIDEDECK ? slidePlan : undefined,
        prompt: outputPrompt,
        analysis: outputAnalysis,
        audioUrl,
        timestamp: Date.now()
      };
      setActiveOutput(newOutput);
      addDiagnostic('response handling', 'Output ready for display.', 'info');
    } catch (error) {
      addDiagnostic('response handling', `Output generation failed: ${getErrorMessage(error)}`, 'error');
      console.error("Output generation failed:", error);
      alert(`Output generation failed: ${getErrorMessage(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveOutput = () => {
    if (!activeOutput) {
      addDiagnostic('response handling', 'No output available to save.', 'error');
      return;
    }
    const exists = savedLibrary.find(o => o.id === activeOutput.id);
    if (exists) {
      addDiagnostic('response handling', 'Output already saved to library.', 'warning');
      return;
    }
    const newLib = [activeOutput, ...savedLibrary];
    setSavedLibrary(newLib);
    localStorage.setItem('qlsv2_library', JSON.stringify(newLib));
    alert("Exploration saved to library.");
  };

  const exportOutput = () => {
    if (!activeOutput) {
      addDiagnostic('response handling', 'No output available to export.', 'error');
      return;
    }
    
    const timestamp = new Date(activeOutput.timestamp).toISOString();
    const textContent = typeof activeOutput.content === 'string' ? activeOutput.content : JSON.stringify(activeOutput.content, null, 2);
    
    let formattedContent = '';
    let mimeType = 'text/markdown';
    let extension = 'md';
    
    switch (activeOutput.type) {
      case OutputType.REPORT:
        formattedContent = `# ${activeOutput.title.toUpperCase()}\n\n${textContent}\n\n---\n**Metadata**\n- Generated: ${timestamp}\n- Type: ${activeOutput.type}\n\nCreated with QLSV2 Learning Studio\nCuriosity over certainty.`;
        break;
      case OutputType.PODCAST:
        formattedContent = `# ${activeOutput.title.toUpperCase()}\n\n${textContent}\n\n---\n**Metadata**\n- Generated: ${timestamp}\n- Type: ${activeOutput.type}\n\nCreated with QLSV2 Learning Studio\nCuriosity over certainty.`;
        break;
      case OutputType.INFOGRAPHIC:
        formattedContent = `<!DOCTYPE html>
<html>
<head>
    <title>${activeOutput.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0a192f; color: #ccd6f6; }
        h1 { color: #64ffda; }
        img { max-width: 100%; height: auto; border: 1px solid #233554; border-radius: 8px; }
        .metadata { margin-top: 40px; padding-top: 20px; border-top: 1px solid #233554; font-size: 12px; color: #8892b0; }
    </style>
</head>
<body>
    <h1>${activeOutput.title}</h1>
    <img src="${textContent}" alt="Infographic" />
    <div class="metadata">
        <p><strong>Generated:</strong> ${timestamp}</p>
        <p><strong>Type:</strong> ${activeOutput.type}</p>
        <p>Created with QLSV2 Learning Studio - Curiosity over certainty.</p>
    </div>
</body>
</html>`;
        mimeType = 'text/html';
        extension = 'html';
        break;
      case OutputType.BASELINE:
        formattedContent = `# ${activeOutput.title.toUpperCase()}\n\n${textContent}\n\n---\n**Metadata**\n- Generated: ${timestamp}\n- Type: ${activeOutput.type}\n\nCreated with QLSV2 Learning Studio\nCuriosity over certainty.`;
        break;
      case OutputType.SLIDEDECK:
        const imageUrls = Array.isArray(textContent) ? textContent : [];
        const slideNote = typeof activeOutput.content === 'string' ? activeOutput.content : '';
        formattedContent = `<!DOCTYPE html>
<html>
<head>
    <title>${activeOutput.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0a192f; color: #ccd6f6; }
        h1 { color: #64ffda; }
        .slide-container { margin: 20px 0; }
        .slide { max-width: 100%; height: auto; border: 1px solid #233554; border-radius: 8px; margin-bottom: 20px; }
        .slide-number { color: #8892b0; font-size: 14px; margin-bottom: 5px; }
        .metadata { margin-top: 40px; padding-top: 20px; border-top: 1px solid #233554; font-size: 12px; color: #8892b0; }
    </style>
</head>
<body>
    <h1>${activeOutput.title}</h1>
    ${slideNote ? `<p>${slideNote}</p>` : ''}
    ${imageUrls.map((url, i) => `
    <div class="slide-container">
        <div class="slide-number">Slide ${i + 1}</div>
        <img src="${url}" alt="Slide ${i + 1}" class="slide" />
    </div>`).join('')}
    <div class="metadata">
        <p><strong>Generated:</strong> ${timestamp}</p>
        <p><strong>Type:</strong> ${activeOutput.type}</p>
        <p>Created with QLSV2 Learning Studio - Curiosity over certainty.</p>
    </div>
</body>
</html>`;
        mimeType = 'text/html';
        extension = 'html';
        break;
      default:
        formattedContent = `# ${activeOutput.title.toUpperCase()}\n\n${textContent}\n\n---\n**Metadata**\n- Generated: ${timestamp}\n- Type: ${activeOutput.type}\n\nCreated with QLSV2 Learning Studio\nCuriosity over certainty.`;
    }
    
    const blob = new Blob([formattedContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date(activeOutput.timestamp).toISOString().split('T')[0];
    a.download = `qlsv2_${activeOutput.type.toLowerCase()}_${dateStr}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareOutput = () => {
    const shareText = `Explore this with me: ${activeOutput?.title}. Created with QLSV2 Learning Studio.`;
    navigator.clipboard.writeText(shareText).then(() => {
      alert("Shareable link text copied to clipboard.");
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a192f] text-[#ccd6f6] selection:bg-[#64ffda]/30">
      <header className="px-8 py-5 flex items-center justify-between border-b border-[#233554] bg-[#0a192f]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => { setBaseline(null); setActiveOutput(null); setShowLibrary(false); }}>
          <div className="w-12 h-12 bg-[#64ffda]/5 rounded-xl flex items-center justify-center text-[#64ffda] border border-[#64ffda]/10 transition-all group-hover:scale-105">
            <BookOpenIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-none">QLSV2 Studio</h1>
            <p className="text-[10px] text-[#495670] uppercase tracking-[0.4em] mt-1">Learning Studio</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-[0.3em] text-[#8892b0]">
          <a href="#home" className="hover:text-[#64ffda] transition-colors">Home</a>
          <a href="#features" className="hover:text-[#64ffda] transition-colors">Features</a>
          <a href="#counter" className="hover:text-[#64ffda] transition-colors">Counter</a>
          <a href="#privacy" className="hover:text-[#64ffda] transition-colors">Privacy</a>
        </nav>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowLibrary(!showLibrary)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${showLibrary ? 'text-[#64ffda]' : 'text-[#8892b0] hover:text-[#ccd6f6]'}`}
          >
            <ArchiveBoxIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Library</span>
            {savedLibrary.length > 0 && <span className="bg-[#64ffda] text-[#0a192f] text-[9px] px-1.5 py-0.5 rounded-full font-bold">{savedLibrary.length}</span>}
          </button>
        </div>
      </header>

      <main id="home" className="flex-1 p-6 sm:p-12 flex flex-col items-center max-w-7xl mx-auto w-full">
        {diagnostics.length > 0 && (
          <div className="w-full max-w-3xl mb-10">
            <div className="bg-[#112240]/60 border border-[#233554] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#64ffda]">Diagnostics</h3>
                <button onClick={() => setDiagnostics([])} className="text-xs text-[#8892b0] hover:text-[#ccd6f6]">Clear</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {diagnostics.map((entry) => (
                  <div key={entry.id} className="flex gap-3 text-xs">
                    <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded ${
                      entry.level === 'error' ? 'bg-red-500/10 text-red-400' :
                      entry.level === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-[#64ffda]/10 text-[#64ffda]'
                    }`}>
                      {entry.level}
                    </span>
                    <span className="text-[#8892b0]">{entry.stage}</span>
                    <span className="flex-1 text-[#ccd6f6]">
                      {entry.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {fortifiedStatus && (
          <div className="w-full max-w-3xl mb-10">
            <div className={`bg-[#112240]/60 border rounded-xl p-5 ${
              fortifiedStatus.state === FortifiedBaselineState.READY ? 'border-[#64ffda]/30' :
              fortifiedStatus.state === FortifiedBaselineState.BLOCKED ? 'border-red-500/30' :
              fortifiedStatus.state === FortifiedBaselineState.INCOMPLETE ? 'border-yellow-500/30' :
              'border-[#233554]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {fortifiedStatus.state === FortifiedBaselineState.READY && (
                    <CheckCircleIcon className="w-5 h-5 text-[#64ffda]" />
                  )}
                  {fortifiedStatus.state === FortifiedBaselineState.BLOCKED && (
                    <XCircleIcon className="w-5 h-5 text-red-400" />
                  )}
                  {fortifiedStatus.state === FortifiedBaselineState.INCOMPLETE && (
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
                  )}
                  {fortifiedStatus.state === FortifiedBaselineState.UNINITIALIZED && (
                    <ClockIcon className="w-5 h-5 text-[#8892b0]" />
                  )}
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-[#ccd6f6]">Fortified Baseline Status</h3>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                  fortifiedStatus.state === FortifiedBaselineState.READY ? 'bg-[#64ffda]/10 text-[#64ffda]' :
                  fortifiedStatus.state === FortifiedBaselineState.BLOCKED ? 'bg-red-500/10 text-red-400' :
                  fortifiedStatus.state === FortifiedBaselineState.INCOMPLETE ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-[#233554] text-[#8892b0]'
                }`}>
                  {fortifiedStatus.state}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs uppercase tracking-wider text-[#495670] w-24 shrink-0">Status</span>
                  <span className="text-sm text-[#ccd6f6]">{fortifiedStatus.message}</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-xs uppercase tracking-wider text-[#495670] w-24 shrink-0">Action</span>
                  <span className="text-sm text-[#64ffda]">{fortifiedStatus.actionGuidance}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#233554]/50">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      fortifiedStatus.environment.ready ? 'bg-[#64ffda]' : 'bg-red-400'
                    }`}></span>
                    <span className="text-xs text-[#8892b0]">Environment: {fortifiedStatus.environment.ready ? 'Ready' : 'Missing vars'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      fortifiedStatus.baselinePresence.hasBaseline ? 'bg-[#64ffda]' : 'bg-[#8892b0]'
                    }`}></span>
                    <span className="text-xs text-[#8892b0]">Baseline: {fortifiedStatus.baselinePresence.hasBaseline ? 'Established' : 'Not set'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      fortifiedStatus.providerReadiness.idle ? 'bg-[#64ffda]' : 'bg-yellow-400'
                    }`}></span>
                    <span className="text-xs text-[#8892b0]">Providers: {fortifiedStatus.providerReadiness.idle ? 'Idle' : 'Active'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      fortifiedStatus.evidenceVault.state === 'populated' ? 'bg-[#64ffda]' :
                      fortifiedStatus.evidenceVault.state === 'seeded' ? 'bg-yellow-400' :
                      'bg-[#8892b0]'
                    }`}></span>
                    <span className="text-xs text-[#8892b0]">Vault: {fortifiedStatus.evidenceVault.state} ({fortifiedStatus.evidenceVault.itemsCount})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {showLibrary ? (
          <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowLibrary(false)} className="p-2 hover:bg-[#112240] rounded-full transition-colors text-[#64ffda]">
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-bold tracking-tight">Your Explorations</h2>
            </div>
            {savedLibrary.length === 0 ? (
              <div className="text-center py-32 border border-dashed border-[#233554] rounded-2xl flex flex-col items-center gap-4 bg-[#112240]/20">
                <ArchiveBoxIcon className="w-12 h-12 text-[#233554]" />
                <p className="text-[#8892b0]">Your library is empty.</p>
                <Button variant="ghost" onClick={() => setShowLibrary(false)}>New Exploration</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedLibrary.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => { setActiveOutput(item); setShowLibrary(false); }}
                    className="bg-[#112240] p-6 rounded-xl border border-[#233554] flex justify-between items-center group cursor-pointer hover:border-[#64ffda]/40 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#64ffda] opacity-70">{OUTPUT_METADATA[item.type].icon}</span>
                        <h4 className="font-semibold text-[#ccd6f6]">{item.title}</h4>
                      </div>
                      <p className="text-xs text-[#495670] uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            ) : preview ? (
              <div className="max-w-3xl mx-auto space-y-8">
                <section className="text-center space-y-6 pt-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#64ffda]/5 text-[#64ffda] text-[10px] uppercase font-bold tracking-[0.2em] border border-[#64ffda]/20">
                    <SparklesIcon className="w-4 h-4" />
                    Preview Fetched
                  </div>
                  <h2 className="text-4xl font-bold text-[#ccd6f6] tracking-tight">Review your source</h2>
                  <p className="text-[#8892b0] max-w-xl mx-auto text-lg font-light leading-relaxed italic">
                    {preview.length} characters extracted. Confirm to create baseline.
                  </p>
                </section>

                <div className="bg-[#112240]/40 p-6 rounded-2xl border border-[#233554] shadow-2xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-[#8892b0] text-sm">
                      <span className="bg-[#64ffda]/10 text-[#64ffda] text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        {preview.length} chars
                      </span>
                      <span>-</span>
                      <span>{preview.length >= 500 ? 'Ready to generate' : 'Short preview (will likely fail)'}</span>
                    </div>
                    <button
                      onClick={() => { setPreview(null); }}
                      className="text-[#495670] hover:text-[#8892b0] text-xs font-medium uppercase tracking-widest transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <div className="text-[#ccd6f6] leading-relaxed whitespace-pre-wrap text-sm max-h-96 overflow-y-auto p-4 bg-[#0a192f]/50 rounded-lg border border-[#233554]/30">
                      {preview.content}
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-[#233554]/50">
                    <button
                      onClick={() => { setPreview(null); }}
                      className="flex-1 px-6 py-3 rounded-lg border border-[#233554] text-[#8892b0] hover:text-[#ccd6f6] hover:border-[#64ffda]/40 transition-all text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmBaseline}
                      disabled={preview.length === 0 || isProcessing}
                      className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                        preview.length > 0 && !isProcessing
                          ? 'bg-[#64ffda] text-[#0a192f] hover:bg-[#64ffda]/90'
                          : 'bg-[#233554] text-[#495670] cursor-not-allowed'
                      }`}
                    >
                      {isProcessing ? 'Creating Baseline...' : 'Confirm Baseline'}
                    </button>
                  </div>
                </div>
              </div>
            ) : !baseline ? (
              <div className="w-full max-w-2xl mt-12 animate-in zoom-in-95 duration-700 space-y-10">
                <section className="text-center space-y-4">
                  <h2 className="text-4xl font-bold text-[#ccd6f6] tracking-tight text-balance">Curiosity begins here.</h2>
                  <p className="text-[#8892b0] text-lg font-light leading-relaxed">
                    Initialize your studio by providing a source URL or text.
                  </p>
                </section>
                <div className="bg-gradient-to-br from-[#0a192f] via-[#0f2a4a] to-[#102b2a] p-[1px] rounded-2xl shadow-[0_0_40px_rgba(100,255,218,0.15)] hover:shadow-[0_0_60px_rgba(34,211,238,0.25)] transition-all">
                  <div className="bg-[#112240]/80 rounded-2xl p-1">
                    <IngestionPanel onIngest={handleIngest} isProcessing={isProcessing} onDiagnostic={addDiagnostic} />
                  </div>
                </div>
                <section id="features" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#0a192f]/60 border border-[#233554]/60 rounded-xl p-5 hover:border-[#64ffda]/40 transition-colors">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-[#64ffda] mb-2">Guided Intake</h3>
                    <p className="text-sm text-[#8892b0]">Drop a URL, transcript, or text to seed a studio exploration.</p>
                  </div>
                  <div className="bg-[#0a192f]/60 border border-[#233554]/60 rounded-xl p-5 hover:border-[#64ffda]/40 transition-colors">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-[#64ffda] mb-2">Creative Outputs</h3>
                    <p className="text-sm text-[#8892b0]">Swap between reports, slides, and visuals without restarting.</p>
                  </div>
                </section>
                <section id="counter" className="bg-[#0a192f]/70 border border-[#233554]/60 rounded-2xl p-6 text-center space-y-4">
                  <p className="text-xs uppercase tracking-[0.4em] text-[#495670]">Exploration Counter</p>
                  <div className="text-5xl font-bold text-[#64ffda]">{counter}</div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => setCounter((value) => value - 1)}
                      className="px-4 py-2 rounded-full border border-[#233554] text-[#8892b0] hover:text-[#ccd6f6] hover:border-[#64ffda]/40 transition-all"
                    >
                      Decrease
                    </button>
                    <button
                      onClick={() => setCounter(0)}
                      className="px-4 py-2 rounded-full bg-[#233554]/60 text-[#ccd6f6] hover:bg-[#233554] transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setCounter((value) => value + 1)}
                      className="px-4 py-2 rounded-full bg-[#64ffda] text-[#0a192f] hover:bg-[#52e0c0] transition-colors"
                    >
                      Increase
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="w-full space-y-16 animate-in fade-in duration-500">
                <section className="text-center space-y-6 pt-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#64ffda]/5 text-[#64ffda] text-[10px] uppercase font-bold tracking-[0.2em] border border-[#64ffda]/20">
                    <SparklesIcon className="w-4 h-4" />
                    Baseline Prepared
                  </div>
                  <h2 className="text-4xl font-bold text-[#ccd6f6] tracking-tight">Choose your lens.</h2>
                  <p className="text-[#8892b0] max-w-xl mx-auto text-lg font-light leading-relaxed italic">
                    Select a format to explore interpretations of your source.
                  </p>
                </section>

                {baseline.provenance && baseline.provenance.length > 0 && (
                  <div className="max-w-2xl mx-auto">
                    <ProvenanceDisplay provenance={baseline.provenance} />
                  </div>
                )}

                {baseline.status === BaselineStatus.INSUFFICIENT_CONTENT && (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-[#112240]/30 border border-[#233554] rounded-lg p-4 flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-[#fbbf24] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#ccd6f6] font-medium mb-1">Source text required</p>
                        <p className="text-[#8892b0] text-sm mb-3">{baseline.errorMessage || 'The material provided is too limited to generate a discussion. Please add a longer article, transcript, or pasted text (at least 500 characters) to enable generation.'}</p>
                        <button
                          onClick={() => { setBaseline(null); }}
                          className="text-[#64ffda] text-xs font-medium uppercase tracking-widest hover:underline"
                        >
                          Add more text and try again
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {baseline.status === BaselineStatus.ERROR && (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-[#112240]/30 border border-[#ef4444]/50 rounded-lg p-4 flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#ccd6f6] font-medium mb-1">Ingestion error</p>
                        <p className="text-[#8892b0] text-sm mb-3">{baseline.errorMessage || 'Failed to process the source. Please try again.'}</p>
                        <button
                          onClick={() => { setBaseline(null); }}
                          className="text-[#64ffda] text-xs font-medium uppercase tracking-widest hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {baseline.status === BaselineStatus.OK && (
                  <div className="w-full flex flex-col items-center gap-4">
                    {baseline.errorMessage && (
                      <div className="max-w-2xl mx-auto w-full">
                        <div className="bg-[#112240]/30 border border-[#f59e0b]/30 rounded-lg p-4 flex items-start gap-3">
                          <ExclamationTriangleIcon className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[#f59e0b] font-medium mb-1">Baseline warning</p>
                            <p className="text-[#8892b0] text-sm">{baseline.errorMessage}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {baseline.content.length < 500 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#64ffda]/10 text-[#64ffda] text-[10px] uppercase font-bold tracking-[0.2em] border border-[#64ffda]/20">
                        <SparklesIcon className="w-4 h-4" />
                        AI Fortification Active
                      </div>
                    )}
                    <OutputSelector
                      onSelect={handleSelectOutput}
                      isGenerating={isGenerating}
                      selectedType={activeOutput?.type}
                      outputEligibility={outputEligibility}
                      outputExecutionStatus={outputExecutionStatus}
                      disabled={false}
                    />
                    {(activeOutput?.type === OutputType.INFOGRAPHIC || activeOutput?.type === OutputType.SLIDEDECK) && (
                      <button
                        onClick={() => setUseEnhancedPanels(!useEnhancedPanels)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-[0.2em] border transition-all ${
                          useEnhancedPanels
                            ? 'bg-[#64ffda]/20 text-[#64ffda] border-[#64ffda]/40'
                            : 'bg-[#233554]/20 text-[#8892b0] border-[#233554]/40 hover:bg-[#233554]/30'
                        }`}
                      >
                        <SparklesIcon className="w-4 h-4" />
                        {useEnhancedPanels ? 'Enhanced Mode ON' : 'Enhanced Mode OFF'}
                      </button>
                    )}
                  </div>
                )}

                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-24 gap-6 animate-in fade-in duration-300">
                     <div className="flex gap-3">
                        <div className="w-3 h-3 rounded-full bg-[#64ffda] animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#64ffda] animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#64ffda] animate-bounce"></div>
                     </div>
                     <div className="text-center space-y-1">
                        <p className="text-[#64ffda] font-medium tracking-widest uppercase text-xs">
                          {hydrationActive && generatingType === OutputType.SLIDEDECK
                            ? '🔍 Deep Search & Briefing Expansion in progress...'
                            : 'Synthesizing'}
                        </p>
                        <p className="text-[#8892b0] text-sm mt-1">
                          {hydrationActive && generatingType === OutputType.SLIDEDECK
                            ? 'Fortifying short input before rendering slides...'
                            : 'Reflecting on interpretations...'}
                        </p>
                      </div>
                  </div>
                )}

                {notesOutput && !isGenerating && (
                  <div className="pb-32 animate-in slide-in-from-bottom-12 duration-1000 max-w-3xl mx-auto w-full">
                    <div className="bg-[#112240] p-6 rounded-xl border border-[#233554]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#ccd6f6]">{notesOutput.title}</h3>
                        <span className="text-xs text-[#8892b0]">{new Date(notesOutput.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-[#64ffda] mb-3 uppercase tracking-wider">Key Takeaways</h4>
                        <ul className="space-y-2">
                          {notesOutput.keyTakeaways.map((takeaway, idx) => (
                            <li key={idx} className="text-sm text-[#ccd6f6] flex items-start gap-2">
                              <span className="text-[#64ffda] mt-1">•</span>
                              <span>{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-[#64ffda] mb-3 uppercase tracking-wider">Notes</h4>
                        <ul className="space-y-2">
                          {notesOutput.bulletNotes.map((note, idx) => (
                            <li key={idx} className="text-sm text-[#ccd6f6] flex items-start gap-2">
                              <span className="text-[#8892b0] mt-1">-</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {reportOutput && !isGenerating && (
                  <div className="pb-32 animate-in slide-in-from-bottom-12 duration-1000 max-w-3xl mx-auto w-full">
                    <div className="bg-[#112240] p-6 rounded-xl border border-[#233554]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#ccd6f6]">{reportOutput.title}</h3>
                        <span className="text-xs text-[#8892b0]">{new Date(reportOutput.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-[#64ffda] mb-3 uppercase tracking-wider">Executive Summary</h4>
                        <p className="text-sm text-[#ccd6f6] leading-relaxed">{reportOutput.executiveSummary}</p>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-[#64ffda] mb-3 uppercase tracking-wider">Key Findings</h4>
                        <ul className="space-y-2">
                          {reportOutput.keyFindings.map((finding, idx) => (
                            <li key={idx} className="text-sm text-[#ccd6f6] flex items-start gap-2">
                              <span className="text-[#64ffda] mt-1">•</span>
                              <span>{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-[#64ffda] mb-3 uppercase tracking-wider">Report Sections</h4>
                        {reportOutput.sections.map((section, idx) => (
                          <div key={idx} className="mb-4 last:mb-0">
                            <h5 className="text-sm font-semibold text-[#ccd6f6] mb-2">{section.title}</h5>
                            <p className="text-sm text-[#8892b0] leading-relaxed">{section.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {audioReportOutput && !isGenerating && (
                  <div className="pb-32 animate-in slide-in-from-bottom-12 duration-1000 max-w-3xl mx-auto w-full">
                    <div className="bg-[#112240] p-6 rounded-xl border border-[#233554]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#ccd6f6]">{audioReportOutput.title}</h3>
                        <span className="text-xs text-[#8892b0]">{new Date(audioReportOutput.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-[#64ffda] mb-3 uppercase tracking-wider">Audio Report</h4>
                        <audio 
                          controls 
                          className="w-full h-12 bg-[#0a192f] rounded-lg"
                          src={audioReportOutput.audioUrl}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-[#8892b0]">
                        <span>Duration: {audioReportOutput.duration > 0 ? `${Math.round(audioReportOutput.duration)}s` : 'N/A'}</span>
                        <span>Source: {audioReportOutput.provenance[0]?.source_type || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {infographicOutput && !isGenerating && (
                  <div className="pb-32 animate-in slide-in-from-bottom-12 duration-1000 max-w-3xl mx-auto w-full">
                    <div className="bg-[#112240] p-6 rounded-xl border border-[#233554]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#ccd6f6]">{infographicOutput.title}</h3>
                        <span className="text-xs text-[#8892b0]">{new Date(infographicOutput.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div className="mb-4">
                        <img 
                          src={infographicOutput.imageUrl} 
                          alt={infographicOutput.caption}
                          className="w-full rounded-lg border border-[#233554]"
                        />
                      </div>
                      
                      <p className="text-sm text-[#8892b0]">{infographicOutput.caption}</p>
                    </div>
                  </div>
                )}

                {slideDeckOutput && !isGenerating && (
                  <div className="pb-32 animate-in slide-in-from-bottom-12 duration-1000 max-w-3xl mx-auto w-full">
                    <div className="bg-[#112240] p-6 rounded-xl border border-[#233554]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#ccd6f6]">{slideDeckOutput.title}</h3>
                        <span className="text-xs text-[#8892b0]">{new Date(slideDeckOutput.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div className="space-y-6">
                        {slideDeckOutput.slides.map((slide, idx) => (
                          <div key={idx} className="bg-[#0a192f] p-4 rounded-lg border border-[#233554]">
                            <h4 className="text-lg font-semibold text-[#64ffda] mb-3">{slide.slideTitle}</h4>
                            <ul className="space-y-2">
                              {slide.bulletPoints.map((point, pIdx) => (
                                <li key={pIdx} className="text-sm text-[#ccd6f6] flex items-start gap-2">
                                  <span className="text-[#8892b0] mt-1">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {podcastOutput && !isGenerating && (
                  <div className="pb-32 animate-in slide-in-from-bottom-12 duration-1000 max-w-3xl mx-auto w-full">
                    <div className="bg-[#112240] p-6 rounded-xl border border-[#233554]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#ccd6f6]">{podcastOutput.title}</h3>
                        <span className="text-xs text-[#8892b0]">{new Date(podcastOutput.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-[#64ffda] mb-3 uppercase tracking-wider">Podcast Audio</h4>
                        <audio 
                          controls 
                          className="w-full h-12 bg-[#0a192f] rounded-lg"
                          src={podcastOutput.audioUrl}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-[#64ffda] mb-3 uppercase tracking-wider">Segments</h4>
                        <div className="space-y-3">
                          {podcastOutput.segments.map((segment, idx) => (
                            <div key={idx} className="bg-[#0a192f] p-3 rounded-lg border border-[#233554]">
                              <h5 className="text-sm font-semibold text-[#ccd6f6] mb-2">{segment.segmentTitle}</h5>
                              <p className="text-xs text-[#8892b0]">{segment.narrationText.substring(0, 150)}...</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-[#8892b0]">
                        <span>Duration: {podcastOutput.duration > 0 ? `${Math.round(podcastOutput.duration)}s` : 'N/A'}</span>
                        <span>Segments: {podcastOutput.segments.length}</span>
                        <span>Source: {podcastOutput.provenance[0]?.source_type || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeOutput && !isGenerating && (
                  <div className="pb-32 animate-in slide-in-from-bottom-12 duration-1000">
                    {(hydrationWarning || duplicateContentWarning) && (
                      <div className="max-w-2xl mx-auto mb-6">
                        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-4 flex items-start gap-3">
                          <ExclamationTriangleIcon className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[#f59e0b] font-medium mb-1">Quality Warning</p>
                            {hydrationWarning && <p className="text-[#8892b0] text-sm mb-2">{hydrationWarning}</p>}
                            {duplicateContentWarning && <p className="text-[#8892b0] text-sm">{duplicateContentWarning}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                    {useEnhancedPanels && activeOutput.type === OutputType.INFOGRAPHIC ? (
                      <EnhancedInfographicPanel
                        sourceContent={typeof activeOutput.content === 'string' ? activeOutput.content : ''}
                        existingInfographicLogic={async (content) => ({
                          header: {
                            title: activeOutput.analysis?.title || 'Infographic',
                            subtitle: activeOutput.analysis?.subtitle || ''
                          },
                          sections: activeOutput.analysis?.key_facts?.map((fact: string, idx: number) => ({
                            title: `Section ${idx + 1}`,
                            keyPoints: [fact],
                            statistics: activeOutput.analysis?.statistics?.slice(0, 2)
                          })) || []
                        })}
                      />
                    ) : useEnhancedPanels && activeOutput.type === OutputType.SLIDEDECK ? (
                      <EnhancedSlideDeckPanel
                        sourceContent={typeof activeOutput.content === 'string' ? activeOutput.content : ''}
                        existingSlideDeckLogic={async () => (
                          Array.isArray(activeOutput.slidePlan)
                            ? activeOutput.slidePlan.map((slide: any, idx: number) => {
                              const keyPoints = Array.isArray(slide.bullets) ? slide.bullets : [];
                              const content = slide.notes || keyPoints.join(' ');
                              return {
                                title: slide.title || `Slide ${idx + 1}`,
                                keyPoints,
                                notes: slide.notes || '',
                                content,
                                type: slide.type || 'content'
                              };
                            })
                            : []
                        )}
                      />
                    ) : (
                      <OutputViewer
                        output={activeOutput}
                        onSave={saveOutput}
                        onExport={exportOutput}
                        onShare={shareOutput}
                      />
                    )}
                  </div>
                )}

                {!activeOutput && !isGenerating && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => { setBaseline(null); }}
                      className="text-[#495670] hover:text-[#8892b0] text-xs font-medium uppercase tracking-widest transition-colors flex items-center gap-2 border border-[#233554] px-4 py-2 rounded-full"
                    >
                      <ArrowLeftIcon className="w-3 h-3" />
                      Discard and Start Over
                    </button>
                  </div>
                )}
              </div>
            )}
      </main>

      <footer id="privacy" className="p-10 border-t border-[#233554] bg-[#0a192f]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-[#495670] uppercase tracking-[0.5em] font-bold">
            QLSV2 Learning Studio
          </p>
          <a
            href="/privacy.html"
            className="text-[10px] uppercase tracking-[0.4em] text-[#64ffda] hover:text-[#22d3ee] transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
