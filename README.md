# Speed Labs ⚡

A modern, privacy-first internet speed test built with Next.js. No ads, no tracking, no BS - just clean speed metrics that stay on your device.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)

## The Vibe

Built this in about 4 hours because I was tired of speed test sites that:
- Bombard you with ads
- Sell your data
- Look like they're stuck in 2010
- Take forever to load (ironic, right?)

So I made my own. It's fast, it's clean, and your data never leaves your browser.

## Features

### Core Testing
- **Download/Upload/Ping** - The essentials, done right
- **Multiple test profiles** - Quick (15s), Standard (30s), Extended (60s)
- **Network type tagging** - WiFi, Ethernet, or Mobile
- **Location tagging** - Tag tests by room/location for comparison
- **Incognito mode** - Run tests without saving to history

### Analytics & Insights
- **Smart Insights** - AI-powered recommendations based on your results
- **Speed Comparison** - Visual comparison against your ISP baseline
- **Peak/Off-Peak Analysis** - See how your speeds vary by time of day
- **Performance Benchmarks** - Check if you can stream 4K, game, video call, etc.
- **Anomaly Detection** - Get alerted when speeds drop significantly
- **7-day/30-day Trends** - Track your connection over time

### Network Diagnostics
- **DNS Lookup Time** - See how fast your DNS is responding
- **Server Selection** - Choose from multiple test servers
- **IPv4/IPv6 Detection** - Know your IP version and address
- **Traceroute Visualization** - See the hops to your test server
- **Router Health Check** - Basic diagnostics for your local network

### Privacy First
- **100% Local Storage** - All data stays in your browser
- **Data Retention Controls** - Auto-delete old tests, set max entries
- **Privacy Report** - See exactly what data exists and where
- **No cookies, no tracking, no analytics**

### Accessibility
- **High Contrast Mode** - Enabled by default for better readability
- **Keyboard Navigation** - Full keyboard support with focus indicators
- **Screen Reader Optimized** - ARIA labels and live regions
- **Dark/Light/System Theme** - Your eyes, your choice

### Developer Stuff
- **REST API** - `/api/speed` endpoint for programmatic access
- **Webhook Support** - Get notified when tests complete
- **Export to CSV/JSON** - Get your data out easily

### The Little Things
- **Achievement System** - Because why not make it fun
- **Speedometer Visualization** - Smooth animated gauge
- **Results Modal** - Shareable test results
- **Modern UI** - Glassmorphism, gradients, the whole deal

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Storage**: localStorage (no backend needed)
- **Deployment**: Works on Vercel, Netlify, anywhere really

## Getting Started

```bash
# Clone it
git clone https://github.com/Foolish-Genius/speedtest.git

# Install deps
cd speedtest
npm install

# Run it
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're good.

## API Usage

### Run a Speed Test
```bash
curl http://localhost:3000/api/speed
```

### Response
```json
{
  "download": 94.5,
  "upload": 47.2,
  "ping": 12,
  "jitter": 2.3,
  "timestamp": "2024-12-27T10:30:00Z"
}
```

### Webhooks
POST your webhook URL and get notified:
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-server.com/webhook"}'
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main app (yeah it's one big file, sue me)
│   ├── layout.tsx        # Root layout + SEO
│   ├── globals.css       # CSS variables + themes
│   └── api/
│       ├── speed/        # Speed test API
│       └── webhooks/     # Webhook management
├── components/
│   └── Logo.tsx          # The blue gradient logo
└── public/
    └── favicon.svg       # Blue favicon
```

## How It Works

1. **Download Test**: Fetches random data from Cloudflare's speed test endpoints
2. **Upload Test**: POSTs random data and measures throughput
3. **Ping Test**: Multiple rounds of small requests to calculate latency
4. **Aggregation**: Uses median values to filter out outliers

All measurements happen client-side. The API endpoint is just a wrapper for programmatic access.

## Browser Support

Works on anything modern:
- Chrome/Edge 90+
- Firefox 90+
- Safari 14+

## Contributing

Found a bug? Want to add something? PRs welcome.

1. Fork it
2. Create your branch (`git checkout -b feature/cool-thing`)
3. Commit (`git commit -m "add cool thing"`)
4. Push (`git push origin feature/cool-thing`)
5. Open a PR

## License

MIT - Do whatever you want with it.

---

**Vibecoded with ♥ by [Foolish Genius](https://github.com/Foolish-Genius)**
