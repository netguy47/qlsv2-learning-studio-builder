
export enum OutputType {
  PODCAST = 'PODCAST',
  REPORT = 'REPORT',
  BASELINE = 'BASELINE',
  INFOGRAPHIC = 'INFOGRAPHIC',
  SLIDEDECK = 'SLIDEDECK',
  AUDIO_REPORT = 'AUDIO_REPORT',
  NOTES = 'NOTES'
}

/**
 * Selectable Output Type
 * 
 * Output types that can be selected for generation (excludes BASELINE).
 */
export type SelectableOutputType = Exclude<OutputType, OutputType.BASELINE>;

/**
 * Development Mode Override
 *
 * Bypasses entitlement checks in development mode for testing purposes.
 */
export const DEV_MODE_OVERRIDE = import.meta.env.DEV;

/**
 * Canonical Flow State Machines
 *
 * Enforces INGEST → REPORT → (OPTIONAL) PODCAST flow
 */

/**
 * Ingestion State Machine
 */
export enum IngestionState {
  IDLE = 'IDLE',
  VALIDATING = 'VALIDATING',
  INGESTING = 'INGESTING',
  FAILED = 'FAILED',
  SUCCESS = 'SUCCESS'
}

/**
 * Report State Machine
 */
export enum ReportState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  READY = 'READY',
  FAILED = 'FAILED'
}

/**
 * Podcast State Machine
 */
export enum PodcastState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  READY = 'READY',
  FAILED = 'FAILED'
}

/**
 * Canonical Flow Status
 *
 * Tracks the state of the entire canonical flow
 */
export interface CanonicalFlowStatus {
  ingestion: IngestionState;
  report: ReportState;
  podcast: PodcastState;
  contentId?: string;
}

/**
 * Flow Guard 1 — Ingest Preconditions
 *
 * Input MUST be a valid article URL OR pasted text
 * Social/video URLs are blocked unless transcript flow is used
 * Backend ingest MUST return a valid contentId
 */
export const NON_TEXT_SOURCES = [
  "youtube.com",
  "tiktok.com",
  "instagram.com",
  "x.com",
  "twitter.com"
];

export function validateIngestInput(url: string): { valid: boolean; reason?: string } {
  if (NON_TEXT_SOURCES.some(d => url.includes(d))) {
    return {
      valid: false,
      reason: 'This source has no extractable article text. Paste a transcript instead.'
    };
  }
  return { valid: true };
}

/**
 * Flow Guard 2 — Preview Gating
 *
 * /preview may ONLY be called if:
 * - ingestState === SUCCESS
 * - contentId exists
 */
export function canCallPreview(flowStatus: CanonicalFlowStatus): boolean {
  return flowStatus.ingestion === IngestionState.SUCCESS && !!flowStatus.contentId;
}

/**
 * Flow Guard 3 — Report is Mandatory
 *
 * REPORT generation is required before any downstream artifact
 * Podcast generation is DISABLED until:
 * - ingestState === SUCCESS
 * - reportState === READY
 */
export function canGeneratePodcast(flowStatus: CanonicalFlowStatus): boolean {
  return (
    flowStatus.ingestion === IngestionState.SUCCESS &&
    flowStatus.report === ReportState.READY
  );
}

/**
 * Flow Guard 4 — Podcast Entitlements
 *
 * Podcast generation requires PRO tier entitlement
 */
export function checkPodcastEntitlement(userTier: UserTier): { eligible: boolean; reason?: string } {
  const hasPro = DEV_MODE_OVERRIDE || USER_TIER_ENTITLEMENTS[userTier]?.includes(Entitlement.GENERATE_PODCAST);
  
  if (!hasPro) {
    return {
      eligible: false,
      reason: 'Podcast generation requires PRO tier subscription'
    };
  }
  
  return { eligible: true };
}

/**
 * User Tier Enum
 * 
 * Defines the subscription tiers for the application.
 * Each tier has different entitlements for output generation.
 */
export enum UserTier {
  FREE = 'FREE',
  STANDARD = 'STANDARD',
  PRO = 'PRO'
}

/**
 * Entitlement Enum
 * 
 * Defines the specific entitlements that grant access to features.
 */
export enum Entitlement {
  // Basic entitlements
  GENERATE_NOTES = 'GENERATE_NOTES',
  GENERATE_REPORT = 'GENERATE_REPORT',
  
  // Standard entitlements
  GENERATE_AUDIO_REPORT = 'GENERATE_AUDIO_REPORT',
  GENERATE_INFOGRAPHIC = 'GENERATE_INFOGRAPHIC',
  
  // Pro entitlements
  GENERATE_PODCAST = 'GENERATE_PODCAST',
  GENERATE_SLIDEDECK = 'GENERATE_SLIDEDECK',
  UNLIMITED_GENERATIONS = 'UNLIMITED_GENERATIONS'
}

/**
 * User Tier Definitions
 * 
 * Maps each user tier to their entitlement set.
 */
export const USER_TIER_ENTITLEMENTS: Record<UserTier, Entitlement[]> = {
  [UserTier.FREE]: [
    Entitlement.GENERATE_NOTES,
    Entitlement.GENERATE_REPORT
  ],
  [UserTier.STANDARD]: [
    Entitlement.GENERATE_NOTES,
    Entitlement.GENERATE_REPORT,
    Entitlement.GENERATE_AUDIO_REPORT,
    Entitlement.GENERATE_INFOGRAPHIC
  ],
  [UserTier.PRO]: [
    Entitlement.GENERATE_NOTES,
    Entitlement.GENERATE_REPORT,
    Entitlement.GENERATE_AUDIO_REPORT,
    Entitlement.GENERATE_INFOGRAPHIC,
    Entitlement.GENERATE_PODCAST,
    Entitlement.GENERATE_SLIDEDECK,
    Entitlement.UNLIMITED_GENERATIONS
  ]
};

/**
 * Output Capability Interface
 * 
 * Defines the requirements for each output type based on Fortified Baseline state
 * and Evidence Vault contents.
 */
export interface OutputCapability {
  type: OutputType;
  displayName: string;
  icon: string;
  requiredBaselineState: FortifiedBaselineState[];
  minBaselineLength: number;
  requiresEvidenceVault: boolean;
  requiredEntitlement?: Entitlement;
  description: string;
}

/**
 * Output Execution State Enum
 * 
 * Defines the lifecycle states of output execution requests.
 * 
 * IDLE: Output type has not been requested
 * REQUESTED: Output has been requested but not yet started
 * IN_PROGRESS: Output is currently being generated
 * COMPLETED: Output generation completed successfully
 * FAILED: Output generation failed with an error
 */
export enum OutputExecutionState {
  IDLE = 'IDLE',
  REQUESTED = 'REQUESTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Output Execution Status Interface
 * 
 * Tracks the execution status for a specific output type.
 */
export interface OutputExecutionStatus {
  type: OutputType;
  state: OutputExecutionState;
  timestamp: number;
  errorMessage?: string;
}

/**
 * Output Eligibility Result
 * 
 * Indicates whether an output type is eligible and provides an explanation
 * if it is not.
 */
export interface OutputEligibility {
  type: OutputType;
  eligible: boolean;
  reason: string;
}

export enum BaselineStatus {
  OK = 'ok',
  INSUFFICIENT_CONTENT = 'insufficient_content',
  ERROR = 'error'
}

/**
 * Fortified Baseline State Enum
 * 
 * UNINITIALIZED: One-time pre-evaluation state. System has not yet computed baseline status.
 *                Cannot reoccur after initial computation. Only valid at startup.
 * 
 * INCOMPLETE: Baseline content exists but is insufficient for generation.
 *             Requires user to provide more comprehensive content or try a different source.
 *             Can transition to READY when baseline content is improved.
 * 
 * READY: System is fully operational and ready for AI provider invocation.
 *        Baseline is established, environment is configured, and providers are idle.
 *        Can transition to READY (with providers active) or remain READY.
 * 
 * BLOCKED: System cannot proceed due to external constraints (missing env vars, etc.).
 *          Requires external change (env update, redeploy, or configuration) to transition.
 *          Cannot transition to other states without external intervention.
 */
export enum FortifiedBaselineState {
  UNINITIALIZED = 'UNINITIALIZED',
  INCOMPLETE = 'INCOMPLETE',
  READY = 'READY',
  BLOCKED = 'BLOCKED'
}

/**
 * Baseline Action Enum
 * 
 * Strict enumeration of possible next actions for each baseline state.
 * Maps to human-readable guidance for the user.
 */
export enum BaselineAction {
  // For UNINITIALIZED state
  INITIALIZE_BASELINE = 'INITIALIZE_BASELINE',
  
  // For INCOMPLETE state
  IMPROVE_BASELINE = 'IMPROVE_BASELINE',
  
  // For READY state
  SELECT_OUTPUT_TYPE = 'SELECT_OUTPUT_TYPE',
  GENERATE_CONTENT = 'GENERATE_CONTENT',
  REVIEW_OUTPUTS = 'REVIEW_OUTPUTS',
  
  // For BLOCKED state
  CONFIGURE_ENVIRONMENT = 'CONFIGURE_ENVIRONMENT',
  REDEPLOY_APPLICATION = 'REDEPLOY_APPLICATION'
}

export interface EnvironmentStatus {
  ready: boolean;
  missingVars: string[];
}

export interface BaselinePresenceStatus {
  hasBaseline: boolean;
  hasScenario: boolean;
}

export interface ProviderReadinessStatus {
  invoked: boolean;
  idle: boolean;
}

export interface EvidenceVaultStatus {
  state: 'empty' | 'seeded' | 'populated';
  itemsCount: number;
}

/**
 * Output Capability Definitions
 * 
 * Defines the requirements for each output type based on Fortified Baseline state
 * and Evidence Vault contents.
 */
export const OUTPUT_CAPABILITIES: OutputCapability[] = [
  {
    type: OutputType.PODCAST,
    displayName: 'Podcast',
    icon: '🎙️',
    requiredBaselineState: [FortifiedBaselineState.READY],
    minBaselineLength: 500,
    requiresEvidenceVault: false,
    requiredEntitlement: Entitlement.GENERATE_PODCAST,
    description: 'Generate an audio podcast from your baseline content'
  },
  {
    type: OutputType.AUDIO_REPORT,
    displayName: 'Audio Report',
    icon: '📻',
    requiredBaselineState: [FortifiedBaselineState.READY],
    minBaselineLength: 300,
    requiresEvidenceVault: false,
    requiredEntitlement: Entitlement.GENERATE_AUDIO_REPORT,
    description: 'Create an audio report summarizing your content'
  },
  {
    type: OutputType.NOTES,
    displayName: 'Notes',
    icon: '📝',
    requiredBaselineState: [FortifiedBaselineState.READY],
    minBaselineLength: 100,
    requiresEvidenceVault: false,
    requiredEntitlement: Entitlement.GENERATE_NOTES,
    description: 'Generate structured notes from your baseline'
  },
  {
    type: OutputType.INFOGRAPHIC,
    displayName: 'Infographic',
    icon: '📊',
    requiredBaselineState: [FortifiedBaselineState.READY],
    minBaselineLength: 400,
    requiresEvidenceVault: false,
    requiredEntitlement: Entitlement.GENERATE_INFOGRAPHIC,
    description: 'Create a visual infographic from your content'
  },
  {
    type: OutputType.SLIDEDECK,
    displayName: 'Slide Deck',
    icon: '📽️',
    requiredBaselineState: [FortifiedBaselineState.READY],
    minBaselineLength: 500,
    requiresEvidenceVault: false,
    requiredEntitlement: Entitlement.GENERATE_SLIDEDECK,
    description: 'Generate a presentation slide deck'
  },
  {
    type: OutputType.REPORT,
    displayName: 'Report',
    icon: '📄',
    requiredBaselineState: [FortifiedBaselineState.READY],
    minBaselineLength: 300,
    requiresEvidenceVault: false,
    requiredEntitlement: Entitlement.GENERATE_REPORT,
    description: 'Generate a comprehensive written report'
  }
];

/**
 * Determine output eligibility based on Fortified Baseline state and Evidence Vault
 * 
 * @param type - Output type to check
 * @param baselineState - Current Fortified Baseline state
 * @param baselineLength - Length of baseline content
 * @param evidenceVaultState - Current Evidence Vault state
 * @returns OutputEligibility with eligible flag and reason
 */
export function determineOutputEligibility(
  type: OutputType,
  baselineState: FortifiedBaselineState | null,
  baselineLength: number,
  evidenceVaultState: 'empty' | 'seeded' | 'populated'
): OutputEligibility {
  const capability = OUTPUT_CAPABILITIES.find(c => c.type === type);
  
  if (!capability) {
    return {
      type,
      eligible: false,
      reason: 'Unknown output type'
    };
  }

  // Check if baseline state is required
  if (!baselineState) {
    return {
      type,
      eligible: false,
      reason: 'No baseline established. Please ingest content first.'
    };
  }

  // Check if baseline state is in required states
  if (!capability.requiredBaselineState.includes(baselineState)) {
    if (baselineState === FortifiedBaselineState.BLOCKED) {
      return {
        type,
        eligible: false,
        reason: 'System is blocked. Configure environment variables to proceed.'
      };
    }
    if (baselineState === FortifiedBaselineState.UNINITIALIZED) {
      return {
        type,
        eligible: false,
        reason: 'System initializing. Please wait.'
      };
    }
    if (baselineState === FortifiedBaselineState.INCOMPLETE) {
      return {
        type,
        eligible: false,
        reason: 'Baseline content insufficient. Provide more comprehensive content.'
      };
    }
  }

  // Check minimum baseline length
  if (baselineLength < capability.minBaselineLength) {
    return {
      type,
      eligible: false,
      reason: `Baseline too short. Requires at least ${capability.minBaselineLength} characters.`
    };
  }

  // Check if evidence vault is required
  if (capability.requiresEvidenceVault && evidenceVaultState === 'empty') {
    return {
      type,
      eligible: false,
      reason: 'Evidence vault is empty. Generate content first.'
    };
  }

  return {
    type,
    eligible: true,
    reason: 'Ready to generate'
  };
}

/**
 * Check monetization entitlement for output execution
 * 
 * @param type - Output type to check
 * @param userTier - Current user tier
 * @returns Monetization check result with eligible flag and reason
 */
export interface MonetizationCheckResult {
  eligible: boolean;
  reason: string;
  requiredTier?: UserTier;
}

export function checkMonetizationEntitlement(
  type: OutputType,
  userTier: UserTier
): MonetizationCheckResult {
  // Dev mode override: bypass all entitlement checks
  if (DEV_MODE_OVERRIDE) {
    return {
      eligible: true,
      reason: 'Dev mode override'
    };
  }

  const capability = OUTPUT_CAPABILITIES.find(c => c.type === type);
  
  if (!capability) {
    return {
      eligible: false,
      reason: 'Unknown output type'
    };
  }

  // If no entitlement required, allow execution
  if (!capability.requiredEntitlement) {
    return {
      eligible: true,
      reason: 'No entitlement required'
    };
  }

  // Check if user tier has the required entitlement
  const userEntitlements = USER_TIER_ENTITLEMENTS[userTier] || [];
  const hasEntitlement = userEntitlements.includes(capability.requiredEntitlement);

  if (!hasEntitlement) {
    // Determine required tier for this output
    let requiredTier: UserTier | undefined;
    if (capability.requiredEntitlement === Entitlement.GENERATE_PODCAST || capability.requiredEntitlement === Entitlement.GENERATE_SLIDEDECK) {
      requiredTier = UserTier.PRO;
    } else if (capability.requiredEntitlement === Entitlement.GENERATE_AUDIO_REPORT || capability.requiredEntitlement === Entitlement.GENERATE_INFOGRAPHIC) {
      requiredTier = UserTier.STANDARD;
    }

    return {
      eligible: false,
      reason: `This output requires ${requiredTier || 'higher'} tier entitlement`,
      requiredTier
    };
  }

  return {
    eligible: true,
    reason: 'Entitlement satisfied'
  };
}

export interface FortifiedBaselineStatus {
  state: FortifiedBaselineState;
  environment: EnvironmentStatus;
  baselinePresence: BaselinePresenceStatus;
  providerReadiness: ProviderReadinessStatus;
  evidenceVault: EvidenceVaultStatus;
  message: string;
  action: BaselineAction;
  actionGuidance: string;
  timestamp: number;
}

export interface IngestedContent {
  source: string;
  type: 'url' | 'youtube' | 'text' | 'manual';
  purpose?: string; // Required for manual entries: declared intent/purpose
  metadata?: {
    title?: string;
    author?: string;
  };
}

export interface Provenance {
  source_type: string;
  source_url: string | null;
  retrieved_at: string;
  notes?: string;
}

export interface InternalBaseline {
  content: string;
  summary: string;
  keyPoints: string[];
  themes: string[];
  exploratoryQuestions: string[];
  provenance?: Provenance[];
  status?: BaselineStatus;
  errorMessage?: string;
}

export interface GeneratedOutput {
  id: string;
  type: SelectableOutputType;
  title: string;
  content: string;
  audioUrl?: string;
  slidePlan?: any[];
  prompt?: string;
  analysis?: any;
  timestamp: number;
}

/**
 * Notes Output Result Type
 * 
 * Represents the structured output generated for NOTES output type.
 */
export interface NotesOutput {
  id: string;
  type: OutputType.NOTES;
  title: string;
  bulletNotes: string[];
  keyTakeaways: string[];
  provenance: Provenance[];
  timestamp: number;
  baselineSnapshot: {
    content: string;
    summary: string;
    themes: string[];
  };
}

/**
 * Report Output Result Type
 * 
 * Represents the structured output generated for REPORT output type.
 */
export interface ReportOutput {
  id: string;
  type: OutputType.REPORT;
  title: string;
  executiveSummary: string;
  sections: {
    title: string;
    content: string;
  }[];
  keyFindings: string[];
  provenance: Provenance[];
  timestamp: number;
  baselineSnapshot: {
    content: string;
    summary: string;
    themes: string[];
  };
}

/**
 * Audio Report Output Result Type
 * 
 * Represents the structured output generated for AUDIO_REPORT output type.
 */
export interface AudioReportOutput {
  id: string;
  type: OutputType.AUDIO_REPORT;
  title: string;
  audioUrl: string;
  duration: number;
  provenance: Provenance[];
  timestamp: number;
  baselineSnapshot: {
    content: string;
    summary: string;
    themes: string[];
  };
}

/**
 * Infographic Output Result Type
 * 
 * Represents the structured output generated for INFOGRAPHIC output type.
 */
export interface InfographicOutput {
  id: string;
  type: OutputType.INFOGRAPHIC;
  title: string;
  imageUrl: string;
  caption: string;
  provenance: Provenance[];
  timestamp: number;
  baselineSnapshot: {
    content: string;
    summary: string;
    themes: string[];
  };
}

/**
 * Slide Deck Slide Type
 * 
 * Represents a single slide in a slide deck.
 */
export interface Slide {
  slideTitle: string;
  bulletPoints: string[];
  imageRef?: string;
}

/**
 * Slide Deck Output Result Type
 * 
 * Represents the structured output generated for SLIDEDECK output type.
 */
export interface SlideDeckOutput {
  id: string;
  type: OutputType.SLIDEDECK;
  title: string;
  slides: Slide[];
  provenance: Provenance[];
  timestamp: number;
  baselineSnapshot: {
    content: string;
    summary: string;
    themes: string[];
  };
}

/**
 * Podcast Segment Type
 * 
 * Represents a single segment in a podcast.
 */
export interface PodcastSegment {
  segmentTitle: string;
  narrationText: string;
}

/**
 * Podcast Output Result Type
 * 
 * Represents the structured output generated for PODCAST output type.
 */
export interface PodcastOutput {
  id: string;
  type: OutputType.PODCAST;
  title: string;
  segments: PodcastSegment[];
  audioUrl: string;
  duration: number;
  provenance: Provenance[];
  timestamp: number;
  baselineSnapshot: {
    content: string;
    summary: string;
    themes: string[];
  };
}
