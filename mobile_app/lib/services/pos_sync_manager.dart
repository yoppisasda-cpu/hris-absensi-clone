import 'api_service.dart';
import 'pos_local_db_service.dart';

class PosSyncManager {
  static final ApiService _apiService = ApiService();
  static bool _isSyncing = false;

  static bool get isSyncing => _isSyncing;

  // Mendapatkan jumlah transaksi offline yang belum sinkron
  static int getPendingCount() {
    return PosLocalDbService.getOfflineSales().length;
  }

  // Menjalankan proses sinkronisasi transaksi offline ke server
  static Future<String?> syncOfflineSales({bool force = false}) async {
    if (force) {
      _isSyncing = false;
    } else if (_isSyncing) {
      return "Sedang mensinkronkan...";
    }
    
    final offlineSales = PosLocalDbService.getOfflineSales();
    if (offlineSales.isEmpty) return null;

    _isSyncing = true;
    print("PosSyncManager: Memulai sinkronisasi ${offlineSales.length} transaksi offline...");
    String? lastError;

    for (var sale in List.from(offlineSales)) {
      try {
        final List<Map<String, dynamic>> items = (sale['items'] as List).map((item) {
          return Map<String, dynamic>.from(item);
        }).toList();

        await _apiService.checkoutPos(
          items: items,
          accountId: sale['accountId'],
          totalAmount: (sale['totalAmount'] as num).toDouble(),
          customerId: sale['customerId'],
          customerName: sale['customerName'],
          customerPhone: sale['customerPhone'],
          notes: sale['notes'],
          saleType: sale['saleType'] ?? 'WALK_IN',
          memberDiscountAmount: (sale['memberDiscountAmount'] as num).toDouble(),
          voucherCode: sale['voucherCode'],
          voucherDiscountAmount: (sale['voucherDiscountAmount'] as num).toDouble(),
          pointsUsed: (sale['pointsUsed'] as num).toDouble(),
          pointsEarned: (sale['pointsEarned'] as num).toDouble(),
          offlineInvoiceNumber: sale['localInvoiceNumber'],
        );

        // Jika berhasil, hapus transaksi dari antrean lokal
        await PosLocalDbService.removeOfflineSale(sale['localInvoiceNumber']);
        print("PosSyncManager: Transaksi ${sale['localInvoiceNumber']} sukses disinkronkan ke server.");
      } catch (e) {
        print("PosSyncManager: Gagal mensinkronkan transaksi ${sale['localInvoiceNumber']}: $e");
        lastError = e.toString();
        // Hentikan sinkronisasi jika ada kegagalan jaringan (karena transaksi berikutnya juga kemungkinan besar akan gagal)
        break;
      }
    }

    _isSyncing = false;
    return lastError;
  }
}
