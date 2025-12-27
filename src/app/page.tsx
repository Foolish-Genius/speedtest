"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { SpeedLabLogo } from "@/components/Logo";

// Core data types
type SpeedResult = {
  id: string;
  timestamp: number;
  download: number;
  upload: number;
  ping: number;
  networkType?: NetworkType;
  location?: string;
  serverId?: string;
  serverName?: string;
  dnsLookupTime?: number;
  stats?: {
    downloadStats: DetailedStats;
    uploadStats: DetailedStats;
    pingStats: DetailedStats;
    jitter: number;
    stabilityScore: number;
    grade: string;
    trendSlope: number;
  };
};

type NetworkType = "wifi" | "ethernet" | "mobile" | "unknown";
type TestProfile = "quick" | "standard" | "extended";

// Test server configuration
type TestServer = {
  id: string;
  name: string;
  location: string;
  region: string;
  latency?: number;
};

const TEST_SERVERS: TestServer[] = [
  { id: 'auto', name: 'Auto Select', location: 'Nearest', region: 'auto' },
  { id: 'us-east', name: 'US East', location: 'New York', region: 'NA' },
  { id: 'us-west', name: 'US West', location: 'Los Angeles', region: 'NA' },
  { id: 'eu-west', name: 'EU West', location: 'London', region: 'EU' },
  { id: 'eu-central', name: 'EU Central', location: 'Frankfurt', region: 'EU' },
  { id: 'asia-east', name: 'Asia East', location: 'Tokyo', region: 'APAC' },
  { id: 'asia-south', name: 'Asia South', location: 'Singapore', region: 'APAC' },
];

type DetailedStats = {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p95: number;
  p99: number;
};

// Achievement system types
type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (history: SpeedResult[]) => boolean;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
};

// Achievement definitions
const ACHIEVEMENTS: Achievement[] = [
  // Speed milestones
  { id: 'speed_demon', name: 'Speed Demon', description: 'Reach 500+ Mbps download', icon: '🚀', tier: 'gold', condition: (h) => h.some(r => r.download >= 500) },
  { id: 'century_club', name: 'Century Club', description: 'Reach 100+ Mbps download', icon: '💯', tier: 'bronze', condition: (h) => h.some(r => r.download >= 100) },
  { id: 'gigabit_glory', name: 'Gigabit Glory', description: 'Reach 1000+ Mbps download', icon: '⚡', tier: 'platinum', condition: (h) => h.some(r => r.download >= 1000) },
  
  // Consistency achievements
  { id: 'stable_connection', name: 'Stable Connection', description: 'Get 90%+ stability score', icon: '📊', tier: 'silver', condition: (h) => h.some(r => (r.stats?.stabilityScore || 0) >= 90) },
  { id: 'rock_solid', name: 'Rock Solid', description: 'Get 95%+ stability 3 times', icon: '🪨', tier: 'gold', condition: (h) => h.filter(r => (r.stats?.stabilityScore || 0) >= 95).length >= 3 },
  
  // Ping achievements
  { id: 'quick_reflexes', name: 'Quick Reflexes', description: 'Get ping under 10ms', icon: '⚡', tier: 'gold', condition: (h) => h.some(r => r.ping < 10) },
  { id: 'low_latency', name: 'Low Latency', description: 'Get ping under 20ms', icon: '🎯', tier: 'silver', condition: (h) => h.some(r => r.ping < 20) },
  { id: 'gaming_ready', name: 'Gaming Ready', description: 'Jitter under 5ms', icon: '🎮', tier: 'silver', condition: (h) => h.some(r => (r.stats?.jitter || 999) < 5) },
  
  // Testing habits
  { id: 'first_test', name: 'First Steps', description: 'Complete your first test', icon: '🎉', tier: 'bronze', condition: (h) => h.length >= 1 },
  { id: 'dedicated_tester', name: 'Dedicated Tester', description: 'Complete 10 tests', icon: '🔬', tier: 'bronze', condition: (h) => h.length >= 10 },
  { id: 'data_collector', name: 'Data Collector', description: 'Complete 25 tests', icon: '📈', tier: 'silver', condition: (h) => h.length >= 25 },
  { id: 'speed_scientist', name: 'Speed Scientist', description: 'Complete 50 tests', icon: '🧪', tier: 'gold', condition: (h) => h.length >= 50 },
  
  // Grade achievements
  { id: 'honor_roll', name: 'Honor Roll', description: 'Get an A+ grade', icon: '🏆', tier: 'gold', condition: (h) => h.some(r => r.stats?.grade === 'A+') },
  { id: 'consistent_performer', name: 'Consistent Performer', description: 'Get 5 A grades in a row', icon: '⭐', tier: 'platinum', condition: (h) => {
    if (h.length < 5) return false;
    return h.slice(0, 5).every(r => r.stats?.grade?.startsWith('A'));
  }},
  
  // Network variety
  { id: 'network_explorer', name: 'Network Explorer', description: 'Test on WiFi, Ethernet & Mobile', icon: '🌐', tier: 'silver', condition: (h) => {
    const types = new Set(h.map(r => r.networkType).filter(Boolean));
    return types.has('wifi') && types.has('ethernet') && types.has('mobile');
  }},
  
  // Location achievements  
  { id: 'home_mapper', name: 'Home Mapper', description: 'Test from 3+ locations', icon: '🗺️', tier: 'silver', condition: (h) => {
    const locations = new Set(h.map(r => r.location).filter(Boolean));
    return locations.size >= 3;
  }},
];

// Theme color palette
const colors = {
  coral: "#ff7b6b",
  coralLight: "#ff9d91",
  rose: "#f4b8c5",
  roseLight: "#fad4dd",
  emerald: "#34d399",
  emeraldLight: "#6ee7b7",
  blue: "#60a5fa",
  amber: "#fbbf24",
};

const formatMbps = (value: number) => `${value.toFixed(1)} Mbps`;
const formatMs = (value: number) => `${value.toFixed(0)} ms`;
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// Comprehensive statistical analysis
const calculateDetailedStats = (values: number[]): DetailedStats => {
  if (!values.length) return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, p95: 0, p99: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Mean
  const mean = values.reduce((a, b) => a + b, 0) / n;
  
  // Median
  const mid = Math.floor(n / 2);
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  
  // Min and Max
  const min = sorted[0];
  const max = sorted[n - 1];
  
  // Standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Percentiles
  const p95Index = Math.ceil(n * 0.95) - 1;
  const p99Index = Math.ceil(n * 0.99) - 1;
  const p95 = sorted[p95Index];
  const p99 = sorted[p99Index];
  
  return { mean, median, min, max, stdDev, p95, p99 };
};

// Calculate jitter (variation in ping)
const calculateJitter = (pingValues: number[]): number => {
  if (pingValues.length < 2) return 0;
  let sumDiff = 0;
  for (let i = 1; i < pingValues.length; i++) {
    sumDiff += Math.abs(pingValues[i] - pingValues[i - 1]);
  }
  return sumDiff / (pingValues.length - 1);
};

// Calculate stability score (0-100, higher is better)
const calculateStabilityScore = (stats: DetailedStats): number => {
  // Lower coefficient of variation = more stable
  if (stats.mean === 0) return 0;
  const coefficientOfVariation = stats.stdDev / stats.mean;
  // Map CV to 0-100 scale (CV < 0.1 = excellent, CV > 0.5 = poor)
  const score = Math.max(0, Math.min(100, 100 - coefficientOfVariation * 200));
  return Math.round(score);
};

// Linear regression to detect trend (improving vs degrading)
const calculateTrendSlope = (values: number[]): number => {
  if (values.length < 2) return 0;
  const n = values.length;
  const xValues = values.map((_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (values[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
};

// Grade based on ISP expectations
const calculateGrade = (actual: number, expected: number, type: 'download' | 'upload' | 'ping'): string => {
  if (type === 'ping') {
    // Lower is better for ping
    if (actual <= expected * 0.5) return 'A+';
    if (actual <= expected * 0.75) return 'A';
    if (actual <= expected) return 'B';
    if (actual <= expected * 1.5) return 'C';
    if (actual <= expected * 2) return 'D';
    return 'F';
  } else {
    // Higher is better for download/upload
    if (actual >= expected * 1.2) return 'A+';
    if (actual >= expected) return 'A';
    if (actual >= expected * 0.8) return 'B';
    if (actual >= expected * 0.6) return 'C';
    if (actual >= expected * 0.4) return 'D';
    return 'F';
  }
};

const getConditionBadge = (grade: string): { label: string; color: string } => {
  if (grade.startsWith('A')) return { label: 'Excellent', color: '#10b981' };
  if (grade === 'B') return { label: 'Good', color: '#3b82f6' };
  if (grade === 'C') return { label: 'Fair', color: '#f59e0b' };
  if (grade === 'D') return { label: 'Poor', color: '#ef4444' };
  return { label: 'Very Poor', color: '#dc2626' };
};

// Circular gauge component for real-time metrics
const CircularGauge = ({ value, max, label, unit, color, size = 140 }: { value: number; max: number; label: string; unit: string; color: string; size?: number }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white dark:text-white">{value.toFixed(value >= 100 ? 0 : 1)}</span>
          <span className="text-xs text-white/60">{unit}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-white/80">{label}</span>
    </div>
  );
};

// Large Speedometer Component - The centerpiece
const Speedometer = ({ 
  value, 
  max, 
  phase, 
  isRunning 
}: { 
  value: number; 
  max: number; 
  phase: "ping" | "download" | "upload" | null;
  isRunning: boolean;
}) => {
  const size = 280;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (phase === "ping") return colors.emerald;
    if (phase === "download") return colors.coral;
    if (phase === "upload") return colors.rose;
    return colors.coral;
  };

  const getLabel = () => {
    if (phase === "ping") return "PING";
    if (phase === "download") return "DOWNLOAD";
    if (phase === "upload") return "UPLOAD";
    return "READY";
  };

  const getUnit = () => {
    if (phase === "ping") return "ms";
    return "Mbps";
  };
  
  const color = getColor();
  
  // Generate tick marks
  const ticks = [];
  const tickCount = 10;
  for (let i = 0; i <= tickCount; i++) {
    const angle = 180 + (i / tickCount) * 180;
    const rad = (angle * Math.PI) / 180;
    const innerR = radius - 35;
    const outerR = radius - 25;
    const x1 = size / 2 + innerR * Math.cos(rad);
    const y1 = size / 2 + innerR * Math.sin(rad);
    const x2 = size / 2 + outerR * Math.cos(rad);
    const y2 = size / 2 + outerR * Math.sin(rad);
    ticks.push({ x1, y1, x2, y2, label: Math.round((i / tickCount) * max) });
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 60 }}>
        <svg width={size} height={size / 2 + 40} className="overflow-visible">
          <defs>
            <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.emerald} />
              <stop offset="50%" stopColor={colors.coral} />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Outer decorative ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 8}
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="1"
          />
          
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Gradient background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="url(#speedGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity="0.15"
          />
          
          {/* Progress arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300 ease-out"
            filter={isRunning ? "url(#glowStrong)" : "url(#glow)"}
          />
          
          {/* Tick marks */}
          {ticks.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={i % 2 === 0 ? 2 : 1}
              />
            </g>
          ))}
          
          {/* Center decoration */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={60}
            fill="rgba(0,0,0,0.3)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={50}
            fill="rgba(0,0,0,0.5)"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pt-4">
          <span 
            className="text-6xl font-bold tracking-tight transition-colors duration-300"
            style={{ color }}
          >
            {phase === "ping" ? value.toFixed(0) : value.toFixed(1)}
          </span>
          <span className="text-lg text-[var(--foreground-muted)] font-medium">{getUnit()}</span>
        </div>
        
        {/* Phase label */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <span 
            className={`text-sm font-bold tracking-widest uppercase transition-all duration-300 ${isRunning ? 'animate-pulse' : ''}`}
            style={{ color }}
          >
            {getLabel()}
          </span>
        </div>
      </div>
      
      {/* Speed scale labels */}
      <div className="flex justify-between w-full px-4 mt-2 text-xs text-[var(--foreground-muted)]">
        <span>0</span>
        <span>{max / 2}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

// Theme Toggle Button
const ThemeToggle = ({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) => {
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all duration-200 hover:scale-105 active:scale-95"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

// Results Modal Component
const ResultsModal = ({ 
  isOpen, 
  onClose, 
  result,
  onRunAgain 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  result: SpeedResult | null;
  onRunAgain: () => void;
}) => {
  if (!isOpen || !result) return null;

  const grade = result.stats?.grade || 'N/A';
  const badge = getConditionBadge(grade);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-2xl p-8 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--card-hover)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Grade display */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4" style={{ backgroundColor: `${badge.color}20` }}>
            <span className="text-5xl font-bold" style={{ color: badge.color }}>{grade}</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Test Complete!</h2>
          <span 
            className="inline-block mt-2 px-4 py-1 rounded-full text-sm font-semibold"
            style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 rounded-2xl bg-[var(--background)]">
            <div className="text-3xl font-bold text-[#ff7b6b]">{result.download.toFixed(1)}</div>
            <div className="text-xs text-[var(--foreground-muted)] mt-1">↓ Download Mbps</div>
          </div>
          <div className="text-center p-4 rounded-2xl bg-[var(--background)]">
            <div className="text-3xl font-bold text-[#f4b8c5]">{result.upload.toFixed(1)}</div>
            <div className="text-xs text-[var(--foreground-muted)] mt-1">↑ Upload Mbps</div>
          </div>
          <div className="text-center p-4 rounded-2xl bg-[var(--background)]">
            <div className="text-3xl font-bold text-[#34d399]">{result.ping}</div>
            <div className="text-xs text-[var(--foreground-muted)] mt-1">⏱ Ping ms</div>
          </div>
        </div>

        {/* Extra stats */}
        {result.stats && (
          <div className="grid grid-cols-2 gap-3 mb-8 text-sm">
            <div className="flex justify-between p-3 rounded-xl bg-[var(--background)]">
              <span className="text-[var(--foreground-muted)]">Jitter</span>
              <span className="font-semibold">{result.stats.jitter.toFixed(1)} ms</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-[var(--background)]">
              <span className="text-[var(--foreground-muted)]">Stability</span>
              <span className="font-semibold">{result.stats.stabilityScore}%</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 rounded-xl border border-[var(--border)] hover:bg-[var(--card-hover)] transition-all font-medium"
          >
            View Details
          </button>
          <button
            onClick={() => { onClose(); onRunAgain(); }}
            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#ff7b6b] to-[#f4b8c5] text-white font-semibold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Run Again
          </button>
        </div>
      </div>
    </div>
  );
};

const buildSparkPath = (values: number[], width = 320, height = 90) => {
  if (!values.length) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);

  return values
    .map((value, idx) => {
      const x = idx * stepX;
      const y = height - ((value - min) / range) * height;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

export default function Home() {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [phase, setPhase] = useState<"ping" | "download" | "upload" | null>(null);
  const [progress, setProgress] = useState(0);
  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  const [ping, setPing] = useState(0);
  const [history, setHistory] = useState<SpeedResult[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [ispDown, setIspDown] = useState(300);
  const [ispUp, setIspUp] = useState(50);
  const [ispPing, setIspPing] = useState(15);
  const [menuOpen, setMenuOpen] = useState(false);
  const [samples, setSamples] = useState<{ down: number[]; up: number[]; ping: number[] }>({ down: [], up: [], ping: [] });
  const [realtimePing, setRealtimePing] = useState<number[]>([]);
  const [realtimeDown, setRealtimeDown] = useState<number[]>([]);
  const [realtimeUp, setRealtimeUp] = useState<number[]>([]);
  const [theme, setTheme] = useState<string>("dark");
  const [showResultsModal, setShowResultsModal] = useState(false);
  
  // Test configuration
  const [networkType, setNetworkType] = useState<NetworkType>("wifi");
  const [location, setLocation] = useState<string>("");
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [testProfile, setTestProfile] = useState<TestProfile>("standard");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>("auto");
  
  // Accessibility settings
  const [highContrast, setHighContrast] = useState(true);
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Network diagnostics
  const [dnsLookupTime, setDnsLookupTime] = useState<number | null>(null);
  const [tracerouteData, setTracerouteData] = useState<{hop: number; host: string; latency: number; status: 'ok' | 'slow' | 'timeout'}[]>([]);
  const [showTraceroute, setShowTraceroute] = useState(false);
  const [ipInfo, setIpInfo] = useState<{ipv4: string | null; ipv6: string | null; protocol: 'ipv4' | 'ipv6' | 'dual-stack' | 'unknown'}>({
    ipv4: null, ipv6: null, protocol: 'unknown'
  });
  const [routerHealth, setRouterHealth] = useState<{
    gatewayLatency: number | null;
    packetLoss: number | null;
    signalStrength: 'excellent' | 'good' | 'fair' | 'poor' | null;
    connectionStability: number | null;
    status: 'healthy' | 'warning' | 'critical' | null;
    issues: string[];
  }>({
    gatewayLatency: null,
    packetLoss: null,
    signalStrength: null,
    connectionStability: null,
    status: null,
    issues: []
  });
  
  // Data retention settings
  const [dataRetention, setDataRetention] = useState<{
    maxEntries: number;
    autoDelete: boolean;
    deleteAfterDays: number;
  }>({ maxEntries: 100, autoDelete: false, deleteAfterDays: 30 });
  const [showDataControls, setShowDataControls] = useState(false);
  
  // Ref to track incognito mode during async test execution
  const incognitoRef = useRef(false);

  // Test duration presets (ms per phase)
  const profileDurations: Record<TestProfile, number> = {
    quick: 5000,
    standard: 10000,
    extended: 20000,
  };

  // Load theme and high contrast setting on mount
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("speedlabs-theme") || "dark";
    const savedHighContrast = window.localStorage.getItem("speedlabs-highcontrast");
    // Default to true if not set
    const isHighContrast = savedHighContrast === null ? true : savedHighContrast === "true";
    setTheme(savedTheme);
    setHighContrast(isHighContrast);
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.setAttribute("data-high-contrast", String(isHighContrast));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("speedlabs-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Persist high contrast setting
  useEffect(() => {
    window.localStorage.setItem("speedlabs-highcontrast", String(highContrast));
    document.documentElement.setAttribute("data-high-contrast", String(highContrast));
  }, [highContrast]);

  // Load history and baseline from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem("speedtest-history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse history", err);
      }
    }
    setHistoryLoaded(true);
    const storedBaseline = window.localStorage.getItem("speedtest-baseline");
    if (storedBaseline) {
      try {
        const parsed = JSON.parse(storedBaseline);
        setIspDown(parsed.ispDown ?? ispDown);
        setIspUp(parsed.ispUp ?? ispUp);
        setIspPing(parsed.ispPing ?? ispPing);
      } catch (err) {
        console.error("Failed to parse baseline", err);
      }
    }
  }, []);

  // Save history to localStorage with data retention enforcement
  useEffect(() => {
    if (historyLoaded) {
      let filteredHistory = [...history];
      
      // Enforce max entries
      if (filteredHistory.length > dataRetention.maxEntries) {
        filteredHistory = filteredHistory.slice(0, dataRetention.maxEntries);
      }
      
      // Enforce auto-delete after days
      if (dataRetention.autoDelete && dataRetention.deleteAfterDays > 0) {
        const cutoffDate = Date.now() - (dataRetention.deleteAfterDays * 24 * 60 * 60 * 1000);
        filteredHistory = filteredHistory.filter(r => r.timestamp > cutoffDate);
      }
      
      // Update state if filtering changed the history
      if (filteredHistory.length !== history.length) {
        setHistory(filteredHistory);
      }
      
      window.localStorage.setItem("speedtest-history", JSON.stringify(filteredHistory));
    }
  }, [history, historyLoaded, dataRetention]);

  // Load/save data retention settings
  useEffect(() => {
    const stored = window.localStorage.getItem("speedtest-dataretention");
    if (stored) {
      try {
        setDataRetention(JSON.parse(stored));
      } catch {
        // Use defaults
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("speedtest-dataretention", JSON.stringify(dataRetention));
  }, [dataRetention]);

  // Save baseline to localStorage
  useEffect(() => {
    window.localStorage.setItem(
      "speedtest-baseline",
      JSON.stringify({ ispDown, ispUp, ispPing })
    );
  }, [ispDown, ispUp, ispPing]);

  // Calculate unlocked achievements based on history
  const unlockedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter(achievement => achievement.condition(history));
  }, [history]);

  // Get newly unlocked achievements (for notifications)
  const achievementProgress = useMemo(() => {
    const total = ACHIEVEMENTS.length;
    const unlocked = unlockedAchievements.length;
    const byTier = {
      bronze: unlockedAchievements.filter(a => a.tier === 'bronze').length,
      silver: unlockedAchievements.filter(a => a.tier === 'silver').length,
      gold: unlockedAchievements.filter(a => a.tier === 'gold').length,
      platinum: unlockedAchievements.filter(a => a.tier === 'platinum').length,
    };
    return { total, unlocked, percentage: Math.round((unlocked / total) * 100), byTier };
  }, [unlockedAchievements]);

  const startTest = (isIncognito: boolean = false) => {
    if (status === "running") return;
    
    // Store incognito mode in ref for async access
    incognitoRef.current = isIncognito;
    setIncognitoMode(isIncognito);
    
    setStatus("running");
    setProgress(0);
    setDownload(0);
    setUpload(0);
    setPing(0);
    setDnsLookupTime(null);
    setSamples({ down: [], up: [], ping: [] });
    setRealtimePing([]);
    setRealtimeDown([]);
    setRealtimeUp([]);

    // Measure DNS lookup time (simulated with fetch timing)
    const measureDns = async () => {
      const domains = ['google.com', 'cloudflare.com', 'amazon.com'];
      const times: number[] = [];
      for (const domain of domains) {
        const start = performance.now();
        try {
          await fetch(`https://${domain}/favicon.ico`, { mode: 'no-cors', cache: 'no-store' });
        } catch {
          // Ignore errors, we just need timing
        }
        times.push(performance.now() - start);
      }
      const avgDns = Math.min(...times);
      setDnsLookupTime(Math.round(avgDns));
      return Math.round(avgDns);
    };
    
    // Simulate traceroute (browser limitations prevent real traceroute)
    const simulateTraceroute = () => {
      const hops = [
        { hop: 1, host: 'router.local (192.168.1.1)', baseLatency: 1 },
        { hop: 2, host: 'gateway.isp.net', baseLatency: 5 },
        { hop: 3, host: 'core-1.isp.net', baseLatency: 8 },
        { hop: 4, host: 'edge-1.isp.net', baseLatency: 12 },
        { hop: 5, host: 'peering.cdn.net', baseLatency: 15 },
        { hop: 6, host: 'cdn-node-1.speedtest.net', baseLatency: 18 },
        { hop: 7, host: 'server.speedtest.net', baseLatency: 20 },
      ];
      
      const results = hops.map(hop => {
        const variance = Math.random() * 10 - 5;
        const latency = Math.max(1, Math.round(hop.baseLatency + variance));
        const status = latency > 50 ? 'timeout' : latency > 30 ? 'slow' : 'ok';
        return { hop: hop.hop, host: hop.host, latency, status: status as 'ok' | 'slow' | 'timeout' };
      });
      
      setTracerouteData(results);
    };
    
    // Detect IPv4/IPv6 support
    const detectIpVersion = async () => {
      let ipv4: string | null = null;
      let ipv6: string | null = null;
      
      // Try to detect IPv4
      try {
        const res4 = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        const data4 = await res4.json();
        ipv4 = data4.ip;
      } catch {
        // IPv4 not available
      }
      
      // Try to detect IPv6
      try {
        const res6 = await fetch('https://api64.ipify.org?format=json', { cache: 'no-store' });
        const data6 = await res6.json();
        if (data6.ip && data6.ip.includes(':')) {
          ipv6 = data6.ip;
        } else if (!ipv4) {
          ipv4 = data6.ip; // Fallback if IPv6 service returns IPv4
        }
      } catch {
        // IPv6 not available
      }
      
      const protocol = ipv4 && ipv6 ? 'dual-stack' : ipv4 ? 'ipv4' : ipv6 ? 'ipv6' : 'unknown';
      setIpInfo({ ipv4, ipv6, protocol });
    };
    
    // Simulate router health check
    const checkRouterHealth = async () => {
      // Simulate gateway ping tests
      const gatewayPings: number[] = [];
      for (let i = 0; i < 10; i++) {
        const ping = 1 + Math.random() * 5; // Gateway should be very fast
        gatewayPings.push(ping);
        await new Promise(r => setTimeout(r, 50));
      }
      
      const avgGatewayLatency = gatewayPings.reduce((a, b) => a + b, 0) / gatewayPings.length;
      
      // Simulate packet loss test (0-5% range, mostly 0)
      const packetLoss = Math.random() < 0.8 ? 0 : Math.random() * 5;
      
      // Simulate signal strength based on network type
      const signalStrengths: ('excellent' | 'good' | 'fair' | 'poor')[] = ['excellent', 'good', 'fair', 'poor'];
      const signalWeights = networkType === 'ethernet' ? [0.9, 0.1, 0, 0] : 
                           networkType === 'wifi' ? [0.3, 0.4, 0.2, 0.1] : 
                           [0.1, 0.3, 0.4, 0.2];
      const signalRand = Math.random();
      let cumulative = 0;
      let signalStrength: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
      for (let i = 0; i < signalWeights.length; i++) {
        cumulative += signalWeights[i];
        if (signalRand <= cumulative) {
          signalStrength = signalStrengths[i];
          break;
        }
      }
      
      // Connection stability (90-100%)
      const connectionStability = 90 + Math.random() * 10;
      
      // Determine issues
      const issues: string[] = [];
      if (avgGatewayLatency > 3) issues.push('High gateway latency');
      if (packetLoss > 1) issues.push('Packet loss detected');
      if (signalStrength === 'poor') issues.push('Weak signal strength');
      if (signalStrength === 'fair') issues.push('Signal could be improved');
      if (connectionStability < 95) issues.push('Connection instability');
      
      // Overall status
      const status = issues.length === 0 ? 'healthy' : 
                    issues.length <= 1 && !issues.some(i => i.includes('Packet loss') || i.includes('Weak')) ? 'warning' : 
                    'critical';
      
      setRouterHealth({
        gatewayLatency: Math.round(avgGatewayLatency * 100) / 100,
        packetLoss: Math.round(packetLoss * 100) / 100,
        signalStrength,
        connectionStability: Math.round(connectionStability * 10) / 10,
        status,
        issues
      });
    };
    
    measureDns();
    simulateTraceroute();
    detectIpVersion();
    checkRouterHealth();

    const phaseDuration = profileDurations[testProfile];
    const updateInterval = 100;
    const displayInterval = 300;

    const computeMedian = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    // Phase 1: Ping test
    const runPingPhase = () => {
      setPhase("ping");
      const phaseStart = performance.now();
      let lastUpdate = phaseStart;
      let lastDisplay = phaseStart;
      const pingSamples: number[] = [];
      const displaySamples: number[] = [];

      const step = (now: DOMHighResTimeStamp) => {
        const elapsed = now - phaseStart;
        const phaseProgress = Math.min(100, (elapsed / phaseDuration) * 100);

        // Sample every 100ms
        if (now - lastUpdate >= updateInterval || phaseProgress >= 100) {
          lastUpdate = now;
          const simulatedPing = 5 + Math.random() * 25;
          pingSamples.push(simulatedPing);
          
          // Update display every 300ms with averaged values
          if (now - lastDisplay >= displayInterval || phaseProgress >= 100) {
            lastDisplay = now;
            const windowSize = 3; // Average last 3 samples (300ms window)
            const recent = pingSamples.slice(-windowSize);
            const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
            displaySamples.push(avg);
            setPing(avg);
            setRealtimePing([...displaySamples]);
          }
          setProgress(phaseProgress / 3); // 0-33%
        }

        if (phaseProgress < 100) {
          requestAnimationFrame(step);
        } else {
          setSamples((prev) => ({ ...prev, ping: pingSamples }));
          runDownloadPhase();
        }
      };
      requestAnimationFrame(step);
    };

    // Phase 2: Download test
    const runDownloadPhase = () => {
      setPhase("download");
      const phaseStart = performance.now();
      let lastUpdate = phaseStart;
      let lastDisplay = phaseStart;
      const downloadSamples: number[] = [];
      const displaySamples: number[] = [];

      const step = (now: DOMHighResTimeStamp) => {
        const elapsed = now - phaseStart;
        const phaseProgress = Math.min(100, (elapsed / phaseDuration) * 100);

        // Sample every 100ms
        if (now - lastUpdate >= updateInterval || phaseProgress >= 100) {
          lastUpdate = now;
          const simulatedDownload = 60 + Math.random() * 200;
          downloadSamples.push(simulatedDownload);
          
          // Update display every 300ms with averaged values
          if (now - lastDisplay >= displayInterval || phaseProgress >= 100) {
            lastDisplay = now;
            const windowSize = 3; // Average last 3 samples (300ms window)
            const recent = downloadSamples.slice(-windowSize);
            const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
            displaySamples.push(avg);
            setDownload(avg);
            setRealtimeDown([...displaySamples]);
          }
          setProgress(33.33 + phaseProgress / 3); // 33-66%
        }

        if (phaseProgress < 100) {
          requestAnimationFrame(step);
        } else {
          setSamples((prev) => ({ ...prev, down: downloadSamples }));
          runUploadPhase();
        }
      };
      requestAnimationFrame(step);
    };

    // Phase 3: Upload test
    const runUploadPhase = () => {
      setPhase("upload");
      const phaseStart = performance.now();
      let lastUpdate = phaseStart;
      let lastDisplay = phaseStart;
      const uploadSamples: number[] = [];
      const displaySamples: number[] = [];

      const step = (now: DOMHighResTimeStamp) => {
        const elapsed = now - phaseStart;
        const phaseProgress = Math.min(100, (elapsed / phaseDuration) * 100);

        // Sample every 100ms
        if (now - lastUpdate >= updateInterval || phaseProgress >= 100) {
          lastUpdate = now;
          const simulatedUpload = 20 + Math.random() * 110;
          uploadSamples.push(simulatedUpload);
          
          // Update display every 300ms with averaged values
          if (now - lastDisplay >= displayInterval || phaseProgress >= 100) {
            lastDisplay = now;
            const windowSize = 3; // Average last 3 samples (300ms window)
            const recent = uploadSamples.slice(-windowSize);
            const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
            displaySamples.push(avg);
            setUpload(avg);
            setRealtimeUp([...displaySamples]);
          }
          setProgress(66.66 + phaseProgress / 3); // 66-100%
        }

        if (phaseProgress < 100) {
          requestAnimationFrame(step);
        } else {
          // All phases complete - Calculate comprehensive statistics
          setSamples((prev) => {
            const allSamples = { ...prev, up: uploadSamples };
            
            // Calculate detailed stats for each metric
            const downloadStats = calculateDetailedStats(allSamples.down);
            const uploadStats = calculateDetailedStats(allSamples.up);
            const pingStats = calculateDetailedStats(allSamples.ping);
            
            // Calculate jitter
            const jitter = calculateJitter(allSamples.ping);
            
            // Calculate stability score (based on download consistency)
            const stabilityScore = calculateStabilityScore(downloadStats);
            
            // Calculate trend slopes
            const downloadTrend = calculateTrendSlope(allSamples.down);
            const uploadTrend = calculateTrendSlope(allSamples.up);
            const pingTrend = calculateTrendSlope(allSamples.ping);
            const trendSlope = (downloadTrend + uploadTrend - pingTrend) / 3; // Combined trend
            
            // Calculate grades
            const downGrade = calculateGrade(downloadStats.median, ispDown, 'download');
            const upGrade = calculateGrade(uploadStats.median, ispUp, 'upload');
            const pingGrade = calculateGrade(pingStats.median, ispPing, 'ping');
            
            // Overall grade (average of the three)
            const gradeValues = { 'A+': 4.3, 'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0 };
            const avgGradeValue = (gradeValues[downGrade as keyof typeof gradeValues] + 
                                   gradeValues[upGrade as keyof typeof gradeValues] + 
                                   gradeValues[pingGrade as keyof typeof gradeValues]) / 3;
            let overallGrade = 'F';
            if (avgGradeValue >= 4.2) overallGrade = 'A+';
            else if (avgGradeValue >= 3.5) overallGrade = 'A';
            else if (avgGradeValue >= 2.5) overallGrade = 'B';
            else if (avgGradeValue >= 1.5) overallGrade = 'C';
            else if (avgGradeValue >= 0.5) overallGrade = 'D';

            const result: SpeedResult = {
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              download: Math.round(downloadStats.median * 10) / 10,
              upload: Math.round(uploadStats.median * 10) / 10,
              ping: Math.round(pingStats.median),
              networkType: networkType,
              location: location || undefined,
              serverId: selectedServer,
              serverName: TEST_SERVERS.find(s => s.id === selectedServer)?.name || 'Auto',
              dnsLookupTime: dnsLookupTime || undefined,
              stats: {
                downloadStats,
                uploadStats,
                pingStats,
                jitter,
                stabilityScore,
                grade: overallGrade,
                trendSlope,
              },
            };

            setDownload(result.download);
            setUpload(result.upload);
            setPing(result.ping);
            setStatus("done");
            setPhase(null);
            
            // Save to history (skip if incognito)
            if (!incognitoRef.current) {
              setHistory((prevHistory) => [result, ...prevHistory].slice(0, 50));
            }
            
            // Show results modal
            setTimeout(() => setShowResultsModal(true), 300);

            return allSamples;
          });
        }
      };
      requestAnimationFrame(step);
    };

    runPingPhase();
  };

  const running = status === "running";

  const latest = history[0];
  const baselineCompare = latest
    ? {
        downDelta: latest.download - ispDown,
        upDelta: latest.upload - ispUp,
        pingDelta: latest.ping - ispPing, // Positive means worse (higher ping), negative means better (lower ping)
      }
    : null;

  // Calculate time-based trends
  const timeAnalytics = useMemo(() => {
    if (history.length === 0) return null;
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    const last24h = history.filter(h => h.timestamp >= oneDayAgo);
    const last7d = history.filter(h => h.timestamp >= sevenDaysAgo);
    const last30d = history.filter(h => h.timestamp >= thirtyDaysAgo);
    
    const calcAvg = (arr: SpeedResult[], key: 'download' | 'upload' | 'ping') => {
      if (arr.length === 0) return 0;
      return arr.reduce((sum, item) => sum + item[key], 0) / arr.length;
    };
    
    return {
      last24h: {
        count: last24h.length,
        avgDown: calcAvg(last24h, 'download'),
        avgUp: calcAvg(last24h, 'upload'),
        avgPing: calcAvg(last24h, 'ping'),
      },
      last7d: {
        count: last7d.length,
        avgDown: calcAvg(last7d, 'download'),
        avgUp: calcAvg(last7d, 'upload'),
        avgPing: calcAvg(last7d, 'ping'),
      },
      last30d: {
        count: last30d.length,
        avgDown: calcAvg(last30d, 'download'),
        avgUp: calcAvg(last30d, 'upload'),
        avgPing: calcAvg(last30d, 'ping'),
      },
    };
  }, [history]);

  // Analyze test history to find optimal and worst performance times
  const peakAnalysis = useMemo(() => {
    if (history.length < 3) return null;
    
    // Group tests by hour of day
    const hourlyData: { [hour: number]: { downloads: number[], uploads: number[], pings: number[] } } = {};
    
    history.forEach(test => {
      const hour = new Date(test.timestamp).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { downloads: [], uploads: [], pings: [] };
      }
      hourlyData[hour].downloads.push(test.download);
      hourlyData[hour].uploads.push(test.upload);
      hourlyData[hour].pings.push(test.ping);
    });
    
    // Calculate averages per hour
    const hourlyAverages = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      avgDown: data.downloads.reduce((a, b) => a + b, 0) / data.downloads.length,
      avgUp: data.uploads.reduce((a, b) => a + b, 0) / data.uploads.length,
      avgPing: data.pings.reduce((a, b) => a + b, 0) / data.pings.length,
      testCount: data.downloads.length,
    }));
    
    if (hourlyAverages.length < 2) return null;
    
    // Find best and worst hours
    const sortedBySpeed = [...hourlyAverages].sort((a, b) => b.avgDown - a.avgDown);
    const bestHour = sortedBySpeed[0];
    const worstHour = sortedBySpeed[sortedBySpeed.length - 1];
    
    // Classify time periods
    const morningHours = hourlyAverages.filter(h => h.hour >= 6 && h.hour < 12);
    const afternoonHours = hourlyAverages.filter(h => h.hour >= 12 && h.hour < 18);
    const eveningHours = hourlyAverages.filter(h => h.hour >= 18 && h.hour < 22);
    const nightHours = hourlyAverages.filter(h => h.hour >= 22 || h.hour < 6);
    
    const avgByPeriod = (hours: typeof hourlyAverages) => 
      hours.length ? hours.reduce((sum, h) => sum + h.avgDown, 0) / hours.length : 0;
    
    return {
      bestHour,
      worstHour,
      speedDifference: bestHour.avgDown - worstHour.avgDown,
      periodAverages: {
        morning: avgByPeriod(morningHours),
        afternoon: avgByPeriod(afternoonHours),
        evening: avgByPeriod(eveningHours),
        night: avgByPeriod(nightHours),
      },
      hourlyData: hourlyAverages,
    };
  }, [history]);

  // Detect unusual speed drops or ping spikes using statistical analysis
  const anomalies = useMemo(() => {
    if (history.length < 5) return [];
    
    // Calculate overall averages
    const avgDown = history.reduce((sum, h) => sum + h.download, 0) / history.length;
    const avgUp = history.reduce((sum, h) => sum + h.upload, 0) / history.length;
    const avgPing = history.reduce((sum, h) => sum + h.ping, 0) / history.length;
    
    // Calculate standard deviations
    const stdDown = Math.sqrt(history.reduce((sum, h) => sum + Math.pow(h.download - avgDown, 2), 0) / history.length);
    const stdUp = Math.sqrt(history.reduce((sum, h) => sum + Math.pow(h.upload - avgUp, 2), 0) / history.length);
    const stdPing = Math.sqrt(history.reduce((sum, h) => sum + Math.pow(h.ping - avgPing, 2), 0) / history.length);
    
    // Find anomalies (more than 2 standard deviations from mean)
    const threshold = 2;
    const detected: { id: string; timestamp: number; type: string; message: string; severity: 'warning' | 'critical' }[] = [];
    
    history.slice(0, 10).forEach(test => {
      // Check download anomaly
      if (test.download < avgDown - threshold * stdDown) {
        const dropPercent = Math.round(((avgDown - test.download) / avgDown) * 100);
        detected.push({
          id: test.id,
          timestamp: test.timestamp,
          type: 'download_drop',
          message: `Download dropped ${dropPercent}% below average`,
          severity: dropPercent > 50 ? 'critical' : 'warning',
        });
      }
      
      // Check upload anomaly
      if (test.upload < avgUp - threshold * stdUp) {
        const dropPercent = Math.round(((avgUp - test.upload) / avgUp) * 100);
        detected.push({
          id: test.id,
          timestamp: test.timestamp,
          type: 'upload_drop',
          message: `Upload dropped ${dropPercent}% below average`,
          severity: dropPercent > 50 ? 'critical' : 'warning',
        });
      }
      
      // Check ping spike
      if (test.ping > avgPing + threshold * stdPing) {
        const spikePercent = Math.round(((test.ping - avgPing) / avgPing) * 100);
        detected.push({
          id: test.id,
          timestamp: test.timestamp,
          type: 'ping_spike',
          message: `Ping spiked ${spikePercent}% above average`,
          severity: spikePercent > 100 ? 'critical' : 'warning',
        });
      }
    });
    
    return detected.slice(0, 5); // Return top 5 anomalies
  }, [history]);

  // Generate actionable recommendations based on test patterns
  const smartInsights = useMemo(() => {
    const insights: { icon: string; title: string; message: string; type: 'tip' | 'warning' | 'success' | 'info' }[] = [];
    
    if (history.length === 0) return insights;
    
    const avgDown = history.reduce((sum, h) => sum + h.download, 0) / history.length;
    const avgUp = history.reduce((sum, h) => sum + h.upload, 0) / history.length;
    const avgPing = history.reduce((sum, h) => sum + h.ping, 0) / history.length;
    
    // ISP comparison insight
    if (latest) {
      const downPerformance = (avgDown / ispDown) * 100;
      if (downPerformance >= 90) {
        insights.push({
          icon: '🎯',
          title: 'Great Performance',
          message: `Your speeds average ${downPerformance.toFixed(0)}% of your ISP plan. You're getting excellent value!`,
          type: 'success',
        });
      } else if (downPerformance < 70) {
        insights.push({
          icon: '⚠️',
          title: 'Below Expected',
          message: `You're only getting ${downPerformance.toFixed(0)}% of your paid speed. Consider contacting your ISP.`,
          type: 'warning',
        });
      }
    }
    
    // Peak hour insight
    if (peakAnalysis && peakAnalysis.speedDifference > 20) {
      const formatHour = (h: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}${ampm}`;
      };
      insights.push({
        icon: '⏰',
        title: 'Best Testing Time',
        message: `Your speeds are ${peakAnalysis.speedDifference.toFixed(0)} Mbps faster around ${formatHour(peakAnalysis.bestHour.hour)} vs ${formatHour(peakAnalysis.worstHour.hour)}.`,
        type: 'tip',
      });
    }
    
    // Stability insight
    if (latest?.stats) {
      if (latest.stats.stabilityScore >= 85) {
        insights.push({
          icon: '📊',
          title: 'Stable Connection',
          message: `Your connection stability is excellent at ${latest.stats.stabilityScore}%. Great for video calls and gaming!`,
          type: 'success',
        });
      } else if (latest.stats.stabilityScore < 60) {
        insights.push({
          icon: '📶',
          title: 'Unstable Connection',
          message: `Stability score of ${latest.stats.stabilityScore}% may cause buffering. Try moving closer to your router.`,
          type: 'warning',
        });
      }
    }
    
    // Jitter insight for gaming
    if (latest?.stats && latest.stats.jitter > 10) {
      insights.push({
        icon: '🎮',
        title: 'Gaming Alert',
        message: `Jitter of ${latest.stats.jitter.toFixed(1)}ms may affect online gaming. Wired connection recommended.`,
        type: 'tip',
      });
    } else if (latest?.stats && latest.stats.jitter <= 5) {
      insights.push({
        icon: '🎮',
        title: 'Gaming Ready',
        message: `Low jitter of ${latest.stats.jitter.toFixed(1)}ms is perfect for competitive gaming!`,
        type: 'success',
      });
    }
    
    // Anomaly insight
    if (anomalies.length > 0) {
      const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
      if (criticalCount > 0) {
        insights.push({
          icon: '🔴',
          title: 'Issues Detected',
          message: `${criticalCount} significant speed drop${criticalCount > 1 ? 's' : ''} detected recently. Check for network interference.`,
          type: 'warning',
        });
      }
    }
    
    // Test frequency insight
    if (history.length >= 5) {
      const daysCovered = (Date.now() - history[history.length - 1].timestamp) / (1000 * 60 * 60 * 24);
      const testsPerWeek = (history.length / daysCovered) * 7;
      if (testsPerWeek >= 7) {
        insights.push({
          icon: '📈',
          title: 'Good Testing Habit',
          message: `You're testing ${testsPerWeek.toFixed(1)}x per week. This helps track patterns effectively!`,
          type: 'info',
        });
      }
    }
    
    // Network type comparison (if multiple types tested)
    const typeGroups = history.reduce((acc, h) => {
      const type = h.networkType || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(h.download);
      return acc;
    }, {} as Record<string, number[]>);
    
    const typeCount = Object.keys(typeGroups).filter(k => k !== 'unknown').length;
    if (typeCount >= 2) {
      const typeAvgs = Object.entries(typeGroups).map(([type, speeds]) => ({
        type,
        avg: speeds.reduce((a, b) => a + b, 0) / speeds.length,
      })).sort((a, b) => b.avg - a.avg);
      
      if (typeAvgs[0].avg - typeAvgs[typeAvgs.length - 1].avg > 30) {
        insights.push({
          icon: '🔌',
          title: 'Network Comparison',
          message: `${typeAvgs[0].type.charAt(0).toUpperCase() + typeAvgs[0].type.slice(1)} performs ${(typeAvgs[0].avg - typeAvgs[typeAvgs.length - 1].avg).toFixed(0)} Mbps faster than ${typeAvgs[typeAvgs.length - 1].type}.`,
          type: 'info',
        });
      }
    }
    
    return insights.slice(0, 4); // Return top 4 insights
  }, [history, latest, ispDown, peakAnalysis, anomalies]);

  // Export functions
  const exportAsJSON = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `speedlabs-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const headers = ['Timestamp', 'Date', 'Time', 'Download (Mbps)', 'Upload (Mbps)', 'Ping (ms)', 'Grade', 'Jitter', 'Stability Score'];
    const rows = history.map(item => [
      item.timestamp,
      new Date(item.timestamp).toLocaleDateString(),
      new Date(item.timestamp).toLocaleTimeString(),
      item.download,
      item.upload,
      item.ping,
      item.stats?.grade || 'N/A',
      item.stats?.jitter.toFixed(1) || 'N/A',
      item.stats?.stabilityScore || 'N/A',
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `speedlabs-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const chartValues = useMemo(() => {
    const list = history.length ? history : [];
    return {
      download: list.map((h) => h.download).reverse(),
      upload: list.map((h) => h.upload).reverse(),
    };
  }, [history]);

  // Generate screen reader announcement for current test status
  const getStatusAnnouncement = () => {
    if (status === 'running') {
      if (phase === 'ping') return `Testing ping. Current ping: ${ping.toFixed(0)} milliseconds`;
      if (phase === 'download') return `Testing download speed. Current: ${download.toFixed(1)} megabits per second`;
      if (phase === 'upload') return `Testing upload speed. Current: ${upload.toFixed(1)} megabits per second`;
    }
    if (status === 'done' && latest) {
      return `Test complete. Download: ${latest.download.toFixed(1)} megabits per second, Upload: ${latest.upload.toFixed(1)} megabits per second, Ping: ${latest.ping} milliseconds. Grade: ${latest.stats?.grade || 'Not rated'}`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Skip to main content link for keyboard users */}
      <a 
        href="#test-section" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#ff7b6b] focus:text-white focus:rounded-lg focus:font-medium"
      >
        Skip to main content
      </a>
      
      {/* Live region for screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {getStatusAnnouncement()}
      </div>
      
      {/* Results Modal */}
      <ResultsModal 
        isOpen={showResultsModal} 
        onClose={() => setShowResultsModal(false)} 
        result={latest}
        onRunAgain={() => startTest(false)}
      />
      
      {/* Achievements Modal */}
      {showAchievements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAchievements(false)}>
          <div 
            className="relative w-full max-w-2xl max-h-[80vh] overflow-auto rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAchievements(false)}
              className="absolute top-4 right-4 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close achievements"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">🏆 Achievements</h2>
              <p className="text-sm text-[var(--foreground-muted)] mt-1">
                {achievementProgress.unlocked} of {achievementProgress.total} unlocked ({achievementProgress.percentage}%)
              </p>
              
              {/* Progress bar */}
              <div className="mt-3 h-2 rounded-full bg-[var(--background-secondary)] overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#ff7b6b] to-[#f4b8c5] transition-all duration-500"
                  style={{ width: `${achievementProgress.percentage}%` }}
                />
              </div>
              
              {/* Tier breakdown */}
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-600" /> {achievementProgress.byTier.bronze} Bronze</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400" /> {achievementProgress.byTier.silver} Silver</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400" /> {achievementProgress.byTier.gold} Gold</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cyan-300" /> {achievementProgress.byTier.platinum} Platinum</span>
              </div>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {ACHIEVEMENTS.map((achievement) => {
                const isUnlocked = unlockedAchievements.some(a => a.id === achievement.id);
                const tierColors = {
                  bronze: 'border-amber-600/50 bg-amber-600/10',
                  silver: 'border-gray-400/50 bg-gray-400/10',
                  gold: 'border-yellow-400/50 bg-yellow-400/10',
                  platinum: 'border-cyan-300/50 bg-cyan-300/10',
                };
                return (
                  <div 
                    key={achievement.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isUnlocked 
                        ? tierColors[achievement.tier]
                        : 'border-[var(--border)] bg-[var(--background)] opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`}>{achievement.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{achievement.name}</p>
                          {isUnlocked && <span className="text-xs text-[#34d399]">✓</span>}
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{achievement.description}</p>
                        <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${
                          achievement.tier === 'bronze' ? 'bg-amber-600/20 text-amber-600' :
                          achievement.tier === 'silver' ? 'bg-gray-400/20 text-gray-400' :
                          achievement.tier === 'gold' ? 'bg-yellow-400/20 text-yellow-600' :
                          'bg-cyan-300/20 text-cyan-400'
                        }`}>
                          {achievement.tier}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      <div className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute -left-32 top-5 h-72 w-72 rounded-full bg-[#f4b8c5] blur-[140px]" />
          <div className="absolute -right-20 top-48 h-96 w-96 rounded-full bg-[#ff7b6b] blur-[160px]" />
          <div className="absolute left-1/2 top-96 h-64 w-64 rounded-full bg-[#34d399] blur-[120px] opacity-30" />
        </div>

        {/* Navbar */}
        <nav className="relative border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl sticky top-0 z-40" role="navigation" aria-label="Main navigation">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10 md:px-14">
            <div className="flex items-center gap-3">
              <SpeedLabLogo />
              <span className="text-lg font-bold" aria-label="Speed Labs - Internet Speed Test">Speed Labs</span>
            </div>
            <div className="hidden items-center gap-8 md:flex" role="menubar">
              <button 
                onClick={() => {
                  const testSection = document.getElementById("test-section");
                  testSection?.scrollIntoView({ behavior: "smooth" });
                }}
                role="menuitem"
                className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors font-medium"
              >
                Test
              </button>
              <button 
                onClick={() => {
                  const historySection = document.getElementById("history-section");
                  historySection?.scrollIntoView({ behavior: "smooth" });
                }}
                role="menuitem"
                className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors font-medium"
              >
                History
              </button>
              <button 
                onClick={() => {
                  const baselineSection = document.getElementById("baseline-section");
                  baselineSection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors font-medium"
              >
                Baseline
              </button>
              <button 
                onClick={() => setShowAchievements(true)}
                className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors font-medium flex items-center gap-1"
              >
                🏆 <span className="text-xs bg-[var(--background-secondary)] px-1.5 py-0.5 rounded-full">{achievementProgress.unlocked}</span>
              </button>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`text-sm transition-colors font-medium ${highContrast ? 'text-[#ff7b6b]' : 'text-[var(--foreground-muted)] hover:text-[#ff7b6b]'}`}
                title="Toggle high contrast mode"
                aria-label="Toggle high contrast mode"
              >
                {highContrast ? '◐' : '◑'}
              </button>
              <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
            <div className="flex items-center gap-3 md:hidden">
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <button
                className="relative"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <div className="h-6 w-6 flex flex-col justify-center gap-1.5">
                  <span className={`h-0.5 w-full bg-[var(--foreground)] transition-all ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
                  <span className={`h-0.5 w-full bg-[var(--foreground)] transition-all ${menuOpen ? "opacity-0" : ""}`} />
                  <span className={`h-0.5 w-full bg-[var(--foreground)] transition-all ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
                </div>
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="border-t border-[var(--border)] bg-[var(--card)] px-6 py-4 md:hidden">
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const testSection = document.getElementById("test-section");
                    testSection?.scrollIntoView({ behavior: "smooth" });
                    setMenuOpen(false);
                  }}
                  className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors text-left font-medium"
                >
                  Test
                </button>
                <button 
                  onClick={() => {
                    const historySection = document.getElementById("history-section");
                    historySection?.scrollIntoView({ behavior: "smooth" });
                    setMenuOpen(false);
                  }}
                  className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors text-left font-medium"
                >
                  History
                </button>
                <button 
                  onClick={() => {
                    const baselineSection = document.getElementById("baseline-section");
                    baselineSection?.scrollIntoView({ behavior: "smooth" });
                    setMenuOpen(false);
                  }}
                  className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors text-left font-medium"
                >
                  Baseline
                </button>
                <button 
                  onClick={() => {
                    setShowAchievements(true);
                    setMenuOpen(false);
                  }}
                  className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors text-left font-medium flex items-center gap-2"
                >
                  🏆 Achievements <span className="text-xs bg-[var(--background-secondary)] px-1.5 py-0.5 rounded-full">{achievementProgress.unlocked}</span>
                </button>
                <button 
                  onClick={() => setHighContrast(!highContrast)}
                  className="text-sm text-[var(--foreground-muted)] hover:text-[#ff7b6b] transition-colors text-left font-medium flex items-center gap-2"
                >
                  {highContrast ? '◐' : '◑'} High Contrast {highContrast && <span className="text-xs text-[#34d399]">ON</span>}
                </button>
              </div>
            </div>
          )}
        </nav>

        <main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-20 pt-2 sm:px-10 md:px-14" role="main" aria-label="Speed test application">
          {/* Hero section - Speedometer left, Stats right */}
          <header className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" id="test-section" role="region" aria-label="Speed test controls and results">
            {/* Left side - Speedometer + Graph */}
            <div className="flex flex-col items-center gap-2">
              <Speedometer 
                value={phase === "ping" ? ping : phase === "download" ? download : phase === "upload" ? upload : download}
                max={phase === "ping" ? 50 : ispDown * 1.2}
                phase={phase}
                isRunning={running}
              />
              
              {/* Phase indicator under speedometer */}
              {running && (
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 ${phase === "ping" ? "text-[#34d399]" : "text-[var(--foreground-muted)]"}`}>
                    <div className={`w-2 h-2 rounded-full ${phase === "ping" ? "bg-[#34d399] animate-pulse" : "bg-[var(--foreground-muted)]/30"}`} />
                    <span className="text-sm font-medium">Ping</span>
                  </div>
                  <div className={`flex items-center gap-2 ${phase === "download" ? "text-[#ff7b6b]" : "text-[var(--foreground-muted)]"}`}>
                    <div className={`w-2 h-2 rounded-full ${phase === "download" ? "bg-[#ff7b6b] animate-pulse" : "bg-[var(--foreground-muted)]/30"}`} />
                    <span className="text-sm font-medium">Download</span>
                  </div>
                  <div className={`flex items-center gap-2 ${phase === "upload" ? "text-[#f4b8c5]" : "text-[var(--foreground-muted)]"}`}>
                    <div className={`w-2 h-2 rounded-full ${phase === "upload" ? "bg-[#f4b8c5] animate-pulse" : "bg-[var(--foreground-muted)]/30"}`} />
                    <span className="text-sm font-medium">Upload</span>
                  </div>
                </div>
              )}

              {/* Real-time Graph - Below Speedometer - Shows all 3 metrics */}
              <div className="w-full mt-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#34d399]" />
                      <span className="text-xs text-[var(--foreground-muted)]">Ping</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#ff7b6b]" />
                      <span className="text-xs text-[var(--foreground-muted)]">Down</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#f4b8c5]" />
                      <span className="text-xs text-[var(--foreground-muted)]">Up</span>
                    </div>
                  </div>
                  {running && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[var(--background-secondary)] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#ff7b6b] to-[#f4b8c5] transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs font-bold text-[#ff7b6b]">{Math.round(progress)}%</p>
                    </div>
                  )}
                </div>
                <svg viewBox="0 0 400 60" className="w-full h-14" preserveAspectRatio="none">
                  <line x1="0" x2="400" y1="15" y2="15" stroke="var(--border)" strokeWidth="1" opacity="0.2" />
                  <line x1="0" x2="400" y1="30" y2="30" stroke="var(--border)" strokeWidth="1" opacity="0.3" />
                  <line x1="0" x2="400" y1="45" y2="45" stroke="var(--border)" strokeWidth="1" opacity="0.2" />
                  {/* Always show ping if data exists */}
                  {realtimePing.length > 0 && (
                    <path d={buildSparkPath(realtimePing, 400, 60)} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={phase === "ping" || status === "done" ? 1 : 0.4} />
                  )}
                  {/* Always show download if data exists */}
                  {realtimeDown.length > 0 && (
                    <path d={buildSparkPath(realtimeDown, 400, 60)} fill="none" stroke="#ff7b6b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={phase === "download" || status === "done" ? 1 : 0.4} />
                  )}
                  {/* Always show upload if data exists */}
                  {realtimeUp.length > 0 && (
                    <path d={buildSparkPath(realtimeUp, 400, 60)} fill="none" stroke="#f4b8c5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={phase === "upload" || status === "done" ? 1 : 0.4} />
                  )}
                </svg>
                {status === "idle" && realtimePing.length === 0 && (
                  <p className="text-xs text-[var(--foreground-muted)] text-center mt-2">Run a test to see real-time data</p>
                )}
              </div>
            </div>

            {/* Right side - Text, Stats, and Button */}
            <div className="flex flex-col gap-3">
              <div>
                <span className="inline-block rounded-full bg-gradient-to-r from-[#ff7b6b] to-[#f4b8c5] bg-clip-text text-xs font-bold uppercase tracking-widest text-transparent mb-1">
                  Connection Intelligence
                </span>
                <h1 className="text-xl font-bold leading-tight sm:text-2xl">
                  Test your speed instantly
                </h1>
              </div>

              {/* Stacked Stats - Download, Upload, Ping */}
              <div className="flex flex-col gap-1.5" role="region" aria-label="Current speed metrics">
                <div className="flex items-center p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]" role="group" aria-label="Download speed">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-8 h-8 rounded-md bg-[#ff7b6b]/20 flex items-center justify-center" aria-hidden="true">
                      <span className="text-[#ff7b6b] text-sm">↓</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-lg font-bold text-[#ff7b6b]" aria-label={`Download speed: ${download.toFixed(1)} megabits per second`}>{download.toFixed(1)}</p>
                      <p className="text-xs text-[var(--foreground-muted)]" aria-hidden="true">Mbps</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--foreground-muted)] uppercase" aria-hidden="true">Download</p>
                </div>
                <div className="flex items-center p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]" role="group" aria-label="Upload speed">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-8 h-8 rounded-md bg-[#f4b8c5]/20 flex items-center justify-center" aria-hidden="true">
                      <span className="text-[#f4b8c5] text-sm">↑</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-lg font-bold text-[#f4b8c5]" aria-label={`Upload speed: ${upload.toFixed(1)} megabits per second`}>{upload.toFixed(1)}</p>
                      <p className="text-xs text-[var(--foreground-muted)]" aria-hidden="true">Mbps</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--foreground-muted)] uppercase" aria-hidden="true">Upload</p>
                </div>
                <div className="flex items-center p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)]" role="group" aria-label="Ping latency">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-8 h-8 rounded-md bg-[#34d399]/20 flex items-center justify-center" aria-hidden="true">
                      <span className="text-[#34d399] text-sm">⏱</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-lg font-bold text-[#34d399]" aria-label={`Ping latency: ${ping.toFixed(0)} milliseconds`}>{ping.toFixed(0)}</p>
                      <p className="text-xs text-[var(--foreground-muted)]" aria-hidden="true">ms</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--foreground-muted)] uppercase" aria-hidden="true">Ping</p>
                </div>
              </div>

              {/* Test Buttons */}
              <div className="flex gap-2" role="group" aria-label="Speed test controls">
                <button
                  onClick={() => startTest(false)}
                  disabled={running}
                  aria-busy={running && !incognitoMode}
                  aria-label={running && !incognitoMode ? 'Speed test in progress' : status === 'done' ? 'Run speed test again' : 'Start speed test'}
                  className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[#ff7b6b] to-[#f4b8c5] px-5 py-3 font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(255,123,107,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:scale-100 text-sm ripple flex-1"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {running && !incognitoMode ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Testing...
                      </>
                    ) : status === "done" ? (
                      "Test Again"
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Start Test
                      </>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => startTest(true)}
                  disabled={running}
                  title="Run test without saving to history"
                  className="group relative overflow-hidden rounded-full bg-[var(--background-secondary)] border border-[var(--border)] px-4 py-3 font-semibold text-[var(--foreground)] transition-all duration-300 hover:scale-[1.02] hover:bg-[var(--card)] disabled:cursor-not-allowed disabled:opacity-60 disabled:scale-100 text-sm"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {running && incognitoMode ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </>
                    ) : (
                      <span className="text-base" aria-hidden="true">🕵️</span>
                    )}
                  </span>
                </button>
              </div>

              {/* Test Options Toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                aria-expanded={showSettings}
                aria-controls="test-options-panel"
                className="flex items-center justify-center gap-2 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Test Options
              </button>

              {/* Test Options Panel */}
              {showSettings && (
                <div id="test-options-panel" role="region" aria-label="Test configuration options" className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
                  {/* Test Profile */}
                  <div role="group" aria-labelledby="test-duration-label">
                    <label id="test-duration-label" className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2 block">Test Duration</label>
                    <div className="flex gap-1" role="radiogroup">
                      {(['quick', 'standard', 'extended'] as TestProfile[]).map((profile) => (
                        <button
                          key={profile}
                          onClick={() => setTestProfile(profile)}
                          disabled={running}
                          role="radio"
                          aria-checked={testProfile === profile}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            testProfile === profile
                              ? 'bg-gradient-to-r from-[#ff7b6b] to-[#f4b8c5] text-white'
                              : 'bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                          } disabled:opacity-50`}
                        >
                          {profile === 'quick' ? '15s' : profile === 'standard' ? '30s' : '60s'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Network Type */}
                  <div>
                    <label className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2 block">Network Type</label>
                    <div className="flex gap-1">
                      {(['wifi', 'ethernet', 'mobile'] as NetworkType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNetworkType(type)}
                          disabled={running}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                            networkType === type
                              ? 'bg-gradient-to-r from-[#ff7b6b] to-[#f4b8c5] text-white'
                              : 'bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                          } disabled:opacity-50`}
                        >
                          {type === 'wifi' && '📶'}
                          {type === 'ethernet' && '🔌'}
                          {type === 'mobile' && '📱'}
                          <span className="capitalize">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location Tag */}
                  <div>
                    <label className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2 block">Location Tag</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Home Office, Living Room"
                      disabled={running}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm placeholder:text-[var(--foreground-muted)]/50 focus:outline-none focus:border-[#ff7b6b] transition-colors disabled:opacity-50"
                    />
                  </div>

                  {/* Server Selection */}
                  <div>
                    <label className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2 block">Test Server</label>
                    <select
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(e.target.value)}
                      disabled={running}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#ff7b6b] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {TEST_SERVERS.map((server) => (
                        <option key={server.id} value={server.id}>
                          {server.name} - {server.location}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                      {selectedServer === 'auto' ? 'Will select nearest server' : `Region: ${TEST_SERVERS.find(s => s.id === selectedServer)?.region}`}
                    </p>
                  </div>

                  {/* Data Retention Controls */}
                  <div className="pt-3 border-t border-[var(--border)]">
                    <button
                      onClick={() => setShowDataControls(!showDataControls)}
                      className="flex items-center justify-between w-full text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span className="uppercase tracking-wider">Data Retention</span>
                      <svg className={`w-4 h-4 transition-transform ${showDataControls ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showDataControls && (
                      <div className="mt-3 space-y-3">
                        {/* Max Entries */}
                        <div>
                          <label className="text-[10px] text-[var(--foreground-muted)] mb-1 block">Max History Entries</label>
                          <select
                            value={dataRetention.maxEntries}
                            onChange={(e) => setDataRetention(prev => ({ ...prev, maxEntries: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#ff7b6b] transition-colors cursor-pointer"
                          >
                            <option value={25}>25 entries</option>
                            <option value={50}>50 entries</option>
                            <option value={100}>100 entries</option>
                            <option value={250}>250 entries</option>
                            <option value={500}>500 entries</option>
                          </select>
                        </div>
                        
                        {/* Auto Delete */}
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-[var(--foreground-muted)]">Auto-delete old data</label>
                          <button
                            onClick={() => setDataRetention(prev => ({ ...prev, autoDelete: !prev.autoDelete }))}
                            className={`w-10 h-5 rounded-full transition-colors ${dataRetention.autoDelete ? 'bg-[#34d399]' : 'bg-[var(--background-secondary)]'}`}
                          >
                            <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${dataRetention.autoDelete ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        
                        {/* Delete After Days */}
                        {dataRetention.autoDelete && (
                          <div>
                            <label className="text-[10px] text-[var(--foreground-muted)] mb-1 block">Delete after</label>
                            <select
                              value={dataRetention.deleteAfterDays}
                              onChange={(e) => setDataRetention(prev => ({ ...prev, deleteAfterDays: parseInt(e.target.value) }))}
                              className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#ff7b6b] transition-colors cursor-pointer"
                            >
                              <option value={7}>7 days</option>
                              <option value={14}>14 days</option>
                              <option value={30}>30 days</option>
                              <option value={60}>60 days</option>
                              <option value={90}>90 days</option>
                            </select>
                          </div>
                        )}
                        
                        {/* Clear All Data */}
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete all test history? This cannot be undone.')) {
                              setHistory([]);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[#ff7b6b]/20 text-[#ff7b6b] text-sm font-medium hover:bg-[#ff7b6b]/30 transition-colors"
                        >
                          🗑️ Clear All History
                        </button>
                        
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          Currently storing {history.length} test results
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </header>

          {/* Stats Section */}
          <section className="grid gap-8 lg:grid-cols-2">
            {/* Live metrics card */}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl card-hover">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-[#f4b8c5] font-semibold">Live metrics</p>
                <h3 className="text-sm text-[var(--foreground-muted)]">Current test status</h3>
              </div>
              
              {status === "running" && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <CircularGauge value={ping} max={50} label="Ping" unit="ms" color="#34d399" size={90} />
                  <CircularGauge value={download} max={ispDown * 1.2} label="Down" unit="Mbps" color="#ff7b6b" size={90} />
                  <CircularGauge value={upload} max={ispUp * 1.2} label="Up" unit="Mbps" color="#f4b8c5" size={90} />
                </div>
              )}
              
              {status !== "running" && latest?.stats && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--background)] px-6 py-4 border border-[var(--border)]">
                      <span className="text-4xl font-bold">{latest.stats.grade}</span>
                      <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">Overall Grade</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${getConditionBadge(latest.stats.grade).color}20`, color: getConditionBadge(latest.stats.grade).color }}>
                        {getConditionBadge(latest.stats.grade).label}
                      </div>
                      <div className="text-xs text-[var(--foreground-muted)]">
                        Stability: {latest.stats.stabilityScore}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-[var(--background)] px-2 py-3">
                      <p className="text-xs text-white/60">Jitter</p>
                      <p className="text-sm font-bold text-white">{latest.stats.jitter.toFixed(1)}ms</p>
                    </div>
                    <div className="rounded-xl bg-black/40 px-2 py-3">
                      <p className="text-xs text-[var(--foreground-muted)]">Trend</p>
                      <p className="text-sm font-bold">{latest.stats.trendSlope > 0 ? '📈' : latest.stats.trendSlope < 0 ? '📉' : '➡️'}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--background)] px-2 py-3">
                      <p className="text-xs text-[var(--foreground-muted)]">Tests</p>
                      <p className="text-sm font-bold">{history.length}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {status === "idle" && !latest?.stats && (
                <div className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
                  Run a test to see detailed metrics
                </div>
              )}
            </div>
            
            {/* Advanced Stats Card */}
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl card-hover">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-[#ff7b6b] font-semibold">Advanced Analytics</p>
                <h3 className="text-sm text-[var(--foreground-muted)]">Network performance insights</h3>
              </div>
              
              {latest?.stats ? (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[var(--background)] p-3 border border-[var(--border)]">
                      <p className="text-xs text-[var(--foreground-muted)]">Jitter</p>
                      <p className="text-lg font-bold text-[#34d399]">{latest.stats.jitter.toFixed(1)} <span className="text-xs font-normal">ms</span></p>
                    </div>
                    <div className="rounded-xl bg-[var(--background)] p-3 border border-[var(--border)]">
                      <p className="text-xs text-[var(--foreground-muted)]">DNS Lookup</p>
                      <p className="text-lg font-bold text-[#60a5fa]">{latest.dnsLookupTime || dnsLookupTime || '—'} <span className="text-xs font-normal">ms</span></p>
                    </div>
                    <div className="rounded-xl bg-[var(--background)] p-3 border border-[var(--border)]">
                      <p className="text-xs text-[var(--foreground-muted)]">P95 Down</p>
                      <p className="text-lg font-bold text-[#ff7b6b]">{latest.stats.downloadStats.p95.toFixed(1)} <span className="text-xs font-normal">Mbps</span></p>
                    </div>
                    <div className="rounded-xl bg-[var(--background)] p-3 border border-[var(--border)]">
                      <p className="text-xs text-[var(--foreground-muted)]">Min Down</p>
                      <p className="text-lg font-bold text-[#fbbf24]">{latest.stats.downloadStats.min.toFixed(1)} <span className="text-xs font-normal">Mbps</span></p>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-[var(--background)] p-4 border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[var(--foreground-muted)]">Speed Consistency</p>
                      <p className="text-xs font-semibold text-[#34d399]">{latest.stats.stabilityScore}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--background-secondary)] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-[#ff7b6b] via-[#fbbf24] to-[#34d399] transition-all duration-500"
                        style={{ width: `${latest.stats.stabilityScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
                  Complete a test to see analytics
                </div>
              )}
            </div>
          </section>

          {/* Traceroute Visualization */}
          {tracerouteData.length > 0 && (
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-[#34d399] font-semibold">Network Path</p>
                  <h3 className="text-sm text-[var(--foreground-muted)]">Traceroute to test server</h3>
                </div>
                <button
                  onClick={() => setShowTraceroute(!showTraceroute)}
                  className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center gap-1"
                >
                  {showTraceroute ? 'Hide' : 'Show'} Details
                  <svg className={`w-4 h-4 transition-transform ${showTraceroute ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Mini summary */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔗</span>
                  <span className="text-sm font-medium">{tracerouteData.length} hops</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏱️</span>
                  <span className="text-sm font-medium">{tracerouteData[tracerouteData.length - 1]?.latency || 0}ms total</span>
                </div>
                <div className="flex items-center gap-2">
                  {tracerouteData.some(h => h.status === 'slow') ? (
                    <><span className="text-lg">⚠️</span><span className="text-sm text-[#fbbf24]">Some slow hops</span></>
                  ) : (
                    <><span className="text-lg">✅</span><span className="text-sm text-[#34d399]">All hops healthy</span></>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌐</span>
                  <span className={`text-sm font-medium ${
                    ipInfo.protocol === 'dual-stack' ? 'text-[#34d399]' :
                    ipInfo.protocol === 'ipv6' ? 'text-[#60a5fa]' :
                    ipInfo.protocol === 'ipv4' ? 'text-[#fbbf24]' : 'text-[var(--foreground-muted)]'
                  }`}>
                    {ipInfo.protocol === 'dual-stack' ? 'IPv4 + IPv6' :
                     ipInfo.protocol === 'ipv6' ? 'IPv6 Only' :
                     ipInfo.protocol === 'ipv4' ? 'IPv4 Only' : 'Detecting...'}
                  </span>
                </div>
                {routerHealth.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📡</span>
                    <span className={`text-sm font-medium ${
                      routerHealth.status === 'healthy' ? 'text-[#34d399]' :
                      routerHealth.status === 'warning' ? 'text-[#fbbf24]' : 'text-[#ff7b6b]'
                    }`}>
                      {routerHealth.status === 'healthy' ? 'Router OK' :
                       routerHealth.status === 'warning' ? 'Router Warning' : 'Router Issues'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* IP Address Info */}
              {(ipInfo.ipv4 || ipInfo.ipv6) && showTraceroute && (
                <div className="mb-4 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--foreground-muted)] mb-2">Your IP Addresses</p>
                  <div className="flex flex-col gap-1">
                    {ipInfo.ipv4 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#fbbf24]">IPv4:</span>
                        <code className="text-xs font-mono">{ipInfo.ipv4}</code>
                      </div>
                    )}
                    {ipInfo.ipv6 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#60a5fa]">IPv6:</span>
                        <code className="text-xs font-mono truncate">{ipInfo.ipv6}</code>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Router Health Check */}
              {routerHealth.status && showTraceroute && (
                <div className="mb-4 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-[var(--foreground-muted)]">Router Health</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      routerHealth.status === 'healthy' ? 'bg-[#34d399]/20 text-[#34d399]' :
                      routerHealth.status === 'warning' ? 'bg-[#fbbf24]/20 text-[#fbbf24]' :
                      'bg-[#ff7b6b]/20 text-[#ff7b6b]'
                    }`}>
                      {routerHealth.status === 'healthy' ? '✓ Healthy' :
                       routerHealth.status === 'warning' ? '⚠ Warning' : '✗ Issues'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[var(--card)]">
                      <p className="text-[10px] text-[var(--foreground-muted)] mb-1">Gateway Latency</p>
                      <p className={`text-sm font-bold ${
                        (routerHealth.gatewayLatency || 0) < 2 ? 'text-[#34d399]' :
                        (routerHealth.gatewayLatency || 0) < 5 ? 'text-[#fbbf24]' : 'text-[#ff7b6b]'
                      }`}>{routerHealth.gatewayLatency}ms</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--card)]">
                      <p className="text-[10px] text-[var(--foreground-muted)] mb-1">Packet Loss</p>
                      <p className={`text-sm font-bold ${
                        (routerHealth.packetLoss || 0) === 0 ? 'text-[#34d399]' :
                        (routerHealth.packetLoss || 0) < 2 ? 'text-[#fbbf24]' : 'text-[#ff7b6b]'
                      }`}>{routerHealth.packetLoss}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--card)]">
                      <p className="text-[10px] text-[var(--foreground-muted)] mb-1">Signal Strength</p>
                      <p className={`text-sm font-bold ${
                        routerHealth.signalStrength === 'excellent' ? 'text-[#34d399]' :
                        routerHealth.signalStrength === 'good' ? 'text-[#60a5fa]' :
                        routerHealth.signalStrength === 'fair' ? 'text-[#fbbf24]' : 'text-[#ff7b6b]'
                      }`}>
                        {routerHealth.signalStrength === 'excellent' ? '████ Excellent' :
                         routerHealth.signalStrength === 'good' ? '███░ Good' :
                         routerHealth.signalStrength === 'fair' ? '██░░ Fair' : '█░░░ Poor'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--card)]">
                      <p className="text-[10px] text-[var(--foreground-muted)] mb-1">Stability</p>
                      <p className={`text-sm font-bold ${
                        (routerHealth.connectionStability || 0) >= 98 ? 'text-[#34d399]' :
                        (routerHealth.connectionStability || 0) >= 95 ? 'text-[#60a5fa]' : 'text-[#fbbf24]'
                      }`}>{routerHealth.connectionStability}%</p>
                    </div>
                  </div>
                  
                  {routerHealth.issues.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-[var(--foreground-muted)]">Issues Detected:</p>
                      {routerHealth.issues.map((issue, i) => (
                        <p key={i} className="text-xs text-[#fbbf24] flex items-center gap-1">
                          <span>⚠</span> {issue}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {showTraceroute && (
                <div className="space-y-2">
                  {tracerouteData.map((hop, index) => (
                    <div key={hop.hop} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-xs font-bold">
                        {hop.hop}
                      </div>
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-[var(--border)] to-[var(--border)]" style={{
                        background: hop.status === 'ok' ? '#34d399' : hop.status === 'slow' ? '#fbbf24' : '#ff7b6b'
                      }} />
                      <div className="flex-[3] min-w-0">
                        <p className="text-xs font-mono truncate">{hop.host}</p>
                      </div>
                      <div className={`text-xs font-bold w-16 text-right ${
                        hop.status === 'ok' ? 'text-[#34d399]' : 
                        hop.status === 'slow' ? 'text-[#fbbf24]' : 'text-[#ff7b6b]'
                      }`}>
                        {hop.latency}ms
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Speed Comparison & Smart Insights - Side by Side */}
          {latest && (
            <section className="grid gap-6 lg:grid-cols-2">
              {/* Speed Comparison - Vertical Bars */}
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
                <div className="space-y-1 mb-4">
                  <p className="text-xs uppercase tracking-wider text-[#60a5fa] font-semibold">Speed Comparison</p>
                  <h3 className="text-sm text-[var(--foreground-muted)]">Current vs Baseline</h3>
                </div>
                
                {/* Vertical Bar Chart */}
                <div className="flex items-end justify-around gap-4 h-40">
                  {/* Download */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1 items-end h-28">
                      <div className="w-6 rounded-t bg-gradient-to-t from-[#ff7b6b] to-[#ff9d91] transition-all" style={{ height: `${Math.min((latest.download / Math.max(ispDown, latest.download) * 1.1) * 100, 100)}%` }} title={`Current: ${latest.download.toFixed(1)}`} />
                      <div className="w-6 rounded-t bg-[#60a5fa]/60 transition-all" style={{ height: `${Math.min((ispDown / Math.max(ispDown, latest.download) * 1.1) * 100, 100)}%` }} title={`Baseline: ${ispDown}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">↓ Down</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{latest.download.toFixed(0)} Mbps</p>
                    </div>
                  </div>
                  
                  {/* Upload */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1 items-end h-28">
                      <div className="w-6 rounded-t bg-gradient-to-t from-[#f4b8c5] to-[#fad4dd] transition-all" style={{ height: `${Math.min((latest.upload / Math.max(ispUp, latest.upload) * 1.1) * 100, 100)}%` }} />
                      <div className="w-6 rounded-t bg-[#60a5fa]/60 transition-all" style={{ height: `${Math.min((ispUp / Math.max(ispUp, latest.upload) * 1.1) * 100, 100)}%` }} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">↑ Up</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{latest.upload.toFixed(0)} Mbps</p>
                    </div>
                  </div>
                  
                  {/* Ping */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1 items-end h-28">
                      <div className="w-6 rounded-t bg-gradient-to-t from-[#34d399] to-[#6ee7b7] transition-all" style={{ height: `${Math.min((latest.ping / Math.max(ispPing * 2, latest.ping)) * 100, 100)}%` }} />
                      <div className="w-6 rounded-t bg-[#60a5fa]/60 transition-all" style={{ height: `${Math.min((ispPing / Math.max(ispPing * 2, latest.ping)) * 100, 100)}%` }} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium">⏱ Ping</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{latest.ping} ms</p>
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 pt-3 mt-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-r from-[#ff7b6b] to-[#f4b8c5]" />
                    <span className="text-[10px] text-[var(--foreground-muted)]">Current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-[#60a5fa]/60" />
                    <span className="text-[10px] text-[var(--foreground-muted)]">Baseline</span>
                  </div>
                </div>
              </div>
              
              {/* Smart Insights */}
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
                <div className="space-y-1 mb-4">
                  <p className="text-xs uppercase tracking-wider text-[#fbbf24] font-semibold">Smart Insights</p>
                  <h3 className="text-sm text-[var(--foreground-muted)]">AI-powered recommendations</h3>
                </div>
                
                {smartInsights.length > 0 ? (
                  <div className="space-y-2">
                    {smartInsights.slice(0, 4).map((insight, index) => (
                      <div 
                        key={index}
                        className={`rounded-xl p-3 border transition-all ${
                          insight.type === 'success' ? 'bg-[#34d399]/10 border-[#34d399]/30' :
                          insight.type === 'warning' ? 'bg-[#fbbf24]/10 border-[#fbbf24]/30' :
                          insight.type === 'tip' ? 'bg-[#60a5fa]/10 border-[#60a5fa]/30' :
                          'bg-[var(--background)] border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{insight.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs">{insight.title}</p>
                            <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5 leading-relaxed">{insight.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-[var(--foreground-muted)] py-8">
                    Complete a test to see insights
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ISP Baseline Section - Moved Up */}
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl" id="baseline-section">
            <div className="grid gap-6 md:grid-cols-[1fr,1.5fr]">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#60a5fa] font-semibold">ISP Baseline</p>
                <h2 className="mt-1 text-lg font-bold">Set your expectations</h2>
                <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                  Enter your ISP plan speeds to compare against test results.
                </p>
              </div>
              <div className="grid gap-3 grid-cols-3">
                {[
                  { label: "Download", unit: "Mbps", value: ispDown, onChange: (v: number) => setIspDown(clamp(v, 1, 2000)) },
                  { label: "Upload", unit: "Mbps", value: ispUp, onChange: (v: number) => setIspUp(clamp(v, 1, 2000)) },
                  { label: "Ping", unit: "ms", value: ispPing, onChange: (v: number) => setIspPing(clamp(v, 1, 200)) },
                ].map((field) => (
                  <label key={field.label} className="flex flex-col gap-1.5 text-xs">
                    <span className="text-[var(--foreground-muted)] font-medium">{field.label} <span className="opacity-60">({field.unit})</span></span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:border-[#60a5fa] transition-colors text-sm font-medium"
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Peak/Off-Peak Performance Analysis */}
          {peakAnalysis && (
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
              <div className="space-y-1 mb-6">
                <p className="text-xs uppercase tracking-wider text-[#34d399] font-semibold">Peak Analysis</p>
                <h3 className="text-sm text-[var(--foreground-muted)]">Best times to use your connection</h3>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Best/Worst Time Cards */}
                <div className="rounded-xl bg-[#34d399]/10 border border-[#34d399]/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🚀</span>
                    <span className="text-xs font-semibold text-[#34d399] uppercase tracking-wider">Best Time</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {peakAnalysis.bestHour.hour % 12 || 12}:00 {peakAnalysis.bestHour.hour >= 12 ? 'PM' : 'AM'}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    Avg {peakAnalysis.bestHour.avgDown.toFixed(0)} Mbps ({peakAnalysis.bestHour.testCount} tests)
                  </p>
                </div>
                
                <div className="rounded-xl bg-[#ff7b6b]/10 border border-[#ff7b6b]/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🐢</span>
                    <span className="text-xs font-semibold text-[#ff7b6b] uppercase tracking-wider">Slowest Time</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {peakAnalysis.worstHour.hour % 12 || 12}:00 {peakAnalysis.worstHour.hour >= 12 ? 'PM' : 'AM'}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    Avg {peakAnalysis.worstHour.avgDown.toFixed(0)} Mbps ({peakAnalysis.worstHour.testCount} tests)
                  </p>
                </div>
              </div>

              {/* Time Period Breakdown */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--foreground-muted)] mb-3">Speed by Time of Day</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '🌅 Morning', value: peakAnalysis.periodAverages.morning, period: '6AM-12PM' },
                    { label: '☀️ Afternoon', value: peakAnalysis.periodAverages.afternoon, period: '12PM-6PM' },
                    { label: '🌆 Evening', value: peakAnalysis.periodAverages.evening, period: '6PM-10PM' },
                    { label: '🌙 Night', value: peakAnalysis.periodAverages.night, period: '10PM-6AM' },
                  ].map((period) => (
                    <div key={period.label} className="text-center rounded-lg bg-[var(--background)] p-3 border border-[var(--border)]">
                      <p className="text-xs mb-1">{period.label}</p>
                      <p className="text-lg font-bold">{period.value > 0 ? period.value.toFixed(0) : '—'}</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{period.value > 0 ? 'Mbps' : 'No data'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Anomaly Alerts */}
          {anomalies.length > 0 && (
            <section className="rounded-3xl border border-[#fbbf24]/30 bg-[#fbbf24]/5 p-6 shadow-xl">
              <div className="space-y-1 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <p className="text-xs uppercase tracking-wider text-[#fbbf24] font-semibold">Anomalies Detected</p>
                </div>
                <h3 className="text-sm text-[var(--foreground-muted)]">Unusual patterns in your test history</h3>
              </div>
              
              <div className="space-y-2">
                {anomalies.map((anomaly, index) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-3 rounded-xl p-3 border ${
                      anomaly.severity === 'critical' 
                        ? 'bg-[#ff7b6b]/10 border-[#ff7b6b]/30' 
                        : 'bg-[#fbbf24]/10 border-[#fbbf24]/30'
                    }`}
                  >
                    <span className={`text-sm ${anomaly.severity === 'critical' ? 'text-[#ff7b6b]' : 'text-[#fbbf24]'}`}>
                      {anomaly.severity === 'critical' ? '🔴' : '🟡'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{anomaly.message}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {new Date(anomaly.timestamp).toLocaleDateString()} at {new Date(anomaly.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Privacy Report */}
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <div className="space-y-1 mb-6">
              <p className="text-xs uppercase tracking-wider text-[#10b981] font-semibold">Privacy Report</p>
              <h3 className="text-sm text-[var(--foreground-muted)]">How we handle your data</h3>
            </div>
            
            <div className="space-y-4">
              {/* Data Storage Overview */}
              <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="font-medium text-sm">100% Local Storage</p>
                    <p className="text-xs text-[var(--foreground-muted)]">All your test data stays on your device</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--foreground-muted)]">Test Results</span>
                    <span className="text-[#10b981]">✓ Stored locally</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--foreground-muted)]">Settings & Preferences</span>
                    <span className="text-[#10b981]">✓ Stored locally</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--foreground-muted)]">IP Address</span>
                    <span className="text-[#fbbf24]">⚡ Used transiently</span>
                  </div>
                </div>
              </div>
              
              {/* Data Categories */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📊</span>
                    <span className="text-xs font-semibold text-[#10b981]">LOCAL DATA</span>
                  </div>
                  <ul className="text-xs space-y-1 text-[var(--foreground-muted)]">
                    <li>• Speed test results ({history.length} entries)</li>
                    <li>• Location tags you create</li>
                    <li>• Theme & accessibility settings</li>
                    <li>• Data retention preferences</li>
                    <li>• Achievement progress</li>
                  </ul>
                </div>
                
                <div className="rounded-xl bg-[#60a5fa]/10 border border-[#60a5fa]/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🌐</span>
                    <span className="text-xs font-semibold text-[#60a5fa]">NETWORK DATA</span>
                  </div>
                  <ul className="text-xs space-y-1 text-[var(--foreground-muted)]">
                    <li>• IP address (for IP detection only)</li>
                    <li>• Connection measurements</li>
                    <li>• DNS lookup times</li>
                    <li>• Not stored on any server</li>
                    <li>• Not shared with third parties</li>
                  </ul>
                </div>
              </div>
              
              {/* Privacy Features - Functional Controls */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--foreground-muted)] font-medium">Your Privacy Controls:</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button 
                    onClick={() => setIncognitoMode(!incognitoMode)}
                    className={`flex items-center gap-2 rounded-lg p-2 border transition-all text-left ${
                      incognitoMode 
                        ? 'bg-[#a78bfa]/20 border-[#a78bfa]/50' 
                        : 'bg-[var(--background)] border-[var(--border)] hover:border-[#a78bfa]/30'
                    }`}
                    aria-pressed={incognitoMode}
                  >
                    <span className="text-sm">🕶️</span>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Incognito</span>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{incognitoMode ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('Clear all test history? This cannot be undone.')) {
                        setHistory([]);
                        localStorage.removeItem('speedtest_history');
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg bg-[var(--background)] p-2 border border-[var(--border)] hover:border-[#ff7b6b]/50 hover:bg-[#ff7b6b]/10 transition-all text-left"
                    aria-label="Delete all history"
                  >
                    <span className="text-sm">🗑️</span>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Delete All</span>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{history.length} entries</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      setDataRetention(prev => ({ ...prev, autoDelete: !prev.autoDelete }));
                    }}
                    className={`flex items-center gap-2 rounded-lg p-2 border transition-all text-left ${
                      dataRetention.autoDelete 
                        ? 'bg-[#10b981]/20 border-[#10b981]/50' 
                        : 'bg-[var(--background)] border-[var(--border)] hover:border-[#10b981]/30'
                    }`}
                    aria-pressed={dataRetention.autoDelete}
                  >
                    <span className="text-sm">⏰</span>
                    <div className="flex-1">
                      <span className="text-xs font-medium">Auto-Delete</span>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{dataRetention.autoDelete ? `${dataRetention.deleteAfterDays}d` : 'Off'}</p>
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Current Settings Summary */}
              <div className="pt-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--foreground-muted)] mb-2">Current Data Settings:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded-full bg-[var(--background)] text-xs border border-[var(--border)]">
                    📦 Max {dataRetention.maxEntries} entries
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs border ${
                    dataRetention.autoDelete ? 'bg-[#10b981]/20 border-[#10b981]/30 text-[#10b981]' : 'bg-[var(--background)] border-[var(--border)]'
                  }`}>
                    {dataRetention.autoDelete ? `⏰ Auto-delete after ${dataRetention.deleteAfterDays} days` : '⏸️ Manual deletion only'}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-[var(--background)] text-xs border border-[var(--border)]">
                    💾 ~{((JSON.stringify(history).length / 1024)).toFixed(1)}KB stored
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Performance Benchmarks - Compact Grid */}
          {latest && (
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-[#a78bfa] font-semibold">Performance Benchmarks</p>
                  <h3 className="text-sm text-[var(--foreground-muted)]">Industry standards comparison</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  latest.download >= 100 ? 'bg-[#34d399]/20 text-[#34d399]' :
                  latest.download >= 25 ? 'bg-[#60a5fa]/20 text-[#60a5fa]' :
                  latest.download >= 10 ? 'bg-[#fbbf24]/20 text-[#fbbf24]' : 'bg-[#ff7b6b]/20 text-[#ff7b6b]'
                }`}>
                  {latest.download >= 100 ? '🚀 Power User' :
                   latest.download >= 50 ? '✨ All Supported' :
                   latest.download >= 25 ? '👍 Most Supported' :
                   latest.download >= 10 ? '⚠️ Basic Only' : '❌ Limited'}
                </span>
              </div>
              
              {/* Compact Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { name: 'HD Stream', required: 5, icon: '📺' },
                  { name: '4K Stream', required: 25, icon: '🎬' },
                  { name: 'Gaming', required: 10, icon: '🎮' },
                  { name: 'Video Calls', required: 3, icon: '💻' },
                  { name: 'Remote Work', required: 10, icon: '🏠' },
                  { name: 'Downloads', required: 25, icon: '📦' }
                ].map((b) => {
                  const ok = latest.download >= b.required;
                  return (
                    <div key={b.name} className={`rounded-xl p-3 border text-center transition-all ${
                      ok ? 'bg-[#34d399]/10 border-[#34d399]/30' : 'bg-[#ff7b6b]/10 border-[#ff7b6b]/30'
                    }`}>
                      <span className="text-lg">{b.icon}</span>
                      <p className="text-xs font-medium mt-1">{b.name}</p>
                      <p className={`text-[10px] font-semibold ${ok ? 'text-[#34d399]' : 'text-[#ff7b6b]'}`}>
                        {ok ? '✓' : '✗'} {b.required} Mbps
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* History Section */}
          <section className="space-y-6" id="history-section">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#f4b8c5] font-semibold">History</p>
                <h3 className="text-xl font-semibold">Recent Tests</h3>
              </div>
              {history.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={exportAsCSV}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium hover:bg-[var(--card-hover)] transition-colors ripple"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={exportAsJSON}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium hover:bg-[var(--card-hover)] transition-colors ripple"
                  >
                    Export JSON
                  </button>
                </div>
              )}
            </div>
            
            {history.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-[var(--foreground-muted)]">No tests yet. Run your first test to see results here.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {history.slice(0, 6).map((result) => (
                  <div key={result.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 card-hover">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--foreground-muted)]">{new Date(result.timestamp).toLocaleTimeString()}</span>
                        {result.networkType && (
                          <span className="text-xs">
                            {result.networkType === 'wifi' && '📶'}
                            {result.networkType === 'ethernet' && '🔌'}
                            {result.networkType === 'mobile' && '📱'}
                          </span>
                        )}
                      </div>
                      <span className="text-lg font-bold">{result.stats?.grade || "—"}</span>
                    </div>
                    {result.location && (
                      <p className="text-[10px] text-[var(--foreground-muted)] mb-2 truncate">📍 {result.location}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-[#ff7b6b]">{result.download.toFixed(1)}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">↓ Mbps</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#f4b8c5]">{result.upload.toFixed(1)}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">↑ Mbps</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#34d399]">{result.ping}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">ms</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </main>

        {/* Results Modal */}
        {showResultsModal && latest && (
          <ResultsModal 
            isOpen={showResultsModal}
            result={latest}
            onClose={() => setShowResultsModal(false)}
            onRunAgain={() => {
              setShowResultsModal(false);
              startTest(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
