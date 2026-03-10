import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';

class LeaveRequestScreen extends StatefulWidget {
  @override
  _LeaveRequestScreenState createState() => _LeaveRequestScreenState();
}

class _LeaveRequestScreenState extends State<LeaveRequestScreen> {
  final ApiService _apiService = ApiService();
  final _reasonController = TextEditingController();
  DateTime? _startDate;
  DateTime? _endDate;
  bool _isLoading = false;
  int _remainingQuota = 0;
  bool _isLoadingQuota = true;
  String _selectedLeaveType = 'ANNUAL'; // 'ANNUAL' or 'SICK'

  @override
  void initState() {
    super.initState();
    _fetchQuota();
  }

  Future<void> _fetchQuota() async {
    try {
      final data = await _apiService.getLeaveQuota();
      if (mounted) {
        setState(() {
          _remainingQuota = data['remaining'];
          _isLoadingQuota = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingQuota = false);
      }
    }
  }

  Future<void> _selectDate(BuildContext context, bool isStartDate) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(Duration(days: 365)),
      helpText: isStartDate ? 'Pilih Tanggal Mulai' : 'Pilih Tanggal Selesai',
    );
    if (picked != null) {
      setState(() {
        if (isStartDate) {
          _startDate = picked;
          if (_endDate != null && _endDate!.isBefore(_startDate!)) {
            _endDate = null;
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (_startDate == null ||
        _endDate == null ||
        _reasonController.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Harap kengkapi semua kolom!')));
      return;
    }

    if (_endDate!.isBefore(_startDate!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Tanggal selesai tidak boleh sebelum tanggal mulai!'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final success = await _apiService.submitLeaveRequest(
        startDate: _startDate!.toIso8601String(),
        endDate: _endDate!.toIso8601String(),
        reason: _reasonController.text,
        type: _selectedLeaveType,
      );

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Pengajuan cuti berhasil dikirim!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengirim pengajuan: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Ajukan Cuti',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info Header
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.amber[800]),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Pastikan Anda sudah berdiskusi dengan atasan sebelum mengajukan cuti.',
                      style: TextStyle(color: Colors.amber[900], fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 16),

            // Kuota Cuti Card
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_month, color: Colors.blue[800]),
                  SizedBox(width: 12),
                  Expanded(
                    child: _isLoadingQuota
                        ? Text(
                            'Memuat kuota cuti...',
                            style: TextStyle(color: Colors.blue[900]),
                          )
                        : Text(
                            'Sisa Jatah Cuti Anda Tahun Ini: $_remainingQuota Hari',
                            style: TextStyle(
                              color: Colors.blue[900],
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                  ),
                ],
              ),
            ),
            SizedBox(height: 24),

            // Tipe Cuti
            Text(
              'Tipe Cuti / Izin',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            SizedBox(height: 12),
            Container(
              padding: EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[300]!),
                color: Colors.white,
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedLeaveType,
                  isExpanded: true,
                  items: [
                    DropdownMenuItem(
                      value: 'ANNUAL',
                      child: Text('Cuti Tahunan (Memotong Kuota Tahunan)'),
                    ),
                    DropdownMenuItem(
                      value: 'SICK',
                      child: Text(
                        'Izin Sakit (Wajib upload surat dokter via HR)',
                      ),
                    ),
                  ],
                  onChanged: (value) {
                    setState(() {
                      if (value != null) _selectedLeaveType = value;
                    });
                  },
                ),
              ),
            ),
            SizedBox(height: 24),

            // Date Selection
            Text(
              'Rentang Tanggal',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _selectDate(context, true),
                    icon: Icon(Icons.calendar_today, size: 18),
                    label: Text(
                      _startDate == null
                          ? 'Mulai'
                          : DateFormat('dd/MM/yy').format(_startDate!),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Icon(Icons.arrow_forward, color: Colors.grey),
                ),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _selectDate(context, false),
                    icon: Icon(Icons.calendar_today, size: 18),
                    label: Text(
                      _endDate == null
                          ? 'Selesai'
                          : DateFormat('dd/MM/yy').format(_endDate!),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      side: BorderSide(
                        color: _endDate == null
                            ? Colors.grey[300]!
                            : Colors.blue,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 32),

            // Reason Input
            Text(
              'Alasan Cuti',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            SizedBox(height: 12),
            TextField(
              controller: _reasonController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Misal: Urusan keluarga, Keperluan mendesak, dll.',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey[50],
              ),
            ),

            if (_selectedLeaveType == 'SICK') ...[
              SizedBox(height: 12),
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red[200]!),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      color: Colors.red[700],
                      size: 20,
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Izin Sakit dapat memotong Tunjangan Transport / Makan Anda per hari sesuai kebijakan perusahaan.',
                        style: TextStyle(color: Colors.red[900], fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            SizedBox(height: 48),

            // Submit Button
            ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              child: _isLoading
                  ? SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      'KIRIM PENGAJUAN',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue[600],
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }
}
