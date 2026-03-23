import * as fsLib from '@freemius/sdk';

const FS = fsLib.default || fsLib.Freemius || fsLib;

const storeId = '12081'; // dev id
const productId = '24851'; // plugin id
const pubKey = 'pk_558239ad588a754e35bda1fa58378'; // App public
const secKey = 'sk_Db7-iYLpTm;c<=#WN9flTuRhTyzaj'; // App secret

const fsClient = new FS({
  scope: 'app',
  id: productId,
  publicKey: pubKey,
  secretKey: secKey,
});

fsClient.Api('/plugins/' + productId + '/plans.json', 'GET', {}, (err, res) => {
  if (err) {
      console.error('Error:', err);
      process.exit(1);
  }
  console.log('Plans:', JSON.stringify(res, null, 2));
  process.exit(0);
});
