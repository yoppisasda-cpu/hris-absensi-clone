const fs = require('fs');
const file = 'web-admin/src/app/dashboard/sales/contracts/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add values to all fields
code = code.replace(/<select([^>]*)onChange=\{e => setFormData\(\{\.\.\.formData, customerId: e.target.value\}\)\}/g, '<select value={formData.customerId} $1onChange={e => setFormData({...formData, customerId: e.target.value})}');
code = code.replace(/<input type="text"([^>]*)onChange=\{e => setFormData\(\{\.\.\.formData, contractNumber: e.target.value\}\)\}/g, '<input type="text" disabled={!!editId} value={formData.contractNumber} $1onChange={e => setFormData({...formData, contractNumber: e.target.value})}');
code = code.replace(/<input type="text"([^>]*)onChange=\{e => setFormData\(\{\.\.\.formData, title: e.target.value\}\)\}/g, '<input type="text" value={formData.title} $1onChange={e => setFormData({...formData, title: e.target.value})}');
code = code.replace(/<input type="date"([^>]*)onChange=\{e => setFormData\(\{\.\.\.formData, startDate: e.target.value\}\)\}/g, '<input type="date" value={formData.startDate} $1onChange={e => setFormData({...formData, startDate: e.target.value})}');
code = code.replace(/<input type="date"([^>]*)onChange=\{e => setFormData\(\{\.\.\.formData, endDate: e.target.value\}\)\}/g, '<input type="date" value={formData.endDate} $1onChange={e => setFormData({...formData, endDate: e.target.value})}');
code = code.replace(/<input type="number"([^>]*)onChange=\{e => setFormData\(\{\.\.\.formData, creditLimit: e.target.value\}\)\}/g, '<input type="number" value={formData.creditLimit} $1onChange={e => setFormData({...formData, creditLimit: e.target.value})}');
code = code.replace(/<input type="text"([^>]*)onChange=\{e => setFormData\(\{\.\.\.formData, picName: e.target.value\}\)\}/g, '<input type="text" value={formData.picName} $1onChange={e => setFormData({...formData, picName: e.target.value})}');
code = code.replace(/<input type="text"([^>]*)onChange=\{e => setFormData\(\{\.\.\.formData, picContact: e.target.value\}\)\}/g, '<input type="text" value={formData.picContact} $1onChange={e => setFormData({...formData, picContact: e.target.value})}');

// Fix Kontrak Baru button
code = code.replace('onClick={() => setShowModal(true)}\n          className="bg-indigo-600 hover:bg-indigo-700', 'onClick={() => { resetForm(); setShowModal(true); }}\n          className="bg-indigo-600 hover:bg-indigo-700');

fs.writeFileSync(file, code);
console.log("Form values injected.");
