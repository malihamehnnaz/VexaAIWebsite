"use client";

import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import { Bot, User, Loader2, X, Send, Sparkles, Zap, Building2, DollarSign, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getChatbotResponse } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { logFirestoreEvent, buildClientLogMeta } from '@/firebase/logging';
import { logChatMessage, logSupabaseEvent } from '@/lib/supabase-logger';
import { collection, serverTimestamp, query, orderBy, addDoc, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/common/language-provider';
import { siteCopy } from '@/lib/localization';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  quote?: {
    quoteId: string;
    currency: 'SEK';
    timeline: string;
    teamSize: string;
    cloudDeployment: string;
    apiCallVolume: string;
    subtotalSek: number;
    contingencySek: number;
    totalSek: number;
    priceRange?: string;
    confidence: 'high' | 'medium' | 'low';
    assumptions: string[];
    items: Array<{
      name: string;
      description: string;
      estimatedHours: number;
      rateSek: number;
      subtotalSek: number;
    }>;
    generatedAtIso: string;
  };
  timestamp?: unknown;
  sessionId?: string;
  userId?: string | null;
  pagePath?: string;
  route?: string;
  userAgent?: string | null;
  eventType?: string;
  source?: string;
};

type QuoteData = NonNullable<Message['quote']>;
type ChatHistoryTurn = Pick<Message, 'role' | 'content'>;

type BulletCard = {
  title: string;
  description: string;
};

type InitialCard = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelSv: string;
  description: string;
  descriptionSv: string;
  value: string;
  valueSv: string;
};

const INITIAL_CARDS: InitialCard[] = [
  {
    icon: Zap,
    label: 'Our Services',
    labelSv: 'Vara tjanster',
    description: 'AI, software, cloud & data',
    descriptionSv: 'AI, mjukvara, moln och data',
    value: 'Tell me about your services',
    valueSv: 'Beratta om era tjanster',
  },
  {
    icon: Building2,
    label: 'About Vexa AI',
    labelSv: 'Om Vexa AI',
    description: 'Who we are & what we do',
    descriptionSv: 'Vilka vi ar och vad vi gor',
    value: 'Tell me about Vexa AI',
    valueSv: 'Beratta om Vexa AI',
  },
  {
    icon: DollarSign,
    label: 'Get an Estimate',
    labelSv: 'Fa en uppskattning',
    description: 'Scoping & project pricing',
    descriptionSv: 'Projektomfang och prissattning',
    value: 'I want to get a project estimate',
    valueSv: 'Jag vill ha en projektuppskattning',
  },
  {
    icon: BookOpen,
    label: 'Case Studies',
    labelSv: 'Case-studier',
    description: 'Real results from clients',
    descriptionSv: 'Verkliga resultat fran kunder',
    value: 'Show me your case studies',
    valueSv: 'Visa era case-studier',
  },
];

type WizardStep = 'project_type' | 'team_size' | 'timeline' | null;

type WizardState = {
  step: WizardStep;
  projectType?: string;
  teamSize?: string;
  timeline?: string;
};

const WIZARD_CONFIG = {
  en: {
    triggers: new Set([
      'i want to get a project estimate',
      'i want an estimate',
      'get an estimate',
      'get estimate now',
      'i want a quote',
    ]),
    project_type: {
      q: 'What type of project are you looking for?',
      opts: ['AI Chatbot / Automation', 'Cloud Migration', 'Custom Software', 'Web / Mobile App', 'Data & Analytics', 'Other'],
    },
    team_size: {
      q: 'How many people will use or be affected by it?',
      opts: ['1–5 people', '6–20 people', '21–50 people', '50+ people'],
    },
    timeline: {
      q: "What's your preferred timeline?",
      opts: ['As soon as possible', '1–3 months', '3–6 months', '6+ months'],
    },
    preparing: 'Thanks! Preparing your estimate now...',
    errorMsg: 'I had trouble generating the estimate. Please try again.',
    buildPrompt: (projectType: string, teamSize: string, timeline: string) =>
      `Generate a project estimate with these confirmed details:\n- Project type: ${projectType}\n- People/team size: ${teamSize}\n- Timeline: ${timeline}\n\nAll required information is confirmed. Generate a complete <quote> block with line items immediately.`,
    defaultSuggestions: ['Download PDF', 'Contact the team', 'Refine scope', 'Start over'],
  },
  sv: {
    triggers: new Set([
      'jag vill ha en projektuppskattning',
      'jag vill ha en uppskattning',
      'fa en uppskattning',
      'fa offert nu',
      'jag vill ha offert',
    ]),
    project_type: {
      q: 'Vilken typ av projekt söker du?',
      opts: ['AI-chatbot / Automation', 'Molnmigrering', 'Specialutvecklad mjukvara', 'Webb / Mobilapp', 'Data & Analys', 'Annat'],
    },
    team_size: {
      q: 'Hur många personer kommer använda eller påverkas av det?',
      opts: ['1–5 personer', '6–20 personer', '21–50 personer', '50+ personer'],
    },
    timeline: {
      q: 'Vad är din önskade tidslinje?',
      opts: ['Så snart som möjligt', '1–3 månader', '3–6 månader', '6+ månader'],
    },
    preparing: 'Tack! Förbereder din uppskattning nu...',
    errorMsg: 'Jag hade problem att generera uppskattningen. Försök igen.',
    buildPrompt: (projectType: string, teamSize: string, timeline: string) =>
      `Generera en projektuppskattning med dessa bekräftade uppgifter:\n- Projekttyp: ${projectType}\n- Antal personer: ${teamSize}\n- Tidslinje: ${timeline}\n\nAll nödvändig information är bekräftad. Generera ett fullständigt <quote>-block med poster direkt.`,
    defaultSuggestions: ['Ladda ner PDF', 'Kontakta teamet', 'Ändra omfång', 'Börja om'],
  },
};

// ── Local estimate generator (no AI required) ────────────────────────────────

const ESTIMATE_CATALOG = {
  'AI Chatbot / Automation': {
    rangeLow: 5000, rangeHigh: 60000,
    items: [
      { name: 'Discovery & Requirements', weight: 0.12 },
      { name: 'AI Model Integration & Training', weight: 0.28 },
      { name: 'Backend & API Development', weight: 0.22 },
      { name: 'Frontend / UI Implementation', weight: 0.18 },
      { name: 'Testing & Quality Assurance', weight: 0.10 },
      { name: 'Deployment & Documentation', weight: 0.10 },
    ],
    assumptions: [
      'Assumes cloud-hosted deployment (Azure / AWS / GCP)',
      'Third-party AI API costs not included',
      'Standard integrations with existing systems',
    ],
  },
  'Cloud Migration': {
    rangeLow: 10000, rangeHigh: 40000,
    items: [
      { name: 'Cloud Architecture Design', weight: 0.15 },
      { name: 'Environment Setup & Configuration', weight: 0.20 },
      { name: 'Data Migration & Validation', weight: 0.25 },
      { name: 'Application Migration', weight: 0.25 },
      { name: 'Security Testing & Validation', weight: 0.10 },
      { name: 'Training & Handover', weight: 0.05 },
    ],
    assumptions: [
      'Migration to a single cloud provider',
      'Cloud infrastructure running costs not included',
      'Existing on-premise data is accessible and documented',
    ],
  },
  'Custom Software': {
    rangeLow: 5000, rangeHigh: 100000,
    items: [
      { name: 'Discovery & UX Design', weight: 0.12 },
      { name: 'Backend Development', weight: 0.28 },
      { name: 'Frontend Development', weight: 0.22 },
      { name: 'Database Design & Integrations', weight: 0.15 },
      { name: 'Testing & Quality Assurance', weight: 0.13 },
      { name: 'Deployment & Launch Support', weight: 0.10 },
    ],
    assumptions: [
      'Covers core feature set as scoped',
      'Third-party service subscriptions not included',
      'Client provides timely feedback and approvals',
    ],
  },
  'Web / Mobile App': {
    rangeLow: 5000, rangeHigh: 100000,
    items: [
      { name: 'UX / UI Design', weight: 0.18 },
      { name: 'Frontend Development', weight: 0.28 },
      { name: 'Backend & API Development', weight: 0.25 },
      { name: 'Database Design', weight: 0.10 },
      { name: 'Testing & QA', weight: 0.12 },
      { name: 'Deployment & App Store Submission', weight: 0.07 },
    ],
    assumptions: [
      'Covers MVP feature set',
      'App store fees not included',
      'Branding / design assets provided or scoped separately',
    ],
  },
  'Data & Analytics': {
    rangeLow: 5000, rangeHigh: 40000,
    items: [
      { name: 'Data Audit & Strategy', weight: 0.15 },
      { name: 'Data Pipeline Development', weight: 0.28 },
      { name: 'Dashboard & Reporting', weight: 0.28 },
      { name: 'Data Quality & Validation', weight: 0.15 },
      { name: 'Training & Documentation', weight: 0.14 },
    ],
    assumptions: [
      'Assumes access to existing data sources',
      'BI tool licensing costs not included',
      'Standard integrations with existing databases',
    ],
  },
  'Other': {
    rangeLow: 5000, rangeHigh: 50000,
    items: [
      { name: 'Discovery & Planning', weight: 0.20 },
      { name: 'Development & Implementation', weight: 0.50 },
      { name: 'Testing & Quality Assurance', weight: 0.15 },
      { name: 'Deployment & Training', weight: 0.15 },
    ],
    assumptions: [
      'Based on typical project scope',
      'Final pricing subject to detailed requirements',
      'Scope can be refined after initial discovery session',
    ],
  },
} as const;

// Position along the price range per team-size band (0 = low end, 1 = high end)
const TEAM_SIZE_POSITIONS: Record<string, number> = {
  '1–5 people': 0.15, '6–20 people': 0.35, '21–50 people': 0.60, '50+ people': 0.80,
  '1–5 personer': 0.15, '6–20 personer': 0.35, '21–50 personer': 0.60, '50+ personer': 0.80,
};

const PROJECT_TYPE_MAP: Record<string, keyof typeof ESTIMATE_CATALOG> = {
  'ai chatbot / automation': 'AI Chatbot / Automation',
  'ai-chatbot / automation': 'AI Chatbot / Automation',
  'cloud migration': 'Cloud Migration',
  'molnmigrering': 'Cloud Migration',
  'custom software': 'Custom Software',
  'specialutvecklad mjukvara': 'Custom Software',
  'web / mobile app': 'Web / Mobile App',
  'webb / mobilapp': 'Web / Mobile App',
  'data & analytics': 'Data & Analytics',
  'data & analys': 'Data & Analytics',
  'other': 'Other',
  'annat': 'Other',
};

const generateLocalEstimate = (projectType: string, teamSize: string, timeline: string): QuoteData => {
  const catalogKey = PROJECT_TYPE_MAP[projectType.toLowerCase()] ?? 'Other';
  const catalog = ESTIMATE_CATALOG[catalogKey];
  const position = TEAM_SIZE_POSITIONS[teamSize] ?? 0.35;

  // Position along range then apply 2/3 scale (matching server-side adjustQuoteForLowerRange)
  const reference = Math.round(
    (catalog.rangeLow + position * (catalog.rangeHigh - catalog.rangeLow)) * (2 / 3) / 100
  ) * 100;

  const items = (catalog.items as readonly { name: string; weight: number }[]).map(({ name, weight }) => ({
    name,
    description: '',
    estimatedHours: 0,
    rateSek: 0,
    subtotalSek: Math.round(reference * weight / 100) * 100,
  }));

  const subtotalSek = items.reduce((sum, item) => sum + item.subtotalSek, 0);
  const contingencySek = Math.round(subtotalSek * 0.1 / 500) * 500;
  const totalSek = subtotalSek + contingencySek;
  const low = Math.round(totalSek * 0.85 / 500) * 500;
  const high = Math.round(totalSek * 1.15 / 500) * 500;

  return {
    quoteId: `VXA-${Date.now().toString().slice(-8)}`,
    currency: 'SEK',
    timeline,
    teamSize,
    cloudDeployment: 'TBD',
    apiCallVolume: 'N/A',
    subtotalSek,
    contingencySek,
    totalSek,
    priceRange: `${low.toLocaleString('sv-SE')}–${high.toLocaleString('sv-SE')} SEK`,
    confidence: 'medium',
    assumptions: [
      ...(catalog.assumptions as readonly string[]),
      'Estimate based on standard scope — refine after detailed requirements session',
    ],
    items,
    generatedAtIso: new Date().toISOString(),
  };
};

const parseBulletCards = (content: string): {
  intro: string;
  cards: BulletCard[];
  outro: string;
} => {
  const segments = content
    .split('•')
    .map(segment => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return { intro: content.trim(), cards: [], outro: '' };
  }

  const cards: BulletCard[] = [];
  const nonCardSegments: string[] = [];

  for (const segment of segments) {
    const dashMatch = segment.match(/^(.*?)\s+[–-]\s+(.*)$/);
    if (dashMatch) {
      cards.push({
        title: dashMatch[1].trim(),
        description: dashMatch[2].trim(),
      });
      continue;
    }

    nonCardSegments.push(segment);
  }

  // Only switch to card layout when we have a meaningful list.
  if (cards.length < 3) {
    return { intro: content.trim(), cards: [], outro: '' };
  }

  const intro = nonCardSegments.length > 0 ? nonCardSegments[0] : '';
  const outro = nonCardSegments.length > 1 ? nonCardSegments.slice(1).join(' ') : '';
  return { intro, cards, outro };
};

// ── localStorage persistence ────────────────────────────────────────────────

const CHAT_STORAGE_KEY = 'vexa_chat_v1';
const CHAT_TTL_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

type StoredChat = {
  messages: Omit<Message, 'timestamp'>[];
  quote: QuoteData | null;
  savedAt: number;
};

function loadStoredChat(): StoredChat | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredChat;
    if (Date.now() - stored.savedAt > CHAT_TTL_MS) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

function saveStoredChat(messages: Message[], quote: QuoteData | null): void {
  if (typeof window === 'undefined') return;
  try {
    // Strip non-serialisable Firestore timestamps before saving
    const clean = messages.map(({ timestamp: _ts, ...rest }) => rest);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages: clean, quote, savedAt: Date.now() } satisfies StoredChat));
  } catch {
    // Storage full or disabled — silently skip
  }
}

function clearStoredChat(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<string[]>([]);
  const [pendingNextQuestion, setPendingNextQuestion] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<ChatHistoryTurn[]>([]);
  const [pagePath, setPagePath] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const scrollDivRef = useRef<HTMLDivElement>(null);

  const [isClient, setIsClient] = useState(false);
  const [wizard, setWizard] = useState<WizardState>({ step: null });
  const [localLatestQuote, setLocalLatestQuote] = useState<QuoteData | null>(null);
  // Full Message objects for local display (includes quotes); separate from localHistory which is ChatHistoryTurn[] for AI calls
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { language } = useLanguage();
  const copy = siteCopy[language].chatbot;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPagePath(window.location.pathname);
    setUserAgent(window.navigator.userAgent);

    if (firestore) {
      logFirestoreEvent(firestore, 'traffic_events', {
        ...buildClientLogMeta(user?.id, window.location.pathname, 'chat_page_view', window.navigator.userAgent),
        eventType: 'page_view',
        source: 'chatbot',
      });
    }

    logSupabaseEvent('traffic_events', {
      sessionId: user?.id ?? null,
      eventType: 'page_view',
      source: 'chatbot',
      pagePath: window.location.pathname,
      route: 'chat_page_view',
      userAgent: window.navigator.userAgent,
    });
  }, [firestore, user?.id]);

  const messagesRef = useMemoFirebase(() => {
    if (!firestore || !user || !isClient) return null;
    return collection(firestore, `users/${user.id}/chat_messages`);
  }, [firestore, user, isClient]);

  const messagesQuery = useMemoFirebase(() => {
    if (!messagesRef) return null;
    return query(messagesRef, orderBy('timestamp', 'asc'));
  }, [messagesRef]);

  const { data: messages, isLoading: isHistoryLoading } = useCollection<Message>(messagesQuery);

  // Restore chat from localStorage on client mount (runs once)
  useEffect(() => {
    if (!isClient) return;
    const stored = loadStoredChat();
    if (stored && stored.messages.length > 0) {
      setDisplayMessages(stored.messages as Message[]);
      setLocalHistory(stored.messages.map(m => ({ role: m.role, content: m.content })).slice(-20));
      if (stored.quote) setLocalLatestQuote(stored.quote);
    }
  }, [isClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync Firestore messages → local state when localStorage is empty (e.g. existing user, cleared storage)
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    if (displayMessages.length > 0) return; // local storage already populated
    setDisplayMessages(messages.slice(-20));
    setLocalHistory(messages.map(m => ({ role: m.role, content: m.content })).slice(-20));
    const lastWithQuote = [...messages].reverse().find(m => m.role === 'assistant' && m.quote);
    if (lastWithQuote?.quote) setLocalLatestQuote(lastWithQuote.quote as QuoteData);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage whenever messages or quote change
  useEffect(() => {
    if (!isClient) return;
    if (displayMessages.length > 0 || localLatestQuote) {
      saveStoredChat(displayMessages, localLatestQuote);
    }
  }, [isClient, displayMessages, localLatestQuote]);
  
  useEffect(() => {
    if (!user && !isUserLoading && auth && isClient) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth, isClient]);

  const scrollToBottom = () => {
    if (scrollDivRef.current) {
      scrollDivRef.current.scrollTo({
        top: scrollDivRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, isAiLoading, pendingSuggestions, pendingNextQuestion]);

  const splitTrailingQuestion = (answer: string) => {
    const match = answer.match(/(?:\n|^)([^?\n]{8,}\?)\s*$/);
    if (!match) return { body: answer.trim(), nextQuestion: undefined };

    const question = match[1].trim();
    const body = answer.slice(0, answer.lastIndexOf(match[1])).trim();

    if (!body) return { body: answer.trim(), nextQuestion: undefined };
    return { body, nextQuestion: question };
  };

  const getLocalFallbackResponse = (message: string): {
    answer: string;
    quote?: QuoteData;
    suggestions?: string[];
    nextQuestion?: string;
  } => {
    const normalized = message.trim().toLowerCase();
    const isGreeting = /^(hi|hello|hey|hej|tja|god morgon|good morning)\b/.test(normalized);
    const isEstimateIntent = /(estimate|quote|pricing|cost|price|offert|uppskattning|pris)/.test(normalized);

    if (isGreeting) {
      return language === 'sv'
        ? {
            answer: 'Hej! Jag kan hjalpa dig med Vexa AI:s tjanster, losningar och projektuppskattningar.',
            suggestions: ['Beratta om era tjanster', 'Jag vill ha en uppskattning', 'Visa case-studier'],
            nextQuestion: 'Vad vill du bygga?'
          }
        : {
            answer: 'Hi! I can help with Vexa AI services, solutions, and project estimates.',
            suggestions: ['Tell me about your services', 'I want an estimate', 'Show case studies'],
            nextQuestion: 'What are you planning to build?'
          };
    }

    if (isEstimateIntent) {
      return language === 'sv'
        ? {
            answer: 'Jag kan ge en snabb preliminar uppskattning. Dela mal, tidslinje och omfang sa tar vi fram den direkt.',
            suggestions: ['Get estimate now', 'Share more details first'],
            nextQuestion: 'Vill du ha uppskattningen nu eller dela mer detaljer?'
          }
        : {
            answer: 'I can provide a quick preliminary estimate. Share your goal, timeline, and scope and I will generate it right away.',
            suggestions: ['Get estimate now', 'Share more details first'],
            nextQuestion: 'Do you want the estimate now or to share more details first?'
          };
    }

    return language === 'sv'
      ? {
          answer: 'Jag har tillfalliga anslutningsproblem, men jag kan fortfarande hjalpa med Vexa AI-fragor om tjanster, case och uppskattningar.',
          suggestions: ['Beratta om era tjanster', 'Jag vill ha en uppskattning', 'Kontaktinfo'],
          nextQuestion: 'Vad vill du att jag hjalper dig med?'
        }
      : {
          answer: 'I am having a temporary connection issue, but I can still help with Vexa AI topics like services, case studies, and estimates.',
          suggestions: ['Tell me about your services', 'I want an estimate', 'Contact info'],
          nextQuestion: 'What would you like help with?'
        };
  };

  const getDefaultSuggestions = () =>
    language === 'sv'
      ? [
          'Beratta om era tjanster',
          'Visa case-studier',
          'Jag vill ha en uppskattning',
          'Kontaktinfo',
        ]
      : [
          'Tell me about your services',
          'Show case studies',
          'I want an estimate',
          'Contact info',
        ];

  const getResponseWithRetry = async (
    message: string,
    history: ChatHistoryTurn[],
    retries = 1
  ): Promise<{
    answer: string;
    quote?: QuoteData;
    suggestions?: string[];
    nextQuestion?: string;
  }> => {
    try {
      return await getChatbotResponse({ question: message, language, history });
    } catch (error) {
      if (retries <= 0) {
        return getLocalFallbackResponse(message);
      }

      await new Promise(resolve => setTimeout(resolve, 900));
      return getResponseWithRetry(message, history, retries - 1);
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const userTurn: ChatHistoryTurn = { role: 'user', content: message };
    const historyForRequest = [...localHistory, userTurn].slice(-20);
    setLocalHistory(historyForRequest);

    setPendingSuggestions([]);
    setPendingNextQuestion(null);

    const sessionId = user?.id ?? `guest-${Date.now().toString().slice(-8)}`;
    const messageMetadata = {
      sessionId,
      userId: user?.id ?? null,
      pagePath: pagePath || '/chat',
      route: 'chatbot_message',
      userAgent: userAgent || null,
      eventType: 'chat_message',
      source: 'chatbot',
    };

    // Helper: persist an assistant message to Firestore + Supabase + both history states without calling AI
    const pushBotMessage = async (content: string, quote?: QuoteData) => {
      const botMsg: Message = {
        role: 'assistant',
        content,
        ...(quote ? { quote } : {}),
        timestamp: serverTimestamp(),
        ...messageMetadata,
      };
      if (messagesRef) await addDoc(messagesRef, botMsg);
      logChatMessage({
        sessionId,
        role: 'assistant',
        content,
        quote: quote ?? undefined,
        pagePath: pagePath || '/chat',
        route: 'chatbot_message',
        source: 'chatbot',
        language,
        userAgent: userAgent || undefined,
      });
      setLocalHistory(prev => [...prev, { role: 'assistant' as const, content }].slice(-20));
      setDisplayMessages(prev => [...prev, botMsg].slice(-20));
    };

    try {
      if (firestore && user) {
        const userDocRef = doc(firestore, 'users', user.id);
        await setDoc(userDocRef, { uid: user.id, updatedAt: serverTimestamp() }, { merge: true });
      }
      const userMsg: Message = { role: 'user', content: message, timestamp: serverTimestamp(), ...messageMetadata };
      if (messagesRef) await addDoc(messagesRef, userMsg);
      logChatMessage({
        sessionId,
        role: 'user',
        content: message,
        pagePath: pagePath || '/chat',
        route: 'chatbot_message',
        source: 'chatbot',
        language,
        userAgent: userAgent || undefined,
      });
      setDisplayMessages(prev => [...prev, userMsg].slice(-20));

      const cfg = WIZARD_CONFIG[language];

      // ── WIZARD: active step ──────────────────────────────────────────────────
      if (wizard.step === 'project_type') {
        setWizard(prev => ({ ...prev, projectType: message, step: 'team_size' }));
        setPendingSuggestions(cfg.team_size.opts as string[]);
        await pushBotMessage(cfg.team_size.q);
        return;
      }

      if (wizard.step === 'team_size') {
        setWizard(prev => ({ ...prev, teamSize: message, step: 'timeline' }));
        setPendingSuggestions(cfg.timeline.opts as string[]);
        await pushBotMessage(cfg.timeline.q);
        return;
      }

      if (wizard.step === 'timeline') {
        const { projectType, teamSize } = wizard;
        setWizard({ step: null });

        const quote = generateLocalEstimate(projectType!, teamSize!, message);
        setLocalLatestQuote(quote);

        const intro = language === 'sv'
          ? `Här är din preliminära uppskattning för ${projectType} för ${teamSize} med ${message} tidslinje.`
          : `Here's your preliminary estimate for ${projectType} for ${teamSize} over ${message}.`;

        await pushBotMessage(intro, quote);
        setPendingSuggestions(cfg.defaultSuggestions as string[]);
        return;
      }

      // ── WIZARD: trigger ──────────────────────────────────────────────────────
      if (cfg.triggers.has(message.trim().toLowerCase())) {
        setWizard({ step: 'project_type' });
        setPendingSuggestions(cfg.project_type.opts as string[]);
        await pushBotMessage(cfg.project_type.q);
        return;
      }

      // ── NORMAL AI FLOW ───────────────────────────────────────────────────────
      setIsAiLoading(true);

      const response = await getResponseWithRetry(message, historyForRequest, 1);
      const split = splitTrailingQuestion(response.answer);
      const assistantMessage: Message = {
        role: 'assistant',
        content: split.body,
        ...(response.quote ? { quote: response.quote } : {}),
        timestamp: serverTimestamp(),
        ...messageMetadata,
      };

      if (messagesRef) {
        await addDoc(messagesRef, assistantMessage);
      }

      logChatMessage({
        sessionId,
        role: 'assistant',
        content: split.body,
        quote: response.quote ?? undefined,
        pagePath: pagePath || '/chat',
        route: 'chatbot_message',
        source: 'chatbot',
        language,
        userAgent: userAgent || undefined,
      });

      if (firestore) {
        await logFirestoreEvent(firestore, 'agent_logs', {
          ...buildClientLogMeta(user?.id, pagePath || '/chat', 'chat_response', userAgent || 'unknown', sessionId),
          eventType: 'chat_response',
          source: 'chatbot',
          language,
          prompt: message,
          response: split.body,
          quote: response.quote ?? null,
        });
      }

      logSupabaseEvent('agent_logs', {
        sessionId,
        eventType: 'chat_response',
        source: 'chatbot',
        pagePath: pagePath || '/chat',
        route: 'chat_response',
        language,
        prompt: message,
        response: split.body,
        quote: response.quote ?? undefined,
        userAgent: userAgent || undefined,
      });

      if (response.quote) setLocalLatestQuote(response.quote as QuoteData);

      const assistantTurn: ChatHistoryTurn = { role: 'assistant', content: split.body };
      setLocalHistory(prev => [...prev, assistantTurn].slice(-20));
      const assistantDisplayMsg: Message = {
        role: 'assistant',
        content: split.body,
        ...(response.quote ? { quote: response.quote } : {}),
        timestamp: serverTimestamp(),
        ...messageMetadata,
      };
      setDisplayMessages(prev => [...prev, assistantDisplayMsg].slice(-20));

      const nextQuestion = response.nextQuestion?.trim() || split.nextQuestion;
      if (nextQuestion) {
        setPendingNextQuestion(nextQuestion);
      }

      setPendingSuggestions(
        response.suggestions?.length
          ? response.suggestions.slice(0, 5)
          : getDefaultSuggestions()
      );
    } catch (error) {
      console.error('Error getting chatbot response:', error);
      const fallbackText = language === 'sv'
        ? 'Jag har tillfalliga problem just nu. Forsok igen om en stund.'
        : 'I am having a temporary issue right now. Please try again shortly.';

      if (messagesRef) {
        await addDoc(messagesRef, {
          role: 'assistant',
          content: fallbackText,
          timestamp: serverTimestamp(),
          ...messageMetadata,
          eventType: 'chat_error',
        });
      }

      logChatMessage({
        sessionId,
        role: 'assistant',
        content: fallbackText,
        pagePath: pagePath || '/chat',
        route: 'chatbot_message',
        eventType: 'chat_error',
        source: 'chatbot',
        language,
        userAgent: userAgent || undefined,
      });

      if (firestore) {
        await logFirestoreEvent(firestore, 'agent_logs', {
          ...buildClientLogMeta(user?.id, pagePath || '/chat', 'chat_error', userAgent || 'unknown', sessionId),
          eventType: 'chat_error',
          source: 'chatbot',
          message: (error as Error)?.message ?? 'Chatbot error',
          prompt: message,
        });
      }

      logSupabaseEvent('error_logs', {
        sessionId,
        eventType: 'chat_error',
        source: 'chatbot',
        pagePath: pagePath || '/chat',
        route: 'chat_error',
        message: (error as Error)?.message ?? 'Chatbot error',
        details: { prompt: message },
        userAgent: userAgent || undefined,
      });

      setLocalHistory(prev => [...prev, { role: 'assistant' as const, content: fallbackText }].slice(-20));
      setDisplayMessages(prev => [...prev, { role: 'assistant' as const, content: fallbackText, timestamp: serverTimestamp(), ...messageMetadata }].slice(-20));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend(input);
    setInput('');
  };

  // displayMessages is the source of truth for display; fall back to Firestore only when both are empty
  const chatContent: Array<Message | ChatHistoryTurn> = displayMessages.length > 0 ? displayMessages : (messages ?? []);
  const initialMessage: Message[] = [{ role: 'assistant', content: copy.initialMessage }];

  // Show download button only when the most recent bot message contains a quote
  const latestQuote = useMemo(() => {
    for (let i = displayMessages.length - 1; i >= 0; i--) {
      const msg = displayMessages[i];
      if (msg.role === 'assistant') {
        return (msg as Message).quote ?? null;
      }
    }
    return null;
  }, [displayMessages]);

  const formatSekForPdf = (value: number) =>
    new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const openQuotePrintView = (quote: QuoteData) => {
    const quoteDate = new Date(quote.generatedAtIso);
    const dateText = Number.isNaN(quoteDate.getTime())
      ? quote.generatedAtIso
      : quoteDate.toLocaleString(language === 'sv' ? 'sv-SE' : 'en-GB');
    const dateInputValue = Number.isNaN(quoteDate.getTime())
      ? ''
      : quoteDate.toISOString().slice(0, 10);
    const validUntil = Number.isNaN(quoteDate.getTime())
      ? null
      : new Date(quoteDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const validUntilValue = validUntil ? validUntil.toISOString().slice(0, 10) : '';

    const assumptionsBlock = quote.assumptions.length
      ? `<ul>${quote.assumptions.map(assumption => `<li>${escapeHtml(assumption)}</li>`).join('')}</ul>`
      : '<p>No assumptions provided.</p>';

    const itemsBlock = quote.items
      .map(
        item => `
          <div class="li">
            <div class="dcol">
              <div class="dname">${escapeHtml(item.name)}</div>
              <div class="ddesc">${escapeHtml(item.description || '-')}</div>
            </div>
            <div class="amt">${formatSekForPdf(item.subtotalSek)} SEK</div>
          </div>`
      )
      .join('');

    const vatSek = 0;

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(quote.quoteId)} - Vexa AI Estimate</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { background: #f4f7fb; font-family: "Segoe UI", Arial, sans-serif; color: #e8e8e8; margin: 0; padding: 16px; }
      .wrap { max-width: 680px; margin: 0 auto; }
      .card { background: #0d1b2a; border-radius: 14px; overflow: hidden; }
      .hbar { background: #0a1520; padding: 20px 28px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #1a2e42; }
      .co { display: flex; align-items: center; gap: 12px; }
      .lc { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #00c9b1, #7b2fbe); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cn { color: #e8e8e8; font-size: 18px; font-weight: 600; margin: 0 0 2px; }
      .ct { color: #7f93a8; font-size: 11px; }
      .rl { text-align: right; }
      .rt { color: #00d4ff; font-size: 24px; font-weight: 600; margin: 0 0 6px; letter-spacing: 3px; }
      .rm { color: #8aa0b4; font-size: 11px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
      .rm div { min-width: 210px; text-align: right; }
      .body { padding: 24px 28px; }
      .from-box { background: #111f2e; border-radius: 10px; padding: 12px 14px; margin-bottom: 20px; border-left: 3px solid #00c9b1; }
      .fl { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #00c9b1; margin-bottom: 6px; }
      .from-box p { font-size: 12px; color: #93a6b8; line-height: 1.7; }
      .from-box p.nm { color: #e8e8e8; font-size: 13px; font-weight: 600; margin-bottom: 2px; }
      .scope { margin: 0 0 16px; padding: 12px 14px; border: 1px solid #1a2e42; border-radius: 10px; background: #0f1d2b; }
      .scope p { font-size: 12px; color: #a9bac9; line-height: 1.7; }
      .scope p strong { color: #e8e8e8; }
      .th { display: grid; grid-template-columns: 1fr 100px; gap: 8px; padding: 7px 12px; background: #111f2e; border-radius: 10px; margin-bottom: 4px; }
      .th span { font-size: 10px; font-weight: 600; color: #00c9b1; text-transform: uppercase; letter-spacing: 0.8px; }
      .th span:not(:first-child) { text-align: right; }
      .li { display: grid; grid-template-columns: 1fr 100px; gap: 8px; padding: 9px 12px; border-bottom: 1px solid #1a2e42; align-items: center; }
      .li:last-child { border-bottom: none; }
      .dname { color: #e8e8e8; font-size: 13px; font-weight: 500; }
      .ddesc { color: #8299ad; font-size: 11px; margin-top: 2px; }
      .amt { color: #e8e8e8; font-size: 13px; text-align: right; }
      .total-block { margin-top: 20px; display: flex; justify-content: flex-end; }
      .tbox { width: 250px; background: #111f2e; border-radius: 10px; padding: 12px 14px; }
      .tr { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #1a2e42; }
      .tr:last-child { border-bottom: none; }
      .tr span { font-size: 12px; color: #96a8ba; }
      .tr b { font-size: 13px; color: #e8e8e8; font-weight: 600; }
      .tf { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: linear-gradient(135deg, #00c9b1 0%, #7b2fbe 100%); border-radius: 10px; margin-top: 10px; }
      .tf span { font-size: 13px; color: #fff; font-weight: 600; }
      .notice { margin-top: 20px; padding: 10px 14px; border: 1px solid #1a2e42; border-left: 3px solid #7b2fbe; border-radius: 10px; background: #111f2e; }
      .notice p { font-size: 11px; color: #9cb0c2; font-style: italic; line-height: 1.6; }
      .notice ul { margin-top: 8px; padding-left: 16px; }
      .notice li { font-size: 11px; color: #9cb0c2; margin: 4px 0; }
      .fbar { background: #0a1520; padding: 12px 28px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1a2e42; gap: 8px; }
      .fc { font-size: 11px; color: #6f8498; }
      .fc span { margin: 0 6px; color: #4f677c; }
      .print-btn { background: linear-gradient(135deg, #00c9b1, #7b2fbe); color: #fff; border: none; font-size: 12px; font-weight: 600; padding: 7px 16px; border-radius: 8px; cursor: pointer; }
      @media print {
        body { background: #0d1b2a; color: #e8e8e8; padding: 0; }
        .wrap { max-width: none; }
        .card { border-radius: 0; background: #0d1b2a; }
        .print-btn { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="hbar">
          <div class="co">
            <div class="lc">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="14" height="14" rx="2" stroke="#00D4FF" stroke-width="1.5"/>
                <rect x="7.5" y="7.5" width="7" height="7" rx="1" stroke="#00D4FF" stroke-width="1.2"/>
                <line x1="8" y1="4" x2="8" y2="2" stroke="#00D4FF" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="14" y1="4" x2="14" y2="2" stroke="#00D4FF" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="8" y1="18" x2="8" y2="20" stroke="#00D4FF" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="14" y1="18" x2="14" y2="20" stroke="#00D4FF" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="18" y1="8" x2="20" y2="8" stroke="#00D4FF" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="18" y1="14" x2="20" y2="14" stroke="#00D4FF" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="4" y1="8" x2="2" y2="8" stroke="#00D4FF" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="4" y1="14" x2="2" y2="14" stroke="#00D4FF" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <p class="cn">Vexa AI</p>
              <p class="ct">Intelligent Systems Studio</p>
            </div>
          </div>
          <div class="rl">
            <p class="rt">ESTIMATE</p>
            <div class="rm">
              <div>No: ${escapeHtml(quote.quoteId)}</div>
              <div>Date: ${escapeHtml(dateInputValue || dateText)}</div>
              <div>Valid until: ${escapeHtml(validUntilValue || '-')}</div>
            </div>
          </div>
        </div>

        <div class="body">
          <div class="from-box">
            <p class="fl">From</p>
            <p class="nm">Vexa AI</p>
            <p>Radhusesplanaden 6 F, 903 28 Umea, Sweden<br/>admin@vexaai.se · +46 735 777 459</p>
          </div>

          <div class="scope">
            <p><strong>Timeline:</strong> ${escapeHtml(quote.timeline)}</p>
            <p><strong>People covered:</strong> ${escapeHtml(quote.teamSize)}</p>
            <p><strong>Cloud deployment:</strong> ${escapeHtml(quote.cloudDeployment)}</p>
            <p><strong>API call volume:</strong> ${escapeHtml(quote.apiCallVolume)}</p>
            <p><strong>Confidence:</strong> ${escapeHtml(quote.confidence)}</p>
            ${quote.priceRange ? `<p><strong>Estimated total range:</strong> ${escapeHtml(quote.priceRange)}</p>` : ''}
          </div>

          <div class="th">
            <span>Description</span>
            <span>Amount</span>
          </div>

          <div id="items">
            ${itemsBlock}
          </div>

          <div class="total-block">
            <div class="tbox">
              <div class="tr"><span>Subtotal</span><b>${formatSekForPdf(quote.subtotalSek)} SEK</b></div>
              <div class="tr"><span>Tax / VAT</span><b>${formatSekForPdf(vatSek)} SEK</b></div>
              <div class="tr"><span>Contingency</span><b>${formatSekForPdf(quote.contingencySek)} SEK</b></div>
              ${quote.priceRange ? `<div class="tr"><span>Estimated total range</span><span>${escapeHtml(quote.priceRange)}</span></div>` : `<div class="tf"><span>Total</span><span>${formatSekForPdf(quote.totalSek)} SEK</span></div>`}
            </div>
          </div>

          <div class="notice">
            <p>This is an estimate only and is not a confirmed invoice. Prices may change after final scope agreement.</p>
            ${assumptionsBlock}
          </div>
        </div>

        <div class="fbar">
          <div class="fc">www.vexaai.se<span>·</span>admin@vexaai.se<span>·</span>+46 735 777 459</div>
          <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        </div>
      </div>
    </div>
  </body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank', 'width=900,height=700');
    if (!printWindow) {
      URL.revokeObjectURL(blobUrl);
      return;
    }
    printWindow.focus();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const normalized = suggestion.trim().toLowerCase();

    if (normalized === 'download pdf' || normalized === 'ladda ner pdf') {
      if (latestQuote) openQuotePrintView(latestQuote);
      return;
    }

    if (normalized === 'start over' || normalized === 'börja om' || normalized === 'borja om') {
      handleRestartChat();
      return;
    }

    handleSend(suggestion);
  };

  const handleRestartChat = async () => {
    setInput('');
    setPendingSuggestions([]);
    setPendingNextQuestion(null);
    setLocalHistory([]);
    setDisplayMessages([]);
    setWizard({ step: null });
    setLocalLatestQuote(null);
    clearStoredChat();

    if (!messagesRef || !firestore) {
      return;
    }

    try {
      const snapshot = await getDocs(messagesRef);
      if (snapshot.empty) return;

      const batch = writeBatch(firestore);
      snapshot.docs.forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to restart chat history', error);
    }
  };

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <Button onClick={() => setIsOpen(!isOpen)} className="w-16 h-16 rounded-full shadow-lg" size="icon">
          <AnimatePresence>
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }}>
                <X className="w-8 h-8" />
              </motion.div>
            ) : (
              <motion.div key="bot" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                <Bot className="w-8 h-8" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-24 left-3 right-3 z-50 md:bottom-28 md:left-auto md:right-8"
          >
            <Card className="h-[32rem] w-full max-w-[calc(100vw-1.5rem)] md:w-96 md:max-w-none flex flex-col shadow-2xl glass-card">
              <CardHeader className="shrink-0 py-3 px-4 text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {copy.title}
                </CardTitle>
                <CardDescription>{copy.description}</CardDescription>
                <div className="mt-2 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRestartChat}
                    disabled={isAiLoading}
                    className="h-8 px-3 text-xs"
                  >
                    {language === 'sv' ? 'Starta om chatten' : 'Restart chat'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-0">
                <div ref={scrollDivRef} className="h-full overflow-y-auto px-4 pb-2">
                  <div className="space-y-3 py-2">
                    {isHistoryLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="mx-auto my-4 h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        {initialMessage.map((msg, i) => <ChatMessage key={`initial-${i}`} message={msg} />)}
                        {chatContent.map((message, index) => (
                          <ChatMessage key={index} message={message} />
                        ))}
                        {localHistory.length === 0 && (
                          <div className="grid grid-cols-2 gap-2 pt-4">
                            {INITIAL_CARDS.map(card => (
                              <button
                                key={card.value}
                                onClick={() => handleSend(language === 'sv' ? card.valueSv : card.value)}
                                className="flex flex-col items-start gap-1 rounded-xl border border-border/60 bg-background/60 p-3 text-left text-xs hover:border-primary/50 hover:bg-primary/5 transition-all group"
                              >
                                <card.icon className="h-5 w-5 text-primary group-hover:text-primary/80 transition-colors" />
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {language === 'sv' ? card.labelSv : card.label}
                                </span>
                                <span className="text-muted-foreground leading-tight">
                                  {language === 'sv' ? card.descriptionSv : card.description}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {isAiLoading && <LoadingBubble />}
                    {!isAiLoading && pendingNextQuestion && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-primary/30 bg-primary/5 p-3"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-primary/80 font-semibold mb-1">
                          {language === 'sv' ? 'Nasta fraga' : 'Next question'}
                        </p>
                        <p className="text-sm text-foreground break-words">{pendingNextQuestion}</p>
                      </motion.div>
                    )}
                    {!isAiLoading && pendingSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {pendingSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground/80 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                    {!isAiLoading && latestQuote && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => openQuotePrintView(latestQuote)}>
                          Download PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={copy.placeholder}
                    disabled={isAiLoading}
                    className="bg-background/50"
                  />
                  <Button type="submit" disabled={isAiLoading} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  const parsed = !isUser ? parseBulletCards(message.content) : null;
  const hasHorizontalCards = Boolean(parsed && parsed.cards.length >= 3);
  const hasQuote = Boolean(!isUser && message.quote);

  const formatSek = (value: number) =>
    new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <Avatar className="h-7 w-7 shrink-0 bg-secondary">
          <AvatarFallback><Bot className="h-4 w-4 text-secondary-foreground" /></AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'rounded-2xl px-3 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        )}
        style={{ maxWidth: hasHorizontalCards ? 'calc(100% - 2.25rem)' : '78%' }}
      >
        {hasQuote && message.quote && (
          <div className="mb-3 rounded-xl border border-primary/20 bg-background/70 p-3">
            <p className="text-[11px] uppercase tracking-wide text-primary/80 font-semibold">Preliminary Estimate</p>
            <p className="mt-1 text-xs text-muted-foreground">{message.quote.quoteId}</p>
            {message.quote.priceRange && (
              <p className="mt-2 text-sm font-semibold text-foreground">Estimated total range: {message.quote.priceRange}</p>
            )}

            <div className="mt-3 space-y-1 text-xs">
              {message.quote.items.map((item) => (
                <div key={item.name} className="rounded-md border border-border/60 bg-background/80 p-2">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-muted-foreground">{item.estimatedHours}h × {item.rateSek} SEK/h = {formatSek(item.subtotalSek)} SEK</p>
                  {item.description && <p className="mt-1 text-muted-foreground">{item.description}</p>}
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1 border-t border-border/70 pt-2 text-xs">
              <p className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatSek(message.quote.subtotalSek)} SEK</span></p>
              <p className="flex justify-between"><span className="text-muted-foreground">Contingency</span><span>{formatSek(message.quote.contingencySek)} SEK</span></p>
              {message.quote.priceRange ? (
                <p className="flex justify-between font-semibold text-foreground"><span>Estimated total range</span><span>{message.quote.priceRange}</span></p>
              ) : (
                <p className="flex justify-between font-semibold text-foreground"><span>Total</span><span>{formatSek(message.quote.totalSek)} SEK</span></p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-muted-foreground">
              <p><span className="text-foreground">Timeline:</span> {message.quote.timeline}</p>
              <p><span className="text-foreground">People:</span> {message.quote.teamSize}</p>
              <p><span className="text-foreground">Cloud:</span> {message.quote.cloudDeployment}</p>
              <p><span className="text-foreground">API volume:</span> {message.quote.apiCallVolume}</p>
              <p><span className="text-foreground">Confidence:</span> {message.quote.confidence}</p>
            </div>
          </div>
        )}

        {hasHorizontalCards && parsed ? (
          <div className="space-y-2">
            {parsed.intro && <p className="break-words whitespace-pre-line">{parsed.intro}</p>}
            <div className="overflow-x-auto -mx-1 pb-1">
              <div className="flex gap-2 px-1 w-max">
                {parsed.cards.map(card => (
                  <div
                    key={card.title}
                    className="w-44 shrink-0 rounded-lg border border-border/60 bg-background/70 p-2.5"
                  >
                    <p className="font-semibold text-foreground text-xs leading-snug">{card.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
            {parsed.outro && <p className="break-words whitespace-pre-line">{parsed.outro}</p>}
          </div>
        ) : (
          <p className="break-words whitespace-pre-line">{message.content}</p>
        )}
      </div>
      {isUser && (
        <Avatar className="h-7 w-7 shrink-0 bg-primary">
          <AvatarFallback><User className="h-4 w-4 text-primary-foreground" /></AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
};

const LoadingBubble = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-end gap-2 justify-start"
  >
    <Avatar className="h-8 w-8 bg-secondary">
      <AvatarFallback><Bot className="h-5 w-5 text-secondary-foreground" /></AvatarFallback>
    </Avatar>
    <div className="max-w-xs rounded-lg px-4 py-2 bg-secondary">
      <Loader2 className="h-5 w-5 animate-spin text-secondary-foreground" />
    </div>
  </motion.div>
);
