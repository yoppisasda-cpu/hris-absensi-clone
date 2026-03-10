import 'package:flutter/material.dart';
import '../utils/pdf_helper.dart';

class PayrollDetailScreen extends StatelessWidget {
  final dynamic payroll;

  PayrollDetailScreen({required this.payroll});

  String _getMonthName(int month) {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return months[month - 1];
  }

  String _formatCurrency(dynamic amount) {
    if (amount == null) return 'Rp 0';
    return 'Rp ${amount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue[600],
      appBar: AppBar(
        title: Text('Rincian Slip Gaji', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: Icon(Icons.picture_as_pdf),
            onPressed: () => PdfHelper.generatePayrollPdf(payroll),
            tooltip: 'Download PDF',
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Container(
                width: double.infinity,
                padding: EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 10,
                      offset: Offset(0, 5),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      'SLIP GAJI DIGITAL',
                      style: TextStyle(
                        letterSpacing: 2,
                        color: Colors.grey,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      '${_getMonthName(payroll['month'])} ${payroll['year']}',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 32),
                    _buildRow(
                      'Gaji Pokok',
                      _formatCurrency(payroll['basicSalary']),
                    ),
                    if (payroll['allowance'] != null &&
                        payroll['allowance'] > 0)
                      _buildRow(
                        'Tunjangan',
                        '+ ${_formatCurrency(payroll['allowance'])}',
                      ),
                    if (payroll['overtimePay'] != null &&
                        payroll['overtimePay'] > 0)
                      _buildRow(
                        'Lembur (${payroll['overtimeHours']} Jam)',
                        '+ ${_formatCurrency(payroll['overtimePay'])}',
                      ),
                    if (payroll['reimbursementPay'] != null &&
                        payroll['reimbursementPay'] > 0)
                      _buildRow(
                        'Reimbursement',
                        '+ ${_formatCurrency(payroll['reimbursementPay'])}',
                      ),

                    // Detil Bonus (THR / Bonus Proyek) - Loop individual entries
                    if (payroll['bonusDetails'] != null &&
                        (payroll['bonusDetails'] as List).isNotEmpty)
                      ...(payroll['bonusDetails'] as List)
                          .map(
                            (b) => _buildRow(
                              '${b['description'] ?? b['type']}',
                              '+ ${_formatCurrency(b['amount'])}',
                              isValueGreen: true,
                            ),
                          )
                          .toList()
                    else if (payroll['bonusPay'] != null &&
                        payroll['bonusPay'] > 0)
                      _buildRow(
                        'Bonus & THR',
                        '+ ${_formatCurrency(payroll['bonusPay'])}',
                        isValueGreen: true,
                      ),

                    SizedBox(height: 16),
                    _buildRow(
                      'Total Hadir',
                      '${payroll['attendanceCount'] ?? 0} Hari',
                    ),
                    _buildRow(
                      'Keterlambatan',
                      '${payroll['lateCount'] ?? 0} Kali',
                      isValueRed: (payroll['lateCount'] ?? 0) > 0,
                    ),
                    if (payroll['sickLeaveDeduction'] != null &&
                        payroll['sickLeaveDeduction'] > 0)
                      _buildRow(
                        'Potongan Sakit',
                        '- ${_formatCurrency(payroll['sickLeaveDeduction'])}',
                        isValueRed: true,
                      ),
                    if (payroll['bpjsKesehatanDeduction'] != null &&
                        payroll['bpjsKesehatanDeduction'] > 0)
                      _buildRow(
                        'BPJS Kesehatan',
                        '- ${_formatCurrency(payroll['bpjsKesehatanDeduction'])}',
                        isValueRed: true,
                      ),
                    if (payroll['bpjsKetenagakerjaanDeduction'] != null &&
                        payroll['bpjsKetenagakerjaanDeduction'] > 0)
                      _buildRow(
                        'BPJS Jamsostek',
                        '- ${_formatCurrency(payroll['bpjsKetenagakerjaanDeduction'])}',
                        isValueRed: true,
                      ),
                    if (payroll['loanDeduction'] != null &&
                        payroll['loanDeduction'] > 0)
                      _buildRow(
                        'Potongan Kasbon',
                        '- ${_formatCurrency(payroll['loanDeduction'])}',
                        isValueRed: true,
                      ),
                    Divider(height: 48),
                    _buildRow(
                      'Total Potongan Absen/Telat',
                      '- ${_formatCurrency(payroll['deductions'])}',
                      isValueRed: true,
                    ),
                    SizedBox(height: 24),
                    Container(
                      padding: EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue[50],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Gaji Bersih',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                                color: Colors.blue[900],
                              ),
                            ),
                          ),
                          Flexible(
                            child: Text(
                              _formatCurrency(payroll['netSalary']),
                              textAlign: TextAlign.right,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                                color: Colors.blue[900],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 40),
                    Image.network(
                      'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PAYROLL-${payroll['id']}',
                      height: 80,
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Verified by HRIS SaaS',
                      style: TextStyle(fontSize: 10, color: Colors.grey),
                    ),
                    SizedBox(height: 16),
                  ],
                ),
              ),
            ),
            SizedBox(height: 40),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Text(
                'Slip gaji ini sah dan diterbitkan secara otomatis oleh sistem penggajian perusahaan.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ),
            SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(
    String label,
    String value, {
    bool isValueRed = false,
    bool isValueGreen = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: Colors.grey[700]),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              softWrap: false,
            ),
          ),
          SizedBox(width: 8),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: isValueRed
                  ? Colors.red[700]
                  : (isValueGreen ? Colors.green[700] : Colors.black87),
            ),
          ),
        ],
      ),
    );
  }
}
