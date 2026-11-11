# Aivola LAN Print Agent

Program jembatan cetak lokal *(Local Print Bridge)* untuk POS Kasir Web (Komputer / Laptop).
Program ini bertindak sebagai jembatan yang menerima perintah cetak dari kasir web, lalu meneruskannya secara otomatis ke:
1. **Printer Kasir** (di meja kasir)
2. **Printer Dapur** (di ruangan dapur via Wi-Fi/LAN IP `9100`)
3. **Printer Bar** (di ruangan bar via Wi-Fi/LAN IP `9100`)

---

## Persyaratan
- Komputer kasir sudah terpasang **Node.js** (versi 16 atau lebih baru).
- Printer Dapur & Bar terhubung kabel LAN / Wi-Fi ke router yang sama dengan komputer kasir.

---

## Cara Menjalankan

### Di Windows:
1. Klik dua kali file **`start.bat`**.
2. Jendela hitam command prompt akan muncul dengan tulisan:
   ```
   🚀 AIVOLA LAN PRINT AGENT AKTIF di Port: 18181
   ```
3. Biarkan jendela ini tetap berjalan di background selama kasir beroperasi.

### Di Mac / Linux:
Jalankan di Terminal:
```bash
./start.sh
```

---

## Pengaturan IP Printer (`config.json`)

Buka file `config.json` untuk menyesuaikan nomor IP printer di outlet Anda:
```json
{
  "port": 18181,
  "kasir": {
    "enabled": true,
    "ip": "192.168.1.200",
    "port": 9100
  },
  "dapur": {
    "enabled": true,
    "ip": "192.168.1.201",
    "port": 9100
  },
  "bar": {
    "enabled": true,
    "ip": "192.168.1.202",
    "port": 9100
  }
}
```
*(Pengaturan IP juga bisa diubah langsung dari menu setting Web POS).*

