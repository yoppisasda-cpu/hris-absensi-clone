const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/loans/page.tsx', 'utf8');

const target = `<div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Pilih Karyawan
                                </label>`;

const replacement = `<div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Pilih Karyawan
                                </label>`;

if (code.includes(target)) {
    // We will inject the account dropdown just above "Jumlah Pinjaman"
    const target2 = `<div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Jumlah Pinjaman (Rp)
                                </label>`;
    
    const replacement2 = `<div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Sumber Dana (Kas/Bank) <span className="text-slate-500 font-normal italic text-xs ml-1">(Opsional)</span>
                                </label>
                                <select
                                    required={!editId ? false : undefined}
                                    value={formData.accountId || ''}
                                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    disabled={!!editId}
                                >
                                    <option value="">-- Pilih Sumber Dana (Atau Kosongkan Jika Hanya Pencatatan) --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} - Saldo: Rp {acc.balance.toLocaleString('id-ID')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Jumlah Pinjaman (Rp)
                                </label>`;
                                
    code = code.replace(target2, replacement2);
    fs.writeFileSync('src/app/dashboard/loans/page.tsx', code);
    console.log('Successfully patched frontend form');
} else {
    console.log('Form block not found');
}
