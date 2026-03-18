const crypto = require('crypto');
const timestamp = '1772827399';
const freemiusProductId = '24851';
const secretKey = 'sk_V:gPf*#-LI284<gfFrf1p]%QuwU@W';
const publicKey = 'pk_fa434b3a361d9bd75c2a33438448c';

const hashString = `${timestamp}${freemiusProductId}${secretKey}${publicKey}checkout`;
const hash = crypto.createHash('md5').update(hashString).digest('hex');

console.log('JS Hash:', hash);
console.log('API Hash:', '6c03127b059aaa7591f95a862ee0487b');
console.log('Match?', hash === '6c03127b059aaa7591f95a862ee0487b');
