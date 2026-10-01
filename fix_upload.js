const fs = require('fs');
const file = 'backend/server.ts';
let code = fs.readFileSync(file, 'utf8');

if(!code.includes("uploads/contracts/")) {
    const uploadMarker = "const uploadAvatar = multer({ dest: path.join(process.cwd(), 'uploads/avatars/') });";
    code = code.replace(uploadMarker, uploadMarker + "\nconst uploadContract = multer({ dest: path.join(process.cwd(), 'uploads/contracts/') });");
}

if(!code.includes("uploads/contracts',")) {
    const dirMarker = "path.join(process.cwd(), 'uploads/avatars')";
    code = code.replace(dirMarker, dirMarker + ",\n  path.join(process.cwd(), 'uploads/contracts')");
}

fs.writeFileSync(file, code);
console.log("Multer uploadContract setup added.");
