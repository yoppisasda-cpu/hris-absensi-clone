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

  // Metadata Controllers
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _footerController = TextEditingController();
  String? _logoPath;

  // Label Printer Controllers
  String _labelPrinterType = 'bluetooth'; // 'bluetooth' or 'wifi'
  final TextEditingController _labelIpController = TextEditingController();
  String? _selectedLabelBtName;
  String? _selectedLabelBtAddress;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadSettings();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _footerController.dispose();
    _labelIpController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final ap = await _printerService.isAutoPrintEnabled();
    final store = await _printerService.getStoreData();
    final config = await _printerService.getPrinterConfig();
    
    setState(() {
      _autoPrint = ap;
      _nameController.text = store['name']!;
      _addressController.text = store['address']!;
      _phoneController.text = store['phone']!;
      _footerController.text = store['footer']!;
      _logoPath = store['logoPath'];
      
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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal scan: $e')));
    } finally {
      setState(() => _isScanning = false);
    }
  }

  Future<void> _connectReceipt(BluetoothInfo device) async {
    setState(() => _isScanning = true);
    final success = await _printerService.connectReceipt(device.name, device.macAdress);
    setState(() => _isScanning = false);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Receipt Printer Terhubung ke ${device.name}')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal terhubung!'), backgroundColor: Colors.red));
    }
  }

  Future<void> _saveLabelWifi() async {
    if (_labelIpController.text.isEmpty) return;
    await _printerService.connectLabel("Wifi Printer", _labelIpController.text, "wifi");
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Alamat IP Label Printer Disimpan')));
  }

  Future<void> _selectLabelBt(BluetoothInfo device) async {
    await _printerService.connectLabel(device.name, device.macAdress, "bluetooth");
    setState(() {
      _selectedLabelBtName = device.name;
      _selectedLabelBtAddress = device.macAdress;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Bluetooth Label Printer terpilih: ${device.name}')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Pengaturan Printer', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.blue[800],
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.blue[800],
          tabs: [
            Tab(text: 'IDENTITAS'),
            Tab(text: 'STRUK'),
            Tab(text: 'LABEL'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildIdentitasTab(),
          _buildReceiptTab(),
          _buildLabelTab(),
        ],
      ),
    );
  }

  Widget _buildIdentitasTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          SwitchListTile(
            title: Text('Cetak Otomatis Setiap Checkout', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            value: _autoPrint,
            onChanged: (val) {
              setState(() => _autoPrint = val);
              _printerService.setAutoPrint(val);
            },
            secondary: Icon(Icons.flash_on, color: Colors.amber[800]),
          ),
          Divider(),
          Center(
            child: Column(
              children: [
                GestureDetector(
                  onTap: _pickLogo,
                  child: Container(
                    width: 100, height: 100,
                    decoration: BoxDecoration(
                      color: Colors.grey[100], borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[200]!),
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
          SizedBox(height: 16),
          _buildTextField(_nameController, 'Nama Toko', Icons.store, (v) => _saveMetadata()),
          SizedBox(height: 12),
          _buildTextField(_addressController, 'Alamat Lengkap', Icons.location_on, (v) => _saveMetadata(), maxLines: 2),
          SizedBox(height: 12),
          _buildTextField(_phoneController, 'Nomor Telepon', Icons.phone, (v) => _saveMetadata()),
          SizedBox(height: 12),
          _buildTextField(_footerController, 'Pesan Kaki (Footer)', Icons.message, (v) => _saveMetadata()),
        ],
      ),
    );
  }

  Widget _buildReceiptTab() {
    return Column(
      children: [
        Container(
          padding: EdgeInsets.all(20),
          color: Colors.blue[50],
          child: Row(
            children: [
              Icon(Icons.receipt_long, color: Colors.blue[800], size: 40),
              SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _printerService.isConnected ? 'Printer Struk Terhubung' : 'Printer Struk Terputus',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _printerService.isConnected ? Colors.green[800] : Colors.red[800]),
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
              Text('SCAN BLUETOOTH (Receipt)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
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
        if (_printerService.isConnected)
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[800], minimumSize: Size(double.infinity, 50)),
              onPressed: () => _printerService.printTest(),
              icon: Icon(Icons.print, color: Colors.white),
              label: Text('TEST PRINT STRUK', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
