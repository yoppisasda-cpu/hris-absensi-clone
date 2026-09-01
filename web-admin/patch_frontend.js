const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/loans/page.tsx', 'utf8');

if (!code.includes('interface Account')) {
    code = code.replace('interface Loan {', `interface Account {\n    id: number;\n    name: string;\n    balance: number;\n}\n\ninterface Loan {`);
}

code = code.replace('const [employees, setEmployees] = useState<Employee[]>([]);', `const [employees, setEmployees] = useState<Employee[]>([]);\n    const [accounts, setAccounts] = useState<Account[]>([]);`);

code = code.replace(`        description: ''\n    });`, `        description: '',\n        accountId: ''\n    });`);

code = code.replace(`api.get('/loans'),\n                api.get('/users')`, `api.get('/loans'),\n                api.get('/users'),\n                api.get('/finance/accounts')`);

code = code.replace(`setLoans(loansRes.data);\n            setEmployees(employeesRes.data);`, `setLoans(loansRes.data);\n            setEmployees(employeesRes.data);\n            setAccounts(accountsRes.data);`);
code = code.replace(`const [loansRes, employeesRes] =`, `const [loansRes, employeesRes, accountsRes] =`);

code = code.replace(`setFormData({ userId: '', amount: '', monthlyDeduction: '', description: '' });`, `setFormData({ userId: '', amount: '', monthlyDeduction: '', description: '', accountId: '' });`);
code = code.replace(`setFormData({ userId: '', amount: '', monthlyDeduction: '', description: '' });`, `setFormData({ userId: '', amount: '', monthlyDeduction: '', description: '', accountId: '' });`);

fs.writeFileSync('src/app/dashboard/loans/page.tsx', code);
console.log('Successfully patched frontend state');
