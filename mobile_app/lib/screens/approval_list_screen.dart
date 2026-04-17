import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';

class ApprovalListScreen extends StatefulWidget {
  @override
  _ApprovalListScreenState createState() => _ApprovalListScreenState();
}

class _ApprovalListScreenState extends State<ApprovalListScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _leaves = [];
  List<dynamic> _overtimes = [];

  @override
  void initState() {
    super.initState();
    _fetchApprovals();
  }

  Future<void> _fetchApprovals() async {
    setState(() => _isLoading = true);
    try {
      final data = await _apiService.getPendingApprovals();
      setState(() {
        _leaves = data['leaves'] ?? [];
        _overtimes = data['overtimes'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleApproval(String type, int id, String status) async {
    try {
      if (type == 'LEAVE') {
        await _apiService.updateLeaveStatus(id, status);
      } else {
        await _apiService.updateOvertimeStatus(id, status);
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Berhasil ${status == 'APPROVED' ? 'menyetujui' : 'menolak'} pengajuan.'),
          backgroundColor: Colors.green,
        ),
      );
      _fetchApprovals();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        appBar: AppBar(
          title: Text('Persetujuan Pending', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey[900])),
          backgroundColor: Colors.white,
          elevation: 0,
          leading: BackButton(color: Colors.blueGrey[900]),
          bottom: TabBar(
            labelColor: Colors.blue[600],
            unselectedLabelColor: Colors.blueGrey[400],
            indicatorColor: Colors.blue[600],
            tabs: [
              Tab(text: 'Cuti (${_leaves.length})'),
              Tab(text: 'Lembur (${_overtimes.length})'),
            ],
          ),
        ),
        body: _isLoading
            ? Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [
                  _buildList('LEAVE', _leaves),
                  _buildList('OVERTIME', _overtimes),
                ],
              ),
      ),
    );
  }

  Widget _buildList(String type, List<dynamic> items) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 64, color: Colors.blueGrey[200]),
            SizedBox(height: 16),
            Text('Tidak ada pengajuan pending', style: TextStyle(color: Colors.blueGrey[400])),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final bool isLeave = type == 'LEAVE';
        
        return Container(
          margin: EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: isLeave ? Colors.orange[50] : Colors.blue[50],
                      child: Icon(
                        isLeave ? Icons.calendar_today : Icons.timer,
                        color: isLeave ? Colors.orange[600] : Colors.blue[600],
                        size: 20,
                      ),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item['user']['name'] ?? 'Karyawan',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.blueGrey[900]),
                          ),
                          Text(
                            isLeave 
                              ? '${DateFormat('dd MMM').format(DateTime.parse(item['startDate']))} - ${DateFormat('dd MMM').format(DateTime.parse(item['endDate']))}'
                              : 'Lembur: ${DateFormat('dd MMM yyyy').format(DateTime.parse(item['date']))}',
                            style: TextStyle(color: Colors.blueGrey[500], fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Divider(height: 1),
              Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Alasan:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey[400]),
                    ),
                    SizedBox(height: 4),
                    Text(
                      item['reason'] ?? '-',
                      style: TextStyle(color: Colors.blueGrey[700]),
                    ),
                    if (!isLeave) ...[
                      SizedBox(height: 8),
                      Text(
                        'Durasi: ${item['durationHours']} Jam',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[700], fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
              Padding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _handleApproval(type, item['id'], 'REJECTED'),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: Colors.red[200]!),
                          foregroundColor: Colors.red[600],
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: Text('Tolak', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _handleApproval(type, item['id'], 'APPROVED'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[600],
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: Text('Setujui', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
