
const https = require('https');

const FIREBASE_URL = 'https://kpi-dun-default-rtdb.asia-southeast1.firebasedatabase.app/tasks.json';

function fetchTasks() {
    return new Promise((resolve, reject) => {
        https.get(FIREBASE_URL, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log('Fetching tasks from Firebase...');
    try {
        const tasksData = await fetchTasks();
        if (!tasksData) {
            console.log('No tasks found.');
            return;
        }

        const tasks = Array.isArray(tasksData) ? tasksData : Object.values(tasksData);
        const march2026Tasks = tasks.filter(t => t && t.date && t.date.startsWith('2026-03'));

        if (march2026Tasks.length === 0) {
            console.log('No tasks found for March 2026.');
            return;
        }

        console.log(`\nFound ${march2026Tasks.length} tasks for March 2026:`);
        console.log('--------------------------------------------------');
        
        // Group by user if possible
        const grouped = {};
        march2026Tasks.forEach(t => {
            const key = t.userId || 'Unknown';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        for (const userId in grouped) {
            console.log(`User ID: ${userId} (${grouped[userId].length} tasks)`);
            grouped[userId].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
                console.log(`  - [${t.date}] ID: ${t.id} | ${t.name}`);
            });
            console.log('');
        }
        
        console.log('--------------------------------------------------');
        console.log(`Total tasks to be deleted: ${march2026Tasks.length}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
