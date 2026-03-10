/**
 * AI Sentiment Analysis for Employee Vents (Phase 37)
 * Simple Keyword-based simulation for MVP
 */

export async function analyzeVent(text: string) {
    const lowercase = text.toLowerCase();
    
    let sentiment: 'Positive' | 'Negative' | 'Neutral' = 'Neutral';
    let mood = 'Netral';
    let score = 0.5;
  
    // Keyword definitions
    const negativeKeywords = ['sedih', 'kecewa', 'marah', 'capek', 'lelah', 'stres', 'buruk', 'parah', 'gagal', 'sulit', 'benci', 'masalah', 'kurang', 'lambat'];
    const positiveKeywords = ['senang', 'bahagia', 'puas', 'bagus', 'hebat', 'mantap', 'terima kasih', 'semangat', 'cinta', 'keren', 'asik', 'nyaman'];
    const stressKeywords = ['stres', 'tekanan', 'deadline', 'pusing', 'beban', 'berat'];
    const tiredKeywords = ['capek', 'lelah', 'lemes', 'ngantuk', 'istirahat', 'libur'];
    const frustratedKeywords = ['kecewa', 'marah', 'benci', 'kesal', 'jengkel'];
  
    let negCount = negativeKeywords.filter(k => lowercase.includes(k)).length;
    let posCount = positiveKeywords.filter(k => lowercase.includes(k)).length;
    let stressCount = stressKeywords.filter(k => lowercase.includes(k)).length;
    let tiredCount = tiredKeywords.filter(k => lowercase.includes(k)).length;
    let frustratedCount = frustratedKeywords.filter(k => lowercase.includes(k)).length;
  
    if (negCount > posCount) {
      sentiment = 'Negative';
      score = 0.1 + (Math.random() * 0.3);
      if (stressCount > 0) mood = 'Stres';
      else if (tiredCount > 0) mood = 'Lelah';
      else if (frustratedCount > 0) mood = 'Kecewa';
      else mood = 'Sedih';
    } else if (posCount > negCount) {
      sentiment = 'Positive';
      score = 0.7 + (Math.random() * 0.2);
      mood = 'Senang';
    } else {
        sentiment = 'Neutral';
        score = 0.4 + (Math.random() * 0.2);
        mood = 'Netral';
    }
  
    return { sentiment, mood, score };
}
