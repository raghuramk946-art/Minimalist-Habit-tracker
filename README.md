# ⚡ Minimalist Notion-Style Habit Tracker & Task Manager

A high-performance, aesthetic obsidian monochrome habit tracker and analytics dashboard inspired by viral self-improvement spreadsheets and Notion systems.

![Habit Tracker Dashboard Preview](preview.png)

---

## 🌟 Key Features

1. **31-Day Interactive Habit Matrix**:
   - Organized by weeks (Week 1 through Week 5) with dynamic day-of-week headers (`Su`, `Mo`, `Tu`, `We`, `Th`, `Fr`, `Sa`).
   - Tactile custom checkboxes with streak tracking and real-time computation.
   - Add, edit, delete, and customize habits with custom emojis and categories.

2. **Real-Time Analytics Deck**:
   - **Daily Progress Bar Chart**: 31 dynamic vertical bars showing completion percentage per day with hover stats.
   - **Weekly Progress Bar Chart**: Grouped completion performance for Weeks 1–5.
   - **Overall KPI Metrics**: Live rollups for **Goal**, **Completed**, and **Left**.
   - **Overall Stats Donut**: Animated SVG circular progress ring with center percentage.

3. **Per-Habit Analysis & Top Habits Leaderboard**:
   - **Analysis Table**: Goal count, Actual completed, Remaining, progress bar, and completion accuracy percentage.
   - **Top 10 Habits**: Ranked leaderboard based on consistency and streaks.

4. **Overall Wellness Tracker**:
   - Daily **Mood** logging (1–5 scale).
   - Daily **Sleep** hours tracking (e.g. 7.5h, 8h).
   - Dynamic interactive SVG line graph correlating Mood & Sleep trends over the month.

5. **12-Month Persistence & Preset Routines**:
   - Instant switching between all 12 months (Jan–Dec) with automatic calendar day adjustment (28/29/30/31 days).
   - 1-click Preset Routines: *Viral Photo Match*, *Monk Mode*, *Deep Work & Developer*, *Holistic Health*.
   - LocalStorage auto-save: All data stays saved in your browser locally.

---

## 🚀 How to Run Locally

### Option 1: Direct File Opening
Simply double-click or open `index.html` in Chrome, Edge, Safari, or Firefox!

### Option 2: Local Web Server
```bash
node server.js
```
Then visit **`http://localhost:3000/`** in your browser.

---

## 📓 How to Embed or Recreate in Notion

### Option A: Embed Directly in Notion (Recommended)
1. Run the app locally or deploy it to Vercel/Netlify/GitHub Pages with 1 click.
2. In any Notion page, type `/embed` and hit `Enter`.
3. Paste the URL (e.g. `http://localhost:3000/` or your hosted URL).
4. Drag the embed to full width for a seamless, interactive dashboard inside Notion!

### Option B: Native Notion Database Structure
If you want to build it natively using Notion databases:

1. **Create a `Habits` Database**:
   - `Name` (Title): Habit name with emoji (e.g., `Wake up at 05:00 ⏰`)
   - `Goal` (Number): `31`
   - `Daily Logs` (Relation): Link to the `Daily Logs` database
   - `Actual` (Rollup): Count of days marked complete
   - `Success %` (Formula): `round(prop("Actual") / prop("Goal") * 100) + "%"`
   - `Progress Bar` (Formula):
     ```javascript
     let(
       pct, prop("Actual") / prop("Goal"),
       repeat("■", round(pct * 15)) + repeat("□", 15 - round(pct * 15)) + " " + round(pct * 100) + "%"
     )
     ```

2. **Create a `Daily Logs` Database**:
   - `Date` (Date property)
   - `Habits Completed` (Relation to `Habits`)
   - `Mood` (Select / Number 1-5)
   - `Sleep Hours` (Number)
