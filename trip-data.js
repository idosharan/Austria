(function (root) {
    'use strict';
    const bookingFields = ['pnr', 'hotel', 'car', 'insurance', 'slc'];
    const days = [
        { id: 'day-1', date: '2026-09-18', departure: '07:40 שעון ישראל', drive: '3:15–3:45 שעות אחרי הנחיתה', parking: 'איסוף רכב בשדה וינה', bring: 'דרכונים, אישורי הזמנות ורישיונות' },
        { id: 'day-2', date: '2026-09-19', departure: '08:00', drive: 'כ־1:15 שעות לכל כיוון', parking: 'Hallstatt P1; חלופה P2', bring: 'שכבה חמה ומזומן לשיט' },
        { id: 'day-3', date: '2026-09-20', departure: '09:00', drive: 'כ־55 דקות לכל כיוון', parking: 'הלברון או Salzburg Süd', bring: 'כרטיסי כניסה ובגדים להחלפה' },
        { id: 'day-4', date: '2026-09-21', departure: 'הגעה למערה ב־09:00', drive: 'כ־30 דקות למערת הקרח', parking: 'חניון המבקרים Eisriesenwelt', bring: 'מעילי חורף, כובע, כפפות ונעליים סגורות' },
        { id: 'day-5', date: '2026-09-22', departure: 'הגעה לנקיק ב־09:00', drive: 'כ־15 דקות לנקיק; כ־40 דקות לגאסטיין', parking: 'חניון הנקיק ותחנת Stubnerkogelbahn', bring: 'נעליים סגורות ושכבה חמה' },
        { id: 'day-6', date: '2026-09-23', departure: '08:30', drive: 'כ־1:15 שעות לשער; נסיעות לאורך הכביש', parking: 'עצירות תצפית לאורך הכביש', bring: 'דלק, שכבות חמות וכרטיס ההטבה' },
        { id: 'day-7', date: '2026-09-24', departure: '08:15', drive: 'כ־שעה לכל כיוון', parking: 'Kesselfallhaus; בהמשך Tauern Spa', bring: 'שכבה חמה ובגדי ים' },
        { id: 'day-8', date: '2026-09-25', departure: 'סיור במכרות ב־09:30', drive: 'כ־45 דקות למכרות; כ־15 דקות לגולינג', parking: 'חניוני המבקרים במכרות ובמפל', bring: 'אישור שעת הסיור וסווטשירט' },
        { id: 'day-9', date: '2026-09-26', departure: 'הגעה להאנגר ב־10:00', drive: 'כ־50 דקות לזלצבורג', parking: 'חניון Hangar-7 ובהמשך Europark', bring: 'רשימת קניות; לסיים עד 18:00' },
        { id: 'day-10', date: '2026-09-27', departure: '09:00', drive: 'כ־3 שעות לווינה; משם לשדה', parking: 'Parkhaus Riesenradplatz', bring: 'דרכונים, אישורי טיסה וכל המזוודות' }
    ];
    function isRecord(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
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
    const api = { days, bookingFields, isRecord, viennaDate, dayForDate, migrateChecks, validateBackup };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.TripData = api;
})(typeof globalThis === 'undefined' ? this : globalThis);