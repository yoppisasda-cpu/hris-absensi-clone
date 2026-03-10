import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ExamScreen extends StatefulWidget {
  final int examId;

  ExamScreen({required this.examId});

  @override
  _ExamScreenState createState() => _ExamScreenState();
}

class _ExamScreenState extends State<ExamScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  Map<String, dynamic>? _exam;
  Map<int, String> _answers = {};
  int _currentQuestionIndex = 0;
  bool _isFinished = false;
  double? _score;

  @override
  void initState() {
    super.initState();
    _loadExam();
  }

  Future<void> _loadExam() async {
    try {
      final data = await _apiService.getExamDetail(widget.examId);
      setState(() {
        _exam = data;
        _isLoading = false;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat detail ujian.')),
      );
      Navigator.pop(context);
    }
  }

  Future<void> _submitExam() async {
    setState(() => _isLoading = true);
    try {
      final result = await _apiService.submitExam(widget.examId, _answers);
      setState(() {
        _score = (result['score'] as num).toDouble();
        _isFinished = true;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengirim jawaban.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text('Ujian SOP')),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_isFinished) {
      return _buildResultScreen();
    }

    final questions = _exam!['questions'] as List<dynamic>;
    final currentQuestion = questions[_currentQuestionIndex];
    final options = currentQuestion['options'] as List<dynamic>;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ujian SOP', style: TextStyle(fontSize: 16)),
            Text('${_currentQuestionIndex + 1} dari ${questions.length} soal', style: TextStyle(fontSize: 12)),
          ],
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            LinearProgressIndicator(
              value: (_currentQuestionIndex + 1) / questions.length,
              backgroundColor: Colors.indigo[50],
              valueColor: AlwaysStoppedAnimation<Color>(Colors.indigo),
              borderRadius: BorderRadius.circular(10),
            ),
            SizedBox(height: 32),
            Text(
              currentQuestion['question'],
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.indigo[900]),
            ),
            SizedBox(height: 24),
            Expanded(
              child: ListView.builder(
                itemCount: options.length,
                itemBuilder: (context, index) {
                  final option = options[index];
                  bool isSelected = _answers[currentQuestion['id']] == option;

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _answers[currentQuestion['id']] = option;
                      });
                    },
                    child: Container(
                      margin: EdgeInsets.only(bottom: 16),
                      padding: EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.indigo[50] : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? Colors.indigo : Colors.grey[300]!,
                          width: 2,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isSelected ? Colors.indigo : Colors.grey[400]!,
                                width: 2,
                              ),
                              color: isSelected ? Colors.indigo : Colors.transparent,
                            ),
                            child: isSelected ? Icon(Icons.check, size: 16, color: Colors.white) : null,
                          ),
                          SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              option,
                              style: TextStyle(
                                fontSize: 16,
                                color: isSelected ? Colors.indigo[900] : Colors.black87,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_currentQuestionIndex > 0)
                  TextButton(
                    onPressed: () => setState(() => _currentQuestionIndex--),
                    child: Text('Sebelumnya'),
                  )
                else
                  SizedBox(),
                ElevatedButton(
                  onPressed: _answers[currentQuestion['id']] == null
                      ? null
                      : () {
                          if (_currentQuestionIndex < questions.length - 1) {
                            setState(() => _currentQuestionIndex++);
                          } else {
                            _submitExam();
                          }
                        },
                  child: Text(_currentQuestionIndex < questions.length - 1 ? 'Lanjut' : 'Selesai'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultScreen() {
    bool isPassed = (_score ?? 0) >= 70;

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isPassed ? Icons.emoji_events : Icons.sentiment_dissatisfied,
                size: 80,
                color: isPassed ? Colors.amber : Colors.red,
              ),
              SizedBox(height: 24),
              Text(
                isPassed ? 'Selamat!' : 'Tetap Semangat!',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Anda telah menyelesaikan ${_exam!['title']}',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              SizedBox(height: 32),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.indigo[50],
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Text('Skor Anda', style: TextStyle(color: Colors.indigo[900])),
                    Text(
                      '${_score?.toStringAsFixed(1)}%',
                      style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.indigo),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 48),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: Text('Kembali ke Learning Center'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                  minimumSize: Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
