import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';

class PosClosingScreen extends StatefulWidget {
  @override
  _PosClosingScreenState createState() => _PosClosingScreenState();
}

class _PosClosingScreenState extends State<PosClosingScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _cashInHandController = TextEditingController();
  
  Map<String, dynamic>? _summary;
  bool _isLoading = true;
  double _actualCash = 0;

  @override
  void initState() {
    super.initState();
    _fetchSummary();
    _cashInHandController.addListener(() {
      setState(() {
        _actualCash = double.tryParse(_cashInHandController.text) ?? 0;
      });
    });
  }

  Future<void> _fetchSummary() async {
    setState(() => _isLoading = true);
    try {
      final summary = await _apiService.getPosClosingSummary();
      setState(() {
        _summary = summary;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil ringkasan: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  double get _expectedCash => (_summary?['expectedCash'] ?? 0).toDouble();
  double get _difference => _actualCash - _expectedCash;

  Future<void> _submitClosing() async {
    if (_summary == null) return;
    
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Konfirmasi Tutup Kasir'),
        content: Text('Apakah Anda yakin ingin melakukan Closing sekarang? Transaksi setelah ini akan masuk ke shift berikutnya.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('Batal')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: Text('Ya, Tutup Kasir')),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      await _apiService.submitPosClosing({
        'startTime': _summary!['startTime'],
        'endTime': _summary!['endTime'],
        'totalGrossSales': _summary!['totalGrossSales'],
        'totalNetSales': _summary!['totalNetSales'],
        'totalCommission': _summary!['totalCommission'],
        'totalTransactions': _summary!['totalTransactions'],
        'actualCash': _actualCash,
        'expectedCash': _expectedCash,
        'cashDifference': _difference,
        'notes': 'Closing Shift Kasir',
      });

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          icon: Icon(Icons.check_circle, color: Colors.green, size: 60),
          title: Text('Berhasil!'),
          content: Text('Closing kasir berhasil disimpan.', textAlign: TextAlign.center),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context); // close dialog
                Navigator.pop(context); // go back to POS
              },
              child: Text('OK'),
            )
          ],
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal closing: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text('Tutup Kasir (Closing)', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0.5,
      ),
      body: _isLoading 
          ? Center(child: CircularProgressIndicator())
          : _summary == null 
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                      SizedBox(height: 16),
                      Text('Gagal memuat ringkasan closing.', style: TextStyle(fontWeight: FontWeight.bold)),
                      SizedBox(height: 16),
                      ElevatedButton(onPressed: _fetchSummary, child: Text('Coba Lagi')),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Info Card
                      Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            children: [
                              _buildDetailRow('Shift Dimulai', _summary?['startTime'] != null ? DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(_summary!['startTime'])) : 'Baru (Hari Ini)'),
                              _buildDetailRow('Waktu Closing', _summary?['endTime'] != null ? DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(_summary!['endTime'])) : DateFormat('dd MMM yyyy, HH:mm').format(DateTime.now())),
                              _buildDetailRow('Total Transaksi', '${_summary?['totalTransactions'] ?? 0} Pesanan'),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 16),

                      // Finance Summary Card
                      Text('RINGKASAN PENDAPATAN', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey, letterSpacing: 1.2)),
                      SizedBox(height: 8),
                      Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            children: [
                              _buildAmountRow('Total Penjualan Kotor (Gross)', (_summary?['blindClosing'] == true) ? 'Rp *******' : currencyFormat.format(_summary?['totalGrossSales'] ?? 0)),
                              _buildAmountRow('Total Potongan Platform', (_summary?['blindClosing'] == true) ? 'Rp *******' : '- ' + currencyFormat.format(_summary?['totalCommission'] ?? 0), isNegative: true),
                              Divider(height: 32),
                              _buildAmountRow('Estimasi Dana Bersih (Net)', (_summary?['blindClosing'] == true) ? 'Rp *******' : currencyFormat.format(_summary?['totalNetSales'] ?? 0), isTotal: true),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 24),

                      // Payment Method Breakdown
                      Text('RINCIAN METODE PEMBAYARAN', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey, letterSpacing: 1.2)),
                      SizedBox(height: 8),
                      Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            children: [
                              ...(_summary?['methodBreakdown'] as List<dynamic>? ?? []).map((m) {
                                final isCash = m['accountType']?.toUpperCase() == 'CASH' || m['accountName'].toLowerCase().contains('tunai') || m['accountName'].toLowerCase().contains('cash');
                                return ListTile(
                                  dense: true,
                                  leading: Icon(isCash ? Icons.money : Icons.account_balance_wallet, color: isCash ? Colors.green : Colors.blue),
                                  title: Text(m['accountName'] ?? 'Akun', style: TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text(isCash ? 'Uang Tunai' : 'Non-Tunai/Transfer'),
                                  trailing: Text(
                                    (_summary?['blindClosing'] == true) ? '*******' : currencyFormat.format(m['expectedAmount']), 
                                    style: TextStyle(fontWeight: FontWeight.bold, color: isCash ? Colors.green[800] : Colors.blue[800])
                                  ),
                                );
                              }).toList(),
                              if ((_summary?['methodBreakdown'] as List?)?.isEmpty ?? true)
                                Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Text('Belum ada transaksi di shift ini.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
                                ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 24),

                      // Items Sold Summary for Stock Check
                      Text('RINGKASAN PRODUK TERJUAL', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey, letterSpacing: 1.2)),
                      SizedBox(height: 4),
                      Text('(untuk pengecekan stok)', style: TextStyle(fontSize: 11, color: Colors.grey[500], fontStyle: FontStyle.italic)),
                      SizedBox(height: 8),
                      Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            children: [
                              ...(_summary?['itemsSummary'] as List<dynamic>? ?? []).map((item) {
                                return Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 6.0),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 36,
                                        height: 36,
                                        decoration: BoxDecoration(
                                          color: Colors.blue[50],
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Center(
                                          child: Text(
                                            '${item['totalQty'].toStringAsFixed(item['totalQty'] % 1 == 0 ? 0 : 1)}',
                                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[800], fontSize: 13),
                                          ),
                                        ),
                                      ),
                                      SizedBox(width: 12),
                                      Expanded(
                                        child: Text(item['productName'] ?? '-', style: TextStyle(fontWeight: FontWeight.w500)),
                                      ),
                                      Text('terjual', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                                    ],
                                  ),
                                );
                              }).toList(),
                              if ((_summary?['itemsSummary'] as List?)?.isEmpty ?? true)
                                Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Text('Belum ada produk terjual di shift ini.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
                                ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 24),

                      // Cash Reconciliation Section
                      Text('REKONSILIASI KAS (UANG TUNAI SAJA)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey, letterSpacing: 1.2)),
                      SizedBox(height: 8),
                      Card(
                        elevation: 4,
                        shadowColor: Colors.black26,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Expected Cash (Sistem - Tunai)', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                              Text(
                                (_summary?['blindClosing'] == true) ? 'Rp *******' : currencyFormat.format(_expectedCash), 
                                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)
                              ),
                              SizedBox(height: 20),
                              Text('Uang Fisik di Laci (Tunai)', style: TextStyle(color: Colors.blue[800], fontSize: 13, fontWeight: FontWeight.bold)),
                              SizedBox(height: 8),
                              TextField(
                                controller: _cashInHandController,
                                keyboardType: TextInputType.number,
                                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.blue[900]),
                                decoration: InputDecoration(
                                  prefixText: 'Rp ',
                                  hintText: '0',
                                  filled: true,
                                  fillColor: Colors.blue[50],
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                                ),
                              ),
                              if (_summary?['blindClosing'] != true) ...[
                                SizedBox(height: 20),
                                Container(
                                  padding: EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: _difference == 0 ? Colors.green[50] : (_difference > 0 ? Colors.blue[50] : Colors.red[50]),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Selisih:', style: TextStyle(fontWeight: FontWeight.bold)),
                                      Text(
                                        currencyFormat.format(_difference),
                                        style: TextStyle(
                                          fontWeight: FontWeight.w900,
                                          color: _difference == 0 ? Colors.green[700] : (_difference > 0 ? Colors.blue[700] : Colors.red[700]),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 40),

                      // Submit Button
                      ElevatedButton(
                        onPressed: _submitClosing,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[900],
                          padding: EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: Text('KONFIRMASI TUTUP KASIR', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                      SizedBox(height: 20),
                    ],
                  ),
                ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13))),
          SizedBox(width: 8),
          Flexible(child: Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87), textAlign: TextAlign.right)),
        ],
      ),
    );
  }

  Widget _buildAmountRow(String label, String value, {bool isNegative = false, bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(label, style: TextStyle(
              fontSize: isTotal ? 15 : 13, 
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? Colors.black : Colors.blueGrey[700]
            )),
          ),
          SizedBox(width: 8),
          Text(value, style: TextStyle(
            fontSize: isTotal ? 18 : 14, 
            fontWeight: FontWeight.w900,
            color: isNegative ? Colors.red[700] : (isTotal ? Colors.green[800] : Colors.black87)
          )),
        ],
      ),
    );
  }
}
