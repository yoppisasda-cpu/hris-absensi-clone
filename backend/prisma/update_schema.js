const fs = require('fs');
const path = require('path');
const schemaPath = path.join(__dirname, 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('deliveryNoteTerms')) {
    schema = schema.replace(
        'logoUrl                String?',
        'logoUrl                String?\n  deliveryNoteTerms      String?              @db.Text'
    );
    fs.writeFileSync(schemaPath, schema);
    console.log('Added deliveryNoteTerms to Company model');
} else {
    console.log('deliveryNoteTerms already exists');
}
