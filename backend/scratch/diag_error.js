
const { getPayrollProductivityInsights } = require('../financeAI');
const fs = require('fs');
const path = require('path');

async function runDiag() {
    const logPath = path.join(__dirname, 'diag_output.log');
    fs.writeFileSync(logPath, 'Starting Diagnostic...\n');
    
    try {
        const tenantId = 1; // Testing for tenant 1
        fs.appendFileSync(logPath, `Running for Tenant ID: ${tenantId}\n`);
        
        const insights = await getPayrollProductivityInsights(tenantId);
        fs.appendFileSync(logPath, 'SUCCESS: ' + JSON.stringify(insights, null, 2) + '\n');
    } catch (err) {
        fs.appendFileSync(logPath, 'ERROR: ' + err.message + '\n');
        fs.appendFileSync(logPath, 'STACK: ' + err.stack + '\n');
    }
}

runDiag();
