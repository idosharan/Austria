(function () {
    'use strict';
    const data = window.TripData;
    const stateKey = 'austria2026-state-v1';
    const all = selector => Array.from(document.querySelectorAll(selector));
    const byId = id => document.getElementById(id);
    const text = (tag, value, className) => {
        const element = document.createElement(tag);
        element.textContent = value;
        if (className) element.className = className;
        return element;
    };
    const activities = all('[data-activity-id]');
    const packingKeys = all('#packing input[data-key]').map(input => input.dataset.key);
    const allowedChecks = packingKeys.concat(activities.map(activity => 'ev:' + activity.dataset.activityId));
    let storageBlocked = false;
    let statusTimeout;
    function status(message, kind = 'success') {
        const element = byId('dataStatus');
        clearTimeout(statusTimeout);
        element.textContent = message;
        element.dataset.kind = kind;
        element.hidden = false;
        if (kind !== 'error') statusTimeout = setTimeout(() => { element.hidden = true; }, 4000);
    }
    function emptyState() {
        return { app: 'aus-trip-2026', version: 1, checks: {}, booking: {}, preferences: { navigation: 'google' } };
    }
    function loadState() {
        try {
            const saved = localStorage.getItem(stateKey);
            if (saved) {
                try { return data.validateBackup(JSON.parse(saved), allowedChecks); }
                catch (error) {
                    storageBlocked = true;
                    status('הנתונים השמורים אינם תקינים. המקור לא נדרס; שינויים זמינים רק כל עוד העמוד פתוח, עד שחזור גיבוי תקין.', 'error');
                    return emptyState();
                }
            }
            const result = emptyState();
            result.checks = data.migrateChecks(JSON.parse(localStorage.getItem('austria2026-checks') || '{}'), activities.map(activity => ({ id: activity.dataset.activityId, legacyKey: activity.dataset.legacyKey })), packingKeys);
            const booking = JSON.parse(localStorage.getItem('austria2026-booking') || '{}');
            if (data.isRecord(booking)) {
                for (const field of data.bookingFields) if (typeof booking[field] === 'string') result.booking[field] = booking[field].slice(0, 2000);
            }
            return result;
        } catch (error) {
            status('לא ניתן לקרוא את השמירה המקומית. פרטים קיימים לא נמחקו.', 'error');
            storageBlocked = true;
            return emptyState();
        }
    }
    let state = loadState();
    let baseline = structuredClone(state);
    let uiReady = false;
    function mergeChanges(latest) {
        for (const group of ['checks', 'booking', 'preferences']) {
            const keys = new Set([...Object.keys(baseline[group]), ...Object.keys(state[group])]);
            for (const key of keys) {
                if (state[group][key] === baseline[group][key]) continue;
                if (Object.hasOwn(state[group], key)) latest[group][key] = state[group][key];
                else delete latest[group][key];
            }
        }
        return latest;
    }
    function saveState(notify = true) {
        try {
            if (storageBlocked) throw new Error('Storage requires recovery');
            const saved = localStorage.getItem(stateKey);
            const merged = saved ? mergeChanges(data.validateBackup(JSON.parse(saved), allowedChecks)) : state;
            localStorage.setItem(stateKey, JSON.stringify(merged));
            state = merged;
            baseline = structuredClone(state);
            if (uiReady) paintState();
            if (notify) status('נשמר במכשיר הזה');
            return true;
        } catch (error) {
            status('השמירה במכשיר נכשלה. השינויים זמניים; אפשר להוריד גיבוי לפני סגירת העמוד.', 'error');
            return false;
        }
    }
    if (!storageBlocked) saveState(false);
    all('.done-check').forEach(element => element.remove());
    for (const activity of activities) {
        activity.id = activity.dataset.activityId;
        const label = text('label', '', 'done-check');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.key = 'ev:' + activity.dataset.activityId;
        input.setAttribute('aria-label', 'בוצע: ' + activity.querySelector('h3').textContent.trim());
        label.append(input, text('span', '✔'));
        activity.append(label);
    }
    const checkboxes = all('input[type="checkbox"][data-key]');
    for (const input of checkboxes) input.addEventListener('change', () => {
        state.checks[input.dataset.key] = input.checked;
        saveState();
        renderDay();
    });
    const bookingArticle = document.querySelector('.b-value').closest('.event');
    byId('bookingContent').append(bookingArticle);
    bookingArticle.querySelector('p').textContent = 'פרטי ההזמנות נשמרים במכשיר הזה בלבד.';
    const emergencyArticle = all('#tips .event').find(article => article.querySelector('h3').textContent.includes('מספרי חירום'));
    byId('emergencyContent').append(emergencyArticle);
    const hotel = all('#day-1 .event').find(article => article.querySelector('h3').textContent.includes('Hofgut'));
    hotel.id = 'hotel';
    async function copyText(value) {
        if (!value.trim()) { status('השדה עדיין ריק', 'error'); return; }
        try { await navigator.clipboard.writeText(value); status('הועתק'); }
        catch (error) { status('ההעתקה אינה זמינה בדפדפן הזה. אפשר לסמן ולהעתיק את הטקסט.', 'error'); }
    }
    for (const editable of all('.b-value')) {
        const field = editable.dataset.field;
        const row = editable.closest('.booking-row');
        const caption = row.querySelector('.b-label');
        const label = text('label', caption.textContent, 'b-label');
        label.htmlFor = 'booking-' + field;
        caption.replaceWith(label);
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'b-value';
        input.id = label.htmlFor;
        input.dataset.field = field;
        input.placeholder = editable.dataset.ph;
        input.maxLength = 2000;
        input.autocomplete = 'off';
        input.dir = 'auto';
        input.addEventListener('input', () => { state.booking[field] = input.value; saveState(); });
        editable.replaceWith(input);
        const button = text('button', '⧉', 'icon-button');
        button.type = 'button';
        button.title = 'העתקת ' + label.textContent;
        button.setAttribute('aria-label', button.title);
        button.addEventListener('click', () => copyText(input.value));
        row.append(button);
    }
    const hotelCopy = text('button', '⧉ העתקת יעד המלון', 'secondary-button');
    hotelCopy.type = 'button';
    hotelCopy.addEventListener('click', () => copyText('Hofgut Wagrain Apartment & Lifestyle Resort, Wagrain, Austria'));
    hotel.append(hotelCopy);
    for (const article of all('section.day .event')) {
        const details = document.createElement('details');
        details.className = 'event-details';
        details.append(text('summary', 'פרטים'));
        const badges = text('div', '', 'event-badges');
        const booking = article.querySelector('.book');
        const card = article.querySelector('.slc');
        if (booking) badges.append(text('span', booking.classList.contains('book-yes') ? 'הזמנה מראש' : booking.classList.contains('book-rec') ? 'הזמנה מומלצת' : 'ללא הזמנה מראש', 'status-chip'));
        if (card) {
            const conditional = /ג'וקר|Salzburg Card|הטבת הג/.test(card.textContent);
            const free = /חינם ממילא|חינם לכולם|הטיול בעיירה חינם/.test(card.textContent);
            badges.append(text('span', card.classList.contains('slc-yes') ? (conditional ? 'הטבה מותנית' : 'כלול בכרטיס') : free ? 'כניסה חופשית' : 'מחוץ לכרטיס', 'status-chip'));
        }
        const links = text('div', '', 'event-actions');
        for (const child of Array.from(article.children)) {
            if (child.matches('h3, .time, .done-check')) continue;
            if (child.matches('a.map-btn, button')) links.append(child);
            else details.append(child);
        }
        if (badges.children.length) article.append(badges);
        if (links.children.length) article.append(links);
        if (details.children.length > 1) article.append(details);
    }
    const destinations = all('a.map-btn:not(.web-btn)').map(link => {
        const destination = new URL(link.href, location.href).searchParams.get('q');
        if (!destination) return null;
        link.classList.add('destination-link');
        return { link, original: link.href, destination };
    }).filter(Boolean);
    function paintNavigation() {
        byId('navigationApp').value = state.preferences.navigation;
        for (const { link, original, destination } of destinations) {
            const url = new URL('https://www.waze.com/ul');
            url.searchParams.set('q', destination);
            url.searchParams.set('navigate', 'yes');
            link.href = state.preferences.navigation === 'waze' ? url.href : original;
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('viewBox', '0 0 24 24');
            icon.setAttribute('aria-hidden', 'true');
            const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            use.setAttribute('href', '#icon-pin');
            icon.append(use);
            link.replaceChildren(icon, document.createTextNode(state.preferences.navigation === 'waze' ? 'Waze' : 'Google Maps'));
            link.setAttribute('aria-label', 'ניווט: ' + destination);
        }
    }
    byId('navigationApp').addEventListener('change', event => {
        state.preferences.navigation = event.target.value;
        saveState();
        paintNavigation();
    });
    function paintState() {
        checkboxes.forEach(input => { input.checked = !!state.checks[input.dataset.key]; });
        all('input.b-value').forEach(input => { input.value = state.booking[input.dataset.field] || ''; });
        paintNavigation();
    }
    paintState();
    uiReady = true;
    window.addEventListener('storage', event => {
        if (event.key !== stateKey || storageBlocked) return;
        try {
            const saved = localStorage.getItem(stateKey);
            if (!saved) return;
            const latest = data.validateBackup(JSON.parse(saved), allowedChecks);
            const nextBaseline = structuredClone(latest);
            state = mergeChanges(latest);
            baseline = nextBaseline;
            paintState();
            renderDay();
            filter();
        } catch (error) { status('לא ניתן לקרוא את השינוי מהלשונית האחרת. הנתונים כאן לא הוחלפו.', 'error'); }
    });
    function download(content, filename, type) {
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(new Blob([content], { type }));
        anchor.download = filename;
        document.body.append(anchor);
        anchor.click();
        setTimeout(() => { URL.revokeObjectURL(anchor.href); anchor.remove(); }, 1000);
    }
    byId('exportBackup').addEventListener('click', () => {
        const backup = { ...state, exportedAt: new Date().toISOString() };
        download(JSON.stringify(backup, null, 2), 'austria-backup-' + data.viennaDate() + '.json', 'application/json');
        status('הגיבוי הורד. הוא מכיל פרטים אישיים ואינו מוצפן.');
    });
    byId('importBackup').addEventListener('change', async event => {
        const input = event.target;
        const file = input.files[0];
        if (!file) return;
        try {
            if (file.size > 128 * 1024) throw new Error('Backup too large');
            const imported = data.validateBackup(JSON.parse(await file.text()), allowedChecks);
            if (!window.confirm('להחליף את ההזמנות והסימונים הנוכחיים בנתוני הגיבוי?')) return;
            localStorage.setItem(stateKey, JSON.stringify(imported));
            state = imported;
            baseline = structuredClone(state);
            storageBlocked = false;
            paintState();
            renderDay();
            filter();
            status('הגיבוי שוחזר ונשמר במכשיר');
        } catch (error) {
            status('השחזור נכשל: הקובץ אינו מתאים או שהשמירה אינה זמינה. הנתונים הנוכחיים לא השתנו.', 'error');
        } finally { input.value = ''; }
    });
    const sections = all('section.day, .utility-section');
    const cards = all('section.day .event, .utility-section .event, .shop-card, .phrase-row, .pack-item');
    const search = byId('tripSearch');
    let view = 'all';
    let followToday = true;
    let selectedDay = data.dayForDate(data.viennaDate());
    let currentDate = '';
    const detailState = new Map();
    for (const day of data.days) {
        const section = byId(day.id);
        section.dataset.date = day.date;
        const option = text('option', day.date.slice(8) + '.9 · ' + section.querySelector('h2').textContent.split('—').slice(1).join('—').trim());
        option.value = day.id;
        byId('daySelect').append(option);
    }
    function filter() {
        const query = search.value.trim().toLocaleLowerCase('he');
        let hits = 0;
        for (const section of sections) {
            const metadata = data.days.find(day => day.id === section.id);
            const dateText = metadata ? metadata.date + ' ' + Number(metadata.date.slice(8)) + '.9.2026 ' + metadata.date.slice(8) + '.09.2026' : '';
            const heading = section.querySelector('h2').textContent + ' ' + dateText;
            const sectionMatch = query && heading.toLocaleLowerCase('he').includes(query);
            let visible = 0;
            for (const card of cards.filter(card => card.closest('section') === section)) {
                const values = Array.from(card.querySelectorAll('input.b-value')).map(input => input.value).join(' ');
                const match = !query || sectionMatch || (card.textContent + ' ' + values).toLocaleLowerCase('he').includes(query);
                card.classList.toggle('hidden-by-search', !match);
                if (match) { visible++; if (query) hits++; }
                const details = card.querySelector('details.event-details');
                if (details && query) {
                    if (!detailState.has(details)) detailState.set(details, details.open);
                    details.open = !!match;
                }
            }
            section.classList.toggle('hidden-by-search', !!query && !visible);
            section.classList.toggle('hidden-by-view', section.classList.contains('day') && !query && view === 'day' && section.id !== selectedDay);
        }
        if (!query) {
            for (const [details, open] of detailState) details.open = open;
            detailState.clear();
        }
        for (const category of all('.pack-cat')) {
            let sibling = category.nextElementSibling;
            let visible = false;
            while (sibling && !sibling.classList.contains('pack-cat')) {
                if (!sibling.classList.contains('hidden-by-search')) visible = true;
                sibling = sibling.nextElementSibling;
            }
            category.classList.toggle('hidden-by-search', !!query && !visible);
        }
        byId('clearSearch').hidden = !query;
        byId('searchCount').textContent = query ? (hits ? hits + ' תוצאות' : 'לא נמצאו תוצאות') : '';
        byId('viewAll').setAttribute('aria-pressed', String(view === 'all'));
        byId('viewToday').setAttribute('aria-pressed', String(view === 'day'));
    }
    function clearSearch() { search.value = ''; filter(); }
    search.addEventListener('input', filter);
    search.addEventListener('search', filter);
    search.addEventListener('keydown', event => { if (event.key === 'Escape') clearSearch(); });
    byId('clearSearch').addEventListener('click', () => { clearSearch(); search.focus(); });
    function renderDay() {
        const day = data.days.find(item => item.id === selectedDay);
        const section = byId(selectedDay);
        byId('daySelect').value = selectedDay;
        const today = data.viennaDate();
        const prefix = day.date === today ? 'היום · ' : today < data.days[0].date ? 'לקראת הטיול · ' : today > data.days.at(-1).date ? 'הטיול הסתיים · ' : '';
        byId('dayCaption').textContent = prefix + day.date.slice(8) + '.9.2026';
        const pending = Array.from(section.querySelectorAll('[data-activity-id]')).find(activity => !state.checks['ev:' + activity.dataset.activityId]);
        byId('nextActivity').textContent = pending ? pending.querySelector('h3').textContent : 'כל התחנות ביום הזה סומנו';
        byId('nextActivity').href = '#' + (pending ? pending.id : day.id);
        byId('nextTime').textContent = pending ? pending.querySelector('.time')?.textContent || '' : '';
        const brief = byId('dayBrief');
        brief.replaceChildren();
        for (const [label, value] of [['יציאה / הגעה', day.departure], ['נסיעות משוערות', day.drive], ['חניה / נקודת מוצא', day.parking], ['לקחת איתנו', day.bring]]) {
            const pair = document.createElement('div');
            pair.append(text('dt', label), text('dd', value));
            brief.append(pair);
        }
        const links = section.querySelector('.day-links');
        byId('selectedDayLinks').replaceChildren(...(links ? Array.from(links.children).map(link => link.cloneNode(true)) : []));
        paintWeather(day);
    }
    const weatherCache = new Map();
    let weatherRequest = 0;
    function showWeather(summary) {
        const element = byId('dayWeather');
        const numbers = text('span', summary.temperatures);
        numbers.dir = 'ltr';
        const parts = [summary.label, numbers];
        if (summary.cloud !== null) parts.push('עננות ' + summary.cloud + '%');
        if (summary.rain !== null) parts.push('סיכוי משקעים ' + summary.rain + '%');
        element.replaceChildren(text('span', summary.icon + ' ' + summary.name + ' (' + summary.elevation.toLocaleString('en-US') + ' מ׳)', 'weather-spot'));
        parts.forEach((part, index) => element.append(index ? ' · ' : ' ', part));
        element.hidden = false;
    }
    async function paintWeather(day) {
        const token = ++weatherRequest;
        const cached = weatherCache.get(day.id);
        if (cached && Date.now() - cached.at < 30 * 60000) { showWeather(cached.summary); return; }
        byId('dayWeather').hidden = true;
        if (!day.weather || navigator.onLine === false) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            const response = await fetch(data.forecastUrl(day), { signal: controller.signal });
            if (!response.ok) return;
            const summary = data.summarizeForecast(await response.json(), day);
            if (!summary) return;
            weatherCache.set(day.id, { summary, at: Date.now() });
            if (token === weatherRequest) showWeather(summary);
        } catch (error) {
            // Offline, blocked or slow: the panel simply stays without a forecast line
        } finally {
            clearTimeout(timeout);
        }
    }
    function updateDate() {
        const today = data.viennaDate();
        if (today === currentDate) return;
        currentDate = today;
        if (followToday) selectedDay = data.dayForDate(today);
        for (const day of data.days) {
            byId(day.id).classList.toggle('is-today', day.date === today);
            all('.date-nav a[href="#' + day.id + '"]').forEach(link => {
                link.classList.toggle('is-today-link', day.date === today);
                if (day.date === today) link.setAttribute('aria-current', 'date');
                else link.removeAttribute('aria-current');
            });
        }
        renderDay();
        filter();
    }
    byId('viewAll').addEventListener('click', () => { view = 'all'; clearSearch(); });
    byId('viewToday').addEventListener('click', () => {
        followToday = true;
        selectedDay = data.dayForDate(data.viennaDate());
        view = 'day';
        clearSearch();
        renderDay();
    });
    byId('daySelect').addEventListener('change', event => {
        followToday = false;
        selectedDay = event.target.value;
        view = 'day';
        clearSearch();
        renderDay();
    });
    function openTarget(target, keepFollowing = false) {
        const section = target.closest('section.day');
        if (section) {
            if (data.days.some(day => day.id === section.id)) {
                selectedDay = section.id;
                if (!keepFollowing) followToday = false;
                renderDay();
            } else view = 'all';
        }
        clearSearch();
        if (target.id === 'tripSearch') target.focus();
        target.querySelector('details')?.setAttribute('open', '');
    }
    document.addEventListener('click', event => {
        const anchor = event.target.closest('a[href^="#"]');
        if (!anchor || anchor.classList.contains('add-cal')) return;
        const target = byId(anchor.hash.slice(1));
        if (!target) return;
        event.preventDefault();
        if (target.id === 'tripTools' && anchor.closest('.quick-nav')) byId('viewToday').click();
        openTarget(target, anchor.id === 'nextActivity');
        if (location.hash !== anchor.hash) history.pushState(null, '', anchor.hash);
        target.scrollIntoView({ block: 'start' });
    });
    window.addEventListener('hashchange', () => {
        const target = byId(location.hash.slice(1));
        if (!target) return;
        openTarget(target);
        requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    });
    byId('tripTools').hidden = false;
    document.querySelector('.quick-nav').hidden = false;
    updateDate();
    setInterval(updateDate, 60000);
    window.addEventListener('focus', updateDate);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDate(); });
    if (location.hash) {
        const target = byId(location.hash.slice(1));
        if (target) {
            openTarget(target);
            requestAnimationFrame(() => target.scrollIntoView());
        }
    }
    const topButton = byId('backToTop');
    document.querySelector('.quick-nav').append(topButton);
    topButton.title = 'חזרה לראש העמוד';
    topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
    function paintTheme() {
        const dark = document.documentElement.dataset.theme === 'dark';
        byId('themeToggle').textContent = dark ? '☀️' : '🌙';
        byId('themeToggle').setAttribute('aria-pressed', String(dark));
        document.querySelector('meta[name="theme-color"]').content = dark ? '#101c17' : '#14342b';
    }
    byId('themeToggle').addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem('austria2026-theme', next); } catch (error) { status('ערכת התצוגה השתנתה, אך לא נשמרה במכשיר.', 'error'); }
        paintTheme();
    });
    paintTheme();
    const flights = {
        LY361: { title: 'טיסה LY361 אל על — תל אביב - וינה', start: '20260918T044000Z', end: '20260918T082000Z', loc: 'נתב"ג טרמינל 3', desc: 'המראה 07:40 שעון ישראל. נחיתה כ-10:20 שעון מקומי. הגעה לשדה עד 04:40.' },
        LY364: { title: 'טיסה LY364 אל על — וינה - תל אביב', start: '20260927T193500Z', end: '20260927T230000Z', loc: 'Vienna International Airport Terminal 3', desc: 'המראה 21:35 שעון מקומי. נחיתה 02:00 שעון ישראל (28.9). החזרת רכב עד 18:15.' }
    };
    const calendarText = value => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    function foldCalendarLine(line) {
        const encoder = new TextEncoder();
        let length = 0;
        let output = '';
        for (const character of line) {
            const size = encoder.encode(character).length;
            if (length + size > 75) { output += '\r\n '; length = 1; }
            output += character;
            length += size;
        }
        return output;
    }
    all('.add-cal').forEach(button => button.addEventListener('click', event => {
        event.preventDefault();
        const flight = flights[button.dataset.cal];
        if (!flight) return;
        const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AustriaTrip2026//HE', 'BEGIN:VEVENT', 'UID:' + button.dataset.cal + '-2026@austria-trip', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'), 'DTSTART:' + flight.start, 'DTEND:' + flight.end, 'SUMMARY:' + calendarText(flight.title), 'LOCATION:' + calendarText(flight.loc), 'DESCRIPTION:' + calendarText(flight.desc), 'BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', 'DESCRIPTION:תזכורת טיסה', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
        download(lines.map(foldCalendarLine).join('\r\n') + '\r\n', button.dataset.cal + '.ics', 'text/calendar;charset=utf-8');
    }));
    let offlineInfo;
    function paintOffline() {
        const element = byId('offlineStatus');
        if (!offlineInfo) return;
        element.dataset.ready = String(!!offlineInfo.ready);
        const saved = offlineInfo.savedAt ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(offlineInfo.savedAt)) : '';
        element.textContent = (navigator.onLine ? '' : 'אין חיבור לרשת. ') + (offlineInfo.ready ? 'התיק זמין ללא רשת' + (saved ? ' · נשמר ' + saved : '') : 'טרם אושרה שמירה מלאה ללא רשת') + '. מפות ואתרים חיצוניים אינם כלולים.';
    }
    function requestOfflineStatus() {
        const controller = navigator.serviceWorker?.controller;
        if (!controller) return;
        const channel = new MessageChannel();
        const timeout = setTimeout(() => { channel.port1.close(); offlineInfo = { ready: false }; paintOffline(); }, 4000);
        channel.port1.onmessage = event => {
            clearTimeout(timeout);
            offlineInfo = event.data;
            channel.port1.close();
            paintOffline();
        };
        controller.postMessage({ type: 'OFFLINE_STATUS' }, [channel.port2]);
    }
    if ('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
        navigator.serviceWorker.addEventListener('controllerchange', requestOfflineStatus);
        navigator.serviceWorker.register('sw.js').then(() => {
            offlineInfo = { ready: false };
            paintOffline();
            return navigator.serviceWorker.ready;
        }).then(requestOfflineStatus).catch(() => { offlineInfo = { ready: false }; paintOffline(); });
    } else {
        byId('offlineStatus').textContent = 'אופליין מנוהל אינו זמין בפתיחה הזו. נדרשת פתיחה ב־HTTPS או בשרת מקומי.';
    }
    window.addEventListener('online', () => { paintOffline(); requestOfflineStatus(); renderDay(); });
    window.addEventListener('offline', paintOffline);
    const installButton = byId('installBtn');
    const installHint = byId('installHint');
    let installPrompt;
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    installButton.hidden = !!standalone;
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; installHint.classList.remove('show'); });
    installButton.addEventListener('click', async () => {
        if (installPrompt) {
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            installButton.hidden = choice.outcome === 'accepted';
            installPrompt = null;
        } else {
            installHint.textContent = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ב־Safari: שיתוף ואז "הוסף למסך הבית".' : 'בתפריט הדפדפן: "התקנת אפליקציה" או "הוספה למסך הבית".';
            installHint.classList.add('show');
        }
    });
    window.addEventListener('appinstalled', () => { installButton.hidden = true; installHint.classList.remove('show'); });
    let printState;
    window.addEventListener('beforeprint', () => {
        printState = { query: search.value, view, details: all('details').map(details => [details, details.open]) };
        view = 'all';
        clearSearch();
        all('details').forEach(details => { details.open = true; });
    });
    window.addEventListener('afterprint', () => {
        if (!printState) return;
        search.value = printState.query;
        view = printState.view;
        filter();
        printState.details.forEach(([details, open]) => { details.open = open; });
    });
})();
