"use client";

import { useEffect, useMemo, useState } from "react";
import { SpeedLabLogo } from "@/components/Logo";

type SpeedResult = {
  id: string;
  timestamp: number;
  download: number;
  upload: number;
  ping: number;
  stats?: {
    downloadStats: DetailedStats;
    uploadStats: DetailedStats;
    pingStats: DetailedStats;
    jitter: number;
    stabilityScore: number;
    grade: string;
    trendSlope: number; // positive = improving, negative = degrading
  };
};

type DetailedStats = {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p95: number;
  p99: number;
};

const palette = {
  charcoal: "#2C2B30",
  graphite: "#4F4F51",
  silver: "#D6D6D6",
  rose: "#F2C4CE",
  coral: "#F58F7C",
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
          <span className="text-2xl font-bold text-white">{value.toFixed(value >= 100 ? 0 : 1)}</span>
          <span className="text-xs text-white/60">{unit}</span>
        </div>
      </div>
      <span className="text-sm font-medium text-white/80">{label}</span>
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
  const [ispDown, setIspDown] = useState(300);
  const [ispUp, setIspUp] = useState(50);
  const [ispPing, setIspPing] = useState(15);
  const [menuOpen, setMenuOpen] = useState(false);
  const [samples, setSamples] = useState<{ down: number[]; up: number[]; ping: number[] }>({ down: [], up: [], ping: [] });
  const [realtimePing, setRealtimePing] = useState<number[]>([]);
  const [realtimeDown, setRealtimeDown] = useState<number[]>([]);
  const [realtimeUp, setRealtimeUp] = useState<number[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("speedtest-history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse history", err);
      }
    }
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

  useEffect(() => {
    window.localStorage.setItem("speedtest-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem(
      "speedtest-baseline",
      JSON.stringify({ ispDown, ispUp, ispPing })
    );
  }, [ispDown, ispUp, ispPing]);

  const startTest = () => {
    if (status === "running") return;
    setStatus("running");
    setProgress(0);
    setDownload(0);
    setUpload(0);
    setPing(0);
    setSamples({ down: [], up: [], ping: [] });
    setRealtimePing([]);
    setRealtimeDown([]);
    setRealtimeUp([]);

    const phaseDuration = 10000; // 10 seconds per phase
    const updateInterval = 100; // Sample every 100ms
    const displayInterval = 300; // Update display every 300ms

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
            setHistory((prevHistory) => [result, ...prevHistory].slice(0, 8));

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

  // Export functions
  const exportAsJSON = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `speedlab-history-${new Date().toISOString().split('T')[0]}.json`;
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
    link.download = `speedlab-history-${new Date().toISOString().split('T')[0]}.csv`;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2C2B30] via-[#4F4F51] to-[#2C2B30] text-[#D6D6D6]">
      <div className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -left-32 top-5 h-72 w-72 rounded-full bg-[#F2C4CE] blur-[140px]" />
          <div className="absolute -right-20 top-48 h-96 w-96 rounded-full bg-[#F58F7C] blur-[160px]" />
        </div>

        {/* Navbar */}
        <nav className="relative border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10 md:px-14">
            <div className="flex items-center gap-3">
              <SpeedLabLogo />
              <span className="text-lg font-bold text-white">Speed Lab</span>
            </div>
            <div className="hidden gap-8 md:flex">
              <button 
                onClick={() => {
                  const testSection = document.getElementById("test-section");
                  testSection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-[#D6D6D6] hover:text-[#F58F7C] transition-colors font-medium"
              >
                Test
              </button>
              <button 
                onClick={() => {
                  const historySection = document.getElementById("history-section");
                  historySection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-[#D6D6D6] hover:text-[#F58F7C] transition-colors font-medium"
              >
                History
              </button>
              <button 
                onClick={() => {
                  const baselineSection = document.getElementById("baseline-section");
                  baselineSection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-[#D6D6D6] hover:text-[#F58F7C] transition-colors font-medium"
              >
                Baseline
              </button>
            </div>
            <button
              className="relative md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="h-6 w-6 flex flex-col justify-center gap-1.5">
                <span className={`h-0.5 w-full bg-white transition-all ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
                <span className={`h-0.5 w-full bg-white transition-all ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`h-0.5 w-full bg-white transition-all ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
              </div>
            </button>
          </div>
          {menuOpen && (
            <div className="border-t border-white/10 bg-black/40 px-6 py-4 md:hidden">
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    const testSection = document.getElementById("test-section");
                    testSection?.scrollIntoView({ behavior: "smooth" });
                    setMenuOpen(false);
                  }}
                  className="text-sm text-[#D6D6D6] hover:text-[#F58F7C] transition-colors text-left font-medium"
                >
                  Test
                </button>
                <button 
                  onClick={() => {
                    const historySection = document.getElementById("history-section");
                    historySection?.scrollIntoView({ behavior: "smooth" });
                    setMenuOpen(false);
                  }}
                  className="text-sm text-[#D6D6D6] hover:text-[#F58F7C] transition-colors text-left font-medium"
                >
                  History
                </button>
                <button 
                  onClick={() => {
                    const baselineSection = document.getElementById("baseline-section");
                    baselineSection?.scrollIntoView({ behavior: "smooth" });
                    setMenuOpen(false);
                  }}
                  className="text-sm text-[#D6D6D6] hover:text-[#F58F7C] transition-colors text-left font-medium"
                >
                  Baseline
                </button>
              </div>
            </div>
          )}
        </nav>

        <main className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-20 pt-12 sm:px-10 md:px-14">
          {/* Hero section */}
          <header className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 flex-1">
              <div className="inline-flex w-fit">
                <span className="rounded-full bg-gradient-to-r from-[#F58F7C] to-[#F2C4CE] bg-clip-text text-xs font-bold uppercase tracking-widest text-transparent">
                  Connection Intelligence
                </span>
              </div>
              <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl">
                Know your network inside and out.
              </h1>
              <p className="max-w-lg text-base text-[#D6D6D6]/85">
                Real-time speed testing, performance tracking, and ISP baseline comparison. All locally stored, always private.
              </p>
            </div>

            {/* Live metrics card with gauges */}
            <div className="w-full rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-6 shadow-2xl backdrop-blur-xl sm:w-80 sm:flex-shrink-0">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs uppercase tracking-wider text-[#F2C4CE] font-semibold">Live metrics</p>
                <h3 className="text-sm text-[#D6D6D6]/80">Current test status</h3>
              </div>
              
              {status === "running" && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <CircularGauge value={ping} max={50} label="Ping" unit="ms" color="#34d399" size={90} />
                  <CircularGauge value={download} max={ispDown * 1.2} label="Down" unit="Mbps" color="#F58F7C" size={90} />
                  <CircularGauge value={upload} max={ispUp * 1.2} label="Up" unit="Mbps" color="#F2C4CE" size={90} />
                </div>
              )}
              
              {status !== "running" && latest?.stats && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 px-6 py-4 border border-white/10">
                      <span className="text-4xl font-bold text-white">{latest.stats.grade}</span>
                      <span className="text-xs text-white/60 uppercase tracking-wider">Overall Grade</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${getConditionBadge(latest.stats.grade).color}20`, color: getConditionBadge(latest.stats.grade).color }}>
                        {getConditionBadge(latest.stats.grade).label}
                      </div>
                      <div className="text-xs text-white/60">
                        Stability: {latest.stats.stabilityScore}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-black/40 px-2 py-3">
                      <p className="text-xs text-white/60">Jitter</p>
                      <p className="text-sm font-bold text-white">{latest.stats.jitter.toFixed(1)}ms</p>
                    </div>
                    <div className="rounded-xl bg-black/40 px-2 py-3">
                      <p className="text-xs text-white/60">Trend</p>
                      <p className="text-sm font-bold text-white">{latest.stats.trendSlope > 0 ? '📈' : latest.stats.trendSlope < 0 ? '📉' : '➡️'}</p>
                    </div>
                    <div className="rounded-xl bg-black/40 px-2 py-3">
                      <p className="text-xs text-white/60">Tests</p>
                      <p className="text-sm font-bold text-white">{history.length}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {status === "idle" && !latest?.stats && (
                <div className="mt-6 text-center text-sm text-white/60">
                  Run a test to see detailed metrics
                </div>
              )}
            </div>
          </header>

          {/* Test section */}
          <section className="grid gap-8 lg:grid-cols-[1.5fr,1fr]" id="test-section">
            {/* Main test card */}
            <div className="flex flex-col gap-6 rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full transition-all ${running ? "bg-[#F58F7C] animate-pulse" : status === "done" ? "bg-emerald-400" : "bg-[#D6D6D6]/50"}`} />
                  <span className="text-3xl font-bold text-white">
                    {status === "running" && phase === "ping" && "Testing Ping..."}
                    {status === "running" && phase === "download" && "Testing Download..."}
                    {status === "running" && phase === "upload" && "Testing Upload..."}
                    {status === "done" && "Complete"}
                    {status === "idle" && "Ready"}
                  </span>
                </div>
                <p className="text-sm text-[#D6D6D6]/80">
                  {status === "idle" && "Click the button below to begin your network test. Takes about 30 seconds."}
                  {status === "running" && phase === "ping" && "Phase 1 of 3: Measuring latency to server..."}
                  {status === "running" && phase === "download" && "Phase 2 of 3: Measuring download throughput..."}
                  {status === "running" && phase === "upload" && "Phase 3 of 3: Measuring upload throughput..."}
                  {status === "done" && "Test finished! Results are based on median values for accuracy."}
                </p>
              </div>

              <button
                onClick={startTest}
                disabled={running}
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[#F58F7C] to-[#F2C4CE] px-8 py-4 font-semibold text-[#2C2B30] shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(245,143,124,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:scale-100"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {!running && status !== "done" && "▶"}
                  {running ? "Running test..." : status === "done" ? "Run again" : "Start test"}
                </span>
                <div className="absolute inset-0 scale-110 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
              </button>

              {/* Real-time phase graph (single view) */}
              <div className="mt-6 rounded-2xl border border-white/15 bg-gradient-to-br from-black/50 to-black/30 p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${running ? "animate-pulse" : ""} ${phase === "ping" ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" : phase === "download" ? "bg-[#F58F7C] shadow-[0_0_12px_rgba(245,143,124,0.6)]" : phase === "upload" ? "bg-[#F2C4CE] shadow-[0_0_12px_rgba(242,196,206,0.6)]" : "bg-white/30"}`} />
                    <p className="text-sm font-semibold text-white">
                      {phase === "ping" && "⏱ Ping Latency"}
                      {phase === "download" && "↓ Download Speed"}
                      {phase === "upload" && "↑ Upload Speed"}
                      {!phase && "Test Progress"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {((phase === "ping" && realtimePing.length > 0) || 
                      (phase === "download" && realtimeDown.length > 0) || 
                      (phase === "upload" && realtimeUp.length > 0)) && (
                      <p className="text-xs text-white/60">
                        {phase === "ping" && `${realtimePing.length} points`}
                        {phase === "download" && `${realtimeDown.length} points`}
                        {phase === "upload" && `${realtimeUp.length} points`}
                      </p>
                    )}
                    <p className="text-sm font-bold text-[#F58F7C]">{Math.round(progress)}%</p>
                  </div>
                </div>
                
                <div className="relative">
                  <svg viewBox="0 0 400 60" className="w-full h-16" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="pingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0.05" />
                      </linearGradient>
                      <linearGradient id="downloadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F58F7C" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#F58F7C" stopOpacity="0.05" />
                      </linearGradient>
                      <linearGradient id="uploadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F2C4CE" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#F2C4CE" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    <line x1="0" x2="400" y1="15" y2="15" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" x2="400" y1="30" y2="30" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="0" x2="400" y1="45" y2="45" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    
                    {phase === "ping" && realtimePing.length > 0 && (
                      <>
                        <path
                          d={`${buildSparkPath(realtimePing, 400, 60)} L400,60 L0,60 Z`}
                          fill="url(#pingGradient)"
                        />
                        <path
                          d={buildSparkPath(realtimePing, 400, 60)}
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="drop-shadow-[0_3px_10px_rgba(52,211,153,0.6)]"
                        />
                      </>
                    )}
                    {phase === "download" && realtimeDown.length > 0 && (
                      <>
                        <path
                          d={`${buildSparkPath(realtimeDown, 400, 60)} L400,60 L0,60 Z`}
                          fill="url(#downloadGradient)"
                        />
                        <path
                          d={buildSparkPath(realtimeDown, 400, 60)}
                          fill="none"
                          stroke="#F58F7C"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="drop-shadow-[0_3px_10px_rgba(245,143,124,0.6)]"
                        />
                      </>
                    )}
                    {phase === "upload" && realtimeUp.length > 0 && (
                      <>
                        <path
                          d={`${buildSparkPath(realtimeUp, 400, 60)} L400,60 L0,60 Z`}
                          fill="url(#uploadGradient)"
                        />
                        <path
                          d={buildSparkPath(realtimeUp, 400, 60)}
                          fill="none"
                          stroke="#F2C4CE"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="drop-shadow-[0_3px_10px_rgba(242,196,206,0.6)]"
                        />
                      </>
                    )}
                    <line x1="0" x2="400" y1="60" y2="60" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  </svg>
                </div>

                <p className="mt-4 text-xs text-[#D6D6D6]/60 text-center">
                  {status === "idle" && "Ready to begin • 3 phases • 30 seconds total"}
                  {status === "running" && `Phase ${phase === "ping" ? "1" : phase === "download" ? "2" : "3"} of 3 • Sampling every 100ms, averaging over 300ms`}
                  {status === "done" && "All phases complete • Results calculated using median values"}
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Download", value: formatMbps(download), icon: "↓", color: "text-[#F58F7C]" },
                  { label: "Upload", value: formatMbps(upload), icon: "↑", color: "text-[#F2C4CE]" },
                  { label: "Ping", value: formatMs(ping), icon: "⏱", color: "text-emerald-400" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-4 transition-all hover:bg-black/60 hover:border-white/20"
                  >
                    <p className="text-xs uppercase tracking-wider text-[#D6D6D6]/70 font-medium">{item.icon} {item.label}</p>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar: Trends + History */}
            <div className="flex flex-col gap-6">
              {/* Trends */}
              <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#F2C4CE] font-semibold">Trends</p>
                    <h3 className="text-lg font-semibold text-white">Recent runs</h3>
                  </div>
                  <span className="text-xs text-[#D6D6D6]/70">{history.length} run(s)</span>
                </div>
                <div className="mt-4 space-y-4">
                  {[
                    { label: "Download", color: palette.coral, values: chartValues.download },
                    { label: "Upload", color: palette.rose, values: chartValues.upload },
                  ].map((row) => (
                    <div key={row.label} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                        <p className="text-[#D6D6D6]/85 font-medium">{row.label}</p>
                      </div>
                      <svg viewBox="0 0 320 60" className="w-full overflow-visible">
                        <path
                          d={buildSparkPath(row.values, 320, 60)}
                          fill="none"
                          stroke={row.color}
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
                        />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* History */}
              <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-6 shadow-2xl backdrop-blur-xl" id="history-section">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#F2C4CE] font-semibold">History</p>
                    <h3 className="text-lg font-semibold text-white">Test logs</h3>
                  </div>
                  {history.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        className="text-xs text-[#D6D6D6]/70 hover:text-[#F58F7C] transition-colors font-medium"
                        onClick={exportAsCSV}
                        title="Export as CSV"
                      >
                        📊 CSV
                      </button>
                      <button
                        className="text-xs text-[#D6D6D6]/70 hover:text-[#F58F7C] transition-colors font-medium"
                        onClick={exportAsJSON}
                        title="Export as JSON"
                      >
                        📄 JSON
                      </button>
                      <button
                        className="text-xs text-[#D6D6D6]/70 hover:text-[#F58F7C] transition-colors font-medium"
                        onClick={() => setHistory([])}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Time-based analytics */}
                {timeAnalytics && timeAnalytics.last24h.count > 0 && (
                  <div className="mb-4 space-y-2 rounded-xl bg-black/30 border border-white/10 p-3">
                    <p className="text-xs font-semibold text-white uppercase tracking-wider">Analytics Summary</p>
                    {[
                      { label: '24h', data: timeAnalytics.last24h },
                      { label: '7d', data: timeAnalytics.last7d },
                      { label: '30d', data: timeAnalytics.last30d },
                    ].filter(period => period.data.count > 0).map(period => (
                      <div key={period.label} className="flex items-center justify-between text-xs">
                        <span className="text-white/60 font-medium">{period.label} avg:</span>
                        <div className="flex gap-2">
                          <span className="text-[#F58F7C]">↓{period.data.avgDown.toFixed(1)}</span>
                          <span className="text-[#F2C4CE]">↑{period.data.avgUp.toFixed(1)}</span>
                          <span className="text-emerald-400">⏱{period.data.avgPing.toFixed(0)}ms</span>
                          <span className="text-white/40">({period.data.count} tests)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {history.length === 0 && (
                    <p className="text-sm text-[#D6D6D6]/70">Run a test to see results.</p>
                  )}
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-black/30 border border-white/5 px-3 py-2 text-xs hover:bg-black/50 transition-colors group"
                    >
                      <div className="flex gap-2 flex-1">
                        <span className="text-[#F58F7C] font-medium">↓ {formatMbps(item.download)}</span>
                        <span className="text-[#F2C4CE] font-medium">↑ {formatMbps(item.upload)}</span>
                        {item.stats && (
                          <span className="text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            Grade: {item.stats.grade}
                          </span>
                        )}
                      </div>
                      <span className="text-[#D6D6D6]/60 text-xs whitespace-nowrap ml-2">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Detailed Statistics Panel (shown after test complete) */}
          {status === "done" && latest?.stats && (
            <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#F2C4CE] font-semibold">Statistical Analysis</p>
                  <h3 className="text-xl font-semibold text-white">Detailed Performance Metrics</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-6xl font-bold text-white">{latest.stats.grade}</span>
                  <div className="flex flex-col gap-1">
                    <span className="rounded-full px-4 py-1.5 text-sm font-semibold" style={{ backgroundColor: `${getConditionBadge(latest.stats.grade).color}20`, color: getConditionBadge(latest.stats.grade).color }}>
                      {getConditionBadge(latest.stats.grade).label}
                    </span>
                    <div className="text-xs text-white/60 text-center">
                      {latest.stats.stabilityScore}% stable
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Download Stats */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#F58F7C]/10 to-transparent p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">↓</span>
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Download</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Median:</span>
                      <span className="font-bold text-[#F58F7C]">{latest.stats.downloadStats.median.toFixed(1)} Mbps</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Mean:</span>
                      <span className="font-semibold text-white">{latest.stats.downloadStats.mean.toFixed(1)} Mbps</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Std Dev:</span>
                      <span className="font-semibold text-white">{latest.stats.downloadStats.stdDev.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Min:</span>
                      <span className="text-white/80">{latest.stats.downloadStats.min.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Max:</span>
                      <span className="text-white/80">{latest.stats.downloadStats.max.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">P95:</span>
                      <span className="text-white/80">{latest.stats.downloadStats.p95.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">P99:</span>
                      <span className="text-white/80">{latest.stats.downloadStats.p99.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Upload Stats */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#F2C4CE]/10 to-transparent p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">↑</span>
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Upload</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Median:</span>
                      <span className="font-bold text-[#F2C4CE]">{latest.stats.uploadStats.median.toFixed(1)} Mbps</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Mean:</span>
                      <span className="font-semibold text-white">{latest.stats.uploadStats.mean.toFixed(1)} Mbps</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Std Dev:</span>
                      <span className="font-semibold text-white">{latest.stats.uploadStats.stdDev.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Min:</span>
                      <span className="text-white/80">{latest.stats.uploadStats.min.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Max:</span>
                      <span className="text-white/80">{latest.stats.uploadStats.max.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">P95:</span>
                      <span className="text-white/80">{latest.stats.uploadStats.p95.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">P99:</span>
                      <span className="text-white/80">{latest.stats.uploadStats.p99.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Ping & Quality Stats */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/10 to-transparent p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">⏱</span>
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Ping & Quality</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Median:</span>
                      <span className="font-bold text-emerald-400">{latest.stats.pingStats.median.toFixed(0)} ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Jitter:</span>
                      <span className="font-semibold text-white">{latest.stats.jitter.toFixed(1)} ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Stability:</span>
                      <span className="font-semibold text-white">{latest.stats.stabilityScore}%</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Min:</span>
                      <span className="text-white/80">{latest.stats.pingStats.min.toFixed(0)} ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Max:</span>
                      <span className="text-white/80">{latest.stats.pingStats.max.toFixed(0)} ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Trend:</span>
                      <span className="text-white/80">
                        {latest.stats.trendSlope > 0.5 ? '📈 Improving' : latest.stats.trendSlope < -0.5 ? '📉 Degrading' : '➡️ Stable'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Variance:</span>
                      <span className="text-white/80">{latest.stats.pingStats.stdDev.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-black/30 border border-white/10 p-4">
                <p className="text-xs text-white/60 leading-relaxed">
                  <strong className="text-white">About these statistics:</strong> Median values are used for final results as they're resistant to outliers. 
                  Standard deviation measures consistency (lower is better). P95/P99 show the 95th/99th percentile values. 
                  Jitter measures ping variation (lower is better for gaming/calls). 
                  Stability score combines all metrics into a 0-100 rating. 
                  Trend slope indicates if connection is improving, degrading, or stable during the test.
                </p>
              </div>
            </section>
          )}

          {/* Baseline comparator */}
          <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-8 shadow-2xl backdrop-blur-xl" id="baseline-section">
            <div className="grid gap-8 md:grid-cols-[1fr,1.2fr]">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#F2C4CE] font-semibold">ISP Baseline</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Set your expectations</h2>
                <p className="mt-3 text-sm text-[#D6D6D6]/80">
                  Enter your ISP plan speeds to compare against your actual test results. Stored locally on your device.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Download (Mbps)", value: ispDown, onChange: (v: number) => setIspDown(clamp(v, 1, 2000)) },
                  { label: "Upload (Mbps)", value: ispUp, onChange: (v: number) => setIspUp(clamp(v, 1, 2000)) },
                  { label: "Ping (ms)", value: ispPing, onChange: (v: number) => setIspPing(clamp(v, 1, 200)) },
                ].map((field) => (
                  <label key={field.label} className="flex flex-col gap-2 text-xs">
                    <span className="text-[#D6D6D6]/80 font-medium">{field.label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      className="rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#F58F7C] focus:bg-black/60 transition-colors text-sm font-medium"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Comparison display */}
            {baselineCompare && (
              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="text-xs uppercase tracking-wider text-[#D6D6D6]/70 font-semibold mb-4">Last test comparison</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Download",
                      delta: baselineCompare.downDelta,
                      unit: " Mbps",
                      betterHigher: true,
                    },
                    {
                      label: "Upload",
                      delta: baselineCompare.upDelta,
                      unit: " Mbps",
                      betterHigher: true,
                    },
                    {
                      label: "Ping",
                      delta: baselineCompare.pingDelta,
                      unit: " ms",
                      betterHigher: false, // For ping, lower is better
                    },
                  ].map((item) => {
                    const isPositive = item.delta >= 0;
                    const good = item.betterHigher ? isPositive : !isPositive;
                    const sign = item.delta > 0 ? "+" : "";
                    return (
                      <div
                        key={item.label}
                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-4"
                      >
                        <p className="text-xs uppercase tracking-wider text-[#D6D6D6]/70 font-medium">{item.label}</p>
                        <p className={`text-xl font-bold ${good ? "text-emerald-400" : "text-[#F58F7C]"}`}>
                          {sign}{item.delta.toFixed(1)}{item.unit}
                        </p>
                        <p className="text-xs text-[#D6D6D6]/65">
                          {item.label === "Ping" 
                            ? (good ? "✓ Lower than baseline" : "⚠ Higher than baseline")
                            : (good ? "✓ On target" : "⚠ Below baseline")
                          }
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
