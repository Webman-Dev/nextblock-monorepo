const crypto = require('crypto');

const devId = '12081';
const pluginId = '24851';
const pubKey = 'pk_558239ad588a754e35bda1fa58378';
const secKey = 'sk_Db7-iYLpTm;c<=#WN9flTuRhTyzaj';

const date = new Date().toUTCString();
const url = `/v1/developers/${devId}/plugins/${pluginId}/plans.json`;

const string1 = `GET\n${url}\n${date}`;
const string2 = `GET\n\n\n${date}\n${url}`;

async function runTest(str, authId) {
  const hash = crypto.createHmac('sha256', secKey).update(str).digest('base64');
  const res = await fetch('https://api.freemius.com' + url, {
    headers: { 'Authorization': `FS ${authId}:${pubKey}:${hash}`, 'Date': date, 'Accept': 'application/json' }
  });
  console.log(authId, str.replace(/\n/g, '\\n'), res.status);
  
  if (res.status === 200) {
      console.log(await res.json());
      process.exit(0);
  }
}

(async () => {
    await runTest(string1, devId);
    await runTest(string2, devId);
    await runTest(string1, pluginId);
    await runTest(string2, pluginId);
    
    // Also try the plugin URL
    const pluginUrl = `/v1/plugins/${pluginId}/plans.json`;
    const str3 = `GET\n${pluginUrl}\n${date}`;
    const str4 = `GET\n\n\n${date}\n${pluginUrl}`;
    
    async function runTest2(str, authId) {
      const hash = crypto.createHmac('sha256', secKey).update(str).digest('base64');
      const res = await fetch('https://api.freemius.com' + pluginUrl, {
        headers: { 'Authorization': `FS ${authId}:${pubKey}:${hash}`, 'Date': date, 'Accept': 'application/json' }
      });
      console.log(authId, str.replace(/\n/g, '\\n'), res.status);
      
      if (res.status === 200) {
          console.log(await res.json());
          process.exit(0);
      }
    }
    
    await runTest2(str3, devId);
    await runTest2(str4, devId);
    await runTest2(str3, pluginId);
    await runTest2(str4, pluginId);
})();
