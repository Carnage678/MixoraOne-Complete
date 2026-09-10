// ---------------------------------------------------------------------------
// Dashboard mock data. Every component consumes typed objects from this file
// so swapping to real API data later is a single-point change.
// ---------------------------------------------------------------------------

export interface DeveloperIdentity {
  name: string;
  title: string;
  bio: string;
  location: string;
  avatarUrl: string | null;
  availability: string[];
  skills: string[];
  connections: { provider: 'github' | 'linkedin'; connected: boolean }[];
  profileSlug: string;
  profileCompletion: number;
}

export interface ShowcaseProject {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  views: number;
  status: 'live' | 'draft' | 'archived';
  hasDemo: boolean;
  hasGithub: boolean;
  thumbnailColor: string;
}

export interface PerformanceMetric {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  sparkline: number[];
}

export interface Opportunity {
  id: string;
  company: string;
  role: string;
  note: string;
  status: 'new' | 'reviewing' | 'responded';
  avatarColor: string;
}

export interface AiSuggestion {
  id: string;
  text: string;
  type: 'profile' | 'project' | 'growth';
}

export interface ConnectedAccount {
  provider: 'github' | 'linkedin';
  connected: boolean;
  username?: string;
}

// ---------------------------------------------------------------------------
// Mock instances
// ---------------------------------------------------------------------------

export const MOCK_IDENTITY: DeveloperIdentity = {
  name: 'Abhishek Anand',
  title: 'Full Stack Developer · AI · SaaS',
  bio: 'Building intelligent software that solves real problems. Passionate about developer tools, AI integration, and clean architecture.',
  location: 'Bengaluru, India',
  avatarUrl: null,
  availability: ['Freelance', 'Full-time', 'Contract'],
  skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'PostgreSQL', 'AI/ML'],
  connections: [
    { provider: 'github', connected: true },
    { provider: 'linkedin', connected: true },
  ],
  profileSlug: 'abhishek-anand',
  profileCompletion: 82,
};

export const MOCK_PROJECTS: ShowcaseProject[] = [
  {
    id: 'proj-1',
    name: 'AI Analytics Platform',
    description:
      'An AI-powered analytics workspace that turns complex business data into actionable insights with natural language queries.',
    techStack: ['Next.js', 'TypeScript', 'Python', 'OpenAI'],
    views: 1284,
    status: 'live',
    hasDemo: true,
    hasGithub: true,
    thumbnailColor: 'from-brand-600/20 to-violet-600/20',
  },
  {
    id: 'proj-2',
    name: 'FinTrack',
    description:
      'Personal finance tracker with automated expense categorization and intelligent budgeting suggestions.',
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
    views: 856,
    status: 'live',
    hasDemo: true,
    hasGithub: false,
    thumbnailColor: 'from-emerald-600/20 to-cyan-600/20',
  },
  {
    id: 'proj-3',
    name: 'Developer Collaboration Hub',
    description:
      'Real-time collaborative development environment with integrated code review and project management.',
    techStack: ['Next.js', 'WebSocket', 'Redis', 'Docker'],
    views: 642,
    status: 'live',
    hasDemo: false,
    hasGithub: true,
    thumbnailColor: 'from-amber-600/20 to-orange-600/20',
  },
  {
    id: 'proj-4',
    name: 'Resume AI',
    description:
      'AI-powered resume builder that tailors your CV to specific job descriptions using GPT-4.',
    techStack: ['React', 'OpenAI', 'Tailwind', 'Vercel'],
    views: 2031,
    status: 'draft',
    hasDemo: false,
    hasGithub: true,
    thumbnailColor: 'from-rose-600/20 to-pink-600/20',
  },
];

export const MOCK_METRICS: PerformanceMetric[] = [
  {
    label: 'Profile views',
    value: '248',
    delta: '+12%',
    trend: 'up',
    sparkline: [20, 25, 22, 30, 28, 35, 40, 38, 42, 48, 45, 52],
  },
  {
    label: 'Project views',
    value: '1,420',
    delta: '+24%',
    trend: 'up',
    sparkline: [80, 95, 110, 105, 120, 140, 135, 150, 160, 155, 170, 180],
  },
  {
    label: 'Profile saves',
    value: '32',
    delta: '+8%',
    trend: 'up',
    sparkline: [2, 3, 2, 4, 3, 5, 4, 6, 5, 5, 7, 6],
  },
  {
    label: 'Hiring inquiries',
    value: '4',
    delta: '+2',
    trend: 'up',
    sparkline: [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  },
];

export const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-1',
    company: 'Acme Technologies',
    role: 'Full-stack Developer',
    note: 'Interested in your AI Analytics Platform project.',
    status: 'new',
    avatarColor: 'bg-brand-600',
  },
  {
    id: 'opp-2',
    company: 'Nova Labs',
    role: 'AI / Backend Engineer',
    note: 'Looking for someone to lead their ML infrastructure.',
    status: 'reviewing',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'opp-3',
    company: 'Stealth Startup',
    role: 'Founding Engineer',
    note: 'Series A fintech company — impressed by FinTrack.',
    status: 'new',
    avatarColor: 'bg-violet-600',
  },
];

export const MOCK_AI_SUGGESTIONS: AiSuggestion[] = [
  {
    id: 'ai-1',
    text: 'Your latest project could perform better with a stronger description and clearer demo screenshots.',
    type: 'project',
  },
  {
    id: 'ai-2',
    text: 'Your profile is missing 2 important skills that match trending job posts.',
    type: 'profile',
  },
  {
    id: 'ai-3',
    text: 'Sharing your AI Analytics Platform on LinkedIn could increase profile views by ~30%.',
    type: 'growth',
  },
];

export const MOCK_CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  { provider: 'github', connected: true, username: 'abhishekanand16' },
  { provider: 'linkedin', connected: true, username: 'abhishek-anand' },
];
