
export type CreativityLevel = 'stable' | 'balanced' | 'experimental' | 'comparison';
export type MarketSuggestionType = 'niche' | 'trending';

export interface UserInput {
  prompt: string;
}

export type Complexity = 'any' | 'light' | 'medium' | 'heavy';

export interface MarketSuggestion {
  title: string;
  rationale: string;
  keywords: {
    genre: string[];
    theme: string[];
    mechanics: string[];
  };
}

export interface GameProposal {
  id: number;
  title: string;
  tagline: string;
  gameFeel: string;
  playerExperience: string;
  keyFeatures: string[];
  turnStructure: string;
  winningCondition: string;
  genres: string[];
  theme: string;
  mechanics: string[];
  competitiveAnalysis: {
    similarGames: { name: string; reason: string }[];
    differentiators: string[];
    inspiration: string;
  };
  creativitySource: 'stable' | 'balanced' | 'experimental';
}

export interface DesignerNotesObject {
    introduction?: string;
    meaningfulDecisions?: string;
    tensionArc?: string;
    playerAgency?: string;
    positiveInteraction?: string;
}

export interface Meta {
  title: string;
  genres: string[];
  theme: string;
  tagline: string;
  designerNotes: string | DesignerNotesObject;
  mechanics: string[];
  players: string;
  playtime: string;
  complexity: string;
  pacing: string;
  targetAudience: string;
}

export interface ComponentData {
  name: string;
  type: string;
  purpose: string;
  acquisition: string;
  consumption:string;
  zone: string;
  limitInitial: string;
  reset: string;
  accessibility: string;
  designerNote?: string;
}

export interface RuleSection {
  title: string;
  content: string;
  examples?: { situation: string; result: string }[];
  playerCountAdjustments?: { playerCount: string; adjustment: string; }[];
}

export interface KeyToVictory {
  name: string;
  archetype: string;
  description: string;
}

export interface GameSummaryCard {
  setup: string[];
  turnSummary: string[];
  endCondition: string;
  scoringSummary: string[];
}

export interface FunFactorAnalysis {
  metrics: {
    name: '의미있는 결정' | '긴장감 아크' | '플레이어 주도성' | '긍정적 상호작용';
    score: number;
    rationale: string;
  }[];
  overallScore: number;
  scoreRationale: string;
}

export interface AIPlaytestReport {
  overallFeedback: string;
  potentialIssues: { issue: string; suggestion: string; severity: '치명적' | '주요' | '사소함' }[];
  strengths: string[];
  funFactorAnalysis: FunFactorAnalysis;
}

export interface SimulationReport {
  methodology: string;
  summary: string;
  strategyDescriptions: { name: string; description: string }[];
  tables: { title: string; data: string[][] }[];
  balanceNotes: string;
}

export interface CompetitiveAnalysis {
  name: string;
  bggRating: number;
  strengths: string;
  ourDifferentiation: string;
}

export interface LaunchKit {
  boxCover: {
    concept: string;
    mood: string;
    colorPalette: { name: string; hex: string }[];
    typography: string;
  };
  boxBlurb: string;
  sellingPoints: string[];
  socialMediaPosts: {
    platform: 'Twitter' | 'Instagram';
    content: string;
  }[];
}

export interface CsvDump {
  filename: string;
  content: string;
}

export interface ImageAsset {
    target: string;
    base64Data: string;
}
export interface ImagePrompt {
    target: string;
    prompt: string;
    artStyle: string;
}

export interface ModificationRecord {
    timestamp: string;
    userInput: string;
    changedKeys: string[];
}

export interface GamePackage {
  meta: Meta;
  assumptions?: string[];
  components: ComponentData[];
  rules: RuleSection[];
  firstTurnWalkthrough: RuleSection;
  keyToVictory: KeyToVictory[];
  gameSummaryCard: GameSummaryCard;
  simulationReport?: SimulationReport;
  aiPlaytestReport?: AIPlaytestReport;
  competitiveAnalysis?: CompetitiveAnalysis[];
  imagePrompts: ImagePrompt[];
  images?: ImageAsset[];
  csvDumps: CsvDump[];
  launchKit?: LaunchKit;
  modificationHistory: ModificationRecord[];
}

export interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
    changedTabs?: {id: string, label: string}[];
}

export interface SavedGameFile {
    history: GamePackage[];
    currentIndex: number;
}