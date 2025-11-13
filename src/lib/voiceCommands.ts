// Voice command system using Web Speech API with Fuzzy Matching
// Provides hands-free medicine tracking with intelligent recognition

import Fuse from 'fuse.js';

export interface VoiceCommand {
  command: string;
  action: 'take_medicine' | 'add_glucose' | 'check_stock' | 'list_medicines' | 'remind' | 'help' | 
          'low_stock_alert' | 'upcoming_doses' | 'add_medicine' | 'refill_medicine' | 
          'medicine_info' | 'interaction_check' | 'export_report' | 'unknown';
  params?: {
    medicineName?: string;
    quantity?: number;
    glucoseValue?: number;
    notes?: string;
    timeframe?: string;
  };
  confidence?: number;
}

// Initialize speech recognition with enhanced settings
export function initializeSpeechRecognition(): any {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported in this browser');
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 5; // Get more alternatives for better matching

  return recognition;
}

// Enhanced command parsing with pattern matching
export function parseVoiceCommand(transcript: string): VoiceCommand {
  const lower = transcript.toLowerCase().trim();
  
  // Natural language patterns for taking medicine
  const takeMedicinePatterns = [
    /(?:i )?(?:took|take|taken|had|using) (?:my )?(?:medicine )?(.+?)(?:\s+(?:tablet|pill|capsule|dose))?$/i,
    /(?:log|record|mark) (?:that i )?(?:took|taken) (.+)$/i,
    /(.+?) (?:taken|took|consumed)$/i
  ];

  // Natural language patterns for glucose
  const glucosePatterns = [
    /(?:my )?(?:blood )?(?:glucose|sugar)(?: (?:is|level))? (\d+)/i,
    /(\d+) (?:glucose|sugar|blood sugar)/i,
    /add glucose (\d+)/i
  ];

  // Try to match taking medicine
  for (const pattern of takeMedicinePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const medicineName = extractMedicineName(match[1]);
      const quantity = extractQuantity(lower) || 1;
      
      return {
        command: transcript,
        action: 'take_medicine',
        params: { medicineName, quantity },
        confidence: 0.9
      };
    }
  }

  // Try to match glucose readings
  for (const pattern of glucosePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return {
        command: transcript,
        action: 'add_glucose',
        params: { glucoseValue: parseInt(match[1]) },
        confidence: 0.95
      };
    }
  }

  // Check stock commands
  if (lower.includes('stock') || lower.includes('how many') || lower.includes('how much')) {
    const medicineName = extractMedicineName(lower);
    
    return {
      command: transcript,
      action: 'check_stock',
      params: { medicineName },
      confidence: 0.85
    };
  }

  // List medicines
  if ((lower.includes('list') || lower.includes('show')) && 
      (lower.includes('medicine') || lower.includes('medication') || lower.includes('all'))) {
    return {
      command: transcript,
      action: 'list_medicines',
      confidence: 0.9
    };
  }

  // Reminder commands
  if (lower.includes('remind') || lower.includes('reminder')) {
    return {
      command: transcript,
      action: 'remind',
      confidence: 0.8
    };
  }

  // Low stock alert commands
  if ((lower.includes('low') || lower.includes('running low') || lower.includes('almost out')) && 
      (lower.includes('stock') || lower.includes('medicine'))) {
    return {
      command: transcript,
      action: 'low_stock_alert',
      confidence: 0.9
    };
  }

  // Upcoming doses commands
  if ((lower.includes('upcoming') || lower.includes('next') || lower.includes('today')) && 
      (lower.includes('dose') || lower.includes('medicine') || lower.includes('medication'))) {
    return {
      command: transcript,
      action: 'upcoming_doses',
      confidence: 0.9
    };
  }

  // Refill medicine commands
  if ((lower.includes('refill') || lower.includes('restock') || lower.includes('add stock')) && 
      lower.includes('medicine')) {
    const medicineName = extractMedicineName(lower);
    const quantity = extractQuantity(lower) || 10;
    return {
      command: transcript,
      action: 'refill_medicine',
      params: { medicineName, quantity },
      confidence: 0.85
    };
  }

  // Medicine info commands
  if ((lower.includes('info') || lower.includes('information') || lower.includes('about') || 
       lower.includes('tell me about')) && lower.includes('medicine')) {
    const medicineName = extractMedicineName(lower);
    return {
      command: transcript,
      action: 'medicine_info',
      params: { medicineName },
      confidence: 0.85
    };
  }

  // Interaction check commands
  if (lower.includes('interaction') || lower.includes('safe') || 
      (lower.includes('check') && lower.includes('drug'))) {
    return {
      command: transcript,
      action: 'interaction_check',
      confidence: 0.9
    };
  }

  // Export report commands
  if ((lower.includes('export') || lower.includes('download') || lower.includes('generate')) && 
      lower.includes('report')) {
    return {
      command: transcript,
      action: 'export_report',
      confidence: 0.9
    };
  }

  // Help command
  if (lower.includes('help') || lower.includes('what can')) {
    return {
      command: transcript,
      action: 'help',
      confidence: 1.0
    };
  }

  // Unknown command
  return {
    command: transcript,
    action: 'unknown',
    confidence: 0
  };
}

// Enhanced medicine name extraction with better cleaning
function extractMedicineName(text: string): string {
  // Remove common words and phrases
  const stopWords = [
    'take', 'took', 'taken', 'had', 'using', 'medicine', 'medication', 
    'tablet', 'pill', 'capsule', 'dose', 'stock', 'of', 'the', 'my', 
    'a', 'an', 'is', 'was', 'are', 'have', 'has', 'log', 'record', 'mark'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  const cleaned = words
    .filter(word => !stopWords.includes(word))
    .filter(word => word.length > 1 && !/^\d+$/.test(word)) // Remove numbers
    .join(' ')
    .trim();

  // Capitalize properly
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Extract quantity from command
function extractQuantity(text: string): number | undefined {
  // Look for numbers
  const numberWords: { [key: string]: number } = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  };

  // Check for number words
  for (const [word, num] of Object.entries(numberWords)) {
    if (text.includes(word)) {
      return num;
    }
  }

  // Check for digits
  const digitMatch = text.match(/\b(\d+)\b/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  return undefined;
}

// Extract number (for glucose)
function extractNumber(text: string): number | undefined {
  const match = text.match(/\b(\d+(?:\.\d+)?)\b/);
  return match ? parseFloat(match[1]) : undefined;
}

// Text-to-speech for feedback
export function speak(text: string): void {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  try {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
    };

    // Small delay to ensure cancel completes
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  } catch (error) {
    console.error('Failed to speak:', error);
  }
}

// Generate help text
export function getHelpText(): string {
  return `🎤 Voice Commands Help:

📊 MEDICATION TRACKING:
  • "Take [medicine name]" or "I took [medicine]"
    Example: "Take Aspirin" or "I took 2 Metformin"
  
  • "Refill [medicine]" or "Add stock to [medicine]"
    Example: "Refill 20 Aspirin"

🩸 GLUCOSE MONITORING:
  • "Glucose is [number]" or "Blood sugar [number]"
    Example: "Glucose is 120" or "My blood sugar is 95"

📦 INVENTORY & STOCK:
  • "How many [medicine]" or "Check stock [medicine]"
    Example: "How many Aspirin do I have?"
  
  • "Low stock" or "Running low"
    Shows medicines that need refilling
  
  • "List medicines" or "Show my medications"
    Lists all your medicines

📅 SCHEDULES & REMINDERS:
  • "Upcoming doses" or "Next medicine"
    Shows doses due soon
  
  • "Remind me" or "Show reminders"
    View medication reminders

ℹ️ MEDICINE INFORMATION:
  • "Info about [medicine]" or "Tell me about [medicine]"
    Example: "Info about Aspirin"

⚠️ SAFETY & INTERACTIONS:
  • "Check interactions" or "Drug interactions"
    Analyzes potential drug interactions

📄 REPORTS & EXPORT:
  • "Export report" or "Generate report"
    Creates a health report

❓ HELP:
  • "Help" - Show this message

💡 Tips:
  - Speak clearly and naturally
  - Wait for response before next command
  - Internet connection required`;
}

// Find best medicine match using Fuse.js fuzzy search
export function findBestMedicineMatch(spokenName: string, availableMedicines: string[]): string | null {
  if (availableMedicines.length === 0) return null;
  
  const normalized = spokenName.toLowerCase().trim();
  
  // Exact match
  const exactMatch = availableMedicines.find(m => m.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  // Fuzzy search with Fuse.js
  const fuse = new Fuse(availableMedicines, {
    threshold: 0.4, // Lower = stricter matching (0.0 = exact, 1.0 = match anything)
    distance: 100,
    ignoreLocation: true,
    keys: ['.'] // Search the string directly
  });

  const results = fuse.search(spokenName);
  
  if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.5) {
    return results[0].item;
  }

  // Fallback: Partial match
  const partialMatch = availableMedicines.find(m => 
    m.toLowerCase().includes(normalized) || normalized.includes(m.toLowerCase())
  );
  
  return partialMatch || null;
}
