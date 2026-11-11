import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/printer_service.dart';
import '../services/api_service.dart';

class PrinterSettingsScreen extends StatefulWidget {
  @override
  _PrinterSettingsScreenState createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> with SingleTickerProviderStateMixin {
  final PrinterService _printerService = PrinterService();
  final ApiService _apiService = ApiService();
  final ImagePicker _picker = ImagePicker();
  late TabController _tabController;

  List<BluetoothInfo> _devices = [];
  bool _isScanning = false;
  bool _autoPrint = false;
  bool _autoPrintKitchen = false;
  bool _autoPrintBar = false;
  bool _autoPrintLabel = false;

  // Metadata Controllers
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _footerController = TextEditingController();
  String? _logoPath;

  // Receipt Printer Controllers
  String _receiptPrinterType = 'bluetooth'; // 'bluetooth' or 'wifi'
  final TextEditingController _receiptIpController = TextEditingController();

  // Kitchen Printer Controllers
  String _kitchenPrinterType = 'wifi'; // 'wifi' or 'bluetooth'
  final TextEditingController _kitchenIpController = TextEditingController();
  String? _selectedKitchenBtName;
  String? _selectedKitchenBtAddress;

  // Bar Printer Controllers
  String _barPrinterType = 'wifi'; // 'wifi' or 'bluetooth'
  final TextEditingController _barIpController = TextEditingController();
  String? _selectedBarBtName;
  String? _selectedBarBtAddress;

  // Label Printer Controllers
  String _labelPrinterType = 'bluetooth'; // 'bluetooth' or 'wifi'
  final TextEditingController _labelIpController = TextEditingController();
  String? _selectedLabelBtName;
  String? _selectedLabelBtAddress;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadSettings();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _footerController.dispose();
    _receiptIpController.dispose();
    _kitchenIpController.dispose();
    _barIpController.dispose();
    _labelIpController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final autoSettings = await _printerService.getAutoPrintSettings();
    final store = await _printerService.getStoreData();
    final config = await _printerService.getPrinterConfig();
    
    setState(() {
      _autoPrint = autoSettings['receipt'] ?? false;
      _autoPrintKitchen = autoSettings['kitchen'] ?? false;
      _autoPrintBar = autoSettings['bar'] ?? false;
      _autoPrintLabel = autoSettings['label'] ?? false;

      _nameController.text = store['name']!;
      _addressController.text = store['address']!;
      _phoneController.text = store['phone']!;
      _footerController.text = store['footer']!;
      _logoPath = store['logoPath'];
      
      _receiptPrinterType = config['receiptType'] ?? 'bluetooth';
      if (_receiptPrinterType == 'wifi') {
        _receiptIpController.text = config['receiptAddress'] ?? '';
      }

      _kitchenPrinterType = config['kitchenType'] ?? 'wifi';
      if (_kitchenPrinterType == 'wifi') {
        _kitchenIpController.text = config['kitchenAddress'] ?? '';
      } else {
        _selectedKitchenBtName = config['kitchenName'];
        _selectedKitchenBtAddress = config['kitchenAddress'];
      }

      _barPrinterType = config['barType'] ?? 'wifi';
      if (_barPrinterType == 'wifi') {
        _barIpController.text = config['barAddress'] ?? '';
      } else {
        _selectedBarBtName = config['barName'];
        _selectedBarBtAddress = config['barAddress'];
      }
      
      _labelPrinterType = config['labelType'] ?? 'bluetooth';
      if (_labelPrinterType == 'wifi') {
        _labelIpController.text = config['labelAddress'] ?? '';
      } else {
        _selectedLabelBtName = config['labelName'];
        _selectedLabelBtAddress = config['labelAddress'];
      }
    });

    if (_nameController.text == 'TOKO KITA') {
      _autoFillFromProfile();
    }

    _scanDevices();
  }

  Future<void> _saveSettings() async {
    await _printerService.saveAutoPrintSettings(_autoPrint, _autoPrintLabel, _autoPrintKitchen, _autoPrintBar);
  }

  Future<void> _autoFillFromProfile() async {
    try {
      final profile = await _apiService.getMyFullProfile();
      if (profile['company']?['name'] != null) {
        setState(() => _nameController.text = profile['company']['name']);
        _saveMetadata();
      }
    } catch (e) {
      print('Auto-fill failed: $e');
    }
  }

  Future<void> _pickLogo() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() => _logoPath = image.path);
      _saveMetadata();
    }
  }

  Future<void> _saveMetadata() async {
    await _printerService.updateStoreData({
      'name': _nameController.text,
      'address': _addressController.text,
      'phone': _phoneController.text,
      'footer': _footerController.text,
      'logoPath': _logoPath ?? '',
    });
  }

  Future<void> _scanDevices() async {
    setState(() => _isScanning = true);
    await [Permission.bluetooth, Permission.bluetoothScan, Permission.bluetoothConnect, Permission.location].request();
    try {
      final devices = await _printerService.getBluetoothDevices();
      setState(() => _devices = devices);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal scan Bluetooth: $e')));
    } finally {
      setState(() => _isScanning = false);
    }
  }

  // RECEIPT (Kasir)
  Future<void> _connectReceipt(BluetoothInfo device) async {
    setState(() => _isScanning = true);
    final success = await _printerService.connectReceipt(device.name, device.macAdress);
    setState(() => _isScanning = false);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Receipt Printer Kasir terhubung: ${device.name}')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal terhubung!'), backgroundColor: Colors.red));
    }
  }

  Future<void> _saveReceiptWifi() async {
    if (_receiptIpController.text.isEmpty) return;
    await _printerService.connectReceipt("Wifi Kasir", _receiptIpController.text.trim(), type: "wifi");
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('IP Printer Kasir disimpan: ${_receiptIpController.text.trim()}')));
  }

  // KITCHEN (Dapur)
  Future<void> _saveKitchenWifi() async {
    if (_kitchenIpController.text.isEmpty) return;
    await _printerService.connectKitchen("Wifi Dapur", _kitchenIpController.text.trim(), "wifi");
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('IP Printer Dapur disimpan: ${_kitchenIpController.text.trim()}')));
  }

  Future<void> _selectKitchenBt(BluetoothInfo device) async {
    await _printerService.connectKitchen(device.name, device.macAdress, "bluetooth");
    setState(() {
      _selectedKitchenBtName = device.name;
      _selectedKitchenBtAddress = device.macAdress;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Bluetooth Printer Dapur: ${device.name}')));
  }

  // BAR (Minuman)
  Future<void> _saveBarWifi() async {
    if (_barIpController.text.isEmpty) return;
    await _printerService.connectBar("Wifi Bar", _barIpController.text.trim(), "wifi");
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('IP Printer Bar disimpan: ${_barIpController.text.trim()}')));
  }

  Future<void> _selectBarBt(BluetoothInfo device) async {
    await _printerService.connectBar(device.name, device.macAdress, "bluetooth");
    setState(() {
      _selectedBarBtName = device.name;
      _selectedBarBtAddress = device.macAdress;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Bluetooth Printer Bar: ${device.name}')));
  }

  // LABEL (Stiker)
  Future<void> _saveLabelWifi() async {
    if (_labelIpController.text.isEmpty) return;
    await _printerService.connectLabel("Wifi Label", _labelIpController.text.trim(), "wifi");
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('IP Printer Label disimpan: ${_labelIpController.text.trim()}')));
  }

  Future<void> _selectLabelBt(BluetoothInfo device) async {
    await _printerService.connectLabel(device.name, device.macAdress, "bluetooth");
    setState(() {
      _selectedLabelBtName = device.name;
      _selectedLabelBtAddress = device.macAdress;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Bluetooth Label: ${device.name}')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Pengaturan Multi-Printer', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: Colors.blue[800],
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.blue[800],
          tabs: const [
            Tab(text: 'IDENTITAS'),
            Tab(text: 'KASIR (STRUK)'),
            Tab(text: 'DAPUR (FOOD)'),
            Tab(text: 'BAR (DRINKS)'),
            Tab(text: 'LABEL (STIKER)'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildIdentitasTab(),
          _buildReceiptTab(),
          _buildKitchenTab(),
          _buildBarTab(),
          _buildLabelTab(),
        ],
      ),
    );
  }

  Widget _buildIdentitasTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('OTOMATISASI CETAK POS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
          SizedBox(height: 8),
          SwitchListTile(
            title: Text('Otomatis Cetak Struk Kasir', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('Cetak struk pembayaran untuk pelanggan & kasir', style: TextStyle(fontSize: 12)),
            value: _autoPrint,
            onChanged: (val) {
              setState(() => _autoPrint = val);
              _saveSettings();
            },
            secondary: Icon(Icons.receipt, color: Colors.blue[800]),
          ),
          SwitchListTile(
            title: Text('Otomatis Cetak Dapur (Kitchen)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('Kirim otomatis pesanan Makanan (FOOD) ke Dapur', style: TextStyle(fontSize: 12)),
            value: _autoPrintKitchen,
            onChanged: (val) {
              setState(() => _autoPrintKitchen = val);
              _saveSettings();
            },
            secondary: Icon(Icons.restaurant, color: Colors.orange[800]),
          ),
          SwitchListTile(
            title: Text('Otomatis Cetak Bar (Minuman)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('Kirim otomatis pesanan Minuman (BEVERAGE) ke Bar', style: TextStyle(fontSize: 12)),
            value: _autoPrintBar,
            onChanged: (val) {
              setState(() => _autoPrintBar = val);
              _saveSettings();
            },
            secondary: Icon(Icons.local_cafe, color: Colors.teal[800]),
          ),
          SwitchListTile(
            title: Text('Otomatis Cetak Label Stiker Cup', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('Cetak stiker per cup untuk botol/gelas minuman', style: TextStyle(fontSize: 12)),
            value: _autoPrintLabel,
            onChanged: (val) {
              setState(() => _autoPrintLabel = val);
              _saveSettings();
            },
            secondary: Icon(Icons.label_important_outline, color: Colors.amber[800]),
          ),
          Divider(height: 32),
          Text('IDENTITAS & HEADER STRUK', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
          SizedBox(height: 12),
          Center(
            child: Column(
              children: [
                GestureDetector(
                  onTap: _pickLogo,
                  child: Container(
                    width: 90, height: 90,
                    decoration: BoxDecoration(
                      color: Colors.grey[100], borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[300]!),
                    ),
                    child: _logoPath != null && _logoPath!.isNotEmpty
                        ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(File(_logoPath!), fit: BoxFit.cover))
                        : Icon(Icons.add_a_photo_outlined, color: Colors.grey[400]),
                  ),
                ),
                TextButton(onPressed: _pickLogo, child: Text('Ubah Logo Toko')),
              ],
            ),
          ),
          SizedBox(height: 12),
          _buildTextField(_nameController, 'Nama Toko / Resto', Icons.store, (v) => _saveMetadata()),
          SizedBox(height: 12),
          _buildTextField(_addressController, 'Alamat Lengkap', Icons.location_on, (v) => _saveMetadata(), maxLines: 2),
          SizedBox(height: 12),
          _buildTextField(_phoneController, 'Nomor Telepon', Icons.phone, (v) => _saveMetadata()),
          SizedBox(height: 12),
          _buildTextField(_footerController, 'Pesan Kaki (Footer Struk)', Icons.message, (v) => _saveMetadata()),
          SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildReceiptTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'bluetooth', label: Text('Bluetooth'), icon: Icon(Icons.bluetooth)),
              ButtonSegment(value: 'wifi', label: Text('LAN / Wifi (IP)'), icon: Icon(Icons.wifi)),
            ],
            selected: {_receiptPrinterType},
            onSelectionChanged: (Set<String> newSelection) {
              setState(() => _receiptPrinterType = newSelection.first);
              if (_receiptPrinterType == 'wifi' && _receiptIpController.text.isNotEmpty) {
                 _printerService.connectReceipt("Wifi Kasir", _receiptIpController.text.trim(), type: "wifi");
              }
            },
          ),
        ),
        if (_receiptPrinterType == 'wifi')
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildTextField(_receiptIpController, 'IP Address Kasir (cth: 192.168.1.200)', Icons.settings_ethernet, (v) => _saveReceiptWifi()),
                  SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _saveReceiptWifi,
                    icon: Icon(Icons.save, size: 18),
                    label: Text('SIMPAN IP KASIR'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[800], foregroundColor: Colors.white),
                  ),
                  SizedBox(height: 16),
                  Text('Pastikan Printer Kasir dan perangkat POS berada dalam satu router Wi-Fi.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  SizedBox(height: 20),
                  if (_printerService.isConnected)
                    Text('Printer Kasir Aktif (WiFi)', style: TextStyle(color: Colors.green[800], fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          )
        else
          Expanded(
            child: Column(
              children: [
                Container(
                  padding: EdgeInsets.all(16),
                  color: Colors.blue[50],
                  child: Row(
                    children: [
                      Icon(Icons.receipt_long, color: Colors.blue[800], size: 36),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _printerService.isConnected ? 'Printer Kasir Terhubung' : 'Printer Kasir Terputus',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: _printerService.isConnected ? Colors.green[800] : Colors.red[800]),
                            ),
                            if (_printerService.isConnected) Text(_printerService.connectedName ?? '', style: TextStyle(color: Colors.blueGrey)),
                          ],
                        ),
                      ),
                      if (_printerService.isConnected)
                        IconButton(icon: Icon(Icons.close, color: Colors.red), onPressed: () async { await _printerService.disconnectReceipt(); setState(() {}); }),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('SCAN BLUETOOTH (KASIR)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                      _isScanning ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : IconButton(icon: Icon(Icons.refresh), onPressed: _scanDevices),
                    ],
                  ),
                ),
                Expanded(
                  child: _devices.isEmpty
                      ? Center(child: Text('Tidak ada perangkat Bluetooth ditemukan'))
                      : ListView.builder(
                          itemCount: _devices.length,
                          itemBuilder: (context, i) {
                            final d = _devices[i];
                            final isCurrent = _printerService.isConnected && _printerService.connectedName == d.name;
                            return ListTile(
                              leading: Icon(Icons.bluetooth),
                              title: Text(d.name),
                              subtitle: Text(d.macAdress),
                              trailing: isCurrent ? Icon(Icons.check_circle, color: Colors.green) : TextButton(onPressed: () => _connectReceipt(d), child: Text('Hubungkan')),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[800], minimumSize: Size(double.infinity, 50)),
            onPressed: () => _printerService.printTest(),
            icon: Icon(Icons.print, color: Colors.white),
            label: Text('TEST PRINT STRUK KASIR', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }

  Widget _buildKitchenTab() {
    return Column(
      children: [
        Container(
          margin: EdgeInsets.all(16),
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.orange[50], borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.orange[200]!)),
          child: Row(
            children: [
              Icon(Icons.restaurant, color: Colors.orange[800], size: 28),
              SizedBox(width: 10),
              Expanded(
                child: Text('Struk Dapur otomatis hanya mencetak menu Makanan (FOOD) beserta varian dan catatan order.', style: TextStyle(fontSize: 12, color: Colors.orange[900])),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'wifi', label: Text('LAN / Wifi (IP)'), icon: Icon(Icons.wifi)),
              ButtonSegment(value: 'bluetooth', label: Text('Bluetooth'), icon: Icon(Icons.bluetooth)),
            ],
            selected: {_kitchenPrinterType},
            onSelectionChanged: (Set<String> newSelection) {
              setState(() => _kitchenPrinterType = newSelection.first);
              if (_kitchenPrinterType == 'wifi' && _kitchenIpController.text.isNotEmpty) {
                _printerService.connectKitchen("Wifi Dapur", _kitchenIpController.text.trim(), "wifi");
              }
            },
          ),
        ),
        SizedBox(height: 12),
        if (_kitchenPrinterType == 'wifi')
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildTextField(_kitchenIpController, 'IP Address Printer Dapur (cth: 192.168.1.201)', Icons.settings_ethernet, (v) => _saveKitchenWifi()),
                  SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _saveKitchenWifi,
                    icon: Icon(Icons.save, size: 18),
                    label: Text('SIMPAN IP DAPUR'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[800], foregroundColor: Colors.white),
                  ),
                  SizedBox(height: 16),
                  Text('Rekomendasi: Hubungkan printer dapur dengan kabel LAN ke Router agar koneksi stabil dan jangkauan jauh.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Spacer(),
                  TextButton.icon(
                    onPressed: () async {
                      await _printerService.disconnectKitchen();
                      setState(() => _kitchenIpController.clear());
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Setting Printer Dapur direset')));
                    },
                    icon: Icon(Icons.delete_outline, color: Colors.red),
                    label: Text('Hapus Konfigurasi Dapur', style: TextStyle(color: Colors.red)),
                  ),
                ],
              ),
            ),
          )
        else
          Expanded(
            child: Column(
              children: [
                if (_selectedKitchenBtName != null)
                  Container(
                    margin: EdgeInsets.all(16),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.orange[50], borderRadius: BorderRadius.circular(10)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Terpilih: $_selectedKitchenBtName', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange[900])),
                        IconButton(
                          icon: Icon(Icons.close, color: Colors.red),
                          onPressed: () async {
                            await _printerService.disconnectKitchen();
                            setState(() {
                              _selectedKitchenBtName = null;
                              _selectedKitchenBtAddress = null;
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('PILIH BLUETOOTH DAPUR', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                      _isScanning ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : IconButton(icon: Icon(Icons.refresh), onPressed: _scanDevices),
                    ],
                  ),
                ),
                Expanded(
                  child: _devices.isEmpty
                      ? Center(child: Text('Tidak ada perangkat Bluetooth'))
                      : ListView.builder(
                          itemCount: _devices.length,
                          itemBuilder: (context, i) {
                            final d = _devices[i];
                            final isSelected = _selectedKitchenBtAddress == d.macAdress;
                            return ListTile(
                              leading: Icon(Icons.restaurant),
                              title: Text(d.name),
                              subtitle: Text(d.macAdress),
                              trailing: isSelected ? Icon(Icons.check_circle, color: Colors.orange[800]) : TextButton(onPressed: () => _selectKitchenBt(d), child: Text('Pilih')),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange[800], minimumSize: Size(double.infinity, 50)),
            onPressed: () => _printerService.printTestKitchen(),
            icon: Icon(Icons.print, color: Colors.white),
            label: Text('TEST PRINT DAPUR (KITCHEN)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }

  Widget _buildBarTab() {
    return Column(
      children: [
        Container(
          margin: EdgeInsets.all(16),
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.teal[50], borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.teal[200]!)),
          child: Row(
            children: [
              Icon(Icons.local_cafe, color: Colors.teal[800], size: 28),
              SizedBox(width: 10),
              Expanded(
                child: Text('Struk Bar otomatis hanya mencetak menu Minuman (BEVERAGE) beserta catatan es/gula/topping.', style: TextStyle(fontSize: 12, color: Colors.teal[900])),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'wifi', label: Text('LAN / Wifi (IP)'), icon: Icon(Icons.wifi)),
              ButtonSegment(value: 'bluetooth', label: Text('Bluetooth'), icon: Icon(Icons.bluetooth)),
            ],
            selected: {_barPrinterType},
            onSelectionChanged: (Set<String> newSelection) {
              setState(() => _barPrinterType = newSelection.first);
              if (_barPrinterType == 'wifi' && _barIpController.text.isNotEmpty) {
                _printerService.connectBar("Wifi Bar", _barIpController.text.trim(), "wifi");
              }
            },
          ),
        ),
        SizedBox(height: 12),
        if (_barPrinterType == 'wifi')
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildTextField(_barIpController, 'IP Address Printer Bar (cth: 192.168.1.202)', Icons.settings_ethernet, (v) => _saveBarWifi()),
                  SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _saveBarWifi,
                    icon: Icon(Icons.save, size: 18),
                    label: Text('SIMPAN IP BAR'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.teal[800], foregroundColor: Colors.white),
                  ),
                  SizedBox(height: 16),
                  Text('Printer thermal di station Barista/Bar untuk pesanan kopi, teh, & aneka minuman.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Spacer(),
                  TextButton.icon(
                    onPressed: () async {
                      await _printerService.disconnectBar();
                      setState(() => _barIpController.clear());
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Setting Printer Bar direset')));
                    },
                    icon: Icon(Icons.delete_outline, color: Colors.red),
                    label: Text('Hapus Konfigurasi Bar', style: TextStyle(color: Colors.red)),
                  ),
                ],
              ),
            ),
          )
        else
          Expanded(
            child: Column(
              children: [
                if (_selectedBarBtName != null)
                  Container(
                    margin: EdgeInsets.all(16),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.teal[50], borderRadius: BorderRadius.circular(10)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Terpilih: $_selectedBarBtName', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.teal[900])),
                        IconButton(
                          icon: Icon(Icons.close, color: Colors.red),
                          onPressed: () async {
                            await _printerService.disconnectBar();
                            setState(() {
                              _selectedBarBtName = null;
                              _selectedBarBtAddress = null;
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('PILIH BLUETOOTH BAR', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                      _isScanning ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : IconButton(icon: Icon(Icons.refresh), onPressed: _scanDevices),
                    ],
                  ),
                ),
                Expanded(
                  child: _devices.isEmpty
                      ? Center(child: Text('Tidak ada perangkat Bluetooth'))
                      : ListView.builder(
                          itemCount: _devices.length,
                          itemBuilder: (context, i) {
                            final d = _devices[i];
                            final isSelected = _selectedBarBtAddress == d.macAdress;
                            return ListTile(
                              leading: Icon(Icons.local_cafe),
                              title: Text(d.name),
                              subtitle: Text(d.macAdress),
                              trailing: isSelected ? Icon(Icons.check_circle, color: Colors.teal[800]) : TextButton(onPressed: () => _selectBarBt(d), child: Text('Pilih')),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.teal[800], minimumSize: Size(double.infinity, 50)),
            onPressed: () => _printerService.printTestBar(),
            icon: Icon(Icons.print, color: Colors.white),
            label: Text('TEST PRINT BAR (MINUMAN)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }

  Widget _buildLabelTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'bluetooth', label: Text('Bluetooth'), icon: Icon(Icons.bluetooth)),
              ButtonSegment(value: 'wifi', label: Text('Wifi (Network)'), icon: Icon(Icons.wifi)),
            ],
            selected: {_labelPrinterType},
            onSelectionChanged: (Set<String> newSelection) {
              setState(() => _labelPrinterType = newSelection.first);
              _printerService.connectLabel(_labelPrinterType == 'wifi' ? "Wifi Printer" : (_selectedLabelBtName ?? "BT Label"), _labelPrinterType == 'wifi' ? _labelIpController.text : (_selectedLabelBtAddress ?? ""), _labelPrinterType);
            },
          ),
        ),
        if (_labelPrinterType == 'wifi')
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                _buildTextField(_labelIpController, 'IP Address Printer (e.g. 192.168.1.100)', Icons.settings_ethernet, (v) => _saveLabelWifi()),
                SizedBox(height: 12),
                Text('Pastikan Printer Label dan HP berada dalam jaringan yang sama.', style: TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          )
        else
          Expanded(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('PILIH PERANGKAT (Label)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                      _isScanning ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : IconButton(icon: Icon(Icons.refresh), onPressed: _scanDevices),
                    ],
                  ),
                ),
                Expanded(
                  child: _devices.isEmpty
                      ? Center(child: Text('Tidak ada perangkat ditemukan'))
                      : ListView.builder(
                          itemCount: _devices.length,
                          itemBuilder: (context, i) {
                            final d = _devices[i];
                            final isSelected = _selectedLabelBtAddress == d.macAdress;
                            return ListTile(
                              leading: Icon(Icons.label_outline),
                              title: Text(d.name),
                              subtitle: Text(d.macAdress),
                              trailing: isSelected ? Icon(Icons.check_circle, color: Colors.amber[800]) : TextButton(onPressed: () => _selectLabelBt(d), child: Text('Pilih')),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.amber[800], minimumSize: Size(double.infinity, 50)),
            onPressed: () => _printerService.printStickerLabels({
              'invoiceNumber': 'TEST-LABEL',
              'items': [{'name': 'Test Label Sticker', 'quantity': 1, 'modifiers': [{'optionName': 'Test Detail'}]}]
            }),
            icon: Icon(Icons.label_important, color: Colors.white),
            label: Text('TEST CETAK LABEL', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, Function(String) onChanged, {int maxLines = 1}) {
    return TextField(
      controller: controller, maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label, prefixIcon: Icon(icon, size: 20),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      onChanged: onChanged,
    );
  }
}
