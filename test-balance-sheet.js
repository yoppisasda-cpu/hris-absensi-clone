const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/finance/reports/balance-sheet?companyId=1', // Need tenantId
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
        console.log(JSON.stringify(JSON.parse(data).assets.fixedAssets, null, 2));
    } catch(e) {
        console.log("Error parsing JSON or fetching");
    }
  });
});
req.on('error', (e) => console.error(e));
req.end();
