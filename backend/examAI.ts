/**
 * AI Exam Question Generator (Phase 39)
 * Generates multiple-choice questions from text content (SOP)
 */

export async function generateQuestions(content: string, count: number = 5) {
    // Enhanced Simulation of an LLM API (Phase 39 Optimization)
    // We break the SOP into logical units and generate diverse questions.
    
    const lines = content.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 15); // Take significant lines

    const questions: { question: string, options: string[], correctAnswer: string }[] = [];
    const usedSentences = new Set<number>();

    // Diverse Question Templates
    const templates = [
        {
            regex: /(wajib|harus|perlu)\s+([\w\s]+?)(?=\s+untuk|\s+agar|\s+biar|\.|$)/i,
            gen: (match: string[]) => ({
                question: `Berdasarkan SOP, apa tindakan yang ${match[1].toLowerCase()} dilakukan terkait "${match[2].trim()}"?`,
                correct: `Melakukan ${match[2].trim()} sesuai prosedur`,
                distractors: ["Dilakukan jika ada waktu luang", "Bisa dilewati jika sudah ahli", "Tergantung instruksi lisan", "Hanya dilakukan saat shift malam"]
            })
        },
        {
            regex: /(memastikan|mengecek|memeriksa)\s+([\w\s]+?)\s+sudah\s+([\w\s]+?)(?=\.|$)/i,
            gen: (match: string[]) => ({
                question: `Apa parameter verifikasi untuk "${match[2].trim()}" sebelum memulai pekerjaan?`,
                correct: `Memastikan statusnya sudah "${match[3].trim()}"`,
                distractors: [`Memastikan sudah "${match[3].trim()} sedikit"`, "Tidak perlu dicek jika buru-buru", "Cukup dilihat dari jauh", "Menunggu rekan kerja mengecek"]
            })
        },
        {
            regex: /([\w\s]+?)\s+(agar|supaya|untuk)\s+([\w\s]+?)(?=\.|$)/i,
            gen: (match: string[]) => ({
                question: `Mengapa langkah "${match[1].trim()}" sangat krusial dilakukan?`,
                correct: `Agar ${match[3].trim()}`,
                distractors: ["Hanya sebagai formalitas", "Supaya terlihat sibuk", "Agar menghemat waktu", "Karena sudah menjadi kebiasaan saja"]
            })
        },
        {
            regex: /^(\d+[\.\)]|\-)\s*([\w\s]+?)(?=\.|$)/i,
            gen: (match: string[]) => ({
                question: `Langkah detail apa yang disebutkan dalam poin prosedur: "${match[2].substring(0, 30)}..."?`,
                correct: match[2].trim(),
                distractors: ["Langkah opsional tambahan", "Saran dari divisi lain", "Prosedur lama yang sudah diganti", "Hanya berlaku untuk manager"]
            })
        }
    ];

    // Try to match lines with templates
    for (let i = 0; i < lines.length && questions.length < count; i++) {
        const line = lines[i];
        for (const template of templates) {
            const match = line.match(template.regex);
            if (match && !usedSentences.has(i)) {
                const qData = template.gen(match);
                
                // Shuffle options
                const options = [qData.correct, ...qData.distractors]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 4);
                
                // Ensure correct answer is there
                if (!options.includes(qData.correct)) options[0] = qData.correct;

                questions.push({
                    question: qData.question,
                    options: options.sort(() => Math.random() - 0.5),
                    correctAnswer: qData.correct
                });

                usedSentences.add(i);
                break;
            }
        }
    }

    // Fallback if not enough questions found through templates
    if (questions.length < count) {
        const fallbacks = [
            {
                question: "Apa tujuan utama dari implementasi SOP ini di tempat kerja?",
                correct: "Konsistensi kualitas dan standar operasional",
                distractors: ["Memperlama proses kerja", "Menambah beban administrasi", "Sekadar dokumen pajangan", "Mengurangi interaksi antar staf"]
            },
            {
                question: "Bagaimana sikap yang benar jika menemukan kondisi yang tidak sesuai dengan SOP ini?",
                correct: "Melapor ke atasan dan mengikuti prosedur darurat",
                distractors: ["Mengabaikannya", "Mencoba memperbaikinya tanpa ijin", "Menyalahkan rekan kerja", "Mendiamkannya saja"]
            }
        ];

        for (const f of fallbacks) {
            if (questions.length >= count) break;
            const options = [f.correct, ...f.distractors].sort(() => Math.random() - 0.5);
            questions.push({
                question: f.question,
                options,
                correctAnswer: f.correct
            });
        }
    }

    // Last resort generic questions
    while (questions.length < count && lines.length > 0) {
        const randomLine = lines[Math.floor(Math.random() * lines.length)];
        questions.push({
            question: `Terkait poin "${randomLine.substring(0, 40)}...", apa yang paling ditekankan?`,
            options: ["Kepatuhan pada standar", "Kecepatan kerja", "Biaya terendah", "Kenyamanan pribadi"].sort(() => Math.random() - 0.5),
            correctAnswer: "Kepatuhan pada standar"
        });
    }

    return questions.slice(0, count);
}
