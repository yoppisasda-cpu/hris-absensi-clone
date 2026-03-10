/**
 * AI Exam Question Generator (Phase 39)
 * Generates multiple-choice questions from text content (SOP)
 */

export async function generateQuestions(content: string) {
    // In a real scenario, this would use an LLM API.
    // Here we simulate it by splitting content into sentences and creating simple questions.
    
    const lines = content.split('\n').filter(l => l.trim().length > 10);
    const questions: { question: string, options: string[], correctAnswer: string }[] = [];

    // Simple heuristic: If a line describes a rule or a step, turn it into a question.
    for (const line of lines) {
        if (questions.length >= 5) break;

        const cleanLine = line.trim();
        
        // Simulating question generation from a statement
        let question = "";
        let correctAnswer = "";
        let distractors: string[] = [];

        if (cleanLine.toLowerCase().includes("suhu") || cleanLine.toLowerCase().includes("temperature")) {
            question = `Berapa parameter yang disebutkan terkait "${cleanLine.substring(0, 20)}..."?`;
            correctAnswer = cleanLine.match(/\d+/)?.[0] || "Sesuai SOP";
            distractors = ["50", "100", "0", "99"];
        } else if (cleanLine.toLowerCase().includes("bersih") || cleanLine.toLowerCase().includes("clean")) {
            question = `Berdasarkan SOP, apa yang harus dilakukan terkait kebersihan di bagian: "${cleanLine.substring(0, 30)}..."?`;
            correctAnswer = "Dibersihkan secara berkala";
            distractors = ["Dibiarkan saja", "Menunggu instruksi", "Seminggu sekali", "Hanya saat kotor"];
        } else {
            question = `Apa poin utama dari pernyataan berikut: "${cleanLine.substring(0, 40)}..."?`;
            correctAnswer = "Langkah wajib sesuai SOP";
            distractors = ["Opsional saja", "Saran manajer", "Tidak penting", "Hanya untuk tamu"];
        }

        if (question) {
            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random()).slice(0, 4);
            // Ensure correct answer is in options
            if (!options.includes(correctAnswer)) options[0] = correctAnswer;
            
            questions.push({
                question,
                options: options.sort(() => 0.5 - Math.random()),
                correctAnswer
            });
        }
    }

    // Fallback if no specific patterns found
    if (questions.length === 0) {
        questions.push({
            question: "Apa tujuan utama dari dokumen ini?",
            options: ["Standar Operasional", "Hiburan", "Cerita Pendek", "Berita"],
            correctAnswer: "Standar Operasional"
        });
    }

    return questions;
}
