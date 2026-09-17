(function (root) {
    'use strict';
    const bookingFields = ['pnr', 'hotel', 'car', 'insurance', 'slc'];
    // weather = the spot whose conditions decide the day (summit for cable-car days, valley otherwise)
    const days = [
        { id: 'day-1', date: '2026-09-18', departure: '07:40 שעון ישראל', drive: '3:15–3:45 שעות אחרי הנחיתה', parking: 'איסוף רכב בשדה וינה', bring: 'דרכונים, אישורי הזמנות ורישיונות', weather: { name: 'ואגריין', lat: 47.33, lon: 13.30, elevation: 840 } },
        { id: 'day-2', date: '2026-09-19', departure: '08:00', drive: 'כ־1:15 שעות לכל כיוון', parking: 'Hallstatt P1; חלופה P2', bring: 'שכבה חמה ומזומן לשיט', weather: { name: 'קריפנשטיין', lat: 47.52, lon: 13.69, elevation: 2100 } },
        { id: 'day-3', date: '2026-09-20', departure: '09:00', drive: 'כ־55 דקות לכל כיוון', parking: 'הלברון או Salzburg Süd', bring: 'כרטיסי כניסה ובגדים להחלפה', weather: { name: 'זלצבורג', lat: 47.80, lon: 13.04, elevation: 430 } },
        { id: 'day-4', date: '2026-09-21', departure: 'הגעה למערה ב־09:00', drive: 'כ־30 דקות למערת הקרח', parking: 'חניון המבקרים Eisriesenwelt', bring: 'מעילי חורף, כובע, כפפות ונעליים סגורות', weather: { name: 'וורפן', lat: 47.48, lon: 13.19, elevation: 550 } },
        { id: 'day-5', date: '2026-09-22', departure: 'הגעה לנקיק ב־09:00', drive: 'כ־15 דקות לנקיק; כ־40 דקות לגאסטיין', parking: 'חניון הנקיק ותחנת Stubnerkogelbahn', bring: 'נעליים סגורות ושכבה חמה', weather: { name: 'שטובנרקוגל', lat: 47.10, lon: 13.12, elevation: 2246 } },
        { id: 'day-6', date: '2026-09-23', departure: '08:30', drive: 'כ־1:15 שעות לשער; נסיעות לאורך הכביש', parking: 'עצירות תצפית לאורך הכביש', bring: 'דלק, שכבות חמות וכרטיס ההטבה', weather: { name: 'קייזר-פרנץ-יוזפס', lat: 47.075, lon: 12.75, elevation: 2369 } },
        { id: 'day-7', date: '2026-09-24', departure: '08:15', drive: 'כ־שעה לכל כיוון', parking: 'Kesselfallhaus; בהמשך Tauern Spa', bring: 'שכבה חמה ובגדי ים', weather: { name: 'מוסרבודן', lat: 47.16, lon: 12.72, elevation: 2036 } },
        { id: 'day-8', date: '2026-09-25', departure: 'סיור במכרות ב־09:30', drive: 'כ־45 דקות למכרות; כ־15 דקות לגולינג', parking: 'חניוני המבקרים במכרות ובמפל', bring: 'אישור שעת הסיור וסווטשירט', weather: { name: 'הליין', lat: 47.68, lon: 13.10, elevation: 450 } },
        { id: 'day-9', date: '2026-09-26', departure: 'הגעה להאנגר ב־10:00', drive: 'כ־50 דקות לזלצבורג', parking: 'חניון Hangar-7 ובהמשך Europark', bring: 'רשימת קניות; לסיים עד 18:00', weather: { name: 'זלצבורג', lat: 47.80, lon: 13.04, elevation: 430 } },
        { id: 'day-10', date: '2026-09-27', departure: '09:00', drive: 'כ־3 שעות לווינה; משם לשדה', parking: 'Parkhaus Riesenradplatz', bring: 'דרכונים, אישורי טיסה וכל המזוודות', weather: { name: 'וינה', lat: 48.21, lon: 16.37, elevation: 170 } }
    ];
    // WMO codes; each entry covers its code up to the next threshold (e.g. 61 covers 61–65)
    const weatherCodes = [
        [0, '☀️', 'בהיר'], [1, '🌤️', 'בהיר ברובו'], [2, '⛅', 'מעונן חלקית'], [3, '☁️', 'מעונן'],
        [45, '🌫️', 'ערפל'], [51, '🌦️', 'טפטוף'], [56, '🌧️', 'טפטוף מקפיא'], [61, '🌧️', 'גשם'], [66, '🌧️', 'גשם מקפיא'],
        [71, '🌨️', 'שלג'], [80, '🌦️', 'ממטרים'], [85, '🌨️', 'ממטרי שלג'], [95, '⛈️', 'סופת רעמים']
    ];
    function isRecord(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }
    function describeWeather(code) {
        if (typeof code !== 'number' || code < 0) return null;
        let match = weatherCodes[0];
        for (const entry of weatherCodes) if (code >= entry[0]) match = entry;
        return { icon: match[1], label: match[2] };
    }
    function forecastUrl(day) {
        const spot = day.weather;
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.search = new URLSearchParams({
            latitude: spot.lat, longitude: spot.lon, elevation: spot.elevation,
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,cloud_cover_mean,precipitation_probability_max',
            timezone: 'Europe/Vienna', start_date: day.date, end_date: day.date
        }).toString();
        return url.href;
    }
    function summarizeForecast(payload, day) {
        if (!isRecord(payload) || !isRecord(payload.daily) || !Array.isArray(payload.daily.time)) return null;
        const index = payload.daily.time.indexOf(day.date);
        if (index < 0) return null;
        const pick = key => Array.isArray(payload.daily[key]) ? payload.daily[key][index] : null;
        const max = pick('temperature_2m_max');
        const min = pick('temperature_2m_min');
        const sky = describeWeather(pick('weather_code'));
        if (typeof max !== 'number' || typeof min !== 'number' || !sky) return null;
        const cloud = pick('cloud_cover_mean');
        const rain = pick('precipitation_probability_max');
        return {
            icon: sky.icon, label: sky.label, name: day.weather.name, elevation: day.weather.elevation,
            temperatures: Math.round(max) + '° / ' + Math.round(min) + '°',
            cloud: typeof cloud === 'number' ? Math.round(cloud) : null,
            rain: typeof rain === 'number' && rain >= 20 ? Math.round(rain) : null
        };
    }
    function viennaDate(date = new Date()) {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
        const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
        return values.year + '-' + values.month + '-' + values.day;
    }
    function dayForDate(date) {
        return (days.find(day => day.date === date) || (date < days[0].date ? days[0] : days[days.length - 1])).id;
    }
    function migrateChecks(saved, activities, packingKeys) {
        const result = {};
        if (!isRecord(saved)) return result;
        for (const key of packingKeys) if (typeof saved[key] === 'boolean') result[key] = saved[key];
        for (const activity of activities) {
            const key = 'ev:' + activity.id;
            if (Object.hasOwn(saved, key) && typeof saved[key] === 'boolean') result[key] = saved[key];
            else if (activity.legacyKey && typeof saved[activity.legacyKey] === 'boolean') result[key] = saved[activity.legacyKey];
        }
        return result;
    }
    function validateBackup(value, allowedChecks) {
        if (!isRecord(value) || value.app !== 'aus-trip-2026' || value.version !== 1 || !isRecord(value.checks) || !isRecord(value.booking) || !isRecord(value.preferences)) throw new Error('Invalid backup format');
        if (Object.keys(value).some(key => !['app', 'version', 'exportedAt', 'checks', 'booking', 'preferences'].includes(key))) throw new Error('Unknown backup field');
        const allowed = new Set(allowedChecks);
        const checks = {};
        const booking = {};
        for (const [key, checked] of Object.entries(value.checks)) {
            if (!allowed.has(key) || typeof checked !== 'boolean') throw new Error('Invalid check');
            checks[key] = checked;
        }
        for (const [key, text] of Object.entries(value.booking)) {
            if (!bookingFields.includes(key) || typeof text !== 'string' || text.length > 2000) throw new Error('Invalid booking');
            booking[key] = text;
        }
        if (Object.keys(value.preferences).some(key => key !== 'navigation') || !['google', 'waze'].includes(value.preferences.navigation)) throw new Error('Invalid navigation preference');
        return { app: 'aus-trip-2026', version: 1, checks, booking, preferences: { navigation: value.preferences.navigation } };
    }
    const api = { days, bookingFields, isRecord, viennaDate, dayForDate, migrateChecks, validateBackup, describeWeather, forecastUrl, summarizeForecast };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.TripData = api;
})(typeof globalThis === 'undefined' ? this : globalThis);