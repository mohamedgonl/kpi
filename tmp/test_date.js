
function getDateRange(period, baseDate) {
    const d = new Date(baseDate);
    let start, end;
    if (period === 'daily') {
        start = end = baseDate;
    } else if (period === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d);
        monday.setDate(diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        start = monday.toISOString().split('T')[0];
        end = sunday.toISOString().split('T')[0];
    } else if (period === 'monthly') {
        start = `${baseDate.substring(0, 7)}-01`;
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        end = lastDay.toISOString().split('T')[0];
    } else if (period === 'quarterly') {
        const qm = Math.floor(d.getMonth() / 3) * 3;
        // The bug migth be here: new Date(y, m, d) uses LOCAL time
        // but .toISOString() uses UTC time.
        // If your local time is after UTC midnight, but before current date, it might shift.
        const startDate = new Date(d.getFullYear(), qm, 1);
        const endDate = new Date(d.getFullYear(), qm + 3, 0);
        console.log(`Local Start: ${startDate.toString()}`);
        console.log(`Local End: ${endDate.toString()}`);
        start = startDate.toISOString().split('T')[0];
        end = endDate.toISOString().split('T')[0];
    }
    return { start: start || '', end: end || '' };
}

const base = '2026-03-27';
const range = getDateRange('quarterly', base);
console.log(`Input: ${base}`);
console.log(`Output: Start=${range.start}, End=${range.end}`);
