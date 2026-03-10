import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class PdfHelper {
  static String _getMonthName(int month) {
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

  static String _formatCurrency(dynamic amount) {
    if (amount == null) return 'Rp 0';
    return 'Rp ${amount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')}';
  }

  static Future<void> generatePayrollPdf(dynamic payroll) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Padding(
            padding: const pw.EdgeInsets.all(40),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Center(
                  child: pw.Text(
                    'SLIP GAJI KARYAWAN',
                    style: pw.TextStyle(
                      fontSize: 24,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.Center(
                  child: pw.Text(
                    '${_getMonthName(payroll['month'])} ${payroll['year']}',
                    style: const pw.TextStyle(fontSize: 16),
                  ),
                ),
                pw.SizedBox(height: 32),
                pw.Divider(thickness: 1),
                pw.SizedBox(height: 16),
                pw.Text(
                  'Rincian Pembayaran:',
                  style: pw.TextStyle(
                    fontSize: 14,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 12),
                _pdfRow('Gaji Pokok', _formatCurrency(payroll['basicSalary'])),
                _pdfRow(
                  'Tunjangan',
                  '+ ${_formatCurrency(payroll['allowance'])}',
                ),
                _pdfRow('Total Hadir', '${payroll['attendanceCount']} Hari'),
                _pdfRow('Total Terlambat', '${payroll['lateCount']} Kali'),
                _pdfRow(
                  'Potongan Terlambat / Absen',
                  '- ${_formatCurrency(payroll['deductions'])}',
                ),
                if (payroll['sickLeaveDeduction'] != null &&
                    payroll['sickLeaveDeduction'] > 0)
                  _pdfRow(
                    'Potongan Sakit (Terhadap Tunjangan)',
                    '- ${_formatCurrency(payroll['sickLeaveDeduction'])}',
                  ),
                if (payroll['bpjsKesehatanDeduction'] != null &&
                    payroll['bpjsKesehatanDeduction'] > 0)
                  _pdfRow(
                    'BPJS Kesehatan',
                    '- ${_formatCurrency(payroll['bpjsKesehatanDeduction'])}',
                  ),
                if (payroll['bpjsKetenagakerjaanDeduction'] != null &&
                    payroll['bpjsKetenagakerjaanDeduction'] > 0)
                  _pdfRow(
                    'BPJS Jamsostek',
                    '- ${_formatCurrency(payroll['bpjsKetenagakerjaanDeduction'])}',
                  ),
                pw.SizedBox(height: 16),
                pw.Divider(thickness: 1),
                pw.SizedBox(height: 8),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'TOTAL GAJI BERSIH (THP)',
                      style: pw.TextStyle(
                        fontSize: 16,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Text(
                      _formatCurrency(payroll['netSalary']),
                      style: pw.TextStyle(
                        fontSize: 16,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                pw.Spacer(),
                pw.Divider(thickness: 0.5),
                pw.SizedBox(height: 8),
                pw.Text(
                  'Dokumen ini diterbitkan secara otomatis oleh aivola Digital SaaS System.',
                  style: const pw.TextStyle(
                    fontSize: 9,
                    color: PdfColors.grey700,
                  ),
                ),
                pw.Text(
                  'Dicetak pada: ${DateTime.now().toLocal().toString().split('.')[0]}',
                  style: const pw.TextStyle(
                    fontSize: 9,
                    color: PdfColors.grey700,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Slip_Gaji_${_getMonthName(payroll['month'])}_${payroll['year']}',
    );
  }

  static pw.Widget _pdfRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: const pw.TextStyle(fontSize: 11)),
          pw.Text(
            value,
            style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
