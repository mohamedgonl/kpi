
const https = require('https');

const TASKS_URL = 'https://kpi-dun-default-rtdb.asia-southeast1.firebasedatabase.app/tasks.json';

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function debug() {
    const tasksData = await fetch(TASKS_URL);
    const tasks = Array.isArray(tasksData) ? tasksData : Object.values(tasksData);
    
    if (tasks.length === 0) return console.log('Empty tasks');

    const sample = tasks.find(t => t && t.userId);
    if (!sample) return console.log('No tasks with userId found');

    console.log(`Task ID: ${sample.id}`);
    console.log(`userId: ${sample.userId}`);
    console.log(`userId type: ${typeof sample.userId}`);
    
    // Check if there are any string IDs
    const stringIds = tasks.filter(t => t && typeof t.userId === 'string');
    console.log(`Total tasks with STRING userId: ${stringIds.length}`);
    
    const numberIds = tasks.filter(t => t && typeof t.userId === 'number');
    console.log(`Total tasks with NUMBER userId: ${numberIds.length}`);
}

debug();
