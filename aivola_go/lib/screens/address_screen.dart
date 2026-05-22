import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/branding_provider.dart';
import '../services/api_service.dart';

class AddressScreen extends StatefulWidget {
  @override
  _AddressScreenState createState() => _AddressScreenState();
}

class _AddressScreenState extends State<AddressScreen> {
  List<dynamic> _addresses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAddresses();
  }

  Future<void> _fetchAddresses() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('/customers/me/addresses');
      if (res.statusCode == 200) {
        setState(() => _addresses = res.data);
      }
    } catch (e) {
      print("Error fetching addresses: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brandingProvider = Provider.of<BrandingProvider>(context);
    final primaryColor = brandingProvider.primaryColor;

    return Scaffold(
      backgroundColor: Color(0xFF1E293B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text("Alamat Saya", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryColor))
          : _addresses.isEmpty
              ? _buildEmptyState(primaryColor)
              : _buildAddressList(primaryColor),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddressForm(primaryColor),
        backgroundColor: primaryColor,
        icon: Icon(Icons.add),
        label: Text("Tambah Alamat", style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildEmptyState(Color primaryColor) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: EdgeInsets.all(30),
            decoration: BoxDecoration(color: primaryColor.withOpacity(0.05), shape: BoxShape.circle),
            child: Icon(Icons.location_off_rounded, size: 80, color: primaryColor.withOpacity(0.5)),
          ),
          SizedBox(height: 24),
          Text("Belum ada alamat", style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text("Tambahkan alamat pengiriman Anda sekarang", style: TextStyle(color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }

  Widget _buildAddressList(Color primaryColor) {
    return ListView.builder(
      padding: EdgeInsets.all(20),
      itemCount: _addresses.length,
      itemBuilder: (context, index) {
        final addr = _addresses[index];
        return Container(
          margin: EdgeInsets.only(bottom: 15),
          padding: EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: addr['isDefault'] ? primaryColor : Colors.white.withOpacity(0.05)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.home_outlined, color: primaryColor, size: 18),
                      SizedBox(width: 8),
                      Text(addr['label'] ?? "Alamat", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
                      if (addr['isDefault']) ...[
                        SizedBox(width: 10),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: primaryColor.withOpacity(0.2), borderRadius: BorderRadius.circular(5)),
                          child: Text("Utama", style: TextStyle(color: primaryColor, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                  PopupMenuButton(
                    icon: Icon(Icons.more_vert, color: Color(0xFF64748B), size: 20),
                    color: Color(0xFF334155),
                    itemBuilder: (context) => [
                      PopupMenuItem(child: Text("Edit", style: TextStyle(color: Colors.white)), value: 'edit'),
                      PopupMenuItem(child: Text("Hapus", style: TextStyle(color: Colors.redAccent)), value: 'delete'),
                    ],
                    onSelected: (val) {
                      if (val == 'edit') _showAddressForm(primaryColor, existing: addr);
                      if (val == 'delete') _deleteAddress(addr['id']);
                    },
                  )
                ],
              ),
              SizedBox(height: 10),
              Text(addr['recipientName'] ?? "", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              Text(addr['phoneNumber'] ?? "", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
              SizedBox(height: 8),
              Text(addr['fullAddress'] ?? "", style: TextStyle(color: Colors.white70, fontSize: 13)),
            ],
          ),
        );
      },
    );
  }

  void _showAddressForm(Color primaryColor, {dynamic existing}) {
    final _labelCtrl = TextEditingController(text: existing?['label'] ?? "");
    final _nameCtrl = TextEditingController(text: existing?['recipientName'] ?? "");
    final _phoneCtrl = TextEditingController(text: existing?['phoneNumber'] ?? "");
    final _addrCtrl = TextEditingController(text: existing?['fullAddress'] ?? "");
    bool _isDef = existing?['isDefault'] ?? false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(25))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 25, right: 25, top: 25),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(existing == null ? "Tambah Alamat Baru" : "Edit Alamat", style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                SizedBox(height: 25),
                _buildField("Label Alamat (Rumah/Kantor)", _labelCtrl),
                _buildField("Nama Penerima", _nameCtrl),
                _buildField("Nomor Telepon", _phoneCtrl),
                _buildField("Alamat Lengkap", _addrCtrl, maxLines: 3),
                Row(
                  children: [
                    Checkbox(
                      value: _isDef,
                      onChanged: (v) => setModalState(() => _isDef = v!),
                      activeColor: primaryColor,
                    ),
                    Text("Jadikan Alamat Utama", style: TextStyle(color: Colors.white70, fontSize: 14)),
                  ],
                ),
                SizedBox(height: 25),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => _saveAddress(existing?['id'], _labelCtrl.text, _nameCtrl.text, _phoneCtrl.text, _addrCtrl.text, _isDef),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      padding: EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                    ),
                    child: Text("Simpan Alamat", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, {int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
          SizedBox(height: 8),
          TextField(
            controller: ctrl,
            maxLines: maxLines,
            style: TextStyle(color: Colors.white),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white.withOpacity(0.05),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: EdgeInsets.symmetric(horizontal: 15, vertical: 15),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveAddress(int? id, String label, String name, String phone, String addr, bool isDefault) async {
    if (label.isEmpty || name.isEmpty || phone.isEmpty || addr.isEmpty) return;

    final body = {
      "label": label,
      "recipientName": name,
      "phoneNumber": phone,
      "fullAddress": addr,
      "isDefault": isDefault
    };

    try {
      final res = id == null
          ? await ApiService.post('/customers/me/addresses', body)
          : await ApiService.patch('/customers/me/addresses/$id', body);

      if (res.statusCode == 200) {
        Navigator.pop(context);
        _fetchAddresses();
      }
    } catch (e) {
      print("Error saving address: $e");
    }
  }

  Future<void> _deleteAddress(int id) async {
    try {
      final res = await ApiService.delete('/customers/me/addresses/$id');
      if (res.statusCode == 200) _fetchAddresses();
    } catch (e) {
      print("Error deleting address: $e");
    }
  }
}
