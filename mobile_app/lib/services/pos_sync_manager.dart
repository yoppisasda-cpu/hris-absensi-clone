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

        double totalAmount = (sale['totalAmount'] as num?)?.toDouble() ?? 0;
        final memberDisc = ((sale['memberDiscountAmount'] ?? 0) as num).toDouble();
        final voucherDisc = ((sale['voucherDiscountAmount'] ?? 0) as num).toDouble();

        // Safety fallback: if totalAmount was stored as 0 due to state clearing race conditions,
        // recompute it from items so that offline sync never registers a Rp 0 sale on server!
        if (totalAmount <= 0 && items.isNotEmpty) {
          double calculatedSubtotal = 0;
          for (final it in items) {
            final double p = (it['price'] as num?)?.toDouble() ?? 0;
            final double q = (it['quantity'] as num?)?.toDouble() ?? 1;
            calculatedSubtotal += p * q;
          }
          final double tax = ((sale['taxAmount'] ?? 0) as num).toDouble();
          final double discounts = memberDisc + voucherDisc;
          if (calculatedSubtotal > 0 && discounts < calculatedSubtotal) {
            totalAmount = (calculatedSubtotal - discounts) + tax;
            print("PosSyncManager: Rescued Rp 0 totalAmount for ${sale['localInvoiceNumber'] ?? sale['invoiceNumber']} -> Rp $totalAmount");
          }
        }

        await _apiService.checkoutPos(
          items: items,
          accountId: sale['accountId'],
          totalAmount: totalAmount,
          customerId: sale['customerId'],
          customerName: sale['customerName'],
          customerPhone: sale['customerPhone'],
          notes: sale['notes'],
          saleType: sale['saleType'] ?? 'WALK_IN',
          memberDiscountAmount: ((sale['memberDiscountAmount'] ?? 0) as num).toDouble(),
          voucherCode: sale['voucherCode'],
          voucherDiscountAmount: ((sale['voucherDiscountAmount'] ?? 0) as num).toDouble(),
          salespersonId: sale['salespersonId'],
          pointsUsed: ((sale['pointsUsed'] ?? 0) as num).toDouble(),
          pointsEarned: ((sale['pointsEarned'] ?? 0) as num).toDouble(),
          offlineInvoiceNumber: sale['localInvoiceNumber'] ?? sale['invoiceNumber'],
          date: sale['date'],
          paymentMethod: sale['paymentMethod'],
          paymentReference: sale['paymentReference'],
        );

        // Jika berhasil, hapus transaksi dari antrean lokal
        final invNum = (sale['localInvoiceNumber'] ?? sale['invoiceNumber'] ?? '').toString();
        await PosLocalDbService.removeOfflineSale(invNum);
        print("PosSyncManager: Transaksi $invNum sukses disinkronkan ke server.");
      } catch (e) {
        print("PosSyncManager: Gagal mensinkronkan transaksi ${sale['localInvoiceNumber']}: $e");
        lastError = e.toString();
        
        // Hentikan sinkronisasi HANYA jika ada kegagalan jaringan sejati (karena transaksi berikutnya juga pasti gagal)
        if (e.toString().contains('SocketException') || 
            e.toString().contains('TimeoutException') || 
            e.toString().contains('Failed host lookup') ||
            e.toString().contains('Connection refused')) {
          break;
        }
        // Jika error berasal dari server (misal 400 Bad Request, 500 Internal Server Error karena produk dihapus, dsb)
        // Kita CONTINUE ke transaksi berikutnya agar tidak memblokir antrean.
        continue;
      }
    }

    _isSyncing = false;
    return lastError;
  }
}
