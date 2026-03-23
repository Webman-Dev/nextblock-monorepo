const crypto = require('crypto');

const storeId = '12081';
const pluginId = '24851';
const apiKey = '5131c54e7e73ffd94b3a1211a7595ba2'; 
const pubKey = 'pk_558239ad588a754e35bda1fa58378';
const secKey = 'sk_Db7-iYLpTm;c<=#WN9flTuRhTyzaj';

async function tryAuth(name, id, pKey, sKey, url) {
    const date = new Date().toUTCString();
    const stringToSign = `GET\n\n\n${date}\n${url}`;
    const hash = crypto.createHmac('sha256', sKey).update(stringToSign).digest('base64');
    const authHeader = `FS ${id}:${pKey}:${hash}`;

    const res = await fetch('https://api.freemius.com' + url, {
        headers: { 'Authorization': authHeader, 'Date': date, 'Accept': 'application/json' }
    });

    console.log(`[${res.status}] ${name}`);
    if (res.status === 200) {
        console.log("SUCCESS:", name);
        process.exit(0);
    }
}

async function runAll() {
    const ids = [storeId, pluginId];
    const pKeys = [pubKey, apiKey, secKey];
    const sKeys = [secKey, apiKey, pubKey];
    const modes = [
        { name: 'Dev', url: `/v1/developers/${storeId}/plugins/${pluginId}/plans.json` },
        { name: 'App', url: `/v1/plugins/${pluginId}/plans.json` },
    ];

    for (const m of modes) {
        for (const i of ids) {
            for (const p of pKeys) {
                for (const s of sKeys) {
                    if (p === s) continue; // skip identical
                    await tryAuth(`${m.name} | ID:${i===storeId?'store':'plugin'} | Pub:${p===pubKey?'pub':(p===apiKey?'api':'sec')} | Sec:${s===secKey?'sec':(s===apiKey?'api':'pub')}`, i, p, s, m.url);
                }
            }
        }
    }
}

runAll().catch(console.error);
