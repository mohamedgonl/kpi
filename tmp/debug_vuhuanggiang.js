
const https = require('https');

const TASKS_URL = 'https://kpi-dun-default-rtdb.asia-southeast1.firebasedatabase.app/tasks.json';
const USERS_URL = 'https://kpi-dun-default-rtdb.asia-southeast1.firebasedatabase.app/users.json';

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
    console.log('Fetching users...');
    const users = await fetch(USERS_URL);
    const giang = Object.values(users).find(u => u.name === 'Vũ Hương Giang');
    if (!giang) {
        console.log('User "Vũ Hương Giang" NOT found in live users.json!');
        console.log('Current users:', Object.values(users).map(u => u.name));
        return;
    }
    console.log(`Found User: ${giang.name} with ID: ${giang.id} (type: ${typeof giang.id})`);

    console.log('Fetching tasks for this ID...');
    const tasksData = await fetch(TASKS_URL);
    const tasks = Array.isArray(tasksData) ? tasksData : Object.values(tasksData);
    
    // Check both number and string
    const stringTasks = tasks.filter(t => t && t.userId === giang.id.toString());
    const numberTasks = tasks.filter(t => t && t.userId === Number(giang.id));
    
    console.log(`Number of tasks with string ID "${giang.id}": ${stringTasks.length}`);
    console.log(`Number of tasks with number ID ${giang.id}: ${numberTasks.length}`);

    if (numberTasks.length + stringTasks.length > 0) {
        const sample = [...numberTasks, ...stringTasks][0];
        console.log('Sample task date:', sample.date);
    }
}

debug();
