import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';

class PosPendingBillsScreen extends StatefulWidget {
  @override
  _PosPendingBillsScreenState createState() => _PosPendingBillsScreenState();
}

class _PosPendingBillsScreenState extends State<PosPendingBillsScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _pendingBills = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPendingBills();
  }

  Future<void> _fetchPendingBills() async {
    setState(() => _isLoading = true);
    try {
      final data = await _apiService.getPendingPosBills();
      setState(() => _pendingBills = data);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil daftar pending: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _resumeBill(dynamic bill) {
    // Return the bill data to the previous screen (POSScreen)
    Navigator.pop(context, bill);
  }

  void _deleteBill(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Hapus Bill?'),
        content: Text('Data yang dihapus tidak dapat dikembalikan.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('Batal')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Hapus', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _apiService.deletePendingPosBill(id);
        _fetchPendingBills();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Bill dihapus')));
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Daftar Pending Bills'),
        backgroundColor: Colors.blue[800],
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _pendingBills.isEmpty
              ? Center(child: Text('Tidak ada pesanan tertunda.'))
              : ListView.builder(
                  padding: EdgeInsets.all(12),
                  itemCount: _pendingBills.length,
                  itemBuilder: (context, index) {
                    final bill = _pendingBills[index];
                    final items = bill['items'] as List;
                    double total = 0;
                    items.forEach((item) => total += (item['price'] * item['quantity']));

                    return Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      margin: EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        title: Text(bill['label'] ?? 'Pesanan', style: TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${items.length} item - Rp ${total.toStringAsFixed(0)}'),
                            Text('Dibuat: ${DateFormat('HH:mm').format(DateTime.parse(bill['createdAt']))} oleh ${bill['user']['name']}', style: TextStyle(fontSize: 11)),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: Icon(Icons.delete_outline, color: Colors.red[300]),
                              onPressed: () => _deleteBill(bill['id']),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue[700],
                                foregroundColor: Colors.white,
                                padding: EdgeInsets.symmetric(horizontal: 12),
                              ),
                              onPressed: () => _resumeBill(bill),
                              child: Text('Lanjutkan'),
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
