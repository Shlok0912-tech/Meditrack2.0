import { useState, useEffect, useRef } from 'react';
import { Medicine } from '@/lib/storage';
import {
  initializeSpeechRecognition,
  parseVoiceCommand,
  speak,
  getHelpText,
  findBestMedicineMatch,
  VoiceCommand
} from '@/lib/voiceCommands';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Volume2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceAssistantProps {
  medicines: Medicine[];
  onTakeMedicine?: (medicineName: string, quantity: number) => void;
  onAddGlucose?: (value: number) => void;
}

interface TranscriptItem {
  text: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

export function VoiceAssistant({ medicines, onTakeMedicine, onAddGlucose }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentCommand, setCurrentCommand] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Monitor speech synthesis
  useEffect(() => {
    const checkSpeaking = () => {
      setIsSpeaking(window.speechSynthesis.speaking);
    };

    const interval = setInterval(checkSpeaking, 100);
    return () => clearInterval(interval);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addTranscript('✅ Internet connection restored. Voice recognition is now available.', 'assistant');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      addTranscript('⚠️ Lost internet connection. Voice recognition requires internet to work.', 'assistant');
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isListening]);

  useEffect(() => {
    const recognition = initializeSpeechRecognition();
    if (!recognition) {
      setIsSupported(false);
      addTranscript('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.', 'assistant');
      return;
    }

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsListening(true);
      setCurrentCommand('Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('🗣️ Heard:', transcript);
      setCurrentCommand(transcript);
      
      // Add user transcript
      addTranscript(transcript, 'user');
      
      // Process command
      processCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsListening(false);
      setCurrentCommand('');
      
      let errorMessage = 'Voice recognition error. Please try again.';
      if (event.error === 'no-speech') {
        errorMessage = '🔇 No speech detected. Please speak clearly into your microphone and try again.';
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        errorMessage = '🎤 Microphone access denied. Please allow microphone access in your browser settings and refresh the page.';
        setIsSupported(false);
      } else if (event.error === 'network') {
        errorMessage = '🌐 Voice recognition requires internet connection. The Web Speech API uses cloud processing. Please:\n\n1. Check your internet connection\n2. Try again in a few moments\n3. Ensure you\'re not blocking network access\n\nNote: Chrome/Edge need internet for speech recognition to work.';
      } else if (event.error === 'aborted') {
        // Don't show error for user-initiated abort
        return;
      } else if (event.error === 'audio-capture') {
        errorMessage = '🎤 Microphone error. Please check:\n1. Microphone is connected\n2. No other app is using the microphone\n3. Microphone permissions are granted';
      } else if (event.error === 'service-not-allowed') {
        errorMessage = '🚫 Speech recognition service not available. This may happen if:\n1. You\'re using HTTP instead of HTTPS\n2. Browser security settings block it\n3. Try using Chrome or Edge browser';
      }
      
      addTranscript(errorMessage, 'assistant');
    };

    recognition.onend = () => {
      console.log('🛑 Voice recognition ended');
      setIsListening(false);
      setCurrentCommand('');
    };

    // Initial greeting
    addTranscript('👋 Voice assistant ready! Click the microphone button and say "help" to see available commands.', 'assistant');

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log('Recognition cleanup:', e);
        }
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const addTranscript = (text: string, type: 'user' | 'assistant') => {
    setTranscripts(prev => [...prev, { text, type, timestamp: new Date() }]);
  };

  const processCommand = (transcript: string) => {
    const command: VoiceCommand = parseVoiceCommand(transcript);
    let response = '';

    switch (command.action) {
      case 'take_medicine':
        if (command.params?.medicineName) {
          const match = findBestMedicineMatch(
            command.params.medicineName,
            medicines.map(m => m.name)
          );

          if (match) {
            const quantity = command.params.quantity || 1;
            response = `Recording ${quantity} ${match}. Done!`;
            if (onTakeMedicine) {
              onTakeMedicine(match, quantity);
            }
          } else {
            response = `I couldn't find "${command.params.medicineName}" in your medicines. Please check the name.`;
          }
        } else {
          response = 'Please specify which medicine you took.';
        }
        break;

      case 'add_glucose':
        if (command.params?.glucoseValue) {
          response = `Glucose reading of ${command.params.glucoseValue} mg/dL recorded.`;
          if (onAddGlucose) {
            onAddGlucose(command.params.glucoseValue);
          }
        } else {
          response = 'Please specify your glucose value.';
        }
        break;

      case 'check_stock':
        if (command.params?.medicineName) {
          const match = findBestMedicineMatch(
            command.params.medicineName,
            medicines.map(m => m.name)
          );

          if (match) {
            const medicine = medicines.find(m => m.name === match);
            if (medicine) {
              const percent = medicine.totalStock > 0 
                ? ((medicine.currentStock / medicine.totalStock) * 100).toFixed(0)
                : 0;
              response = `You have ${medicine.currentStock} of ${medicine.name}, which is ${percent}% of total stock.`;
            }
          } else {
            response = `Medicine not found.`;
          }
        } else {
          const lowStock = medicines.filter(m => 
            m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < 20
          );
          
          if (lowStock.length > 0) {
            response = `Low stock alert: ${lowStock.map(m => m.name).join(', ')}.`;
          } else {
            response = `All medicines are well stocked.`;
          }
        }
        break;

      case 'list_medicines':
        if (medicines.length === 0) {
          response = 'You have no medicines in your inventory.';
        } else {
          const names = medicines.slice(0, 5).map(m => m.name).join(', ');
          response = `You have ${medicines.length} medicines: ${names}${medicines.length > 5 ? ', and more' : ''}.`;
        }
        break;

      case 'remind':
        response = 'Reminders feature is available in the Reminders tab.';
        break;

      case 'low_stock_alert':
        const lowStock = medicines.filter(m => 
          m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < 20
        );
        
        if (lowStock.length === 0) {
          response = '✅ Great news! All medicines are well stocked. No low stock alerts.';
        } else {
          const details = lowStock.map(m => {
            const percent = ((m.currentStock / m.totalStock) * 100).toFixed(0);
            return `${m.name}: ${m.currentStock} remaining (${percent}%)`;
          }).join(', ');
          response = `⚠️ ${lowStock.length} medicine${lowStock.length > 1 ? 's' : ''} running low: ${details}. Please refill soon.`;
        }
        break;

      case 'upcoming_doses':
        const now = new Date().getHours();
        const morningMeds = medicines.filter(m => m.schedule === 'morning' || m.schedule === 'morning_night' || m.schedule === 'three_times');
        const noonMeds = medicines.filter(m => m.schedule === 'noon' || m.schedule === 'noon_night' || m.schedule === 'three_times');
        const nightMeds = medicines.filter(m => m.schedule === 'night' || m.schedule === 'morning_night' || m.schedule === 'noon_night' || m.schedule === 'three_times');
        
        let upcomingList = [];
        if (now < 12 && morningMeds.length > 0) {
          upcomingList.push(`Morning doses: ${morningMeds.map(m => m.name).join(', ')}`);
        }
        if (now < 15 && noonMeds.length > 0) {
          upcomingList.push(`Noon doses: ${noonMeds.map(m => m.name).join(', ')}`);
        }
        if (now < 21 && nightMeds.length > 0) {
          upcomingList.push(`Night doses: ${nightMeds.map(m => m.name).join(', ')}`);
        }
        
        response = upcomingList.length > 0 
          ? `📅 Upcoming doses: ${upcomingList.join('. ')}`
          : '✅ No more doses scheduled for today.';
        break;

      case 'refill_medicine':
        if (command.params?.medicineName) {
          const match = findBestMedicineMatch(
            command.params.medicineName,
            medicines.map(m => m.name)
          );

          if (match) {
            const quantity = command.params.quantity || 10;
            response = `📦 To refill ${quantity} units of ${match}, please use the Add Medicine dialog in the Dashboard tab. Voice refilling is not yet automated for safety.`;
          } else {
            response = `I couldn't find "${command.params.medicineName}" in your inventory.`;
          }
        } else {
          response = 'Please specify which medicine you want to refill.';
        }
        break;

      case 'medicine_info':
        if (command.params?.medicineName) {
          const match = findBestMedicineMatch(
            command.params.medicineName,
            medicines.map(m => m.name)
          );

          if (match) {
            const medicine = medicines.find(m => m.name === match);
            if (medicine) {
              const scheduleText = medicine.schedule 
                ? medicine.schedule.replace(/_/g, ' and ')
                : 'as needed';
              response = `ℹ️ ${medicine.name}: Stock: ${medicine.currentStock} of ${medicine.totalStock}. Dosage: ${medicine.dosage || 'not specified'}. Schedule: ${scheduleText}. ${medicine.notes ? 'Notes: ' + medicine.notes : ''}`;
            }
          } else {
            response = `Medicine "${command.params.medicineName}" not found in your inventory.`;
          }
        } else {
          response = 'Please specify which medicine you want information about.';
        }
        break;

      case 'interaction_check':
        if (medicines.length < 2) {
          response = '✅ You need at least 2 medicines to check for interactions. Currently you have ' + medicines.length + ' medicine.';
        } else {
          response = `⚠️ Interaction checker is available in the Interactions tab. I'll check ${medicines.length} medicines for potential drug interactions. Please switch to the Interactions tab to see detailed results.`;
        }
        break;

      case 'export_report':
        response = '📄 Health report export is available in the Export tab. You can generate a comprehensive PDF report with your medication history, glucose readings, and health insights.';
        break;

      case 'help':
        response = getHelpText();
        break;

      default:
        response = 'I didn\'t understand that command. Say "help" for available commands.';
    }

    addTranscript(response, 'assistant');
    speak(response);
  };

  const startListening = () => {
    if (!navigator.onLine) {
      addTranscript('⚠️ No internet connection detected. Voice recognition requires internet to work. Please connect to the internet and try again.', 'assistant');
      return;
    }

    if (!recognitionRef.current) {
      addTranscript('❌ Voice recognition not initialized. Please refresh the page.', 'assistant');
      return;
    }
    
    if (isListening) {
      console.log('Already listening');
      return;
    }

    try {
      console.log('🎤 Starting voice recognition...');
      recognitionRef.current.start();
      addTranscript('🎤 Listening... Speak now!', 'assistant');
    } catch (error: any) {
      console.error('Failed to start recognition:', error);
      if (error.message && error.message.includes('already started')) {
        // Recognition is already running
        console.log('Recognition already active');
      } else {
        addTranscript('Failed to start voice recognition. Please try again.', 'assistant');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        console.log('🛑 Stopping voice recognition...');
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      addTranscript('🔇 Speech stopped.', 'assistant');
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Voice Assistant
          </CardTitle>
          <CardDescription>Browser Compatibility Issue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-medium mb-2">⚠️ Voice recognition not supported</p>
            <p className="text-sm text-muted-foreground">
              Voice commands require the Web Speech API. Please use one of these browsers:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Google Chrome (recommended)</li>
              <li>Microsoft Edge</li>
              <li>Safari (iOS/macOS)</li>
            </ul>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium mb-2">💡 Quick Setup:</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Use Chrome or Edge browser</li>
              <li>Allow microphone access when prompted</li>
              <li>Click "Start Listening" and speak clearly</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              AI Voice Assistant
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm">
              Control MediTrack with your voice
              {medicines.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {medicines.length} medicines available
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isSpeaking && (
              <Button
                size="default"
                variant="outline"
                onClick={stopSpeaking}
                className="rounded-full flex-1 sm:flex-none"
              >
                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-pulse" />
                <span className="text-sm sm:text-base">Stop Speaking</span>
              </Button>
            )}
            <Button
              size="default"
              variant={isListening ? 'destructive' : 'default'}
              onClick={isListening ? stopListening : startListening}
              disabled={!isOnline}
              className={cn(
                "rounded-full transition-all flex-1 sm:flex-none",
                isListening && "animate-pulse shadow-lg",
                !isOnline && "opacity-50 cursor-not-allowed"
              )}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Stop</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">{isOnline ? 'Start Listening' : 'Offline'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOnline && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
              ⚠️ No Internet Connection
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Voice recognition requires an active internet connection because it uses cloud-based speech processing.
              Please connect to the internet to use this feature.
            </p>
          </div>
        )}

        {!isListening && transcripts.length === 1 && isOnline && (
          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <p className="text-sm font-medium mb-2 text-foreground">🎤 How to use Voice Assistant:</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Click "Start Listening" button above</li>
              <li>Allow microphone access if prompted</li>
              <li>Speak clearly: "Take Aspirin" or "Glucose is 120"</li>
              <li>Wait for the assistant's response</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Say "help" anytime to see all available commands
            </p>
          </div>
        )}

        {currentCommand && (
          <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary/20 animate-pulse">
            <p className="text-sm font-medium flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              {currentCommand}
            </p>
          </div>
        )}

        <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4" ref={scrollRef}>
          <div className="space-y-3">
            {transcripts.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3',
                  item.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[80%] p-2.5 sm:p-3 rounded-lg',
                    item.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {item.type === 'assistant' && (
                      <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm whitespace-pre-line">{item.text}</p>
                      <p className="text-[10px] sm:text-xs opacity-70 mt-1">
                        {item.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Quick Commands:</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                processCommand('help');
              }}
              className="h-6 text-xs"
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => processCommand('list medicines')}
              className="text-[11px] sm:text-xs justify-start h-9 sm:h-8"
            >
              📋 <span className="ml-1">List All</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processCommand('low stock')}
              className="text-[11px] sm:text-xs justify-start h-9 sm:h-8"
            >
              ⚠️ <span className="ml-1">Low Stock</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processCommand('upcoming doses')}
              className="text-[11px] sm:text-xs justify-start h-9 sm:h-8"
            >
              📅 <span className="ml-1">Upcoming</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processCommand('check interactions')}
              className="text-[11px] sm:text-xs justify-start h-9 sm:h-8"
            >
              🔍 <span className="ml-1">Interactions</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processCommand('export report')}
              className="text-[11px] sm:text-xs justify-start h-9 sm:h-8"
            >
              📄 <span className="ml-1">Report</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => processCommand('remind me')}
              className="text-[11px] sm:text-xs justify-start h-9 sm:h-8"
            >
              🔔 <span className="ml-1">Reminders</span>
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
            <Mic className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {medicines.length} medicines
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            AI-powered
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
