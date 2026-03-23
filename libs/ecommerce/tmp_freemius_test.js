const crypto = require('crypto');

const storeId = '12081';
const pluginId = '24851';
const pubKey = 'pk_558239ad588a754e35bda1fa58378';
const secKey = 'sk_Db7-iYLpTm;c<=#WN9flTuRhTyzaj';

async function testSandbox() {
    const date = new Date().toUTCString();
    const url = `/v1/developers/${storeId}/plugins/${pluginId}/plans.json`;
    const stringToSign = `GET\n\n\n${date}\n${url}`;
    const hash = crypto.createHmac('sha256', secKey).update(stringToSign).digest('base64');
    const authHeader = `FS ${storeId}:${pubKey}:${hash}`;

    const res = await fetch('https://sandbox-api.freemius.com' + url, {
        headers: { 'Authorization': authHeader, 'Date': date, 'Accept': 'application/json' }
    });

    console.log(`[${res.status}] Sandbox API`);
    if (res.status === 200) {
        console.log("SUCCESS:", await res.json());
        process.exit(0);
    }
}

testSandbox().catch(console.error);
