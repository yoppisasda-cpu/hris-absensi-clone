const fs = require('fs');
const file = 'backend/server.ts';
let code = fs.readFileSync(file, 'utf8');

const marker = 'runAutoMigration().then(() => {';
const splitIndex = code.indexOf(marker);

const topPart = code.substring(0, splitIndex);
const bottomPart = code.substring(splitIndex);

// Find the Global Error Handler
const errorMarker = '// ==========================================\n// GLOBAL ERROR HANDLER (Express 5 Compatible)\n// ==========================================';
const errorIndex = bottomPart.indexOf(errorMarker);

if (errorIndex !== -1) {
    const listenAndErrorPart = bottomPart.substring(0, errorIndex + errorMarker.length);
    const routesPart = bottomPart.substring(errorIndex + errorMarker.length);
    
    // Actually, I should just move the routes before the error handler.
    // The easiest way is to extract the routes and inject them before runAutoMigration.
    
    // Find where the routes start in bottomPart
    const auditLogMarker = 'app.get(\'/api/audit-logs\',';
    const auditLogIndex = bottomPart.indexOf(auditLogMarker);
    
    if (auditLogIndex !== -1) {
        // the error handler is between 0 and auditLogIndex
        const listenAndErrorCode = bottomPart.substring(0, auditLogIndex);
        const lateRoutes = bottomPart.substring(auditLogIndex);
        
        const newCode = topPart + '\n\n' + lateRoutes + '\n\n' + listenAndErrorCode;
        fs.writeFileSync(file, newCode);
        console.log("Routes moved successfully!");
    }
}
