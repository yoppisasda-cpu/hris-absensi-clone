import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'exam_screen.dart';
import 'material_detail_screen.dart';

class LearningCenterScreen extends StatefulWidget {
  @override
  _LearningCenterScreenState createState() => _LearningCenterScreenState();
}

class _LearningCenterScreenState extends State<LearningCenterScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _objectives = [];
  List<dynamic> _recommendations = [];
  List<dynamic> _reviews = [];
  List<dynamic> _exams = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _apiService.getLearningObjectives(),
        _apiService.getLearningRecommendations(),
        _apiService.getKnowledgeReviews(),
        _apiService.getExams(),
      ]);
      setState(() {
        _objectives = results[0];
        _recommendations = results[1];
        _reviews = results[2];
        _exams = results[3];
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil data L&D.')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _addObjective(String title, String desc, String cat) async {
    try {
      await _apiService.addLearningObjective(title, desc, cat, null);
      _loadData();
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menambah target.')),
      );
    }
  }

  void _updateProgress(int id, double current) async {
    double newVal = current + 10;
    if (newVal > 100) newVal = 100;
    String status = newVal == 100 ? 'COMPLETED' : 'IN_PROGRESS';
    
    try {
      await _apiService.updateObjectiveProgress(id, newVal, status);
      _loadData();
    } catch (e) {
       ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal update progress.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Learning Center', style: TextStyle(color: Colors.black)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.black),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadData,
          )
        ],
      ),
      body: _isLoading 
        ? Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSummaryCard(),
                SizedBox(height: 24),
                _buildSectionHeader('AI Skill Recommendations', Icons.auto_awesome),
                SizedBox(height: 12),
                _buildRecommendations(),
                SizedBox(height: 24),
                _buildSectionHeader('Your Learning Objectives', Icons.track_changes),
                SizedBox(height: 12),
                _buildObjectivesList(),
                SizedBox(height: 24),
                _buildSectionHeader('Ujian & Verifikasi SOP (AI)', Icons.quiz),
                SizedBox(height: 12),
                _buildExamsList(),
                SizedBox(height: 24),
                _buildSectionHeader('Knowledge Reviews', Icons.assignment_turned_in),
                SizedBox(height: 12),
                _buildReviewsList(),
              ],
            ),
          ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        child: Icon(Icons.add),
        backgroundColor: Colors.indigo,
      ),
    );
  }

  Widget _buildSummaryCard() {
    int completed = _objectives.where((o) => o['status'] == 'COMPLETED').length;
    double avgProgress = _objectives.isEmpty ? 0 : 
      _objectives.map((o) => (o['progress'] as num).toDouble()).reduce((a, b) => a + b) / _objectives.length;

    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [Colors.indigo[700]!, Colors.indigo[400]!]),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.indigo.withOpacity(0.3), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Overall Progress', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14)),
                  Text('${avgProgress.toStringAsFixed(1)}%', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                ],
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                child: Text('$completed / ${_objectives.length} Done', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
              )
            ],
          ),
          SizedBox(height: 20),
          LinearProgressIndicator(
            value: avgProgress / 100,
            backgroundColor: Colors.white.withOpacity(0.3),
            valueColor: AlwaysStoppedAnimation(Colors.white),
            minHeight: 8,
            borderRadius: BorderRadius.circular(4),
          )
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.indigo),
        SizedBox(width: 8),
        Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blueGrey[900])),
      ],
    );
  }

  Widget _buildRecommendations() {
    if (_recommendations.isEmpty) return Text('No recommendations available.');
    
    return Container(
      height: 120,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _recommendations.length,
        separatorBuilder: (context, index) => SizedBox(width: 12),
        itemBuilder: (context, index) {
          final rec = _recommendations[index];
          return Container(
            width: 200,
            padding: EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.indigo[50],
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.indigo[100]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(rec['category'] ?? '', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.indigo)),
                SizedBox(height: 4),
                Text(rec['title'] ?? '', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold), maxLines: 2, overflow: TextOverflow.ellipsis),
                Spacer(),
                GestureDetector(
                  onTap: () => _addObjective(rec['title'], rec['description'], rec['category']),
                  child: Text('+ Add to Targets', style: TextStyle(fontSize: 12, color: Colors.indigo, fontWeight: FontWeight.bold)),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildObjectivesList() {
    if (_objectives.isEmpty) {
      return Container(
        padding: EdgeInsets.all(20),
        alignment: Alignment.center,
        child: Text('Belum ada target belajar.', style: TextStyle(color: Colors.grey)),
      );
    }

    return Column(
      children: _objectives.map((o) => _buildObjectiveItem(o)).toList(),
    );
  }

  Widget _buildExamsList() {
    if (_exams.isEmpty) {
      return Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.amber[50], borderRadius: BorderRadius.circular(12)),
        child: Row(
          children: [
            Icon(Icons.info_outline, color: Colors.amber[800], size: 20),
            SizedBox(width: 12),
            Expanded(child: Text('Belum ada ujian SOP yang tersedia.', style: TextStyle(fontSize: 12, color: Colors.amber[900]))),
          ],
        ),
      );
    }

    return Column(
      children: _exams.map((exam) => Container(
        margin: EdgeInsets.only(bottom: 12),
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.indigo[100]!),
          boxShadow: [BoxShadow(color: Colors.indigo.withOpacity(0.05), blurRadius: 10, offset: Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.indigo[50], shape: BoxShape.circle),
              child: Icon(Icons.assignment, color: Colors.indigo, size: 20),
            ),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(exam['title'], style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text(exam['material']?['category'] ?? 'SOP', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context, 
                MaterialPageRoute(builder: (_) => ExamScreen(examId: exam['id']))
              ).then((_) => _loadData()),
              child: Text('Mulai'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.indigo,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                padding: EdgeInsets.symmetric(horizontal: 16),
                elevation: 0,
              ),
            )
          ],
        ),
      )).toList(),
    );
  }

  Widget _buildObjectiveItem(dynamic obj) {
    double progress = (obj['progress'] as num).toDouble();
    bool isDone = obj['status'] == 'COMPLETED';

    return Container(
      margin: EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[100]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: EdgeInsets.all(8),
                decoration: BoxDecoration(color: isDone ? Colors.green[50] : Colors.blue[50], shape: BoxShape.circle),
                child: Icon(isDone ? Icons.check : Icons.rocket_launch, size: 16, color: isDone ? Colors.green : Colors.blue),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(obj['title'], style: TextStyle(fontWeight: FontWeight.bold, decoration: isDone ? TextDecoration.lineThrough : null)),
                    Text(obj['category'] ?? 'General', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
              if (!isDone && obj['materialId'] == null)
                IconButton(
                  icon: Icon(Icons.add_circle_outline, color: Colors.indigo),
                  onPressed: () => _updateProgress(obj['id'], progress),
                )
            ],
          ),
          if (obj['materialId'] != null) ...[
            SizedBox(height: 12),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.indigo[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.indigo[100]!),
              ),
              child: InkWell(
                onTap: () {
                   if (obj['material'] != null) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => MaterialDetailScreen(material: obj['material']))
                      );
                   }
                },
                borderRadius: BorderRadius.circular(12),
                child: Row(
                  children: [
                    Icon(Icons.book, size: 16, color: Colors.indigo),
                    SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Terhubung ke SOP: ${obj['material']?['title'] ?? 'Materi'}',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.indigo[700]),
                          ),
                          Text('Klik untuk baca materi', style: TextStyle(fontSize: 9, color: Colors.indigo[300])),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right, size: 16, color: Colors.indigo[300]),
                  ],
                ),
              ),
            ),
          ],
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: LinearProgressIndicator(
                  value: progress / 100,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation(isDone ? Colors.green : Colors.blue),
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              SizedBox(width: 12),
              Text('${progress.toInt()}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildReviewsList() {
    if (_reviews.isEmpty) return Text('Belum ada riwayat review.', style: TextStyle(color: Colors.grey, fontSize: 13));

    return Column(
      children: _reviews.map((r) => ListTile(
        contentPadding: EdgeInsets.zero,
        leading: CircleAvatar(backgroundColor: Colors.orange[50], child: Icon(Icons.star, color: Colors.orange, size: 20)),
        title: Text(r['title'], style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        subtitle: Text(r['comments'] ?? '', style: TextStyle(fontSize: 12)),
        trailing: Text(r['score']?.toString() ?? '-', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.orange[800])),
      )).toList(),
    );
  }

  void _showAddDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String category = 'Technical';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Add Learning Objective', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(height: 20),
            TextField(controller: titleCtrl, decoration: InputDecoration(labelText: 'Title', border: OutlineInputBorder())),
            SizedBox(height: 12),
            TextField(controller: descCtrl, decoration: InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => _addObjective(titleCtrl.text, descCtrl.text, category),
              child: Text('Create Target'),
              style: ElevatedButton.styleFrom(minimumSize: Size(double.infinity, 50), backgroundColor: Colors.indigo, foregroundColor: Colors.white),
            ),
            SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
