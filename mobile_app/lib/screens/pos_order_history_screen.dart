import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import 'package:intl/intl.dart';

class PosOrderHistoryScreen extends StatefulWidget {
  @override
  _PosOrderHistoryScreenState createState() => _PosOrderHistoryScreenState();
}

class _PosOrderHistoryScreenState extends State<PosOrderHistoryScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _orders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _isLoading = true);
    try {
      final data = await _apiService.getPosOrders();
      setState(() => _orders = data);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil riwayat: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _handleRefund(dynamic saleDetail) async {
    
    // 1. Get Financial Accounts for refund source
    showDialog(context: context, builder: (context) => Center(child: CircularProgressIndicator()));
    List<dynamic> accounts = [];
    try {
      accounts = await _apiService.getFinancialAccounts();
      Navigator.pop(context); // Close loading
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal mengambil akun keuangan: $e')));
      return;
    }

    int? selectedAccountId = accounts.isNotEmpty ? accounts[0]['id'] : null;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Konfirmasi Refund Full'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Apakah Anda yakin ingin me-refund pesanan ${saleDetail['invoiceNumber']}?'),
              SizedBox(height: 16),
              Text('Pilih Akun Pengembalian:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              DropdownButton<int>(
                isExpanded: true,
                value: selectedAccountId,
                items: accounts.map<DropdownMenuItem<int>>((acc) => DropdownMenuItem<int>(
                  value: acc['id'],
                  child: Text(acc['name']),
                )).toList(),
                onChanged: (val) => setDialogState(() => selectedAccountId = val),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text('Batal')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
              onPressed: selectedAccountId == null ? null : () async {
                Navigator.pop(context); // Close confirm
                _processRefund(saleDetail['id'], saleDetail['items'], selectedAccountId!);
              },
              child: Text('YA, REFUND'),
            ),
          ],
        ),
      ),
    );
  }

  void _processRefund(int saleId, List<dynamic> items, int accountId) async {
    showDialog(context: context, builder: (context) => Center(child: CircularProgressIndicator()));
    try {
      // Map items to refund format: { productId, quantity }
      final refundItems = items.map((item) => {
        'productId': item['productId'],
        'quantity': item['quantity'],
      }).toList();

      await _apiService.returnSale(saleId, refundItems, accountId);
      Navigator.pop(context); // Close loading
      Navigator.pop(context); // Close detail bottomsheet

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Refund Berhasil Diolah'), backgroundColor: Colors.green),
      );
      _fetchOrders(); // Refresh list
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal Refund: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _showOrderDetail(dynamic order) async {
    final userRole = Provider.of<AuthProvider>(context, listen: false).userRole;
    final isAdmin = ['SUPERADMIN', 'ADMIN', 'OWNER'].contains(userRole);

    showDialog(
      context: context,
      builder: (context) => Center(child: CircularProgressIndicator()),
    );

    try {
      final detail = await _apiService.getSaleDetail(order['id']);
      Navigator.pop(context); // Close loading

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Detail Pesanan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              Divider(),
              Text('Invoice: ${detail['invoiceNumber']}', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[900])),
              Text('Waktu: ${DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(detail['date']))}'),
              Text('Tipe: ${detail['saleType']}'),
              SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: (detail['items'] as List).length,
                  itemBuilder: (context, index) {
                    final item = detail['items'][index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(item['product_name'] ?? 'Produk'),
                      subtitle: Text('${item['quantity']} x Rp ${item['price']}'),
                      trailing: Text('Rp ${item['total']}', style: TextStyle(fontWeight: FontWeight.bold)),
                    );
                  },
                ),
              ),
              Divider(),
              _buildSummaryRow('Subtotal Items', 'Rp ${detail['totalAmount']}'),
              if ((detail['totalCommission'] ?? 0) > 0) ...[
                _buildSummaryRow('Potongan Platform (Komisi)', '- Rp ${detail['totalCommission']}', isNegative: true),
                Divider(),
                _buildSummaryRow('ESTIMASI DANA CAIR (NET)', 'Rp ${(detail['totalAmount'] - detail['totalCommission']).toStringAsFixed(0)}', isHighlight: true),
              ] else ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('TOTAL BAYAR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text('Rp ${detail['totalAmount']}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.blue[800])),
                  ],
                ),
              ],
              if (isAdmin) ...[
                SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red[50],
                      foregroundColor: Colors.red[800],
                      side: BorderSide(color: Colors.red[200]!),
                      padding: EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () => _handleRefund(detail),
                    icon: Icon(Icons.undo),
                    label: Text('REFUND FULL PESANAN', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
              SizedBox(height: 20),
            ],
          ),
        ),
      );
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat detail: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Widget _buildSummaryRow(String label, String value, {bool isNegative = false, bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(
            color: isHighlight ? Colors.black : Colors.blueGrey[600],
            fontSize: isHighlight ? 15 : 13,
            fontWeight: isHighlight ? FontWeight.bold : FontWeight.w500,
          )),
          Text(value, style: TextStyle(
            color: isNegative ? Colors.red[700] : (isHighlight ? Colors.blue[900] : Colors.blueGrey[800]),
            fontSize: isHighlight ? 18 : 13,
            fontWeight: FontWeight.bold,
          )),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Riwayat Pesanan POS'),
        backgroundColor: Colors.blue[800],
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: Icon(Icons.refresh), onPressed: _fetchOrders),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? Center(child: Text('Belum ada riwayat pesanan.'))
              : ListView.builder(
                  padding: EdgeInsets.all(12),
                  itemCount: _orders.length,
                  itemBuilder: (context, index) {
                    final order = _orders[index];
                    final date = DateTime.parse(order['date']);
                    return Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      margin: EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        onTap: () => _showOrderDetail(order),
                        title: Text(order['invoiceNumber'], style: TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(DateFormat('dd MMM yyyy, HH:mm').format(date)),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('Rp ${order['totalAmount']}', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[700])),
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(4)),
                              child: Text(order['saleType'], style: TextStyle(fontSize: 10, color: Colors.blue[800], fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
