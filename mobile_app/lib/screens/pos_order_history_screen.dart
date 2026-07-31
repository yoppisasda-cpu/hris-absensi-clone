import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import 'package:intl/intl.dart';
import '../services/printer_service.dart';
import '../services/pos_local_db_service.dart';

class PosOrderHistoryScreen extends StatefulWidget {
  @override
  _PosOrderHistoryScreenState createState() => _PosOrderHistoryScreenState();
}

class _PosOrderHistoryScreenState extends State<PosOrderHistoryScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _orders = [];
  bool _isLoading = true;
  DateTime? _startDate;
  DateTime? _endDate;
  String _selectedFilterLabel = 'Semua Tanggal';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _isLoading = true);
    try {
      final onlineData = await _apiService.getPosOrders(
        startDate: _startDate,
        endDate: _endDate,
      );
      
      // Mengambil transaksi offline yang BELUM tersinkron
      final offlineSales = PosLocalDbService.getOfflineSales();
      final localData = offlineSales.map((sale) => {
        'id': 'offline_${sale['localInvoiceNumber']}',
        'invoiceNumber': sale['localInvoiceNumber'],
        'date': sale['date'] ?? DateTime.now().toIso8601String(),
        'totalAmount': sale['totalAmount'],
        'status': 'MENUNGGU SINKRON',
        'saleType': sale['saleType'] ?? 'WALK_IN',
        'paymentMethod': sale['paymentMethod'],
        'items': (sale['items'] as List).map((it) => {
            ...it,
            'product_name': it['name'] ?? it['productName'] ?? 'Produk',
            'quantity': it['quantity'],
            'price': it['price'],
            'total': it['total'],
        }).toList(),
        'isOffline': true,
        'totalCommission': 0.0,
      }).toList();

      setState(() => _orders = [...localData, ...onlineData]);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil riwayat: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now().add(Duration(days: 1)),
      initialDateRange: _startDate != null && _endDate != null
          ? DateTimeRange(start: _startDate!, end: _endDate!)
          : DateTimeRange(start: DateTime.now().subtract(Duration(days: 7)), end: DateTime.now()),
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            colorScheme: ColorScheme.light(primary: Colors.blue[800]!),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
        _selectedFilterLabel = '${DateFormat('dd/MM/yy').format(picked.start)} - ${DateFormat('dd/MM/yy').format(picked.end)}';
      });
      _fetchOrders();
    }
  }

  void _setPresetDate(String preset) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    setState(() {
      if (preset == 'today') {
        _startDate = today;
        _endDate = today;
        _selectedFilterLabel = 'Hari Ini';
      } else if (preset == 'yesterday') {
        final yesterday = today.subtract(Duration(days: 1));
        _startDate = yesterday;
        _endDate = yesterday;
        _selectedFilterLabel = 'Kemarin';
      } else if (preset == 'week') {
        _startDate = today.subtract(Duration(days: 7));
        _endDate = today;
        _selectedFilterLabel = '7 Hari Terakhir';
      } else if (preset == 'month') {
        _startDate = DateTime(now.year, now.month, 1);
        _endDate = today;
        _selectedFilterLabel = 'Bulan Ini';
      } else if (preset == 'all') {
        _startDate = null;
        _endDate = null;
        _selectedFilterLabel = 'Semua Tanggal';
      }
    });
    _fetchOrders();
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

  void _updateStatus(int saleId, String newStatus) async {
    showDialog(context: context, builder: (context) => Center(child: CircularProgressIndicator()));
    try {
      await _apiService.patch('/sales/$saleId/status', {'status': newStatus});
      Navigator.pop(context); // Close loading
      
      if (Navigator.canPop(context)) {
        Navigator.pop(context); // Close detail bottomsheet if open
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Status diperbarui menjadi $newStatus'), backgroundColor: Colors.green),
      );
      _fetchOrders(); // Refresh list
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal update status: $e'), backgroundColor: Colors.red),
      );
    }
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

    dynamic detail;
    if (order['isOffline'] == true) {
      detail = order;
    } else {
      showDialog(
        context: context,
        builder: (context) => Center(child: CircularProgressIndicator()),
      );
      try {
        detail = await _apiService.getSaleDetail(order['id']);
        Navigator.pop(context); // Close loading
      } catch (e) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memuat detail: $e'), backgroundColor: Colors.red),
        );
        return;
      }
    }

    try {

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
              Row(
                children: [
                  Text('Status: '),
                  _buildStatusBadge(detail['status'] ?? 'PAID'),
                ],
              ),
              Text('Waktu: ${DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(detail['date']).toLocal())}'),
              Text('Tipe: ${detail['saleType']}'),
              SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: (detail['items'] as List).length,
                  itemBuilder: (context, index) {
                    final item = detail['items'][index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(item['product_name'] ?? 'Produk', style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${item['quantity']} x Rp ${item['price']}'),
                          if (item['modifiers'] != null && (item['modifiers'] as List).isNotEmpty)
                            ...((item['modifiers'] as List)).map((mod) => Text(
                              ' - ${mod['optionName'] ?? mod['name']}',
                              style: TextStyle(fontSize: 12, color: Colors.blueGrey[600], fontStyle: FontStyle.italic),
                            )).toList(),
                        ],
                      ),
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
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[800],
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () {
                          // Prepare data for printer
                          final printData = Map<String, dynamic>.from({
                            ...detail,
                            'items': (detail['items'] as List).map((it) => Map<String, dynamic>.from({
                              ...it,
                              'name': it['product_name'],
                              'modifiers': it['modifiers'],
                            })).toList(),
                          });
                          final printer = Provider.of<PrinterService>(context, listen: false);
                          printer.printReceipt(printData);
                        },
                        icon: Icon(Icons.print),
                        label: Text('CETAK STRUK', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange[800],
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () {
                          final printData = Map<String, dynamic>.from({
                            ...detail,
                            'items': (detail['items'] as List).map((it) => Map<String, dynamic>.from({
                              ...it,
                              'name': it['product_name'],
                              'modifiers': it['modifiers'],
                            })).toList(),
                          });
                          final printer = Provider.of<PrinterService>(context, listen: false);
                          printer.printKitchenReceipt(printData);
                        },
                        icon: Icon(Icons.restaurant),
                        label: Text('DAPUR', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    if (detail['isOffline'] != true) ...[
                      SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red[50],
                            foregroundColor: Colors.red[800],
                            side: BorderSide(color: Colors.red[200]!),
                            padding: EdgeInsets.symmetric(vertical: 12),
                          ),
                          onPressed: () => _handleRefund(detail),
                          icon: Icon(Icons.undo),
                          label: Text('REFUND FULL', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
              
              // Status Action Buttons
              if (detail['isOffline'] != true && (detail['status'] == 'PROCESSING' || detail['status'] == 'READY')) ...[
                SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: () => _updateStatus(detail['id'], 'PAID'),
                    icon: Icon(Icons.check_circle),
                    label: Text('PESANAN SELESAI / DIAMBIL', style: TextStyle(fontWeight: FontWeight.bold)),
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

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status) {
      case 'PENDING': color = Colors.orange; break;
      case 'PROCESSING': color = Colors.blue; break;
      case 'READY': color = Colors.purple; break;
      case 'PAID': color = Colors.green; break;
      case 'CANCELLED': color = Colors.red; break;
      case 'MENUNGGU SINKRON': color = Colors.orange[800]!; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: color.withOpacity(0.5))),
      child: Text(status, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredOrders = _orders.where((order) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final inv = (order['invoiceNumber'] ?? '').toString().toLowerCase();
      final cust = (order['customerName'] ?? '').toString().toLowerCase();
      return inv.contains(q) || cust.contains(q);
    }).toList();

    final double totalSum = filteredOrders.fold(0.0, (sum, o) => sum + (double.tryParse(o['totalAmount'].toString()) ?? 0));

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Text('Riwayat Pesanan POS', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.blue[800],
        foregroundColor: Colors.white,
        elevation: 1,
        actions: [
          IconButton(
            icon: Icon(Icons.date_range),
            tooltip: 'Filter Tanggal (Backdate)',
            onPressed: () => _selectDateRange(context),
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter & Search Header
          Container(
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            color: Colors.white,
            child: Column(
              children: [
                // Search Input Bar
                TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Cari No. Faktur / Pelanggan...',
                    prefixIcon: Icon(Icons.search, color: Colors.blue[800]),
                    suffixIcon: _searchQuery.isNotEmpty 
                        ? IconButton(icon: Icon(Icons.clear), onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          }) 
                        : null,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.blue[800]!)),
                  ),
                ),
                SizedBox(height: 8),

                // Quick Date Preset Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('Hari Ini', () => _setPresetDate('today'), isSelected: _selectedFilterLabel == 'Hari Ini'),
                      SizedBox(width: 6),
                      _buildFilterChip('Kemarin', () => _setPresetDate('yesterday'), isSelected: _selectedFilterLabel == 'Kemarin'),
                      SizedBox(width: 6),
                      _buildFilterChip('7 Hari', () => _setPresetDate('week'), isSelected: _selectedFilterLabel == '7 Hari Terakhir'),
                      SizedBox(width: 6),
                      _buildFilterChip('Bulan Ini', () => _setPresetDate('month'), isSelected: _selectedFilterLabel == 'Bulan Ini'),
                      SizedBox(width: 6),
                      _buildFilterChip('Semua', () => _setPresetDate('all'), isSelected: _selectedFilterLabel == 'Semua Tanggal'),
                      SizedBox(width: 6),
                      InkWell(
                        onTap: () => _selectDateRange(context),
                        child: Chip(
                          avatar: Icon(Icons.calendar_month, size: 14, color: Colors.blue[800]),
                          label: Text(_selectedFilterLabel.startsWith('Hari') || _selectedFilterLabel.startsWith('Kemarin') || _selectedFilterLabel.startsWith('7') || _selectedFilterLabel.startsWith('Bulan') || _selectedFilterLabel.startsWith('Semua') ? 'Pilih Tanggal 📅' : _selectedFilterLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue[900])),
                          backgroundColor: Colors.blue[50],
                          side: BorderSide(color: Colors.blue[200]!),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Total Summary Strip
          Container(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.blue[50],
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${filteredOrders.length} Pesanan Ditemukan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue[900])),
                Text('Total: Rp ${NumberFormat('#,###', 'id').format(totalSum)}', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.blue[900])),
              ],
            ),
          ),

          // Orders List
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator())
                : filteredOrders.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history_toggle_off, size: 48, color: Colors.grey[400]),
                            SizedBox(height: 8),
                            Text('Tidak ada riwayat pesanan ditemukan.', style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.bold)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchOrders,
                        child: ListView.builder(
                          padding: EdgeInsets.all(12),
                          itemCount: filteredOrders.length,
                          itemBuilder: (context, index) {
                            final order = filteredOrders[index];
                            final date = DateTime.parse(order['date']).toLocal();
                            return Card(
                              elevation: 1.5,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              margin: EdgeInsets.only(bottom: 10),
                              child: ListTile(
                                onTap: () => _showOrderDetail(order),
                                title: Row(
                                  children: [
                                    Text(order['invoiceNumber'], style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    if (order['customerName'] != null && order['customerName'].toString().isNotEmpty) ...[
                                      SizedBox(width: 8),
                                      Text('(${order['customerName']})', style: TextStyle(fontSize: 12, color: Colors.grey[700])),
                                    ],
                                  ],
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(DateFormat('dd MMM yyyy, HH:mm').format(date), style: TextStyle(fontSize: 12, color: Colors.blueGrey[600])),
                                    SizedBox(height: 4),
                                    Text('Bayar: ${order['accountName'] ?? order['paymentMethod'] ?? '-'}', style: TextStyle(fontSize: 11, color: Colors.black54, fontStyle: FontStyle.italic)),
                                  ],
                                ),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text('Rp ${NumberFormat('#,###', 'id').format(order['totalAmount'])}', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[800], fontSize: 14)),
                                    SizedBox(height: 4),
                                    _buildStatusBadge(order['status'] ?? 'PAID'),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, VoidCallback onTap, {required bool isSelected}) {
    return InkWell(
      onTap: onTap,
      child: Chip(
        label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : Colors.black87, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
        backgroundColor: isSelected ? Colors.blue[800] : Colors.grey[200],
        padding: EdgeInsets.symmetric(horizontal: 4),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}
