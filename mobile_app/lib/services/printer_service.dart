import 'dart:io';
import 'package:image/image.dart' as img;
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class PrinterService {
  static final PrinterService _instance = PrinterService._internal();
  factory PrinterService() => _instance;
  PrinterService._internal();

  // Settings Keys
  static const String _prefReceiptPrinterName = 'receipt_printer_name';
  static const String _prefReceiptPrinterAddress = 'receipt_printer_address';
  static const String _prefLabelPrinterName = 'label_printer_name';
  static const String _prefLabelPrinterAddress = 'label_printer_address';
  static const String _prefLabelPrinterType = 'label_printer_type'; // 'bluetooth' or 'wifi'
  static const String _prefAutoPrint = 'auto_print_receipt';
  
  // Store Metadata keys
  static const String prefStoreName = 'print_store_name';
  static const String prefStoreAddress = 'print_store_address';
  static const String prefStorePhone = 'print_store_phone';
  static const String prefStoreFooter = 'print_store_footer';
  static const String prefStoreLogo = 'print_store_logo_path';

  bool _isConnected = false;
  String? _connectedName;

  bool get isConnected => _isConnected;
  String? get connectedName => _connectedName;

  Future<Map<String, String>> getStoreData() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'name': prefs.getString(prefStoreName) ?? 'TOKO KITA',
      'address': prefs.getString(prefStoreAddress) ?? 'Jl. Raya Sukses No. 123',
      'phone': prefs.getString(prefStorePhone) ?? '0812-3456-7890',
      'footer': prefs.getString(prefStoreFooter) ?? 'Terima Kasih Atas Kunjungan Anda',
      'logoPath': prefs.getString(prefStoreLogo) ?? '',
    };
  }

  Future<Map<String, String?>> getPrinterConfig() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'receiptName': prefs.getString(_prefReceiptPrinterName),
      'receiptAddress': prefs.getString(_prefReceiptPrinterAddress),
      'labelName': prefs.getString(_prefLabelPrinterName),
      'labelAddress': prefs.getString(_prefLabelPrinterAddress),
      'labelType': prefs.getString(_prefLabelPrinterType) ?? 'bluetooth',
    };
  }

  Future<void> updateStoreData(Map<String, String> data) async {
    final prefs = await SharedPreferences.getInstance();
    if (data.containsKey('name')) await prefs.setString(prefStoreName, data['name']!);
    if (data.containsKey('address')) await prefs.setString(prefStoreAddress, data['address']!);
    if (data.containsKey('phone')) await prefs.setString(prefStorePhone, data['phone']!);
    if (data.containsKey('footer')) await prefs.setString(prefStoreFooter, data['footer']!);
    if (data.containsKey('logoPath')) await prefs.setString(prefStoreLogo, data['logoPath']!);
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final rAddress = prefs.getString(_prefReceiptPrinterAddress);
    if (rAddress != null) {
      await connectReceipt(prefs.getString(_prefReceiptPrinterName) ?? 'Printer', rAddress);
    }
  }

  Future<List<BluetoothInfo>> getBluetoothDevices() async {
    return await PrintBluetoothThermal.pairedBluetooths;
  }

  Future<bool> connectReceipt(String name, String address) async {
    final bool result = await PrintBluetoothThermal.connect(macPrinterAddress: address);
    if (result) {
      _isConnected = true;
      _connectedName = name;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefReceiptPrinterName, name);
      await prefs.setString(_prefReceiptPrinterAddress, address);
    }
    return result;
  }

  Future<void> connectLabel(String name, String address, String type) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefLabelPrinterName, name);
    await prefs.setString(_prefLabelPrinterAddress, address);
    await prefs.setString(_prefLabelPrinterType, type);
  }

  Future<void> disconnectReceipt() async {
    await PrintBluetoothThermal.disconnect;
    _isConnected = false;
    _connectedName = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefReceiptPrinterName);
    await prefs.remove(_prefReceiptPrinterAddress);
  }

  // Shim to maintain compatibility with existing code that might call .disconnect()
  Future<void> disconnect() => disconnectReceipt();
  // Shim for .connect()
  Future<bool> connect(String name, String address) => connectReceipt(name, address);

  Future<bool> isAutoPrintEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_prefAutoPrint) ?? false;
  }

  Future<void> setAutoPrint(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefAutoPrint, value);
  }

  Future<bool> printTest() async {
    if (!_isConnected) return false;
    
    List<int> bytes = [];
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm58, profile);

    bytes += generator.text('TEST RECEIPT', styles: PosStyles(align: PosAlign.center, bold: true, height: PosTextSize.size2, width: PosTextSize.size2));
    bytes += generator.feed(1);
    bytes += generator.text('Receipt Printer OK (Bluetooth)', styles: PosStyles(align: PosAlign.center));
    bytes += generator.text(DateFormat('dd/MM/yyyy HH:mm:ss').format(DateTime.now()), styles: PosStyles(align: PosAlign.center));
    bytes += generator.feed(3);
    bytes += generator.cut();

    return await PrintBluetoothThermal.writeBytes(bytes);
  }

  Future<void> _sendToWifiPrinter(String ip, List<int> bytes) async {
    try {
      final socket = await Socket.connect(ip, 9100, timeout: Duration(seconds: 5));
      socket.add(bytes);
      await socket.flush();
      await socket.close();
    } catch (e) {
      print('Wifi print failed: $e');
      throw e;
    }
  }

  Future<bool> printReceipt(Map<String, dynamic> saleData) async {
    if (!_isConnected) return false;

    final store = await getStoreData();
    List<int> bytes = [];
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm58, profile);

    // Header Logo
    if (store['logoPath']!.isNotEmpty) {
      final File file = File(store['logoPath']!);
      if (await file.exists()) {
        final img.Image? image = img.decodeImage(await file.readAsBytes());
        if (image != null) {
          final img.Image resized = img.copyResize(image, width: 200);
          bytes += generator.imageRaster(resized, align: PosAlign.center);
        }
      }
    }

    // Header Text
    bytes += generator.text(store['name']!, styles: PosStyles(align: PosAlign.center, bold: true, height: PosTextSize.size2, width: PosTextSize.size2));
    bytes += generator.text(store['address']!, styles: PosStyles(align: PosAlign.center));
    bytes += generator.text('Telp: ${store['phone']}', styles: PosStyles(align: PosAlign.center));
    bytes += generator.hr();

    // Order Info
    bytes += generator.text('Invoice: ${saleData['invoiceNumber'] ?? '-'}');
    if (saleData['customerName'] != null && saleData['customerName'].toString().isNotEmpty) {
      bytes += generator.text('Pelanggan: ${saleData['customerName']}');
    }
    bytes += generator.text('Tanggal: ${DateFormat('dd-MM-yyyy HH:mm').format(DateTime.now())}');
    bytes += generator.text('Kasir  : ${saleData['cashierName'] ?? 'Admin'}');
    bytes += generator.hr();

    // Items
    final List items = saleData['items'] ?? [];
    for (var item in items) {
       bytes += generator.text(item['name'], styles: PosStyles(bold: true));
       bytes += generator.row([
        PosColumn(text: '${item['quantity']} x ${item['price']}', width: 8),
        PosColumn(text: (item['quantity'] * item['price']).toStringAsFixed(0), width: 4, styles: PosStyles(align: PosAlign.right)),
      ]);
    }
    bytes += generator.hr();

    // Totals
    bytes += generator.row([
      PosColumn(text: 'TOTAL', width: 6, styles: PosStyles(bold: true)),
      PosColumn(text: (saleData['totalAmount'] ?? 0).toStringAsFixed(0), width: 6, styles: PosStyles(align: PosAlign.right, bold: true)),
    ]);
    
    if (saleData['paymentMethod'] != null) {
      bytes += generator.text('Bayar (${saleData['paymentMethod']}): ${(saleData['cashReceived'] ?? saleData['totalAmount']).toStringAsFixed(0)}', styles: PosStyles(align: PosAlign.right));
      final change = (saleData['cashReceived'] ?? 0) - (saleData['totalAmount'] ?? 0);
      if (change > 0) {
        bytes += generator.text('Kembali: ${change.toStringAsFixed(0)}', styles: PosStyles(align: PosAlign.right));
      }
    }

    bytes += generator.feed(1);
    bytes += generator.text(store['footer']!, styles: PosStyles(align: PosAlign.center, fontType: PosFontType.fontB));
    bytes += generator.feed(3);
    bytes += generator.cut();

    return await PrintBluetoothThermal.writeBytes(bytes);
  }

  Future<bool> printStickerLabels(Map<String, dynamic> saleData) async {
    final prefs = await SharedPreferences.getInstance();
    final type = prefs.getString(_prefLabelPrinterType) ?? 'bluetooth';
    final address = prefs.getString(_prefLabelPrinterAddress);

    if (address == null) return false;

    List<int> bytes = [];
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm58, profile);

    final List items = saleData['items'] ?? [];
    final String invoice = saleData['invoiceNumber'] ?? '-';
    final String time = DateFormat('HH:mm').format(DateTime.now());

    for (var item in items) {
      final int qty = (item['quantity'] ?? 1).toInt();
      
      for (int i = 1; i <= qty; i++) {
        bytes += generator.text('--------------------------------', styles: PosStyles(align: PosAlign.center));
        bytes += generator.text('Order: $invoice', styles: PosStyles(align: PosAlign.center, fontType: PosFontType.fontB));
        bytes += generator.text(item['name'], styles: PosStyles(align: PosAlign.center, bold: true, height: PosTextSize.size2, width: PosTextSize.size2));
        
        final List? modifiers = item['modifiers'];
        if (modifiers != null && modifiers.isNotEmpty) {
          for (var mod in modifiers) {
            bytes += generator.text('- ${mod['optionName'] ?? mod['name']}', styles: PosStyles(align: PosAlign.left, fontType: PosFontType.fontB));
          }
        }
        
        bytes += generator.text('($i/$qty) - $time', styles: PosStyles(align: PosAlign.center, fontType: PosFontType.fontB));
        bytes += generator.text('--------------------------------', styles: PosStyles(align: PosAlign.center));
        bytes += generator.feed(2);
      }
    }
    
    bytes += generator.cut();

    if (type == 'wifi') {
      await _sendToWifiPrinter(address, bytes);
      return true;
    } else {
      // For bluetooth, try to connect if not already
      if (!_isConnected) {
        final r = await connectReceipt("Label Printer", address);
        if (!r) return false;
      }
      return await PrintBluetoothThermal.writeBytes(bytes);
    }
  }

  Future<void> generateReceiptPreview(Map<String, dynamic> saleData) async {
    final pdf = pw.Document();
    final store = await getStoreData();
    
    pw.MemoryImage? logoImage;
    if (store['logoPath']!.isNotEmpty) {
      final file = File(store['logoPath']!);
      if (await file.exists()) {
        logoImage = pw.MemoryImage(await file.readAsBytes());
      }
    }

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll57,
        margin: pw.EdgeInsets.all(4),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              if (logoImage != null)
                pw.Center(
                  child: pw.Image(logoImage, width: 40, height: 40),
                ),
              pw.Center(
                child: pw.Text(store['name']!, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 13)),
              ),
              pw.Center(child: pw.Text(store['address']!, style: pw.TextStyle(fontSize: 8))),
              pw.Center(child: pw.Text('Telp: ${store['phone']}', style: pw.TextStyle(fontSize: 8))),
              pw.Divider(thickness: 0.5),
              pw.Text('Invoice: ${saleData['invoiceNumber'] ?? '-'}', style: pw.TextStyle(fontSize: 8)),
              if (saleData['customerName'] != null && saleData['customerName'].toString().isNotEmpty)
                pw.Text('Pelanggan: ${saleData['customerName']}', style: pw.TextStyle(fontSize: 8)),
              pw.Text('Tanggal: ${DateFormat('dd-MM-yyyy HH:mm').format(DateTime.now())}', style: pw.TextStyle(fontSize: 8)),
              pw.Text('Kasir  : ${saleData['cashierName'] ?? 'Admin'}', style: pw.TextStyle(fontSize: 8)),
              pw.Divider(thickness: 0.5),
              ...((saleData['items'] as List?) ?? []).map((item) {
                return pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(item['name'], style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text('${item['quantity']} x ${item['price']}', style: pw.TextStyle(fontSize: 8)),
                        pw.Text((item['quantity'] * item['price']).toStringAsFixed(0), style: pw.TextStyle(fontSize: 8)),
                      ],
                    ),
                  ],
                );
              }).toList(),
              pw.Divider(thickness: 0.5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('TOTAL', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                  pw.Text((saleData['totalAmount'] ?? 0).toStringAsFixed(0), style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                ],
              ),
              if (saleData['paymentMethod'] != null) ...[
                pw.Align(
                  alignment: pw.Alignment.centerRight,
                  child: pw.Text('Bayar (${saleData['paymentMethod']}): ${(saleData['cashReceived'] ?? saleData['totalAmount']).toStringAsFixed(0)}', style: pw.TextStyle(fontSize: 8)),
                ),
                pw.Align(
                  alignment: pw.Alignment.centerRight,
                  child: pw.Text('Kembali: ${((saleData['cashReceived'] ?? 0) - (saleData['totalAmount'] ?? 0)).toStringAsFixed(0)}', style: pw.TextStyle(fontSize: 8)),
                ),
              ],
              pw.SizedBox(height: 10),
              pw.Center(child: pw.Text(store['footer']!, style: pw.TextStyle(fontSize: 7))),
              pw.Center(child: pw.Text('Powered by HRIS Absensi', style: pw.TextStyle(fontSize: 6))),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }
}
