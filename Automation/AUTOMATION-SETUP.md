# 🚀 SmartPMO.ai Automation Setup Guide

## 📋 Overview

This automation system runs daily at 5:00 AM SAST and:
1. Discovers 350-500 articles from 179 RSS sources
2. Scores articles using Gemini AI (PMO relevance 0-100)
3. Fetches full content for top 20 articles
4. Extracts keywords using Gemini
5. Generates 10-20 smart cards (dynamic based on quality)
6. Deploys to smartpmo.ai via git push

**Total cost: R0/month** (all free APIs)

---

## ⚡ Quick Start (5 Minutes)

### 1. Get API Keys

**Gemini API (Required)**
```bash
# Visit: https://ai.google.dev
# Click "Get API Key" → Create new project → Copy key
# Free tier: 1,500 calls/day (you'll use ~220/day)
```

**Jina AI (Required)**
```bash
# Visit: https://jina.ai
# Sign up → Dashboard → API Keys → Create
# Free tier: 1,000 calls/day (you'll use ~20/day)
```

**Google Custom Search (Already have?)**
```bash
# Check if you already have:
# D:\PMO-Brain-2.0-Modular\.env should have GOOGLE_API_KEY
# If not: https://console.cloud.google.com/apis/credentials
```

### 2. Create .env File

```bash
cd D:\PMO-Brain-2.0-Modular\automation

# Create .env file
notepad .env
```

Paste this:
```env
# Gemini AI (Required)
GEMINI_API_KEY=your_gemini_key_here

# Jina AI Reader (Required)
JINA_API_KEY=your_jina_key_here

# Google Custom Search (Already have these?)
GOOGLE_API_KEY=your_google_key
GOOGLE_CSE_ID=your_cse_id

# TheNewsAPI (Optional)
THE_NEWS_API_KEY=your_thenewsapi_key
```

### 3. Install Dependencies

```bash
cd D:\PMO-Brain-2.0-Modular\automation
npm install
```

### 4. Test Run

```bash
# Test discovery only (fast - 2 min)
npm run discovery

# Test full pipeline (slower - 15 min)
npm test

# Run full production pipeline
npm start
```

---

## 🎯 Production Setup

### Option A: GitHub Actions (Recommended - 100% Automated)

**1. Add secrets to GitHub**
```
Go to: https://github.com/YOUR-USERNAME/YOUR-REPO/settings/secrets/actions
Add new secrets:
- GEMINI_API_KEY
- JINA_API_KEY
- GOOGLE_API_KEY
- GOOGLE_CSE_ID
```

**2. Copy workflow file**
```bash
# Create .github/workflows directory if it doesn't exist
mkdir -p D:\PMO-Brain-2.0-Modular\.github\workflows

# Copy the workflow file (I created this in artifact)
# Copy daily-automation.yml to .github/workflows/
```

**3. Push to GitHub**
```bash
cd D:\PMO-Brain-2.0-Modular
git add .github/workflows/daily-automation.yml
git add automation/
git commit -m "Add automation system"
git push
```

**4. Done!**
- Runs daily at 5:00 AM SAST automatically
- View logs: GitHub → Actions tab
- No PC needed (runs in cloud)
- Email notification on failure

### Option B: Windows Task Scheduler (Local PC)

**1. Create batch file**
```bash
notepad D:\PMO-Brain-2.0-Modular\run-automation.bat
```

Paste this:
```batch
@echo off
cd /d D:\PMO-Brain-2.0-Modular\automation
node run-daily-pipeline.js
pause
```

**2. Schedule task**
```bash
# Open Task Scheduler (Win + R, type "taskschd.msc")
# Create Task:
#   Name: SmartPMO Daily Automation
#   Trigger: Daily at 5:00 AM
#   Action: Run D:\PMO-Brain-2.0-Modular\run-automation.bat
#   Settings: 
#     - Wake computer to run
#     - If task fails, restart every 5 minutes (max 3 attempts)
```

**Or use command line:**
```powershell
schtasks /create /tn "SmartPMO Daily Automation" /tr "D:\PMO-Brain-2.0-Modular\run-automation.bat" /sc daily /st 05:00 /ru SYSTEM
```

---

## 📊 Monitoring & Console

### Open Console After Run

The automation auto-opens the console at:
```
http://localhost:8080/console
```

You'll see:
- Today's run summary
- Source performance (179 sources)
- Articles discovered, scored, fetched
- Cards generated (10-20)
- Any errors or warnings

### Manual Console Check

```bash
# Make sure server is running
cd D:\PMO-Brain-2.0-Modular\01-Management-Console
node server.js

# Open browser
start http://localhost:8080/console
```

---

## 🎴 Card Display Logic

### How It Works

**Every day, the system:**
1. Fetches content for top 20 articles (score >= 70)
2. Counts how many have score >= 89 (premium)
3. Decides display:
   - **If 15+ premium articles**: Show ALL premium (15-20 cards)
   - **Otherwise**: Show top 10 (minimum)

### Example Days

**Typical Day (Good Quality)**
```
Top 20 fetched:
├─ 3 articles >=89 (premium)
├─ 12 articles 70-88 (good)
└─ 5 articles 60-69 (ok)

Result: Display top 10 cards
```

**Exceptional Day (Amazing Quality)**
```
Top 20 fetched:
├─ 16 articles >=89 (premium) ⭐
├─ 3 articles 70-88 (good)
└─ 1 article 60-69 (ok)

Result: Display all 16 premium cards! 🎉
```

---

## 🔧 Troubleshooting

### "No articles discovered"
```bash
# Check if discovery sources are working
node automation/modules/DiscoveryEngine.js

# Verify .env has Google API keys
cat automation/.env
```

### "Gemini API error"
```bash
# Check API key is valid
# Visit: https://ai.google.dev → API Keys
# Verify key is active and has quota

# Check rate limit in console
# Should show: 220/1500 calls used (safe)
```

### "Jina fetch failed"
```bash
# Check API key
# Visit: https://jina.ai → Dashboard → API Keys

# Test single fetch
curl -H "Authorization: Bearer YOUR_KEY" https://r.jina.ai/https://techcrunch.com
```

### "Git push failed"
```bash
# Verify git credentials
cd D:\PMO-Brain-2.0-Modular\website
git config --list

# Test push
git push origin main
```

### "Console won't open"
```bash
# Start console server
cd D:\PMO-Brain-2.0-Modular\01-Management-Console
node server.js

# Check port 8080 is free
netstat -ano | findstr :8080
```

---

## 📈 Performance & Limits

### Daily Usage (All Safe)

| API | Limit | Your Usage | % Used |
|-----|-------|------------|--------|
| Gemini | 1,500/day | ~220 | 15% ✅ |
| Jina | 1,000/day | ~20 | 2% ✅ |
| Google | 100/day | 20 | 20% ✅ |
| GDELT | Unlimited | 8 | 0% ✅ |

### Expected Runtime

```
Total: ~65 minutes
├─ Discovery: 30 min (179 sources)
├─ Scoring: 20 min (200 articles)
├─ Fetch: 10 min (20 articles)
├─ Keywords: 3 min (20 articles)
├─ Cards: 1 min (10-20 cards)
└─ Deploy: 1 min (git push)
```

### Typical Output

```
5:00 AM - Start
5:30 AM - 350 articles discovered
5:50 AM - 147 articles scored
6:00 AM - 18 articles content fetched
6:03 AM - 54 keywords extracted
6:04 AM - 12 cards generated
6:05 AM - Published to smartpmo.ai
6:06 AM - Console opens
```

---

## 🛠️ Advanced Usage

### Run Individual Steps

```bash
# Discovery only
npm run discovery

# Scoring only
npm run scoring

# Fetch only
npm run fetch

# Keywords only
npm run keywords

# Cards only
npm run cards

# Deploy only
npm run deploy
```

### Test Mode (No Deploy)

```bash
# Run full pipeline but skip git push
node run-daily-pipeline.js --test
```

### Manual Trigger (GitHub Actions)

```
1. Go to GitHub → Actions tab
2. Select "SmartPMO Daily Automation"
3. Click "Run workflow" → Run
4. Monitor progress in real-time
```

### View Logs

**GitHub Actions:**
```
GitHub → Actions → Latest run → Click job → View logs
```

**Local:**
```bash
# Check operations_log table
sqlite3 D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db
SELECT * FROM operations_log ORDER BY timestamp DESC LIMIT 10;
```

---

## 📂 File Structure

```
D:\PMO-Brain-2.0-Modular\
├── automation/
│   ├── run-daily-pipeline.js      # Master script
│   ├── modules/
│   │   ├── DatabaseManager.js     # SQLite ops
│   │   ├── DiscoveryEngine.js     # 179 sources
│   │   ├── ScoringEngine.js       # Gemini AI
│   │   ├── ContentFetcher.js      # Jina AI
│   │   ├── KeywordExtractor.js    # Gemini AI
│   │   └── CardGenerator.js       # Smart 10-20 logic
│   ├── package.json
│   └── .env                        # Your API keys
├── .github/
│   └── workflows/
│       └── daily-automation.yml    # GitHub Actions
├── website/
│   └── api/
│       └── daily-cards.json        # Output (deployed)
└── 02-discovery-engine/
    └── pmo_insights.db             # Database

```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `.env` file exists with all API keys
- [ ] `npm install` completed successfully
- [ ] `npm test` runs without errors
- [ ] GitHub secrets added (if using Actions)
- [ ] Task scheduled (if using local)
- [ ] Console opens at http://localhost:8080/console
- [ ] First run completed successfully
- [ ] Cards visible on smartpmo.ai

---

## 🆘 Get Help

### Check Documentation
1. This file (AUTOMATION-SETUP.md)
2. Console: http://localhost:8080/console
3. Database restart prompts:
   ```sql
   SELECT content FROM restart_prompts WHERE title = 'SmartPMO Automation Build';
   ```

### Common Issues
- API keys invalid → Regenerate at provider website
- Rate limit hit → Check console for usage stats
- Git push fails → Verify credentials and network
- No articles found → Check RSS feeds in console

### Debug Mode
```bash
# Run with verbose logging
NODE_ENV=development node run-daily-pipeline.js
```

---

## 🎉 Success!

Once setup, you'll wake up every morning to:
- ✅ 10-20 fresh AI+PMO cards on smartpmo.ai
- ✅ Zero manual work required
- ✅ Full audit trail in console
- ✅ R0/month cost

**Enjoy your fully automated SmartPMO.ai system!** ☕

---

Last updated: 2025-10-09  
Version: 1.0  
Status: Production Ready 🚀