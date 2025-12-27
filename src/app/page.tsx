"use client";

import { useEffect, useMemo, useState } from "react";

type SpeedResult = {
  id: string;
  timestamp: number;
  download: number;
  upload: number;
  ping: number;
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
  const [progress, setProgress] = useState(0);
  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  const [ping, setPing] = useState(0);
  const [history, setHistory] = useState<SpeedResult[]>([]);
  const [ispDown, setIspDown] = useState(300);
  const [ispUp, setIspUp] = useState(50);
  const [ispPing, setIspPing] = useState(15);
  const [menuOpen, setMenuOpen] = useState(false);

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

    const totalMs = 3000;
    const start = performance.now();
    let lastUpdate = start;
    const updateInterval = 30; // Batch updates every 30ms to prevent glitching

    const step = (now: DOMHighResTimeStamp) => {
      const elapsed = now - start;
      const nextProgress = Math.min(100, (elapsed / totalMs) * 100);

      // Only update state every 30ms
      if (now - lastUpdate >= updateInterval || nextProgress >= 100) {
        lastUpdate = now;
        const ease = (t: number) => 1 - Math.pow(1 - t, 3);
        const eased = ease(nextProgress / 100);
        const simulatedDownload = 30 + Math.random() * 220;
        const simulatedUpload = 15 + Math.random() * 90;
        const simulatedPing = 8 + Math.random() * 22;

        setProgress(nextProgress);
        setDownload(simulatedDownload * eased);
        setUpload(simulatedUpload * eased);
        setPing(simulatedPing + (1 - eased) * 10);
      }

      if (nextProgress < 100) {
        requestAnimationFrame(step);
      } else {
        const finalDownload = Number((80 + Math.random() * 220).toFixed(1));
        const finalUpload = Number((30 + Math.random() * 120).toFixed(1));
        const finalPing = Number((7 + Math.random() * 18).toFixed(0));

        const result: SpeedResult = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          download: finalDownload,
          upload: finalUpload,
          ping: finalPing,
        };

        setDownload(result.download);
        setUpload(result.upload);
        setPing(result.ping);
        setStatus("done");
        setHistory((prev) => [result, ...prev].slice(0, 8));
      }
    };

    requestAnimationFrame(step);
  };

  const running = status === "running";

  const latest = history[0];
  const baselineCompare = latest
    ? {
        downDelta: latest.download - ispDown,
        upDelta: latest.upload - ispUp,
        pingDelta: ispPing - latest.ping,
      }
    : null;

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
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#F58F7C] to-[#F2C4CE]" />
              <span className="text-lg font-bold text-white">Speed Lab</span>
            </div>
            <div className="hidden gap-8 md:flex">
              <button className="text-sm text-[#D6D6D6] hover:text-white transition-colors">Test</button>
              <button className="text-sm text-[#D6D6D6] hover:text-white transition-colors">History</button>
              <button className="text-sm text-[#D6D6D6] hover:text-white transition-colors">Baseline</button>
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
                <button className="text-sm text-[#D6D6D6] hover:text-white transition-colors text-left">Test</button>
                <button className="text-sm text-[#D6D6D6] hover:text-white transition-colors text-left">History</button>
                <button className="text-sm text-[#D6D6D6] hover:text-white transition-colors text-left">Baseline</button>
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

            {/* Live metrics card */}
            <div className="w-full rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-6 shadow-2xl backdrop-blur-xl sm:w-80 sm:flex-shrink-0">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs uppercase tracking-wider text-[#F2C4CE] font-semibold">Live metrics</p>
                <h3 className="text-sm text-[#D6D6D6]/80">Current test status</h3>
              </div>
              <div className="mt-5 space-y-3">
                {[{ label: "↓ Download", value: formatMbps(download) }, { label: "↑ Upload", value: formatMbps(upload) }, { label: "⏱ Ping", value: formatMs(ping) }].map((m) => (
                  <div key={m.label} className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2.5">
                    <p className="text-xs text-[#D6D6D6]/70 font-medium">{m.label}</p>
                    <p className="text-lg font-semibold text-white">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          {/* Test section */}
          <section className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
            {/* Main test card */}
            <div className="flex flex-col gap-6 rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-white">{status === "running" ? "Testing..." : status === "done" ? "Complete" : "Ready"}</span>
                </div>
                <p className="text-sm text-[#D6D6D6]/80">
                  {status === "idle" && "Click the button below to begin your network test."}
                  {status === "running" && "Measuring your connection performance..."}
                  {status === "done" && "Test finished. Review your results above."}
                </p>
              </div>

              <button
                onClick={startTest}
                disabled={running}
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[#F58F7C] to-[#F2C4CE] px-8 py-4 font-semibold text-[#2C2B30] shadow-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60 disabled:scale-100"
              >
                <span className="relative z-10">{running ? "Running test..." : status === "done" ? "Run again" : "Start test"}</span>
                <div className="absolute inset-0 scale-110 bg-white/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
              </button>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Download", value: formatMbps(download), icon: "↓" },
                  { label: "Upload", value: formatMbps(upload), icon: "↑" },
                  { label: "Ping", value: formatMs(ping), icon: "⏱" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-wider text-[#D6D6D6]/70 font-medium">{item.icon} {item.label}</p>
                    <p className="text-2xl font-bold text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-4 space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-[#F58F7C] to-[#F2C4CE] transition-[width] duration-100"
                    style={{ width: `${progress}%` }}
                    aria-label="Progress"
                  />
                </div>
                <p className="text-xs text-[#D6D6D6]/60 text-right font-medium">{Math.round(progress)}%</p>
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
              <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#F2C4CE] font-semibold">History</p>
                    <h3 className="text-lg font-semibold text-white">Test logs</h3>
                  </div>
                  {history.length > 0 && (
                    <button
                      className="text-xs text-[#D6D6D6]/70 hover:text-[#F58F7C] transition-colors font-medium"
                      onClick={() => setHistory([])}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {history.length === 0 && (
                    <p className="text-sm text-[#D6D6D6]/70">Run a test to see results.</p>
                  )}
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-black/30 border border-white/5 px-3 py-2 text-xs hover:bg-black/50 transition-colors"
                    >
                      <div className="flex gap-2 flex-1">
                        <span className="text-[#F58F7C] font-medium">↓ {formatMbps(item.download)}</span>
                        <span className="text-[#F2C4CE] font-medium">↑ {formatMbps(item.upload)}</span>
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

          {/* Baseline comparator */}
          <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/8 to-white/5 p-8 shadow-2xl backdrop-blur-xl">
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
                      betterHigher: false,
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
                          {good ? "✓ On target" : "⚠ Below baseline"}
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
