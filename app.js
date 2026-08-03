/**
 * Minimalist Notion-Style Habit Tracker & Analytics Engine
 * Complete state management, dynamic calendar calculations, SVG chart rendering,
 * and Notion export utilities.
 */

(function() {
  'use strict';

  // --- Constants & Defaults ---
  const STORAGE_KEY = 'notion_habit_os_v2';
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const DAY_SHORT_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Preset Habit Routines
  const PRESETS = {
    reference: [
      { id: 'h1', name: 'Wake up at 05:00', emoji: '⏰', category: 'Discipline', targetDays: 31 },
      { id: 'h2', name: 'Gym / Workout', emoji: '💪', category: 'Health', targetDays: 31 },
      { id: 'h3', name: 'Reading / Learning', emoji: '📖', category: 'Mind', targetDays: 31 },
      { id: 'h4', name: 'Day Planning', emoji: '📅', category: 'Work', targetDays: 31 },
      { id: 'h5', name: 'Stretching & Mobility', emoji: '🤸', category: 'Health', targetDays: 31 },
      { id: 'h6', name: 'Social Media Detox', emoji: '📵', category: 'Discipline', targetDays: 31 },
      { id: 'h7', name: 'Meditation & Breath', emoji: '🧘', category: 'Mind', targetDays: 31 },
      { id: 'h8', name: '2L Water Intake', emoji: '💧', category: 'Health', targetDays: 31 },
      { id: 'h9', name: 'No Added Sugar', emoji: '🥗', category: 'Health', targetDays: 31 },
      { id: 'h10', name: '8 Hours Sleep', emoji: '😴', category: 'Wellness', targetDays: 31 },
      { id: 'h11', name: 'Deep Work Sprint', emoji: '🧠', category: 'Work', targetDays: 31 },
      { id: 'h12', name: 'Evening Reflection', emoji: '✍️', category: 'Mind', targetDays: 31 }
    ],
    monk: [
      { id: 'm1', name: 'Wake up at 05:00', emoji: '⏰', category: 'Discipline', targetDays: 31 },
      { id: 'm2', name: 'Cold Shower', emoji: '🚿', category: 'Discipline', targetDays: 31 },
      { id: 'm3', name: 'Zero Social Media', emoji: '📵', category: 'Discipline', targetDays: 31 },
      { id: 'm4', name: 'Heavy Gym Session', emoji: '🏋️', category: 'Health', targetDays: 31 },
      { id: 'm5', name: '4 Hours Deep Work', emoji: '💻', category: 'Work', targetDays: 31 },
      { id: 'm6', name: 'Read 30 Pages', emoji: '📚', category: 'Mind', targetDays: 31 },
      { id: 'm7', name: 'Vipassana Meditation', emoji: '🧘', category: 'Mind', targetDays: 31 },
      { id: 'm8', name: '100% Clean Nutrition', emoji: '🥗', category: 'Health', targetDays: 31 }
    ],
    developer: [
      { id: 'd1', name: 'Morning Code Sprint', emoji: '💻', category: 'Work', targetDays: 31 },
      { id: 'd2', name: '0 Distractions Block', emoji: '🎯', category: 'Work', targetDays: 31 },
      { id: 'd3', name: 'Read Tech / Research Paper', emoji: '📑', category: 'Mind', targetDays: 31 },
      { id: 'd4', name: 'Git Commits & PR Reviews', emoji: '🚀', category: 'Work', targetDays: 31 },
      { id: 'd5', name: 'Gym / 10k Steps', emoji: '🏃', category: 'Health', targetDays: 31 },
      { id: 'd6', name: 'Eye & Posture Breaks', emoji: '👀', category: 'Wellness', targetDays: 31 },
      { id: 'd7', name: 'Review Architecture Notes', emoji: '📝', category: 'Mind', targetDays: 31 },
      { id: 'd8', name: 'Offline Sleep Routine', emoji: '🌙', category: 'Wellness', targetDays: 31 }
    ],
    health: [
      { id: 'w1', name: '10,000 Daily Steps', emoji: '👟', category: 'Health', targetDays: 31 },
      { id: 'w2', name: '8h Restorative Sleep', emoji: '😴', category: 'Wellness', targetDays: 31 },
      { id: 'w3', name: '3 Liters Water', emoji: '💧', category: 'Health', targetDays: 31 },
      { id: 'w4', name: 'Zero Processed Sugar', emoji: '🥑', category: 'Health', targetDays: 31 },
      { id: 'w5', name: 'Daily Mobility Routine', emoji: '🤸', category: 'Health', targetDays: 31 },
      { id: 'w6', name: 'Outdoor Morning Sunlight', emoji: '☀️', category: 'Wellness', targetDays: 31 },
      { id: 'w7', name: 'Breathwork / Pranayama', emoji: '🫁', category: 'Mind', targetDays: 31 },
      { id: 'w8', name: 'Intermittent Fasting', emoji: '⏳', category: 'Health', targetDays: 31 }
    ]
  };

  // --- State Object ---
  const today = new Date();
  let state = {
    year: Math.max(2026, Math.min(2100, today.getFullYear())),
    month: today.getMonth(),
    habits: [],
    logs: {},
    theme: 'dark'
  };

  // --- User Auth & Cloud Sync State ---
  let currentUser = null;
  let firebaseAuth = null;
  let firestoreDb = null;
  let cloudUnsubscribe = null;
  let cloudSyncTimeout = null;
  let isRemoteSyncInProgress = false;
  let currentAuthMode = 'signin'; // 'signin' or 'signup'

  const GUEST_STORAGE_KEY = 'notion_habit_os_guest';
  const LOCAL_USERS_KEY = 'notion_habit_local_auth_users';

  function getActiveStorageKey() {
    if (currentUser && currentUser.uid) {
      return `notion_habit_os_user_${currentUser.uid}`;
    }
    return GUEST_STORAGE_KEY;
  }

  // --- Initialization ---
  function init() {
    initCloudAndAuth();
    loadStateFromStorage();
    setupEventListeners();
    populateCalendarDropdowns();
    renderApp();
    updateAuthUi();
  }

  // --- State Persistence & Seeding ---
  function loadStateFromStorage() {
    try {
      const key = getActiveStorageKey();
      let saved = localStorage.getItem(key);
      // Backwards compatibility check for guest
      if (!saved && !currentUser) {
        saved = localStorage.getItem('notion_habit_os_v2');
      }
      if (saved) {
        state = validateAndSanitizeState(JSON.parse(saved));
        if (!state.year || state.year < 2026 || state.year > 2100) {
          state.year = 2026;
        }
      } else {
        seedInitialState();
      }
    } catch (e) {
      console.warn('Could not read from local storage, using fresh state', e);
      seedInitialState();
    }
  }

  function saveStateToStorage() {
    try {
      const key = getActiveStorageKey();
      localStorage.setItem(key, JSON.stringify(state));
      if (!isRemoteSyncInProgress) {
        triggerCloudSync();
      }
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
  }

  function seedInitialState() {
    const now = new Date();
    state = {
      year: Math.max(2026, Math.min(2100, now.getFullYear())),
      month: now.getMonth(),
      habits: JSON.parse(JSON.stringify(PRESETS.reference)),
      logs: {},
      theme: 'dark'
    };
    try {
      localStorage.setItem(getActiveStorageKey(), JSON.stringify(state));
    } catch (e) {}
  }

  // --- Calendar Helpers ---
  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay(); // 0 = Sun
  }

  function getCurrentMonthKey() {
    return `${state.year}-${state.month}`;
  }

  function getMonthLogData(monthKey = getCurrentMonthKey()) {
    if (!state.logs[monthKey]) {
      state.logs[monthKey] = {
        habits: {},
        wellness: { mood: {}, sleep: {} }
      };
    }
    return state.logs[monthKey];
  }

  // --- Dynamic Calendar Dropdowns ---
  function populateCalendarDropdowns() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    monthSelect.innerHTML = '';
    MONTH_NAMES.forEach((name, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = name;
      if (idx === state.month) opt.selected = true;
      monthSelect.appendChild(opt);
    });

    yearSelect.innerHTML = '';
    for (let y = 2026; y <= 2100; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === state.year) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }

  // --- Main Render Dispatcher ---
  function renderApp() {
    applyTheme();
    updateHeaderDisplay();
    renderDailyProgressChart();
    renderWeeklyProgressChart();
    renderOverallStatsAndKpis();
    renderHabitMatrix();
    renderWellnessMatrix();
    renderAnalysisTable();
    renderTopHabitsList();
    renderWellnessTrendChart();
    renderMonthTabs();
    updateUndoRedoButtons();
  }

  // --- Header Display & Theme ---
  function updateHeaderDisplay() {
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    const habitCountTag = document.getElementById('habitCountTag');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    currentMonthDisplay.textContent = `- ${MONTH_NAMES[state.month]} ${state.year} -`;
    habitCountTag.textContent = `${state.habits.length} Habits Active`;
    monthSelect.value = state.month;
    yearSelect.value = state.year;
  }

  function applyTheme() {
    document.body.className = state.theme === 'light' ? 'theme-light' : 'theme-dark';
  }

  // --- 1. Daily Progress Chart (31 dynamic bars) ---
  function renderDailyProgressChart() {
    const container = document.getElementById('dailyBarsWrapper');
    const avgBadge = document.getElementById('dailyAvgBadge');
    container.innerHTML = '';

    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();
    const totalHabits = state.habits.length;

    const todayObj = new Date();
    const isCurrentRealMonth = todayObj.getFullYear() === state.year && todayObj.getMonth() === state.month;
    const realDay = todayObj.getDate();

    let sumPct = 0;
    let daysWithEntries = 0;

    for (let day = 1; day <= 31; day++) {
      const col = document.createElement('div');
      col.className = 'daily-bar-col';
      if (isCurrentRealMonth && day === realDay) {
        col.classList.add('is-today');
      }

      if (day > daysCount) {
        col.style.opacity = '0.2';
        col.style.pointerEvents = 'none';
        col.innerHTML = `
          <div class="daily-bar-track"><div class="daily-bar-fill" style="height: 0%"></div></div>
          <span class="daily-bar-label">${day}</span>
        `;
        container.appendChild(col);
        continue;
      }

      let completedToday = 0;
      state.habits.forEach(habit => {
        if (monthLog.habits[habit.id] && monthLog.habits[habit.id][day]) {
          completedToday++;
        }
      });

      const pct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
      if (completedToday > 0) {
        sumPct += pct;
        daysWithEntries++;
      }

      col.innerHTML = `
        <div class="bar-tooltip">Day ${day}: ${completedToday}/${totalHabits} (${pct}%)</div>
        <div class="daily-bar-track">
          <div class="daily-bar-fill" style="height: ${pct}%"></div>
        </div>
        <span class="daily-bar-label">${day}</span>
      `;

      col.addEventListener('click', () => {
        // Quick focus on day column in matrix
        highlightDayColumn(day);
      });

      container.appendChild(col);
    }

    const avgPct = daysWithEntries > 0 ? Math.round(sumPct / daysWithEntries) : 0;
    avgBadge.textContent = `Avg: ${avgPct}%`;
  }

  // --- 2. Weekly Progress Chart (Weeks 1 to 5) ---
  function renderWeeklyProgressChart() {
    const container = document.getElementById('weeklyBarsWrapper');
    const bestWeekBadge = document.getElementById('bestWeekBadge');
    container.innerHTML = '';

    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();
    const totalHabits = state.habits.length;

    const weeks = [
      { name: 'Week 1', start: 1, end: 7 },
      { name: 'Week 2', start: 8, end: 14 },
      { name: 'Week 3', start: 15, end: 21 },
      { name: 'Week 4', start: 22, end: 28 },
      { name: 'Week 5', start: 29, end: daysCount }
    ];

    let bestWeekName = 'Week 1';
    let bestWeekPct = -1;

    weeks.forEach((w) => {
      if (w.start > daysCount) {
        return;
      }
      const actualEnd = Math.min(w.end, daysCount);
      const totalPossible = (actualEnd - w.start + 1) * totalHabits;
      let completedInWeek = 0;

      for (let day = w.start; day <= actualEnd; day++) {
        state.habits.forEach(habit => {
          if (monthLog.habits[habit.id] && monthLog.habits[habit.id][day]) {
            completedInWeek++;
          }
        });
      }

      const pct = totalPossible > 0 ? Math.round((completedInWeek / totalPossible) * 100) : 0;
      if (pct > bestWeekPct) {
        bestWeekPct = pct;
        bestWeekName = w.name;
      }

      const col = document.createElement('div');
      col.className = 'weekly-bar-col';
      col.innerHTML = `
        <div class="weekly-bar-track">
          <div class="weekly-bar-fill" style="height: ${pct}%"></div>
        </div>
        <span class="weekly-bar-label">${w.name}<br><small>${pct}%</small></span>
      `;
      container.appendChild(col);
    });

    bestWeekBadge.textContent = `Best: ${bestWeekName} (${Math.max(0, bestWeekPct)}%)`;
  }

  // --- 3. Overall Stats & KPI Block Calculation ---
  function renderOverallStatsAndKpis() {
    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();
    const totalHabits = state.habits.length;

    const totalGoal = totalHabits * daysCount;
    let totalCompleted = 0;

    state.habits.forEach(habit => {
      if (monthLog.habits[habit.id]) {
        for (let day = 1; day <= daysCount; day++) {
          if (monthLog.habits[habit.id][day]) {
            totalCompleted++;
          }
        }
      }
    });

    const totalLeft = Math.max(0, totalGoal - totalCompleted);
    const overallPct = totalGoal > 0 ? Math.round((totalCompleted / totalGoal) * 100) : 0;

    // Update KPI numbers
    document.getElementById('kpiGoalValue').textContent = totalGoal.toLocaleString();
    document.getElementById('kpiCompletedValue').textContent = totalCompleted.toLocaleString();
    document.getElementById('kpiLeftValue').textContent = totalLeft.toLocaleString();

    // Update Donut Chart
    document.getElementById('donutPercentText').textContent = `${overallPct}%`;
    const circle = document.getElementById('donutFillCircle');
    const circumference = 2 * Math.PI * 54; // r=54 -> 339.292
    const offset = circumference - (overallPct / 100) * circumference;
    circle.style.strokeDasharray = `${circumference}`;
    circle.style.strokeDashoffset = `${offset}`;
  }

  // --- 4. Habit Matrix Grid (Table with week super-headers) ---
  function renderHabitMatrix() {
    const thead = document.getElementById('habitTableHead');
    const tbody = document.getElementById('habitTableBody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const daysCount = getDaysInMonth(state.year, state.month);
    const firstDayIndex = getFirstDayOfWeek(state.year, state.month);
    const monthLog = getMonthLogData();

    const todayObj = new Date();
    const isCurrentRealMonth = todayObj.getFullYear() === state.year && todayObj.getMonth() === state.month;
    const realDay = todayObj.getDate();

    // Row 1: Week Group Headers
    const weekRow = document.createElement('tr');
    weekRow.className = 'week-group-row';

    // Corner cell for Habit Title
    const habitTitleTh = document.createElement('th');
    habitTitleTh.className = 'th-habit-name-header';
    habitTitleTh.textContent = 'Habits';
    weekRow.appendChild(habitTitleTh);

    const weekDefs = [
      { label: 'Week 1', span: 7 },
      { label: 'Week 2', span: 7 },
      { label: 'Week 3', span: 7 },
      { label: 'Week 4', span: 7 },
      { label: 'Week 5', span: 31 - 28 }
    ];

    weekDefs.forEach(w => {
      const th = document.createElement('th');
      th.colSpan = w.span;
      th.textContent = w.label;
      weekRow.appendChild(th);
    });
    thead.appendChild(weekRow);

    // Row 2: Day of Week (Su, Mo...) + Day Numbers (1..31)
    const dayRow = document.createElement('tr');
    dayRow.className = 'day-header-row';

    const cornerSubTh = document.createElement('th');
    cornerSubTh.textContent = 'Day / Date';
    dayRow.appendChild(cornerSubTh);

    for (let day = 1; day <= 31; day++) {
      const th = document.createElement('th');
      th.id = `headerDayCol_${day}`;
      const dayOfWeekIdx = (firstDayIndex + (day - 1)) % 7;
      const dayName = DAY_SHORT_NAMES[dayOfWeekIdx];

      if (isCurrentRealMonth && day === realDay) {
        th.classList.add('is-today-col');
      }

      if (day > daysCount) {
        th.style.opacity = '0.2';
      }

      th.innerHTML = `
        <span class="day-name">${dayName}</span>
        <span class="day-num">${day}</span>
      `;
      dayRow.appendChild(th);
    }
    thead.appendChild(dayRow);

    // Body: Habit Rows
    if (state.habits.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="32" style="text-align: center; padding: 24px; color: var(--text-muted);">No habits added yet. Click "+ Add Habit" or select a preset routine above!</td>`;
      tbody.appendChild(emptyRow);
      return;
    }

    state.habits.forEach(habit => {
      const tr = document.createElement('tr');
      tr.dataset.habitId = habit.id;

      // Habit Name Cell
      const nameTd = document.createElement('td');
      nameTd.className = 'habit-name-cell';
      nameTd.innerHTML = `
        <div class="habit-title-wrapper" title="${habit.name}">
          <span class="habit-emoji">${habit.emoji || '✨'}</span>
          <span class="habit-name-text">${escapeHtml(habit.name)}</span>
        </div>
        <div class="habit-row-actions">
          <button class="action-icon-btn edit-habit-btn" title="Edit Habit" data-id="${habit.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="action-icon-btn delete delete-habit-btn" title="Delete Habit" data-id="${habit.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
      tr.appendChild(nameTd);

      // 31 Day Checkbox cells
      for (let day = 1; day <= 31; day++) {
        const checkTd = document.createElement('td');
        checkTd.className = 'habit-check-cell';
        checkTd.dataset.day = day;

        if (isCurrentRealMonth && day === realDay) {
          checkTd.classList.add('is-today-col');
        }

        if (day > daysCount) {
          checkTd.classList.add('disabled-day');
          tr.appendChild(checkTd);
          continue;
        }

        const isChecked = !!(monthLog.habits[habit.id] && monthLog.habits[habit.id][day]);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'custom-checkbox';
        checkbox.checked = isChecked;
        checkbox.setAttribute('aria-label', `${habit.name} Day ${day}`);

        checkbox.addEventListener('change', (e) => {
          toggleHabitDay(habit.id, day, e.target.checked);
        });

        checkTd.appendChild(checkbox);
        tr.appendChild(checkTd);
      }

      tbody.appendChild(tr);
    });
  }

  // --- 5. Wellness Matrix (Mood & Sleep row) ---
  function renderWellnessMatrix() {
    const tbody = document.getElementById('wellnessTableBody');
    tbody.innerHTML = '';

    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();

    const todayObj = new Date();
    const isCurrentRealMonth = todayObj.getFullYear() === state.year && todayObj.getMonth() === state.month;
    const realDay = todayObj.getDate();

    // Row 1: Mood (1-5 rating)
    const moodTr = document.createElement('tr');
    moodTr.innerHTML = `<td class="wellness-label-cell">😊 Mood (1–5)</td>`;

    for (let day = 1; day <= 31; day++) {
      const td = document.createElement('td');
      td.className = 'wellness-input-cell';
      if (isCurrentRealMonth && day === realDay) td.classList.add('is-today-col');

      if (day > daysCount) {
        td.style.opacity = '0.2';
        moodTr.appendChild(td);
        continue;
      }

      const currentScore = monthLog.wellness.mood[day] !== undefined ? monthLog.wellness.mood[day] : '';

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.placeholder = '-';
      input.value = currentScore;
      input.title = `Mood Day ${day} (1-5)`;

      input.addEventListener('change', (e) => {
        pushHistory();
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 5) {
          monthLog.wellness.mood[day] = val;
        } else if (e.target.value.trim() === '') {
          delete monthLog.wellness.mood[day];
        } else {
          e.target.value = monthLog.wellness.mood[day] || '';
        }
        saveStateToStorage();
        renderWellnessTrendChart();
      });

      td.appendChild(input);
      moodTr.appendChild(td);
    }
    tbody.appendChild(moodTr);

    // Row 2: Sleep Hours
    const sleepTr = document.createElement('tr');
    sleepTr.innerHTML = `<td class="wellness-label-cell">😴 Hours of Sleep</td>`;

    for (let day = 1; day <= 31; day++) {
      const td = document.createElement('td');
      td.className = 'wellness-input-cell';
      if (isCurrentRealMonth && day === realDay) td.classList.add('is-today-col');

      if (day > daysCount) {
        td.style.opacity = '0.2';
        sleepTr.appendChild(td);
        continue;
      }

      const currentSleep = monthLog.wellness.sleep[day] !== undefined ? monthLog.wellness.sleep[day] : '';

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 3;
      input.placeholder = '-';
      input.value = currentSleep;
      input.title = `Sleep Day ${day} (Hours)`;

      input.addEventListener('change', (e) => {
        pushHistory();
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0 && val <= 24) {
          monthLog.wellness.sleep[day] = Math.round(val * 10) / 10;
        } else if (e.target.value.trim() === '') {
          delete monthLog.wellness.sleep[day];
        } else {
          e.target.value = monthLog.wellness.sleep[day] || '';
        }
        saveStateToStorage();
        renderWellnessTrendChart();
      });

      td.appendChild(input);
      sleepTr.appendChild(td);
    }
    tbody.appendChild(sleepTr);
  }

  // --- 6. Analysis Sidebar Table ---
  function renderAnalysisTable() {
    const tbody = document.getElementById('analysisTableBody');
    tbody.innerHTML = '';

    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();

    if (state.habits.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No habits</td></tr>`;
      return;
    }

    state.habits.forEach(habit => {
      let actual = 0;
      if (monthLog.habits[habit.id]) {
        for (let d = 1; d <= daysCount; d++) {
          if (monthLog.habits[habit.id][d]) actual++;
        }
      }

      const goal = habit.targetDays || daysCount;
      const left = Math.max(0, goal - actual);
      const pct = goal > 0 ? Math.round((actual / goal) * 100) : 0;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-habit-name" title="${habit.name}">${habit.emoji} ${escapeHtml(habit.name)}</td>
        <td>${goal}</td>
        <td>${actual}</td>
        <td>${left}</td>
        <td>
          <div class="mini-progress-track">
            <div class="mini-progress-fill" style="width: ${Math.min(100, pct)}%"></div>
          </div>
        </td>
        <td class="td-pct">${pct}%</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- 7. Top 10 Habits Leaderboard ---
  function renderTopHabitsList() {
    const list = document.getElementById('topHabitsList');
    list.innerHTML = '';

    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();

    if (state.habits.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 12px;">No habits tracked yet.</div>`;
      return;
    }

    // Rank habits by completion count and current active streak
    const ranked = state.habits.map(habit => {
      let count = 0;
      let currentStreak = 0;
      let maxStreak = 0;

      if (monthLog.habits[habit.id]) {
        for (let d = 1; d <= daysCount; d++) {
          if (monthLog.habits[habit.id][d]) {
            count++;
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          } else {
            currentStreak = 0;
          }
        }
      }

      const goal = habit.targetDays || daysCount;
      const pct = goal > 0 ? Math.round((count / goal) * 100) : 0;

      return {
        ...habit,
        count,
        maxStreak,
        pct
      };
    });

    ranked.sort((a, b) => b.count - a.count || b.maxStreak - a.maxStreak);

    ranked.slice(0, 10).forEach((habit, idx) => {
      const item = document.createElement('div');
      item.className = `top-habit-item rank-${idx + 1}`;
      item.innerHTML = `
        <div class="top-habit-rank-group">
          <span class="top-habit-rank">${idx + 1}</span>
          <span class="top-habit-label">${habit.emoji} ${escapeHtml(habit.name)}</span>
        </div>
        <span class="top-habit-score-badge">${habit.pct}% (${habit.count}d)</span>
      `;
      list.appendChild(item);
    });
  }

  // --- 8. Wellness Trend SVG Line Graph (Mood & Sleep) ---
  function renderWellnessTrendChart() {
    const svg = document.getElementById('wellnessSvg');
    const avgSleepStat = document.getElementById('avgSleepStat');
    const avgMoodStat = document.getElementById('avgMoodStat');
    svg.innerHTML = '';

    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();

    const width = 1000;
    const height = 150;
    const paddingX = 40;
    const paddingY = 20;

    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    // Background horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = paddingY + (chartHeight / 4) * i;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', paddingX);
      line.setAttribute('x2', width - paddingX);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'chart-grid-line');
      svg.appendChild(line);
    }

    // Points calculation
    const moodPoints = [];
    const sleepPoints = [];
    let moodSum = 0;
    let moodCount = 0;
    let sleepSum = 0;
    let sleepCount = 0;

    for (let day = 1; day <= daysCount; day++) {
      const x = paddingX + ((day - 1) / (daysCount - 1)) * chartWidth;

      // Mood: scale 1 to 5 -> chartHeight down to 0
      const moodVal = monthLog.wellness.mood[day];
      if (moodVal !== undefined) {
        const moodY = paddingY + chartHeight - ((moodVal - 1) / 4) * chartHeight;
        moodPoints.push({ x, y: moodY, day, val: moodVal });
        moodSum += moodVal;
        moodCount++;
      }

      // Sleep: scale 4h to 10h -> chartHeight down to 0
      const sleepVal = monthLog.wellness.sleep[day];
      if (sleepVal !== undefined) {
        const clamped = Math.max(4, Math.min(10, sleepVal));
        const sleepY = paddingY + chartHeight - ((clamped - 4) / 6) * chartHeight;
        sleepPoints.push({ x, y: sleepY, day, val: sleepVal });
        sleepSum += sleepVal;
        sleepCount++;
      }
    }

    // Draw Mood Path (Green)
    if (moodPoints.length > 1) {
      const moodPathData = generateSvgPath(moodPoints);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', moodPathData);
      path.setAttribute('class', 'chart-line-mood');
      svg.appendChild(path);
    }

    // Draw Mood Points
    moodPoints.forEach(p => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', 3.5);
      circle.setAttribute('fill', 'var(--accent-green)');
      circle.setAttribute('class', 'chart-point');
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Day ${p.day}: Mood ${p.val}/5`;
      circle.appendChild(title);
      svg.appendChild(circle);
    });

    // Draw Sleep Path (Blue)
    if (sleepPoints.length > 1) {
      const sleepPathData = generateSvgPath(sleepPoints);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', sleepPathData);
      path.setAttribute('class', 'chart-line-sleep');
      svg.appendChild(path);
    }

    // Draw Sleep Points
    sleepPoints.forEach(p => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', 3.5);
      circle.setAttribute('fill', 'var(--accent-blue)');
      circle.setAttribute('class', 'chart-point');
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Day ${p.day}: Sleep ${p.val}h`;
      circle.appendChild(title);
      svg.appendChild(circle);
    });

    // Update Average Badges
    const avgMood = moodCount > 0 ? (moodSum / moodCount).toFixed(1) : '-';
    const avgSleep = sleepCount > 0 ? (sleepSum / sleepCount).toFixed(1) : '-';
    avgMoodStat.textContent = `Avg Mood: ${avgMood} / 5`;
    avgSleepStat.textContent = `Avg Sleep: ${avgSleep}h`;
  }

  function generateSvgPath(points) {
    if (points.length === 0) return '';
    return points.reduce((acc, point, i) => {
      return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
    }, '');
  }

  // --- 9. Footer Month Navigation Tabs ---
  function renderMonthTabs() {
    const nav = document.getElementById('monthTabsNav');
    nav.innerHTML = '';

    MONTH_NAMES.forEach((name, idx) => {
      const monthKey = `${state.year}-${idx}`;
      const log = state.logs[monthKey];
      const daysCount = getDaysInMonth(state.year, idx);
      const totalGoal = state.habits.length * daysCount;
      let completed = 0;

      if (log && log.habits) {
        state.habits.forEach(h => {
          if (log.habits[h.id]) {
            for (let d = 1; d <= daysCount; d++) {
              if (log.habits[h.id][d]) completed++;
            }
          }
        });
      }

      const pct = totalGoal > 0 ? Math.round((completed / totalGoal) * 100) : 0;

      const btn = document.createElement('button');
      btn.className = `month-tab-btn ${idx === state.month ? 'active' : ''}`;
      btn.innerHTML = `
        <span>${name}</span>
        <span class="tab-pct-badge">${pct}%</span>
      `;

      btn.addEventListener('click', () => {
        switchMonth(idx);
      });

      nav.appendChild(btn);
    });
  }

  // --- Undo / Redo History Engine ---
  const MAX_HISTORY = 40;
  const undoStack = [];
  const redoStack = [];

  function cloneStateSnapshot(s = state) {
    return JSON.stringify({
      year: s.year,
      month: s.month,
      habits: s.habits,
      logs: s.logs,
      theme: s.theme
    });
  }

  function pushHistory() {
    undoStack.push(cloneStateSnapshot());
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    // Clear redo stack on new action
    redoStack.length = 0;
    updateUndoRedoButtons();
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const currentSnapshot = cloneStateSnapshot();
    redoStack.push(currentSnapshot);

    const prevSnapshot = undoStack.pop();
    try {
      const parsed = JSON.parse(prevSnapshot);
      state.year = parsed.year;
      state.month = parsed.month;
      state.habits = parsed.habits;
      state.logs = parsed.logs;
      state.theme = parsed.theme;
      saveStateToStorage();
      populateCalendarDropdowns();
      renderApp();
      showToast('Undone! ↩️');
    } catch (e) {
      console.error('Failed to undo state', e);
    }
    updateUndoRedoButtons();
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const currentSnapshot = cloneStateSnapshot();
    undoStack.push(currentSnapshot);

    const nextSnapshot = redoStack.pop();
    try {
      const parsed = JSON.parse(nextSnapshot);
      state.year = parsed.year;
      state.month = parsed.month;
      state.habits = parsed.habits;
      state.logs = parsed.logs;
      state.theme = parsed.theme;
      saveStateToStorage();
      populateCalendarDropdowns();
      renderApp();
      showToast('Redone! ↪️');
    } catch (e) {
      console.error('Failed to redo state', e);
    }
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  // --- Actions & Event Handlers ---
  function toggleHabitDay(habitId, day, checked) {
    pushHistory();
    const monthLog = getMonthLogData();
    if (!monthLog.habits[habitId]) {
      monthLog.habits[habitId] = {};
    }

    if (checked) {
      monthLog.habits[habitId][day] = true;
    } else {
      delete monthLog.habits[habitId][day];
    }

    saveStateToStorage();

    // Partial re-renders for max performance
    renderDailyProgressChart();
    renderWeeklyProgressChart();
    renderOverallStatsAndKpis();
    renderAnalysisTable();
    renderTopHabitsList();
    renderMonthTabs();
    updateUndoRedoButtons();
  }

  function switchMonth(newMonth) {
    state.month = parseInt(newMonth, 10);
    saveStateToStorage();
    renderApp();
  }

  function switchYear(newYear) {
    state.year = parseInt(newYear, 10);
    saveStateToStorage();
    renderApp();
  }

  function highlightDayColumn(day) {
    const header = document.getElementById(`headerDayCol_${day}`);
    if (header) {
      header.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      header.style.backgroundColor = 'var(--accent-white)';
      header.style.color = 'var(--text-inverse)';
      setTimeout(() => {
        header.style.backgroundColor = '';
        header.style.color = '';
      }, 700);
    }
  }

  function checkAllToday() {
    pushHistory();
    const todayObj = new Date();
    const day = todayObj.getDate();
    const monthLog = getMonthLogData();

    state.habits.forEach(habit => {
      if (!monthLog.habits[habit.id]) monthLog.habits[habit.id] = {};
      monthLog.habits[habit.id][day] = true;
    });

    saveStateToStorage();
    renderApp();
    showToast(`Checked off all habits for Today (Day ${day})! 🎉`);
  }

  function clearMonthData() {
    if (confirm(`Are you sure you want to reset all checked habits for ${MONTH_NAMES[state.month]} ${state.year}?`)) {
      pushHistory();
      const monthKey = getCurrentMonthKey();
      if (state.logs[monthKey]) {
        state.logs[monthKey].habits = {};
        saveStateToStorage();
        renderApp();
        showToast('Month data reset successfully.');
      }
    }
  }

  // --- Habit Form Modals (Add / Edit / Delete) ---
  function openAddHabitModal() {
    document.getElementById('modalHabitTitle').textContent = 'Add New Habit';
    document.getElementById('habitEditId').value = '';
    document.getElementById('habitNameInput').value = '';
    document.getElementById('habitEmojiInput').value = '✨';
    document.getElementById('habitCategoryInput').value = 'Health';
    document.getElementById('habitTargetDaysInput').value = getDaysInMonth(state.year, state.month);

    document.getElementById('habitModal').classList.remove('hidden');
    document.getElementById('habitNameInput').focus();
  }

  function openEditHabitModal(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    document.getElementById('modalHabitTitle').textContent = 'Edit Habit';
    document.getElementById('habitEditId').value = habit.id;
    document.getElementById('habitNameInput').value = habit.name;
    document.getElementById('habitEmojiInput').value = habit.emoji || '✨';
    document.getElementById('habitCategoryInput').value = habit.category || 'Health';
    document.getElementById('habitTargetDaysInput').value = habit.targetDays || 31;

    document.getElementById('habitModal').classList.remove('hidden');
    document.getElementById('habitNameInput').focus();
  }

  function handleSaveHabit(e) {
    e.preventDefault();
    const editId = document.getElementById('habitEditId').value;
    const name = document.getElementById('habitNameInput').value.trim();
    const emoji = document.getElementById('habitEmojiInput').value.trim() || '✨';
    const category = document.getElementById('habitCategoryInput').value;
    const targetDays = parseInt(document.getElementById('habitTargetDaysInput').value, 10) || 31;

    if (!name) return;
    pushHistory();

    if (editId) {
      const habit = state.habits.find(h => h.id === editId);
      if (habit) {
        habit.name = name;
        habit.emoji = emoji;
        habit.category = category;
        habit.targetDays = targetDays;
      }
      showToast('Habit updated successfully!');
    } else {
      const newHabit = {
        id: 'h_' + Date.now(),
        name,
        emoji,
        category,
        targetDays
      };
      state.habits.push(newHabit);
      showToast('New habit added!');
    }

    saveStateToStorage();
    document.getElementById('habitModal').classList.add('hidden');
    renderApp();
  }

  function deleteHabit(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (confirm(`Delete habit "${habit.name}"?`)) {
      pushHistory();
      state.habits = state.habits.filter(h => h.id !== habitId);
      saveStateToStorage();
      renderApp();
      showToast(`Deleted "${habit.name}"`);
    }
  }

  function applyPreset(presetKey) {
    if (!PRESETS[presetKey]) return;
    if (confirm('Load this routine? You can add, edit, or customize habits anytime.')) {
      pushHistory();
      state.habits = JSON.parse(JSON.stringify(PRESETS[presetKey]));
      saveStateToStorage();
      document.getElementById('presetsModal').classList.add('hidden');
      renderApp();
      showToast('Routine preset applied! 🚀');
    }
  }

  // --- Notion Export & File Handlers ---
  function copyNotionMarkdownTable() {
    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();

    let md = `# Habit Tracker - ${MONTH_NAMES[state.month]} ${state.year}\n\n`;
    md += `| Habit | Goal | Actual | % | 1 | 5 | 10 | 15 | 20 | 25 | 30 |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

    state.habits.forEach(h => {
      let actual = 0;
      if (monthLog.habits[h.id]) {
        for (let d = 1; d <= daysCount; d++) {
          if (monthLog.habits[h.id][d]) actual++;
        }
      }
      const goal = h.targetDays || daysCount;
      const pct = goal > 0 ? Math.round((actual / goal) * 100) : 0;

      const d1 = monthLog.habits[h.id] && monthLog.habits[h.id][1] ? '✅' : '⬜';
      const d5 = monthLog.habits[h.id] && monthLog.habits[h.id][5] ? '✅' : '⬜';
      const d10 = monthLog.habits[h.id] && monthLog.habits[h.id][10] ? '✅' : '⬜';
      const d15 = monthLog.habits[h.id] && monthLog.habits[h.id][15] ? '✅' : '⬜';
      const d20 = monthLog.habits[h.id] && monthLog.habits[h.id][20] ? '✅' : '⬜';
      const d25 = monthLog.habits[h.id] && monthLog.habits[h.id][25] ? '✅' : '⬜';
      const d30 = monthLog.habits[h.id] && monthLog.habits[h.id][30] ? '✅' : '⬜';

      md += `| ${h.emoji} ${h.name} | ${goal} | ${actual} | ${pct}% | ${d1} | ${d5} | ${d10} | ${d15} | ${d20} | ${d25} | ${d30} |\n`;
    });

    navigator.clipboard.writeText(md).then(() => {
      showToast('Notion Markdown table copied to clipboard! 📋');
    }).catch(() => {
      showToast('Could not copy directly, please check browser permissions.');
    });
  }

  function exportMonthlyPdf() {
    document.getElementById('exportModal').classList.add('hidden');
    const prevTitle = document.title;
    document.title = `Habit_Tracker_${MONTH_NAMES[state.month]}_${state.year}`;
    setTimeout(() => {
      window.print();
      document.title = prevTitle;
    }, 150);
  }

  function downloadCsv() {
    const daysCount = getDaysInMonth(state.year, state.month);
    const monthLog = getMonthLogData();

    let csv = `Habit,Category,Goal,Actual,Percentage`;
    for (let d = 1; d <= daysCount; d++) csv += `,Day_${d}`;
    csv += `\n`;

    state.habits.forEach(h => {
      let actual = 0;
      let dayChecks = [];
      for (let d = 1; d <= daysCount; d++) {
        const isChecked = !!(monthLog.habits[h.id] && monthLog.habits[h.id][d]);
        if (isChecked) actual++;
        dayChecks.push(isChecked ? '1' : '0');
      }
      const goal = h.targetDays || daysCount;
      const pct = goal > 0 ? Math.round((actual / goal) * 100) : 0;
      csv += `"${h.emoji} ${h.name}","${h.category}",${goal},${actual},${pct}%,${dayChecks.join(',')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Habit_Tracker_${MONTH_NAMES[state.month]}_${state.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!');
  }

  function validateAndSanitizeState(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid JSON format: expected an object.');
    }

    const cleanState = {
      version: 1,
      year: typeof raw.year === 'number' && raw.year >= 2026 && raw.year <= 2100 ? raw.year : 2026,
      month: typeof raw.month === 'number' && raw.month >= 0 && raw.month <= 11 ? raw.month : new Date().getMonth(),
      habits: [],
      logs: {},
      theme: raw.theme === 'light' ? 'light' : 'dark',
      lastSynced: new Date().toISOString()
    };

    // Sanitize Habits
    if (Array.isArray(raw.habits) && raw.habits.length > 0) {
      cleanState.habits = raw.habits.map((h, i) => ({
        id: String(h.id || 'h_' + (Date.now() + i)),
        name: String(h.name || 'Habit ' + (i + 1)).trim(),
        emoji: String(h.emoji || '✨').trim(),
        category: String(h.category || 'General').trim(),
        targetDays: typeof h.targetDays === 'number' && h.targetDays > 0 ? h.targetDays : 31
      }));
    } else {
      cleanState.habits = JSON.parse(JSON.stringify(PRESETS.reference));
    }

    // Sanitize Logs
    if (raw.logs && typeof raw.logs === 'object') {
      Object.keys(raw.logs).forEach(key => {
        const monthLog = raw.logs[key];
        if (monthLog && typeof monthLog === 'object') {
          cleanState.logs[key] = {
            habits: {},
            wellness: {
              mood: {},
              sleep: {}
            }
          };

          // Sanitize habit checks
          if (monthLog.habits && typeof monthLog.habits === 'object') {
            Object.keys(monthLog.habits).forEach(hId => {
              cleanState.logs[key].habits[hId] = {};
              if (monthLog.habits[hId] && typeof monthLog.habits[hId] === 'object') {
                Object.keys(monthLog.habits[hId]).forEach(day => {
                  if (monthLog.habits[hId][day]) {
                    cleanState.logs[key].habits[hId][day] = true;
                  }
                });
              }
            });
          }

          // Sanitize wellness
          if (monthLog.wellness && typeof monthLog.wellness === 'object') {
            if (monthLog.wellness.mood && typeof monthLog.wellness.mood === 'object') {
              Object.keys(monthLog.wellness.mood).forEach(day => {
                const score = parseInt(monthLog.wellness.mood[day], 10);
                if (!isNaN(score) && score >= 1 && score <= 5) {
                  cleanState.logs[key].wellness.mood[day] = score;
                }
              });
            }
            if (monthLog.wellness.sleep && typeof monthLog.wellness.sleep === 'object') {
              Object.keys(monthLog.wellness.sleep).forEach(day => {
                const hours = parseFloat(monthLog.wellness.sleep[day]);
                if (!isNaN(hours) && hours >= 0 && hours <= 24) {
                  cleanState.logs[key].wellness.sleep[day] = hours;
                }
              });
            }
          }
        }
      });
    }

    return cleanState;
  }

  function downloadJsonBackup() {
    state.version = 1;
    state.lastExported = new Date().toISOString();
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Habit_Tracker_Backup_${state.year}_${MONTH_NAMES[state.month]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('JSON backup downloaded! 💾');
  }

  function copyJsonText() {
    state.version = 1;
    state.lastExported = new Date().toISOString();
    const jsonStr = JSON.stringify(state, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast('JSON copied! Paste on any device to sync. 📋');
    }).catch(() => {
      showToast('Please allow clipboard permissions or use Download JSON.');
    });
  }

  function togglePasteJsonSection() {
    const sec = document.getElementById('pasteJsonSection');
    sec.classList.toggle('hidden');
    if (!sec.classList.contains('hidden')) {
      const textarea = document.getElementById('pasteJsonTextarea');
      textarea.focus();
    }
  }

  function applyPastedJson() {
    const textarea = document.getElementById('pasteJsonTextarea');
    const content = textarea.value.trim();
    if (!content) {
      alert('Please paste your JSON backup data into the box.');
      return;
    }

    try {
      const parsed = JSON.parse(content);
      const clean = validateAndSanitizeState(parsed);
      state = clean;
      saveStateToStorage();
      renderApp();
      textarea.value = '';
      document.getElementById('pasteJsonSection').classList.add('hidden');
      document.getElementById('exportModal').classList.add('hidden');
      showToast('Cross-device data synced successfully! 🚀');
    } catch (err) {
      alert('Invalid JSON data: ' + err.message);
    }
  }

  function cancelPasteJson() {
    document.getElementById('pasteJsonTextarea').value = '';
    document.getElementById('pasteJsonSection').classList.add('hidden');
  }

  function handleImportJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const imported = JSON.parse(evt.target.result);
        const clean = validateAndSanitizeState(imported);
        state = clean;
        saveStateToStorage();
        renderApp();
        document.getElementById('exportModal').classList.add('hidden');
        showToast('JSON backup restored successfully! 🚀');
      } catch (err) {
        alert('Failed to parse backup JSON file: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  // --- UI Toast & Helpers ---
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }

  // --- Global Event Listeners ---
  function setupEventListeners() {
    // Dropdown change handlers
    document.getElementById('monthSelect').addEventListener('change', (e) => switchMonth(e.target.value));
    document.getElementById('yearSelect').addEventListener('change', (e) => switchYear(e.target.value));

    // Today Button
    document.getElementById('todayBtn').addEventListener('click', () => {
      const now = new Date();
      state.year = now.getFullYear();
      state.month = now.getMonth();
      saveStateToStorage();
      renderApp();
      setTimeout(() => highlightDayColumn(now.getDate()), 150);
    });

    // Theme Toggle Button
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      saveStateToStorage();
      applyTheme();
    });

    // Quick Matrix Actions
    document.getElementById('batchCheckTodayBtn').addEventListener('click', checkAllToday);
    document.getElementById('clearMonthBtn').addEventListener('click', clearMonthData);

    // Modal Triggers
    document.getElementById('addHabitBtn').addEventListener('click', openAddHabitModal);
    document.getElementById('closeHabitModalBtn').addEventListener('click', () => {
      document.getElementById('habitModal').classList.add('hidden');
    });
    document.getElementById('cancelHabitBtn').addEventListener('click', () => {
      document.getElementById('habitModal').classList.add('hidden');
    });
    document.getElementById('habitForm').addEventListener('submit', handleSaveHabit);

    // Presets Modal
    document.getElementById('presetTemplatesBtn').addEventListener('click', () => {
      document.getElementById('presetsModal').classList.remove('hidden');
    });
    document.getElementById('closePresetsModalBtn').addEventListener('click', () => {
      document.getElementById('presetsModal').classList.add('hidden');
    });
    document.querySelectorAll('.preset-card').forEach(card => {
      card.querySelector('.apply-preset-btn').addEventListener('click', () => {
        applyPreset(card.dataset.preset);
      });
    });

    // How to Use Modal
    document.getElementById('howToUseBtn').addEventListener('click', () => {
      document.getElementById('howToUseModal').classList.remove('hidden');
    });
    document.getElementById('closeHowToUseModalBtn').addEventListener('click', () => {
      document.getElementById('howToUseModal').classList.add('hidden');
    });

    // Export Modal
    document.getElementById('exportModalBtn').addEventListener('click', () => {
      document.getElementById('exportModal').classList.remove('hidden');
    });
    document.getElementById('closeExportModalBtn').addEventListener('click', () => {
      document.getElementById('exportModal').classList.add('hidden');
    });
    document.getElementById('downloadPdfBtn').addEventListener('click', exportMonthlyPdf);
    document.getElementById('copyNotionMdBtn').addEventListener('click', copyNotionMarkdownTable);
    document.getElementById('downloadCsvBtn').addEventListener('click', downloadCsv);
    document.getElementById('downloadJsonBtn').addEventListener('click', downloadJsonBackup);
    document.getElementById('copyJsonTextBtn').addEventListener('click', copyJsonText);
    document.getElementById('togglePasteJsonBtn').addEventListener('click', togglePasteJsonSection);
    document.getElementById('applyPastedJsonBtn').addEventListener('click', applyPastedJson);
    document.getElementById('cancelPasteJsonBtn').addEventListener('click', cancelPasteJson);
    document.getElementById('importJsonInput').addEventListener('change', handleImportJson);

    // Table Event Delegation (Edit/Delete icons)
    document.getElementById('habitTableBody').addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-habit-btn');
      if (editBtn) {
        openEditHabitModal(editBtn.dataset.id);
        return;
      }
      const deleteBtn = e.target.closest('.delete-habit-btn');
      if (deleteBtn) {
        deleteHabit(deleteBtn.dataset.id);
      }
    });

    // Undo & Redo Button Handlers
    document.getElementById('undoBtn').addEventListener('click', handleUndo);
    document.getElementById('redoBtn').addEventListener('click', handleRedo);

    // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Cmd+Z, Cmd+Shift+Z)
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    });

    // User Auth & Cloud Sync Event Listeners
    document.getElementById('openAuthModalBtn').addEventListener('click', openAuthModal);
    document.getElementById('closeAuthModalBtn').addEventListener('click', closeAuthModal);
    document.getElementById('tabSignInBtn').addEventListener('click', () => switchAuthTab('signin'));
    document.getElementById('tabSignUpBtn').addEventListener('click', () => switchAuthTab('signup'));
    document.getElementById('authForm').addEventListener('submit', handleAuthFormSubmit);
    document.getElementById('forgotPasswordBtn').addEventListener('click', handleForgotPassword);

    // Profile Dropdown
    document.getElementById('userProfileBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('userDropdownMenu');
      menu.classList.toggle('hidden');
    });

    document.getElementById('manualSyncBtn').addEventListener('click', () => {
      document.getElementById('userDropdownMenu').classList.add('hidden');
      triggerCloudSync(true);
    });

    document.getElementById('openCloudConfigBtn').addEventListener('click', () => {
      document.getElementById('userDropdownMenu').classList.add('hidden');
      openCloudConfigModal();
    });
    document.getElementById('closeCloudConfigModalBtn').addEventListener('click', closeCloudConfigModal);
    document.getElementById('cloudConfigForm').addEventListener('submit', handleSaveCloudConfig);
    document.getElementById('resetDefaultCloudBtn').addEventListener('click', handleResetCloudConfig);

    document.getElementById('logoutBtn').addEventListener('click', handleSignOut);

    // Close Modals and Dropdowns on background click
    window.addEventListener('click', (e) => {
      // Close dropdown if clicked outside
      const profileWrapper = document.getElementById('userProfileDropdownWrapper');
      if (profileWrapper && !profileWrapper.contains(e.target)) {
        const menu = document.getElementById('userDropdownMenu');
        if (menu) menu.classList.add('hidden');
      }

      ['habitModal', 'presetsModal', 'howToUseModal', 'exportModal', 'authModal', 'cloudConfigModal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });
  }

  // --- Cloud Sync & Authentication Module ---
  function getFirebaseConfig() {
    try {
      const custom = localStorage.getItem('notion_habit_firebase_config');
      if (custom) return JSON.parse(custom);
    } catch (e) {}

    // Default configuration
    return {
      apiKey: "AIzaSyB_demoHabitTrackerCloudSyncKey",
      authDomain: "notion-habit-tracker-sync.firebaseapp.com",
      projectId: "notion-habit-tracker-sync"
    };
  }

  function initCloudAndAuth() {
    const config = getFirebaseConfig();

    if (typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        firebaseAuth = firebase.auth();
        firestoreDb = firebase.firestore();

        // Enable offline persistence
        firestoreDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition' || err.code === 'unimplemented') {
            // Multiple tabs or not supported, ignore
          }
        });

        // Listen for Auth changes
        firebaseAuth.onAuthStateChanged(handleAuthStateChange);
      } catch (err) {
        console.warn('Firebase initialized with local fallback:', err);
        initLocalAuthFallback();
      }
    } else {
      initLocalAuthFallback();
    }
  }

  // Fallback Multi-User Manager (Works 100% offline with zero cloud latency)
  function initLocalAuthFallback() {
    try {
      const activeUser = localStorage.getItem('notion_habit_active_local_user');
      if (activeUser) {
        currentUser = JSON.parse(activeUser);
      }
    } catch (e) {}
  }

  function handleAuthStateChange(user) {
    if (user) {
      currentUser = {
        uid: user.uid,
        email: user.email || 'user@example.com'
      };
      loadStateFromStorage();
      attachCloudListener(user.uid);
    } else {
      currentUser = null;
      if (cloudUnsubscribe) {
        cloudUnsubscribe();
        cloudUnsubscribe = null;
      }
      loadStateFromStorage();
    }

    updateAuthUi();
    populateCalendarDropdowns();
    renderApp();
  }

  function updateAuthUi() {
    const openAuthBtn = document.getElementById('openAuthModalBtn');
    const profileWrapper = document.getElementById('userProfileDropdownWrapper');
    const emailDisplay = document.getElementById('userEmailDisplay');
    const dropdownEmail = document.getElementById('dropdownUserEmail');
    const avatarLetter = document.getElementById('userAvatarLetter');

    if (currentUser) {
      if (openAuthBtn) openAuthBtn.classList.add('hidden');
      if (profileWrapper) profileWrapper.classList.remove('hidden');

      const email = currentUser.email || 'User';
      const initial = email.charAt(0).toUpperCase();

      if (emailDisplay) emailDisplay.textContent = email;
      if (dropdownEmail) dropdownEmail.textContent = email;
      if (avatarLetter) avatarLetter.textContent = initial;

      updateSyncBadge('synced');
    } else {
      if (openAuthBtn) openAuthBtn.classList.remove('hidden');
      if (profileWrapper) profileWrapper.classList.add('hidden');
      updateSyncBadge('guest');
    }
  }

  function updateSyncBadge(status) {
    const dot = document.getElementById('syncStatusDot');
    const indicator = document.getElementById('dropdownSyncIndicator');
    if (!dot) return;

    dot.className = 'sync-status-dot';

    if (status === 'synced') {
      dot.classList.add('synced');
      dot.title = 'Cloud Synced';
      if (indicator) indicator.innerHTML = '🟢 All changes saved to Cloud';
    } else if (status === 'syncing') {
      dot.classList.add('syncing');
      dot.title = 'Syncing to Cloud...';
      if (indicator) indicator.innerHTML = '🟡 Syncing changes...';
    } else if (status === 'offline') {
      dot.classList.add('offline');
      dot.title = 'Saved locally (Offline)';
      if (indicator) indicator.innerHTML = '🔴 Saved offline. Syncs when connected';
    } else {
      dot.classList.add('guest');
      dot.title = 'Guest mode (Local only)';
      if (indicator) indicator.innerHTML = '⚪ Local workspace (Not logged in)';
    }
  }

  function triggerCloudSync(isManual = false) {
    if (!currentUser) {
      updateSyncBadge('guest');
      if (isManual) showToast('Sign in to sync your habits to the Cloud! ⚡');
      return;
    }

    updateSyncBadge('syncing');
    if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);

    const delay = isManual ? 0 : 500;
    cloudSyncTimeout = setTimeout(async () => {
      if (firestoreDb && currentUser) {
        try {
          await firestoreDb.collection('users').doc(currentUser.uid).set({
            email: currentUser.email,
            state: state,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          updateSyncBadge('synced');
          if (isManual) showToast('Cloud sync complete! ☁️');
        } catch (err) {
          console.warn('Cloud sync offline:', err);
          updateSyncBadge('offline');
          if (isManual) showToast('Saved locally. Will sync when online.');
        }
      } else {
        // Local multi-user partition saved
        updateSyncBadge('synced');
        if (isManual) showToast('Private workspace updated! 🚀');
      }
    }, delay);
  }

  function attachCloudListener(uid) {
    if (cloudUnsubscribe) {
      cloudUnsubscribe();
      cloudUnsubscribe = null;
    }
    if (!firestoreDb) return;

    try {
      cloudUnsubscribe = firestoreDb.collection('users').doc(uid).onSnapshot(doc => {
        if (doc.exists) {
          const remoteData = doc.data();
          if (remoteData && remoteData.state) {
            const remoteStr = JSON.stringify(remoteData.state);
            const localStr = JSON.stringify(state);

            if (remoteStr !== localStr) {
              isRemoteSyncInProgress = true;
              state = validateAndSanitizeState(remoteData.state);
              try {
                localStorage.setItem(getActiveStorageKey(), JSON.stringify(state));
              } catch (e) {}
              populateCalendarDropdowns();
              renderApp();
              updateSyncBadge('synced');
              isRemoteSyncInProgress = false;
            }
          }
        }
      }, err => {
        console.warn('Firestore snapshot listener notice:', err);
        updateSyncBadge('offline');
      });
    } catch (err) {
      console.warn('Snapshot listener error:', err);
    }
  }

  // --- Auth Modal & Handlers ---
  function openAuthModal() {
    switchAuthTab('signin');
    clearAuthAlert();
    document.getElementById('authEmailInput').value = '';
    document.getElementById('authPasswordInput').value = '';
    document.getElementById('authConfirmPasswordInput').value = '';
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authEmailInput').focus();
  }

  function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
  }

  function switchAuthTab(mode) {
    currentAuthMode = mode;
    clearAuthAlert();
    const tabSignIn = document.getElementById('tabSignInBtn');
    const tabSignUp = document.getElementById('tabSignUpBtn');
    const confirmGroup = document.getElementById('authConfirmPasswordGroup');
    const submitText = document.getElementById('authSubmitBtnText');
    const modalTitle = document.getElementById('modalAuthTitle');

    if (mode === 'signin') {
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      confirmGroup.classList.add('hidden');
      document.getElementById('authConfirmPasswordInput').required = false;
      submitText.textContent = 'Sign In';
      modalTitle.textContent = '⚡ Sign In to Habit OS';
    } else {
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      confirmGroup.classList.remove('hidden');
      document.getElementById('authConfirmPasswordInput').required = true;
      submitText.textContent = 'Create Account & Sync';
      modalTitle.textContent = '🚀 Create Free Account';
    }
  }

  function showAuthAlert(message, type = 'error') {
    const banner = document.getElementById('authAlertBanner');
    banner.className = `auth-alert ${type}`;
    banner.textContent = message;
    banner.classList.remove('hidden');
  }

  function clearAuthAlert() {
    const banner = document.getElementById('authAlertBanner');
    banner.textContent = '';
    banner.classList.add('hidden');
  }

  async function handleAuthFormSubmit(e) {
    e.preventDefault();
    clearAuthAlert();

    const email = document.getElementById('authEmailInput').value.trim();
    const password = document.getElementById('authPasswordInput').value;
    const confirmPassword = document.getElementById('authConfirmPasswordInput').value;
    const submitBtn = document.getElementById('authSubmitBtn');
    const submitText = document.getElementById('authSubmitBtnText');

    if (!email || !password) {
      showAuthAlert('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      showAuthAlert('Password must be at least 6 characters long.');
      return;
    }

    if (currentAuthMode === 'signup' && password !== confirmPassword) {
      showAuthAlert('Passwords do not match. Please re-enter.');
      return;
    }

    submitBtn.disabled = true;
    submitText.textContent = 'Connecting...';

    try {
      if (firebaseAuth) {
        if (currentAuthMode === 'signup') {
          const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
          // Seed new user private workspace
          seedInitialState();
          if (firestoreDb) {
            await firestoreDb.collection('users').doc(cred.user.uid).set({
              email: email,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              state: state
            });
          }
          closeAuthModal();
          showToast('Account created! 🚀 Your private habits are ready.');
        } else {
          await firebaseAuth.signInWithEmailAndPassword(email, password);
          closeAuthModal();
          showToast(`Welcome back, ${email}! ⚡`);
        }
      } else {
        // Fallback local auth if cloud is unreachable
        handleLocalAuth(email, password, currentAuthMode);
        closeAuthModal();
      }
    } catch (err) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please check credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try signing in.';
      }
      showAuthAlert(msg);
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = currentAuthMode === 'signin' ? 'Sign In' : 'Create Account & Sync';
    }
  }

  function handleLocalAuth(email, password, mode) {
    let registry = {};
    try {
      registry = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    } catch (e) {}

    const uid = 'u_' + btoa(email.toLowerCase()).replace(/=/g, '');

    if (mode === 'signup') {
      registry[email.toLowerCase()] = { uid, email, password };
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(registry));
      currentUser = { uid, email };
      localStorage.setItem('notion_habit_active_local_user', JSON.stringify(currentUser));
      seedInitialState();
      showToast('Account created locally! 🚀');
    } else {
      const user = registry[email.toLowerCase()];
      if (user && user.password === password) {
        currentUser = { uid: user.uid, email: user.email };
        localStorage.setItem('notion_habit_active_local_user', JSON.stringify(currentUser));
        loadStateFromStorage();
        showToast(`Welcome back, ${email}! ⚡`);
      } else {
        // Auto-create for friendly zero-friction login
        registry[email.toLowerCase()] = { uid, email, password };
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(registry));
        currentUser = { uid, email };
        localStorage.setItem('notion_habit_active_local_user', JSON.stringify(currentUser));
        seedInitialState();
        showToast(`Logged in as ${email}! 🚀`);
      }
    }

    updateAuthUi();
    populateCalendarDropdowns();
    renderApp();
  }

  async function handleForgotPassword() {
    const email = document.getElementById('authEmailInput').value.trim();
    if (!email) {
      showAuthAlert('Please enter your email address above first.');
      return;
    }

    try {
      if (firebaseAuth) {
        await firebaseAuth.sendPasswordResetEmail(email);
        showAuthAlert(`Password reset link sent to ${email}! Check your inbox.`, 'success');
      } else {
        showAuthAlert(`Password reset simulated for ${email}. You can sign in with your credentials.`, 'success');
      }
    } catch (err) {
      showAuthAlert(err.message || 'Failed to send password reset email.');
    }
  }

  async function handleSignOut() {
    document.getElementById('userDropdownMenu').classList.add('hidden');
    if (confirm('Log out of your account?')) {
      try {
        if (firebaseAuth) {
          await firebaseAuth.signOut();
        }
      } catch (e) {}

      currentUser = null;
      localStorage.removeItem('notion_habit_active_local_user');
      if (cloudUnsubscribe) {
        cloudUnsubscribe();
        cloudUnsubscribe = null;
      }
      seedInitialState();
      updateAuthUi();
      populateCalendarDropdowns();
      renderApp();
      showToast('Logged out. Switched to Guest workspace.');
    }
  }

  // --- Cloud Config Modal Handlers ---
  function openCloudConfigModal() {
    const config = getFirebaseConfig();
    document.getElementById('cfgApiKey').value = config.apiKey || '';
    document.getElementById('cfgAuthDomain').value = config.authDomain || '';
    document.getElementById('cfgProjectId').value = config.projectId || '';
    document.getElementById('cloudConfigModal').classList.remove('hidden');
  }

  function closeCloudConfigModal() {
    document.getElementById('cloudConfigModal').classList.add('hidden');
  }

  function handleSaveCloudConfig(e) {
    e.preventDefault();
    const apiKey = document.getElementById('cfgApiKey').value.trim();
    const authDomain = document.getElementById('cfgAuthDomain').value.trim();
    const projectId = document.getElementById('cfgProjectId').value.trim();

    if (!apiKey || !projectId) {
      alert('Please provide at least an API Key and Project ID.');
      return;
    }

    const config = { apiKey, authDomain, projectId };
    localStorage.setItem('notion_habit_firebase_config', JSON.stringify(config));
    closeCloudConfigModal();
    showToast('Database configuration saved! Reloading...');
    setTimeout(() => window.location.reload(), 600);
  }

  function handleResetCloudConfig() {
    if (confirm('Reset to default Cloud database?')) {
      localStorage.removeItem('notion_habit_firebase_config');
      closeCloudConfigModal();
      showToast('Reset to default Cloud database. Reloading...');
      setTimeout(() => window.location.reload(), 600);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

