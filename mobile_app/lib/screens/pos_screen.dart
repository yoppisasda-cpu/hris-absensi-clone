import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import 'pos_order_history_screen.dart';
import 'pos_pending_bills_screen.dart';
import 'pos_closing_screen.dart';
import 'printer_settings_screen.dart';

class POSScreen extends StatefulWidget {
  @override
  _POSScreenState createState() => _POSScreenState();
}

class _POSScreenState extends State<POSScreen> {
  final ApiService _apiService = ApiService();
  final PrinterService _printerService = PrinterService();
  List<dynamic> _products = [];
  List<dynamic> _categories = [];
  List<dynamic> _accounts = [];
  List<Map<String, dynamic>> _cart = [];
  bool _isLoading = true;
  bool _isWaiterMode = false;
  static const String _prefWaiterMode = 'pos_waiter_mode';

  int? _selectedCategoryId;
  int? _selectedAccountId;
  String _selectedPaymentMethod = 'Tunai';
  String _searchQuery = "";
  String _saleType = 'WALK_IN';
  final TextEditingController _customerNameController = TextEditingController();
  final TextEditingController _customerPhoneController = TextEditingController();
  final TextEditingController _cashReceivedController = TextEditingController();
  double _cashReceived = 0;

  @override
  void initState() {
    super.initState();
    _fetchData();
    _printerService.init();
    _loadWaiterMode();
  }

  @override
  void dispose() {
    _customerNameController.dispose();
    _customerPhoneController.dispose();
    _cashReceivedController.dispose();
    super.dispose();
  }

  Future<void> _loadWaiterMode() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() => _isWaiterMode = prefs.getBool(_prefWaiterMode) ?? false);
  }

  Future<void> _toggleWaiterMode(bool val) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefWaiterMode, val);
    setState(() => _isWaiterMode = val);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(val ? 'Mode Pelayan Aktif' : 'Mode Kasir Aktif'), duration: Duration(seconds: 1)),
    );
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final prods = await _apiService.getPosProducts();
      final cats = await _apiService.getPosCategories();
      final accs = await _apiService.getFinancialAccounts();
      setState(() {
        _products = prods;
        _categories = cats;
        _accounts = accs;
        if (accs.isNotEmpty) _selectedAccountId = accs[0]['id'];
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil data POS: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  List<double> _getQuickCashOptions(double total) {
    if (total <= 0) return [10000, 20000, 50000, 100000];
    
    Set<double> options = {};
    
    options.add(total);
    
    double next1k = (total / 1000).ceil() * 1000.0;
    if (next1k > total) options.add(next1k);

    double next5k = (total / 5000).ceil() * 5000.0;
    if (next5k > total) options.add(next5k);

    double next10k = (total / 10000).ceil() * 10000.0;
    if (next10k > total) options.add(next10k);

    List<double> standardNotes = [20000, 50000, 100000];
    for (var note in standardNotes) {
      if (note > total) options.add(note);
    }

    List<double> result = options.toList()..sort();
    return result.take(4).toList();
  }

  List<dynamic> get _filteredProducts {
    return _products.where((p) {
      final matchesSearch = p['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCat = _selectedCategoryId == null || p['categoryId'] == _selectedCategoryId;
      return matchesSearch && matchesCat;
    }).toList();
  }

  double _getItemPrice(Map<String, dynamic> item) {
    double basePrice = 0;
    
    // Convert platform prices safely
    double pGofood = double.tryParse(item['priceGofood']?.toString() ?? '0') ?? 0;
    double pGrabfood = double.tryParse(item['priceGrabfood']?.toString() ?? '0') ?? 0;
    double pShopeefood = double.tryParse(item['priceShopeefood']?.toString() ?? '0') ?? 0;
    double pNormal = double.tryParse(item['price']?.toString() ?? '0') ?? 0;

    if (_saleType == 'GOFOOD' && pGofood > 0) {
      basePrice = pGofood;
    } else if (_saleType == 'GRABFOOD' && pGrabfood > 0) {
      basePrice = pGrabfood;
    } else if (_saleType == 'SHOPEEFOOD' && pShopeefood > 0) {
      basePrice = pShopeefood;
    } else {
      basePrice = pNormal;
    }

    double modPrice = 0;
    if (item['modifiers'] != null) {
      for (var m in (item['modifiers'] as List)) {
        modPrice += (m['price'] as num).toDouble();
      }
    }
    return basePrice + modPrice;
  }

  double get _subtotalAmount {
    return _cart.fold(0, (sum, item) => sum + (_getItemPrice(item) * item['quantity']));
  }

  double get _grandTotal {
    return _subtotalAmount;
  }

  void _addToCart(dynamic product, {List<Map<String, dynamic>>? modifiers}) {
    bool trackStock = product['trackStock'] ?? true;
    
    if (trackStock && (product['stock'] ?? 0) <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Stok habis!'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() {
      final String modifiersJson = modifiers != null ? jsonEncode(modifiers) : '[]';
      
      final index = _cart.indexWhere((item) {
        final itemModifiersJson = item['modifiers'] != null ? jsonEncode(item['modifiers']) : '[]';
        return item['productId'] == product['id'] && itemModifiersJson == modifiersJson;
      });

      if (index >= 0) {
        if (trackStock && _cart[index]['quantity'] >= product['stock']) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Stok tidak cukup')),
          );
          return;
        }
        _cart[index]['quantity']++;
      } else {
        _cart.add({
          'productId': product['id'],
          'name': product['name'],
          'price': product['price'],
          'priceGofood': product['priceGofood'],
          'priceGrabfood': product['priceGrabfood'],
          'priceShopeefood': product['priceShopeefood'],
          'quantity': 1,
          'maxStock': product['stock'],
          'trackStock': product['trackStock'] ?? true,
          'modifiers': modifiers,
        });
      }
    });
  }

  IconData _getPaymentIcon(String name) {
    name = name.toLowerCase();
    if (name.contains('tunai') || name.contains('cash')) return Icons.payments_outlined;
    if (name.contains('qris')) return Icons.qr_code_scanner;
    if (name.contains('debit') || name.contains('credit')) return Icons.credit_card_outlined;
    if (name.contains('transfer')) return Icons.account_balance_outlined;
    if (name.contains('gofood') || name.contains('grabfood') || name.contains('shopeefood')) return Icons.delivery_dining;
    return Icons.account_balance_wallet_outlined;
  }

  void _updateCartQty(int index, int delta) {
    setState(() {
      if (index >= 0 && index < _cart.length) {
        final newQty = _cart[index]['quantity'] + delta;
        if (newQty <= 0) {
          _cart.removeAt(index);
        } else {
          bool trackStock = _cart[index]['trackStock'] ?? true;
          int maxStock = (_cart[index]['maxStock'] ?? 0).toInt();

          if (!trackStock || newQty <= maxStock) {
            _cart[index]['quantity'] = newQty;
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Stok tidak cukup')),
            );
          }
        }
      }
    });
  }

  void _showTableLabelDialog() {
    final TextEditingController labelController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Simpan ke Meja / Pelanggan'),
        content: TextField(
          controller: labelController,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Contoh: Meja 12 atau Bpk Ahmad',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[800], foregroundColor: Colors.white),
            onPressed: () async {
              if (labelController.text.trim().isEmpty) return;
              final name = labelController.text.trim();
              Navigator.pop(context);
              
              try {
                await _apiService.holdPosBill(name, _cart, 'WALK_IN');
                setState(() => _cart = []);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Pesanan $name Berhasil Terkirim ke Kasir')));
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red));
              }
            },
            child: Text('SIMPAN'),
          ),
        ],
      ),
    );
  }

  void _showCheckoutModal() {
    if (_cart.isEmpty) return;
    
    _saleType = 'WALK_IN';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          ),
          padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
          child: _buildCheckoutContent(context, setModalState, isModal: true),
        ),
      ),
    );
  }

  Widget _buildCheckoutContent(BuildContext context, Function setPanelState, {bool isModal = true}) {
    return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)))),
                SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Konfirmasi Checkout', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.blue[900])),
                    IconButton(onPressed: () => Navigator.pop(context), icon: Icon(Icons.close, color: Colors.grey)),
                  ],
                ),
                SizedBox(height: 12),

                // Compact Cart Summary
                Container(
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.blueGrey[50]?.withOpacity(0.5), borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${_cart.length} Item(s)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey[700])),
                      Text('Rp ${_grandTotal.toStringAsFixed(0)}', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.blue[800])),
                    ],
                  ),
                ),
                SizedBox(height: 16),
                
                Text('Tipe Penjualan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blueGrey[600], letterSpacing: 0.5)),
                SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildCompactSaleTypeChip('WALK_IN', 'Walk-in', Icons.person, setPanelState),
                    _buildCompactSaleTypeChip('GOFOOD', 'GoFood', Icons.delivery_dining, setPanelState),
                    _buildCompactSaleTypeChip('GRABFOOD', 'GrabFood', Icons.delivery_dining, setPanelState),
                    _buildCompactSaleTypeChip('SHOPEEFOOD', 'ShopeeFood', Icons.delivery_dining, setPanelState),
                  ],
                ),
                SizedBox(height: 24),
                Text('Nama Pelanggan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey[600])),
                SizedBox(height: 10),
                LayoutBuilder(
                  builder: (context, constraints) => RawAutocomplete<Object>(
                    optionsBuilder: (TextEditingValue textEditingValue) async {
                      if (textEditingValue.text.isEmpty) return const Iterable<Object>.empty();
                      final results = await _apiService.searchCustomers(textEditingValue.text);
                      return results.cast<Object>();
                    },
                    displayStringForOption: (option) => (option as Map<String, dynamic>)['name'],
                    onSelected: (Object selection) {
                      final sel = selection as Map<String, dynamic>;
                      setPanelState(() {
                        _customerNameController.text = sel['name'];
                        _customerPhoneController.text = sel['phone'] ?? '';
                      });
                    },
                    fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                      if (controller.text.isEmpty && _customerNameController.text.isNotEmpty) {
                        controller.text = _customerNameController.text;
                      }
                      controller.addListener(() {
                        _customerNameController.text = controller.text;
                      });

                      return TextField(
                        controller: controller,
                        focusNode: focusNode,
                        decoration: InputDecoration(
                          hintText: 'Cari atau ketik nama pembeli...',
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                          prefixIcon: Icon(Icons.person_search, size: 20, color: Colors.blueGrey[400]),
                        ),
                      );
                    },
                    optionsViewBuilder: (context, onSelected, options) {
                      return Align(
                        alignment: Alignment.topLeft,
                        child: Material(
                          elevation: 4.0,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: constraints.maxWidth,
                            constraints: BoxConstraints(maxHeight: 200),
                            child: ListView.builder(
                              padding: EdgeInsets.zero,
                              shrinkWrap: true,
                              itemCount: options.length,
                              itemBuilder: (BuildContext context, int index) {
                                final dynamic option = options.elementAt(index);
                                return ListTile(
                                  title: Text(option['name'], style: TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text(option['phone'] ?? 'No HP tidak tersedia', style: TextStyle(fontSize: 12)),
                                  leading: CircleAvatar(
                                    backgroundColor: Colors.blue[50],
                                    child: Icon(Icons.person, size: 18, color: Colors.blue[800]),
                                  ),
                                  onTap: () => onSelected(option),
                                );
                              },
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                SizedBox(height: 16),
                Text('Nomor HP Pelanggan (Opsional)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey[600])),
                SizedBox(height: 10),
                TextField(
                  controller: _customerPhoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    hintText: '0812xxxxxxxx',
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                  ),
                ),
                SizedBox(height: 24),
                
                Container(
                  padding: EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.blueGrey[50], borderRadius: BorderRadius.circular(16)),
                  child: Column(
                    children: [
                      _buildSummaryRow('Subtotal Items', 'Rp ${_subtotalAmount}'),
                      Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('TOTAL BAYAR', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                          Text('Rp ${_grandTotal.toStringAsFixed(0)}', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.blue[800])),
                        ],
                      ),
                    ],
                  ),
                ),
                
                if (_saleType == 'WALK_IN') ...[
                  SizedBox(height: 24),
                  Text('Metode Pembayaran', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey[600])),
                  SizedBox(height: 10),
                  GridView.count(
                    shrinkWrap: true,
                    physics: NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    childAspectRatio: 2.5,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    children: ['Tunai', 'QRIS', 'Debit/Credit', 'Transfer'].map((method) {
                      final bool isSelected = _selectedPaymentMethod == method;
                      return InkWell(
                        onTap: () {
                          setPanelState(() {
                            _selectedPaymentMethod = method;
                            
                            if (method == 'Tunai') {
                               final cashAcc = _accounts.firstWhere((a) => a['type'] == 'CASH' || a['name'].toString().toLowerCase().contains('tunai'), orElse: () => _accounts.isNotEmpty ? _accounts.first : null);
                               if (cashAcc != null) _selectedAccountId = cashAcc['id'];
                            } else {
                               final bankAcc = _accounts.firstWhere((a) => a['type'] == 'BANK' || !a['name'].toString().toLowerCase().contains('tunai'), orElse: () => _accounts.isNotEmpty ? _accounts.first : null);
                               if (bankAcc != null) _selectedAccountId = bankAcc['id'];
                            }
                          });
                          setState(() {});
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isSelected ? Colors.green[600]! : Colors.grey[200]!,
                              width: isSelected ? 2 : 1.5,
                            ),
                            borderRadius: BorderRadius.circular(16),
                            color: isSelected ? Colors.green[50]?.withOpacity(0.3) : Colors.white,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                _getPaymentIcon(method),
                                color: isSelected ? Colors.green[700] : Colors.grey[600],
                                size: 18,
                              ),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  method,
                                  style: TextStyle(
                                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                                    color: isSelected ? Colors.green[900] : Colors.blueGrey[800],
                                    fontSize: 12,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
                
                SizedBox(height: 32),
                
                ...(() {
                  final bool isCash = _selectedPaymentMethod == 'Tunai';

                  if (!isCash) return <Widget>[];

                  return <Widget>[
                    Text('Uang Tunai Diterima', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey[600])),
                    SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _getQuickCashOptions(_grandTotal).map((val) => Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              side: BorderSide(color: Colors.blue[100]!),
                              padding: EdgeInsets.symmetric(horizontal: 16),
                            ),
                            onPressed: () {
                              setPanelState(() {
                                _cashReceived = val;
                                _cashReceivedController.text = val.toStringAsFixed(0);
                              });
                            },
                            child: Text('Rp ${val.toStringAsFixed(0)}', style: TextStyle(fontSize: 12, color: Colors.blueGrey[700], fontWeight: FontWeight.bold)),
                          ),
                        )).toList(),
                      ),
                    ),
                    SizedBox(height: 16),
                    Text('Input Nominal Manual', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey[600])),
                    SizedBox(height: 10),
                    TextField(
                      controller: _cashReceivedController,
                      keyboardType: TextInputType.number,
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                      onChanged: (val) {
                        setPanelState(() {
                          _cashReceived = double.tryParse(val) ?? 0;
                        });
                      },
                      decoration: InputDecoration(
                        hintText: '0',
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        filled: true,
                        fillColor: Colors.grey[50],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                      ),
                    ),
                    SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Kembalian:', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                        Text(
                          'Rp ${(_cashReceived - _grandTotal > 0 ? _cashReceived - _grandTotal : 0).toStringAsFixed(0)}',
                          style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green[700], fontSize: 20),
                        ),
                      ],
                    ),
                    SizedBox(height: 24),
                  ];
                })(),

                Row(
                  children: [
                    Expanded(
                      child: _isWaiterMode 
                        ? ElevatedButton.icon(
                            onPressed: () {
                              if (isModal) Navigator.pop(context);
                              _showTableLabelDialog();
                            },
                            icon: Icon(Icons.pause_circle_outline, color: Colors.white),
                            label: Text('SIMPAN PESANAN', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.amber[800],
                              padding: EdgeInsets.symmetric(vertical: 20),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          )
                        : OutlinedButton.icon(
                            onPressed: () {
                              if (isModal) Navigator.pop(context);
                              _showTableLabelDialog();
                            },
                            icon: Icon(Icons.pause_circle_outline, color: Colors.amber[900]),
                            label: Text('HOLD', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber[900])),
                            style: OutlinedButton.styleFrom(
                              padding: EdgeInsets.symmetric(vertical: 20),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              side: BorderSide(color: Colors.amber[900]!),
                            ),
                          ),
                    ),
                    if (!_isWaiterMode) ...[
                      SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: () {
                            if (_selectedAccountId == null) {
                              showDialog(
                                context: context,
                                builder: (context) => AlertDialog(
                                  title: Text('Akun Keuangan Belum Set'),
                                  content: Text('Silahkan buka pengaturan di Web Admin dan tambahkan Akun Keuangan (Kas/Bank) terlebih dahulu agar bisa menerima pembayaran.'),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(context), child: Text('OK')),
                                  ],
                                ),
                              );
                              return;
                            }
                            _processCheckout(context, isModal: isModal);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue[800],
                            padding: EdgeInsets.symmetric(vertical: 20),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 4,
                          ),
                          child: Text('BAYAR SEKARANG', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      ),
                    ],
                  ],
                ),
                SizedBox(height: 20),
              ],
            ),
    );
  }

  Widget _buildCompactSaleTypeChip(String type, String label, IconData icon, Function setPanelState) {
    bool isSelected = _saleType == type;
    return GestureDetector(
      onTap: () {
        setPanelState(() {
          _saleType = type;
          if (type == 'GOFOOD' || type == 'GRABFOOD' || type == 'SHOPEEFOOD') {
            _selectedPaymentMethod = type == 'GOFOOD' ? 'GoFood' : (type == 'GRABFOOD' ? 'GrabFood' : 'ShopeeFood');
            final marketAcc = _accounts.firstWhere(
              (a) => a['name'].toString().toLowerCase().contains('market') || a['name'].toString().toLowerCase().contains('delivery'),
              orElse: () => _accounts.isNotEmpty ? _accounts.first : null
            );
            if (marketAcc != null) _selectedAccountId = marketAcc['id'];
          } else if (type == 'WALK_IN') {
            _selectedPaymentMethod = 'Tunai';
            final cashAcc = _accounts.firstWhere((a) => a['type'] == 'CASH' || a['name'].toString().toLowerCase().contains('tunai'), orElse: () => _accounts.isNotEmpty ? _accounts.first : null);
            if (cashAcc != null) _selectedAccountId = cashAcc['id'];
          }
        });
        setState(() {});
      },
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue[800] : Colors.white,
          border: Border.all(color: isSelected ? Colors.blue[800]! : Colors.grey[300]!),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: isSelected ? Colors.white : Colors.blueGrey[600], size: 14),
            SizedBox(width: 6),
            Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.blueGrey[600], fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildSaleTypeChip(String type, String label, IconData icon, Function setPanelState) {
    bool isSelected = _saleType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setPanelState(() {
            _saleType = type;
            if (type == 'GOFOOD' || type == 'GRABFOOD' || type == 'SHOPEEFOOD') {
              _selectedPaymentMethod = type == 'GOFOOD' ? 'GoFood' : (type == 'GRABFOOD' ? 'GrabFood' : 'ShopeeFood');
              
              final marketAcc = _accounts.firstWhere(
                (a) => a['name'].toString().toLowerCase().contains('market') || a['name'].toString().toLowerCase().contains('delivery'),
                orElse: () => _accounts.isNotEmpty ? _accounts.first : null
              );
              if (marketAcc != null) {
                _selectedAccountId = marketAcc['id'];
              }
            } else if (type == 'WALK_IN') {
              _selectedPaymentMethod = 'Tunai';
              final cashAcc = _accounts.firstWhere((a) => a['type'] == 'CASH' || a['name'].toString().toLowerCase().contains('tunai'), orElse: () => _accounts.isNotEmpty ? _accounts.first : null);
              if (cashAcc != null) _selectedAccountId = cashAcc['id'];
            }
          });
          setState(() {});
        },
        child: Container(
          padding: EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Colors.blue[800] : Colors.white,
            border: Border.all(color: isSelected ? Colors.blue[800]! : Colors.grey[300]!),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? Colors.white : Colors.blueGrey[600], size: 20),
              SizedBox(height: 4),
              Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.blueGrey[600], fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isPositive = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.blueGrey[500], fontSize: 13, fontWeight: FontWeight.w500)),
          Text(value, style: TextStyle(color: isPositive ? Colors.blue[700] : Colors.blueGrey[700], fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Future<void> _processCheckout(BuildContext currentContext, {bool isModal = true}) async {
    if (isModal) Navigator.pop(currentContext);
    setState(() => _isLoading = true);
    try {
      final checkoutItems = _cart.map((item) {
        final salePrice = _getItemPrice(item);
        return {
          ...item,
          'price': salePrice,
          'originalPrice': item['price'],
          'total': salePrice * item['quantity'],
        };
      }).toList();

      final response = await _apiService.checkoutPos(
        items: checkoutItems,
        accountId: _selectedAccountId!,
        totalAmount: _grandTotal,
        customerName: _customerNameController.text.trim(),
        customerPhone: _customerPhoneController.text.trim(),
        saleType: _saleType,
        serviceFee: 0,
        markupPercentage: 0,
        notes: _selectedPaymentMethod != 'Tunai' ? '[Metode: $_selectedPaymentMethod]' : null,
      );

      final saleData = {
        'invoiceNumber': response['invoiceNumber'],
        'items': checkoutItems,
        'totalAmount': _grandTotal,
        'cashReceived': _cashReceived > 0 ? _cashReceived : _grandTotal,
        'paymentMethod': _selectedPaymentMethod,
        'customerName': _customerNameController.text.trim(),
      };

      if (await _printerService.isAutoPrintEnabled()) {
        _printerService.printReceipt(saleData);
      }
      
      setState(() {
        _cart = [];
        _customerNameController.clear();
        _customerPhoneController.clear();
        _cashReceivedController.clear();
        _cashReceived = 0;
      });
      
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Column(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 64),
              SizedBox(height: 16),
              Text('Transaksi Berhasil!', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text('Pesanan #${response['invoiceNumber']} telah sukses diproses.', textAlign: TextAlign.center, style: TextStyle(color: Colors.blueGrey)),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElevatedButton.icon(
                  onPressed: () => _printerService.printReceipt(saleData),
                  icon: Icon(Icons.print, color: Colors.white),
                  label: Text('CETAK STRUK', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[800],
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: () => _printerService.printStickerLabels(saleData),
                  icon: Icon(Icons.label_important_outline, color: Colors.white),
                  label: Text('CETAK LABEL STICKER', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: Colors.amber[800],
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => _printerService.generateReceiptPreview(saleData),
                  icon: Icon(Icons.remove_red_eye_outlined),
                  label: Text('LIHAT PREVIEW', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: BorderSide(color: Colors.blue[800]!),
                    foregroundColor: Colors.blue[800],
                  ),
                ),
                SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _fetchData();
                  },
                  child: Text('OK, KEMBALI', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                ),
              ],
            )
          ],
        ),
      );
    } catch (e) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Gagal Checkout'),
          content: Text('$e'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text('OK')),
          ],
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _handleProductTap(dynamic p) {
    if (p['customizations'] != null && (p['customizations'] as List).isNotEmpty) {
      _showCustomizationDialog(p);
    } else {
      _addToCart(p);
    }
  }

  void _showCustomizationDialog(dynamic p) {
    List<Map<String, dynamic>> selectedModifiers = [];
    
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text('Kustomisasi: ${p['name']}'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: (p['customizations'] as List).map<Widget>((pc) {
                    final group = pc['Group'];
                    if (group == null) return SizedBox();
                    
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8.0),
                          child: Text(
                            '${group['name']} ${group['isRequired'] == true ? "(Wajib)" : ""}',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ),
                        ...(group['options'] ?? []).map<Widget>((opt) {
                          final int idx = selectedModifiers.indexWhere((m) => m['optionId'] == opt['id']);
                          final bool isSelected = idx >= 0;
                          
                          return CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(opt['name']),
                            subtitle: (opt['price'] ?? 0) > 0 ? Text('+Rp ${opt['price']}') : null,
                            value: isSelected,
                            onChanged: (bool? val) {
                              setDialogState(() {
                                if (val == true) {
                                  if (group['maxSelections'] == 1) {
                                    selectedModifiers.removeWhere((m) => m['groupId'] == group['id']);
                                  }
                                  selectedModifiers.add({
                                    'groupId': group['id'],
                                    'groupName': group['name'],
                                    'optionId': opt['id'],
                                    'optionName': opt['name'],
                                    'price': opt['price'],
                                  });
                                } else {
                                  selectedModifiers.removeWhere((m) => m['optionId'] == opt['id']);
                                }
                              });
                            },
                          );
                        }).toList(),
                        Divider(),
                      ],
                    );
                  }).toList(),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Batal'),
                ),
                ElevatedButton(
                  onPressed: () {
                    for (var pc in (p['customizations'] as List)) {
                      final group = pc['Group'];
                      if (group != null && group['isRequired'] == true) {
                        int selectedInGroup = selectedModifiers.where((m) => m['groupId'] == group['id']).length;
                        if (selectedInGroup < (group['minSelections'] ?? 1)) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Kustomisasi ${group['name']} wajib dipilih!')));
                          return;
                        }
                      }
                    }
                    Navigator.pop(context);
                    _addToCart(p, modifiers: selectedModifiers);
                  },
                  child: Text('Tambah'),
                )
              ],
            );
          }
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFF7F8FA),
      appBar: AppBar(
        title: Text('Aivola.id POS', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: Colors.blue[800]),
            tooltip: 'Sinkronisasi Data',
            onPressed: () {
              _fetchData();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Data berhasil disinkronkan'), duration: Duration(seconds: 1)),
              );
            },
          ),
          IconButton(
            icon: Icon(Icons.print_outlined, color: Colors.blue[800]),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => PrinterSettingsScreen())),
          ),
          IconButton(
            icon: Icon(Icons.pause_circle_outline, color: Colors.blue[800]),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => PosPendingBillsScreen()),
              ).then((selectedBill) {
                if (selectedBill != null) {
                  setState(() {
                    _cart = List<Map<String, dynamic>>.from(selectedBill['items']);
                  });
                }
              });
            },
          ),
          IconButton(
            icon: Icon(_isWaiterMode ? Icons.person_outline : Icons.point_of_sale),
            tooltip: _isWaiterMode ? 'Pindah ke Mode Kasir' : 'Pindah ke Mode Pelayan',
            onPressed: () => _toggleWaiterMode(!_isWaiterMode),
          ),
          IconButton(
            icon: Icon(Icons.history),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => PosOrderHistoryScreen())),
          ),
          IconButton(
            icon: Icon(Icons.lock_clock),
            tooltip: 'Tutup Kasir (Closing)',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => PosClosingScreen())),
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Top Search & Categories
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    decoration: InputDecoration(
                      hintText: 'Cari menu...',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: Colors.grey[50],
                    ),
                  ),
                ),
                
                Container(
                  height: 40,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text('Semua'),
                          selected: _selectedCategoryId == null,
                          onSelected: (val) => setState(() => _selectedCategoryId = null),
                          selectedColor: Colors.green[100],
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.grey[300]!)),
                        ),
                      ),
                      ..._categories.map((cat) => Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text(cat['name']),
                          selected: _selectedCategoryId == cat['id'],
                          onSelected: (val) => setState(() => _selectedCategoryId = val ? cat['id'] : null),
                          selectedColor: Colors.green[100],
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.grey[300]!)),
                        ),
                      )).toList(),
                    ],
                  ),
                ),

                SizedBox(height: 16),

                // Grid of Products
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final bool isLargeScreen = constraints.maxWidth > 900;
                      int cols = 2;
                      
                      // Calculate columns considering side panel space if large screen
                      double availableWidth = isLargeScreen ? constraints.maxWidth - 400 : constraints.maxWidth;
                      
                      if (availableWidth > 1400) cols = 10;
                      else if (availableWidth > 1200) cols = 8;
                      else if (availableWidth > 1000) cols = 6;
                      else if (availableWidth > 800) cols = 4;
                      else if (availableWidth > 600) cols = 3;
                      
                      Widget mainContent = _filteredProducts.isEmpty
                          ? Center(child: Text('Tidak ada produk ditemukan'))
                          : GridView.builder(
                              padding: EdgeInsets.all(12),
                              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: cols,
                                childAspectRatio: 0.68,
                                crossAxisSpacing: 8,
                                mainAxisSpacing: 8,
                                ),
                          itemCount: _filteredProducts.length,
                          itemBuilder: (context, i) {
                            final p = _filteredProducts[i];
                            final int cartQty = _cart.where((item) => item['productId'] == p['id']).fold(0, (sum, item) => sum + (item['quantity'] as int));

                            return GestureDetector(
                              onTap: () => _handleProductTap(p),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.04),
                                      blurRadius: 8,
                                      offset: Offset(0, 2),
                                    ),
                                  ],
                                  border: Border.all(color: Colors.grey[100]!, width: 1),
                                ),
                                child: Stack(
                                  children: [
                                    // Vertical Stripe Background
                                    Positioned.fill(
                                      child: Align(
                                        alignment: Alignment.center,
                                        child: Container(
                                          width: constraints.maxWidth / cols * 0.3,
                                          color: Color(0xFFEDF2F7),
                                        ),
                                      ),
                                    ),
                                    Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: [
                                          // Product Image Area (Iconic)
                                          Icon(Icons.coffee, size: 28, color: Color(0xFF2D3748)),
                                          SizedBox(height: 12),
                                          // Name
                                          Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 8.0),
                                            child: Text(
                                              p['name'], 
                                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1A202C)),
                                              textAlign: TextAlign.center,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          SizedBox(height: 4),
                                          // Price
                                          Text(
                                            'Rp ${p['price']}', 
                                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF2D3748)),
                                            textAlign: TextAlign.center,
                                          ),
                                          SizedBox(height: 8),
                                        ],
                                      ),
                                    ),
                                    if (cartQty > 0)
                                      Positioned(
                                        top: 8,
                                        right: 8,
                                        child: CircleAvatar(
                                          radius: 10,
                                          backgroundColor: Colors.blue[800],
                                          child: Text('$cartQty', style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold)),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                        );

                      if (isLargeScreen) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: mainContent),
                            Container(
                              width: 400,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                border: Border(left: BorderSide(color: Colors.grey[300]!, width: 2)),
                                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: Offset(-2, 0))],
                              ),
                              child: _cart.isEmpty
                                  ? Center(child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.shopping_basket_outlined, size: 64, color: Colors.grey[300]),
                                        SizedBox(height: 16),
                                        Text('Keranjang Kosong', style: TextStyle(color: Colors.grey[500], fontWeight: FontWeight.bold)),
                                      ],
                                    ))
                                  : Padding(
                                      padding: const EdgeInsets.all(16.0),
                                      child: _buildCheckoutContent(context, setState, isModal: false),
                                    ),
                            ),
                          ],
                        );
                      }

                      return mainContent;
                    },
                  ),
                ),
              ],
            ),
      floatingActionButton: LayoutBuilder(
        builder: (context, constraints) {
          final bool isLargeScreen = constraints.maxWidth > 900;
          if (isLargeScreen) return SizedBox();
          
          return _cart.isNotEmpty
              ? FloatingActionButton.extended(
                  onPressed: _showCheckoutModal,
                  backgroundColor: Colors.blue[800],
                  label: Text('LIHAT KERANJANG (${_cart.length})', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  icon: Icon(Icons.shopping_basket, color: Colors.white),
                )
              : SizedBox();
        },
      ),
    );
  }
}

