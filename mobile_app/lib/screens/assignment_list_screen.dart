import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'assignment_detail_screen.dart';
import 'package:intl/intl.dart';

class AssignmentListScreen extends StatefulWidget {
  @override
  _AssignmentListScreenState createState() => _AssignmentListScreenState();
}

class _AssignmentListScreenState extends State<AssignmentListScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _assignments = [];
  String _filter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchAssignments();
  }

  Future<void> _fetchAssignments() async {
    setState(() => _isLoading = true);
    try {
      final data = await _apiService.getAssignments();
      setState(() {
        _assignments = data;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat penugasan: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  List<dynamic> get _filteredAssignments {
    if (_filter == 'ALL') return _assignments;
    return _assignments.where((a) => a['status'] == _filter).toList();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'COMPLETED': return Colors.teal;
      case 'IN_PROGRESS': return Colors.blue;
      case 'PENDING': return Colors.orange;
      case 'REJECTED': return Colors.red;
      default: return Colors.grey;
    }
  }

  void _showCreateDialog() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String priority = 'MEDIUM';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(25))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 20, left: 24, right: 24
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Ajukan Penugasan Mandiri', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              SizedBox(height: 8),
              Text('Pastikan tugas relevan dengan pekerjaan Anda.', style: TextStyle(color: Colors.grey, fontSize: 13)),
              SizedBox(height: 20),
              TextField(
                controller: titleController,
                decoration: InputDecoration(
                  labelText: 'Judul Tugas',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: Icon(Icons.title),
                ),
              ),
              SizedBox(height: 16),
              TextField(
                controller: descController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Deskripsi / Tujuan',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: Icon(Icons.description),
                ),
              ),
              SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: priority,
                items: ['LOW', 'MEDIUM', 'HIGH'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                onChanged: (val) => setModalState(() => priority = val!),
                decoration: InputDecoration(
                  labelText: 'Prioritas',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: Icon(Icons.priority_high),
                ),
              ),
              SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    if (titleController.text.isEmpty) return;
                    try {
                      await _apiService.createAssignment({
                        'title': titleController.text,
                        'description': descController.text,
                        'priority': priority
                      });
                      Navigator.pop(context);
                      _fetchAssignments();
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Pengajuan terkirim! Menunggu approval.')));
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal mengirim pengajuan')));
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal[700],
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text('KIRIM PENGAJUAN', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
              SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Daftar Penugasan', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        actions: [
          IconButton(icon: Icon(Icons.refresh), onPressed: _fetchAssignments),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterChip('ALL', 'Semua'),
                _buildFilterChip('PENDING', 'Pending'),
                _buildFilterChip('IN_PROGRESS', 'Berjalan'),
                _buildFilterChip('COMPLETED', 'Selesai'),
              ],
            ),
          ),

          Expanded(
            child: _isLoading 
              ? Center(child: CircularProgressIndicator())
              : _filteredAssignments.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_late, size: 64, color: Colors.grey[300]),
                          SizedBox(height: 16),
                          Text('Belum ada penugasan.', style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.w500)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchAssignments,
                      child: ListView.builder(
                        itemCount: _filteredAssignments.length,
                        padding: EdgeInsets.all(16),
                        itemBuilder: (context, index) {
                          final task = _filteredAssignments[index];
                          final bool isPriority = task['priority'] == 'HIGH';
                          final dueDate = task['dueDate'] != null 
                              ? DateFormat('dd MMM yyyy').format(DateTime.parse(task['dueDate']))
                              : 'No deadline';

                          return Card(
                            margin: EdgeInsets.only(bottom: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 2,
                            shadowColor: Colors.black12,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () async {
                                final result = await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => AssignmentDetailScreen(assignment: task)),
                                );
                                if (result == true) _fetchAssignments();
                              },
                              child: Padding(
                                padding: EdgeInsets.all(20),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Container(
                                          padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: _getStatusColor(task['status']).withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: _getStatusColor(task['status']).withOpacity(0.3))
                                          ),
                                          child: Text(
                                            task['status'],
                                            style: TextStyle(
                                              color: _getStatusColor(task['status']),
                                              fontWeight: FontWeight.bold,
                                              fontSize: 10
                                            ),
                                          ),
                                        ),
                                        if (isPriority)
                                          Container(
                                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(4)),
                                            child: Text('HIGH PRIORITY', style: TextStyle(color: Colors.red, fontSize: 8, fontWeight: FontWeight.w900)),
                                          )
                                      ],
                                    ),
                                    SizedBox(height: 12),
                                    Text(
                                      task['title'],
                                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                    ),
                                    SizedBox(height: 6),
                                    Text(
                                      task['description'] ?? 'Tidak ada deskripsi.',
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                                    ),
                                    SizedBox(height: 16),
                                    Divider(height: 1),
                                    SizedBox(height: 12),
                                    Row(
                                      children: [
                                        Icon(Icons.calendar_today, size: 14, color: Colors.blueGrey),
                                        SizedBox(width: 6),
                                        Text('Deadline: $dueDate', style: TextStyle(fontSize: 12, color: Colors.blueGrey)),
                                        Spacer(),
                                        Text('Detail', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 13)),
                                        Icon(Icons.chevron_right, size: 18, color: Colors.blue),
                                      ],
                                    )
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        backgroundColor: Colors.teal[700],
        child: Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildFilterChip(String value, String label) {
    bool isSelected = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          if (selected) {
            setState(() => _filter = value);
          }
        },
        selectedColor: Colors.teal[100],
        labelStyle: TextStyle(
          color: isSelected ? Colors.teal[900] : Colors.grey[700],
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal
        ),
      ),
    );
  }
}
