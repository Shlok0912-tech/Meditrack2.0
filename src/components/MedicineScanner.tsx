import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, ScanLine, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createWorker } from 'tesseract.js';
import { EXTENDED_MEDICINE_MAP } from '../lib/extendedMedicines';
import { loadExternalNames } from '../lib/loadExternalNames';

interface MedicineScannerProps {
  onMedicineExtracted?: (medicineData: {
    name: string;
    dosage?: string;
    notes?: string;
  }) => void;
}

export function MedicineScanner({ onMedicineExtracted }: MedicineScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [originalOCRText, setOriginalOCRText] = useState<string>(''); // Store original OCR text
  // Runtime external names (from public labels files)
  const externalExtendedMapRef = useRef<Map<string, string>>(new Map());

  // Load external medicine labels on mount
  useEffect(() => {
    // Attempt to load external labels from public folder (exact match only)
    (async () => {
      try {
        const names = await loadExternalNames(['/Train/labels.txt', '/labels.txt']);
        if (names.length > 0) {
          const m = new Map<string, string>();
          for (const n of names) m.set(n.toLowerCase(), n);
          externalExtendedMapRef.current = m;
          console.log(`🧩 External labels ready: ${m.size} names`);
        }
      } catch (e) {
        console.warn('Failed loading external labels:', e);
      }
    })();
  }, []);









  // Multi-pass OCR with ensemble approach for maximum accuracy
  // Advanced performOCR with region detection, Sauvola binarization, and multi-angle deskewing
  const performOCR = async (imageData: string): Promise<any> => {
    try {
      // Tunable constants - IMPROVED FOR BETTER ACCURACY
      const ANGLE_SEARCH = [-5, -3, -1, 0, 1, 3, 5]; // Expanded angle range for rotated images
      const UPSCALE = 3; // Increased to 3x for better small text recognition
      const SAUVOLA_WINDOW = 19; // Optimized window size
      const SAUVOLA_K = 0.3; // Adjusted k parameter for better binarization
      const MIN_CROP_AREA = 1500; // Lower threshold to catch more text regions
      const MAX_CROPS_TO_TRY = 3; // Try top 3 regions for better coverage

      // Create worker for detection+recognition
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Set parameters - ENHANCED FOR MEDICINE LABELS
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-()% +/µμ&',
        preserve_interword_spaces: '1',
        tessedit_create_hocr: '0',
        tessedit_create_tsv: '0',
        tessedit_create_pdf: '0',
      });

      // 1) Quick detect pass to get word boxes
      const detectResult = await worker.recognize(imageData);
      const words = (detectResult.data && (detectResult.data as any).words) ? (detectResult.data as any).words : [];
      
      // if no words, fallback to full-image single-pass
      if (!words || words.length === 0) {
        console.warn('No word boxes found - falling back to single-pass on full image');
        const fallbackParsed = parseMedicineText(detectResult.data.text || '');
        await worker.terminate();
        const matchResult = findBestMedicineMatch(fallbackParsed.name || '');
        const confidenceNum = detectResult.data && detectResult.data.confidence ? detectResult.data.confidence : 50;
        return {
          ...fallbackParsed,
          rawText: detectResult.data.text || '',
          confidence: confidenceNum > 90 ? 'high' : confidenceNum > 75 ? 'medium' : 'low',
          ocrConfidence: Math.round(confidenceNum),
          matchConfidence: matchResult.confidence || 0,
          multiPassResults: 1,
          originalName: fallbackParsed.name,
          fullOCRText: detectResult.data.text || ''
        };
      }

      // 2) Cluster word boxes to find candidate label regions
      const clusters = clusterWordBoxes(words.map((w: any) => ({
        bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
        text: w.text
      })));

      // Filter clusters, pick top N
      const candidateClusters = clusters.filter((c: any) => c.area >= MIN_CROP_AREA).slice(0, MAX_CROPS_TO_TRY);
      
      // If none, fallback to center crop
      if (candidateClusters.length === 0) {
        const img = await loadImage(imageData);
        const cw = Math.floor(img.width * 0.6), ch = Math.floor(img.height * 0.25);
        const cx = Math.floor((img.width - cw) / 2), cy = Math.floor((img.height - ch) / 2);
        candidateClusters.push({ x: cx, y: cy, w: cw, h: ch, words: [], area: cw * ch });
      }

      // 3) For each candidate crop, create preprocessed variants (angles) and OCR them
      const allResults: Array<{ text: string; confidence: number; parsed: any }> = [];
      
      for (const cluster of candidateClusters) {
        // Crop and upscale
        const cropDataUrl = await cropBoxFromDataUrl(imageData, { x: cluster.x, y: cluster.y, w: cluster.w, h: cluster.h }, UPSCALE);
        const cropImg = await loadImage(cropDataUrl);

        // Try small angle deskew/search
        for (const angle of ANGLE_SEARCH) {
          const rotatedCanvas = drawRotated(cropImg, angle);
          
          // Apply Sauvola binarization
          sauvolaBinarizeCanvas(rotatedCanvas, SAUVOLA_WINDOW, SAUVOLA_K);
          
          // Morphological open to reduce speckle
          morphologicalOpenCanvas(rotatedCanvas, 1);

          // Get dataURL for OCR
          const preprocessedDataUrl = rotatedCanvas.toDataURL('image/png', 1.0);

          // Run OCR on this preprocessed crop variant
          const rec = await worker.recognize(preprocessedDataUrl);
          const text = rec.data?.text || '';
          const conf = rec.data?.confidence || 0;

          const parsed = parseMedicineText(text || '');
          allResults.push({ text, confidence: conf, parsed });

          console.log(`CROP OCR angle=${angle} conf=${conf}`, parsed.name);
        }
      }

      await worker.terminate();

      // 4) Ensemble selection across allResults
      let bestScore = -Infinity;
      let bestResult = allResults[0] || { text: '', confidence: 0, parsed: { name: 'Unknown Medicine' } };
      
      // Compute name consensus
      const nameCounts: Record<string, number> = {};
      for (const r of allResults) {
        const nm = (r.parsed.name || '').toLowerCase().trim();
        if (nm) nameCounts[nm] = (nameCounts[nm] || 0) + 1;
      }
      const maxCount = Math.max(0, ...Object.values(nameCounts));
      
      for (const r of allResults) {
        const parsed = r.parsed;
        const baseConf = r.confidence || 0;
        const match = findBestMedicineMatch(parsed.name || '');
        const matchBonus = (match?.confidence || 0) * 40;
        const dosageBonus = parsed.dosage ? 10 : 0;
        const length = (parsed.name || '').length;
        const lengthBonus = (length >= 3 && length <= 30) ? 8 : 0;
        const consensusBonus = parsed.name && nameCounts[parsed.name.toLowerCase()] ? (nameCounts[parsed.name.toLowerCase()] / Math.max(1, maxCount)) * 12 : 0;
        const score = baseConf + matchBonus + dosageBonus + lengthBonus + consensusBonus;
        
        if (score > bestScore) {
          bestScore = score;
          bestResult = r;
        }
      }

      // 5) Post-process & validation
      const pseudoResults = allResults.map(r => ({ text: r.text, confidence: r.confidence / 100, parsed: r.parsed }));
      const validated = validateAndCorrect(bestResult.parsed, pseudoResults.map(r => ({ text: r.text, confidence: r.confidence, parsed: r.parsed })));
      let finalConfidenceNum = calculateEnsembleConfidence(pseudoResults.map(r => ({ text: r.text, confidence: r.confidence, parsed: r.parsed })), validated);
      
      // Boost if known match
      const matchResult = findBestMedicineMatch(validated.name || '');
      if (matchResult.confidence > 0.65) {
        finalConfidenceNum = Math.max(finalConfidenceNum, matchResult.confidence * 100);
        validated.name = matchResult.name;
      }
      finalConfidenceNum = Math.min(100, Math.round(finalConfidenceNum));

      // Pick raw text from bestResult
      const rawText = bestResult.text || (allResults[0] && allResults[0].text) || '';

      console.log('═══════════════════════════════════════');
      console.log('📋 FINAL OCR RESULT:');
      console.log('  Medicine Name:', validated.name);
      console.log('  Dosage:', validated.dosage);
      console.log('  Confidence:', finalConfidenceNum + '%');
      console.log('  Match Result:', matchResult);
      console.log('  Raw OCR Text:', rawText.substring(0, 100) + '...');
      console.log('═══════════════════════════════════════');

      return {
        ...validated,
        rawText,
        confidence: finalConfidenceNum > 90 ? 'high' : finalConfidenceNum > 75 ? 'medium' : 'low',
        ocrConfidence: Math.round(finalConfidenceNum),
        matchConfidence: matchResult.confidence || 0,
        multiPassResults: allResults.length,
        originalName: validated.name,
        fullOCRText: rawText
      };
    } catch (error) {
      console.error('OCR Error (crop-based):', error);
      throw new Error('Failed to extract text from image (crop-based pipeline)');
    }
  };

  // Validate and correct results using cross-validation
  const validateAndCorrect = (parsed: any, allResults: Array<{ text: string; confidence: number; parsed: any }>) => {
    const validated = { ...parsed };
    
    // Cross-validate medicine name across all passes
    const names = allResults.map(r => r.parsed.name).filter(n => n && n.length > 2);
    const nameFrequency: Record<string, number> = {};
    
    for (const name of names) {
      const normalized = name.toLowerCase().trim();
      nameFrequency[normalized] = (nameFrequency[normalized] || 0) + 1;
    }
    
    // Use most common name if consensus exists
    const sortedNames = Object.entries(nameFrequency).sort((a, b) => b[1] - a[1]);
    if (sortedNames.length > 0 && sortedNames[0][1] >= 2) {
      const consensusName = names.find(n => n.toLowerCase() === sortedNames[0][0]) || validated.name;
      validated.name = consensusName;
    }
    
    // Cross-validate dosage
    const dosages = allResults.map(r => r.parsed.dosage).filter(Boolean);
    if (dosages.length > 0 && !validated.dosage) {
      validated.dosage = dosages[0];
    }
    
    return validated;
  };

  // Calculate ensemble confidence from multiple passes
  const calculateEnsembleConfidence = (results: Array<{ text: string; confidence: number; parsed: any }>, validated: any): number => {
    // Average confidence from all passes
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // Check for consensus
    const names = results.map(r => r.parsed.name.toLowerCase().trim());
    const uniqueNames = new Set(names);
    const consensusBonus = uniqueNames.size === 1 ? 15 : uniqueNames.size === 2 ? 10 : 0;
    
    // Check for known medicine match
    const matchResult = findBestMedicineMatch(validated.name);
    const matchBonus = matchResult.confidence * 20;
    
    return Math.min(100, avgConfidence + consensusBonus + matchBonus);
  };

  // -----------------------
  // Advanced OCR Helper Functions
  // -----------------------

  // Helper: convert base64 image to Image element
  const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

  // Helper: draw rotated image on canvas
  const drawRotated = (img: HTMLImageElement, angleDeg: number, sx = 0, sy = 0, sw?: number, sh?: number) => {
    const radians = (angleDeg * Math.PI) / 180;
    const w = sw ?? img.width;
    const h = sh ?? img.height;
    const c = document.createElement('canvas');
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    c.width = Math.ceil(w * cos + h * sin);
    c.height = Math.ceil(w * sin + h * cos);
    const ctx = c.getContext('2d')!;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, sx, sy, sw ?? img.width, sh ?? img.height, -w / 2, -h / 2, w, h);
    return c;
  };

  // Helper: upscale image via canvas
  const upscaleDataUrl = async (dataUrl: string, scale = 2): Promise<string> => {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png', 1.0);
  };

  // Helper: crop box from dataUrl
  const cropBoxFromDataUrl = async (imageDataUrl: string, box: { x: number; y: number; w: number; h: number }, upscale = 2): Promise<string> => {
    const img = await loadImage(imageDataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(box.w * upscale));
    canvas.height = Math.max(1, Math.floor(box.h * upscale));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png', 1.0);
  };

  // Helper: simple morphological open (erode then dilate) on canvas
  const morphologicalOpenCanvas = (canvas: HTMLCanvasElement, kernelSize = 1) => {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const img = ctx.getImageData(0, 0, width, height);
    const out = new Uint8ClampedArray(img.data.length);
    
    const get = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return 255;
      return img.data[(y * width + x) * 4];
    };
    
    // Erode
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let min = 255;
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          for (let kx = -kernelSize; kx <= kernelSize; kx++) {
            const v = get(x + kx, y + ky);
            if (v < min) min = v;
          }
        }
        const idx = (y * width + x) * 4;
        out[idx] = out[idx + 1] = out[idx + 2] = min;
        out[idx + 3] = 255;
      }
    }
    
    // Dilate
    const temp = new Uint8ClampedArray(out);
    const get2 = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return 0;
      return temp[(y * width + x) * 4];
    };
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let max = 0;
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          for (let kx = -kernelSize; kx <= kernelSize; kx++) {
            const v = get2(x + kx, y + ky);
            if (v > max) max = v;
          }
        }
        const idx = (y * width + x) * 4;
        img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = max;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  // Helper: Sauvola binarization on canvas
  const sauvolaBinarizeCanvas = (canvas: HTMLCanvasElement, windowSize = 25, k = 0.34) => {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const src = ctx.getImageData(0, 0, width, height);
    const gray = new Float64Array(width * height);
    
    for (let i = 0, j = 0; i < src.data.length; i += 4, j++) {
      gray[j] = 0.299 * src.data[i] + 0.587 * src.data[i + 1] + 0.114 * src.data[i + 2];
    }
    
    const half = Math.floor(windowSize / 2);
    const integral = new Float64Array((width + 1) * (height + 1));
    const integralSq = new Float64Array((width + 1) * (height + 1));
    
    for (let y = 1; y <= height; y++) {
      let rowSum = 0, rowSumSq = 0;
      for (let x = 1; x <= width; x++) {
        const val = gray[(y - 1) * width + (x - 1)];
        rowSum += val;
        rowSumSq += val * val;
        const idx = y * (width + 1) + x;
        integral[idx] = integral[idx - (width + 1)] + rowSum;
        integralSq[idx] = integralSq[idx - (width + 1)] + rowSumSq;
      }
    }
    
    const out = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - half), y1 = Math.max(0, y - half);
        const x2 = Math.min(width - 1, x + half), y2 = Math.min(height - 1, y + half);
        const area = (x2 - x1 + 1) * (y2 - y1 + 1);
        const idx2 = (y2 + 1) * (width + 1) + (x2 + 1);
        const idx1 = y1 * (width + 1) + x1;
        const sum = integral[idx2] - integral[(y2 + 1) * (width + 1) + x1] - integral[y1 * (width + 1) + (x2 + 1)] + integral[idx1];
        const sumSq = integralSq[idx2] - integralSq[(y2 + 1) * (width + 1) + x1] - integralSq[y1 * (width + 1) + (x2 + 1)] + integralSq[idx1];
        const mean = sum / area;
        const variance = (sumSq / area) - mean * mean;
        const std = Math.sqrt(Math.max(0, variance));
        const threshold = mean * (1 + k * ((std / 128) - 1));
        const val = gray[y * width + x];
        out[y * width + x] = val > threshold ? 255 : 0;
      }
    }
    
    const outImage = ctx.createImageData(width, height);
    for (let i = 0, j = 0; i < outImage.data.length; i += 4, j++) {
      outImage.data[i] = out[j];
      outImage.data[i + 1] = out[j];
      outImage.data[i + 2] = out[j];
      outImage.data[i + 3] = 255;
    }
    ctx.putImageData(outImage, 0, 0);
  };

  // Helper: cluster word boxes (simple vertical proximity clustering)
  const clusterWordBoxes = (words: Array<any>) => {
    if (!words || words.length === 0) return [];
    
    const boxes = words.map((w: any) => {
      const x = w.bbox.x0, y = w.bbox.y0, wth = w.bbox.x1 - w.bbox.x0, hgt = w.bbox.y1 - w.bbox.y0;
      return { x, y, w: wth, h: hgt, text: w.text, area: wth * hgt, midY: y + hgt / 2 };
    });
    
    boxes.sort((a, b) => a.midY - b.midY);
    const clusters: Array<any> = [];
    const verticalGap = 24; // px - tune based on dataset
    
    for (const b of boxes) {
      let placed = false;
      for (const c of clusters) {
        const clusterMid = c.y + c.h / 2;
        if (Math.abs(b.midY - clusterMid) < verticalGap + (b.h + c.h) / 4) {
          c.words.push(b);
          const minX = Math.min(c.x, b.x);
          const minY = Math.min(c.y, b.y);
          const maxX = Math.max(c.x + c.w, b.x + b.w);
          const maxY = Math.max(c.y + c.h, b.y + b.h);
          c.x = minX; c.y = minY; c.w = maxX - minX; c.h = maxY - minY;
          c.area += b.area;
          placed = true;
          break;
        }
      }
      if (!placed) {
        clusters.push({ x: b.x, y: b.y, w: b.w, h: b.h, words: [b], area: b.area });
      }
    }
    
    clusters.sort((a, b) => b.area - a.area);
    return clusters;
  };

  // Medicine name database for pattern matching and validation
  const KNOWN_MEDICINES = {
    // Brand names with common variations and OCR errors
    'nicardia': { 
      correct: 'Nicardia', 
      variations: ['nicardia', 'nicardla', 'nlcardia', 'nicarolia', 'nicardie', 'nicardja', 'nicarola', 'nlcardla', 'nicardie', 'micardla'],
      forms: ['retard', 'sustained release', 'sr'],
      commonDosages: ['5mg', '10mg', '20mg', '30mg']
    },
    'arkamin': {
      correct: 'Arkamin',
      variations: ['arkamin', 'arkamln', 'arkarnin', 'arkemin', 'arkamim', 'arkemln', 'arkemin', 'arkarnln', 'arkarnim'],
      forms: ['tablets'],
      commonDosages: ['100mcg', '0.1mg']
    },
    'levera': {
      correct: 'Levera',
      variations: ['levera', 'ievera', 'levere', 'levara', 'levira', 'ievere', 'lavera', 'levara', 'levers', 'levera'],
      forms: ['tablets'],
      commonDosages: ['250mg', '500mg', '750mg', '1000mg']
    },
    'ecosprin': {
      correct: 'Ecosprin',
      variations: ['ecosprin', 'ecospirn', 'ecosprln', 'ecospirn', 'ecosprm', 'ecosorin', 'ecospring', 'ecosprln', 'ecosprm'],
      forms: ['av', 'tablets', 'capsules'],
      commonDosages: ['75mg', '150mg']
    },
    'pan': {
      correct: 'Pan',
      variations: ['pan', 'pen', 'pam', 'pan-d', 'pand'],
      forms: ['d', 'dsr', 'tablets'],
      commonDosages: ['40mg']
    },
    'nifedipine': {
      correct: 'Nifedipine',
      variations: ['nifedipine', 'nlfedipine', 'nifedioine', 'nlfedioine', 'mfedipine', 'nifedipin', 'nlfedipin', 'nlfedlplne'],
      forms: ['ip', 'sustained release', 'tablets', 'sr'],
      commonDosages: ['5mg', '10mg', '20mg', '30mg']
    },
    'clonidine': {
      correct: 'Clonidine',
      variations: ['clonidine', 'cionidine', 'clonldine', 'clomdine', 'clomidine', 'clonldlne', 'clonlding', 'cionldine'],
      forms: ['tablets', 'ip'],
      commonDosages: ['100mcg', '0.1mg']
    },
    'levetiracetam': {
      correct: 'Levetiracetam',
      variations: ['levetiracetam', 'ievetiracetam', 'levatiracetam', 'levetiracetarn', 'levetlracetam', 'ievetlracetam', 'levetiracetarn'],
      forms: ['tablets', 'ip'],
      commonDosages: ['250mg', '500mg', '750mg', '1000mg']
    },
    'aspirin': {
      correct: 'Aspirin',
      variations: ['aspirin', 'asplrin', 'asprin', 'asplrln', 'espirim', 'asplrm', 'espirim', 'esplrin'],
      forms: ['gastro-resistant', 'tablets'],
      commonDosages: ['75mg', '150mg']
    },
    'atorvastatin': {
      correct: 'Atorvastatin',
      variations: ['atorvastatin', 'atorvastin', 'atorvestatin', 'atorvastatln', 'atorvastetin', 'atorvastatim', 'atorvastetin', 'atorvestetln'],
      forms: ['tablets'],
      commonDosages: ['10mg', '20mg', '40mg', '80mg']
    },
    'pantoprazole': {
      correct: 'Pantoprazole',
      variations: ['pantoprazole', 'pentoprazole', 'pantoprazol', 'pentoprezole', 'pantoprazoie', 'pentoprazoie', 'pantoprazoie', 'pantoprezol'],
      forms: ['tablets', 'dsr', 'gastro-resistant'],
      commonDosages: ['20mg', '40mg']
    },
    'domperidone': {
      correct: 'Domperidone',
      variations: ['domperidone', 'domperidon', 'domoeridone', 'dompendone', 'dornperidone', 'domperidona', 'domperldon', 'domperldone'],
      forms: ['tablets', 'sr'],
      commonDosages: ['10mg', '30mg']
    },
    'uritop': {
      correct: 'Uritop-SR',
      variations: ['uritop', 'urltop', 'uritoo', 'unritop', 'urltoр', 'urltop-sr', 'urltoop', 'urltop'],
      forms: ['sr', 'sustained release'],
      commonDosages: ['100mg']
    },
    'nitrofurantoin': {
      correct: 'Nitrofurantoin',
      variations: ['nitrofurantoin', 'nitrofurantoine', 'nitrofurantom', 'nitrofurantoln', 'nitrofuramtoin', 'nitrofurantolne', 'njtrofurantoin', 'nitrofuramtoln'],
      forms: ['sustained release', 'tablets', 'ip', 'sr'],
      commonDosages: ['50mg', '100mg']
    },
    'stalix': {
      correct: 'STALIX D',
      variations: ['stalix', 'stailx', 'stellx', 'stallix', 'stalx', 'stalix-d', 'stallx', 'stalllx'],
      forms: ['d', 'tablets'],
      commonDosages: ['10mg', '100mg', '10+100']
    },
    'dapagliflozin': {
      correct: 'Dapagliflozin',
      variations: ['dapagliflozin', 'dapagllflozin', 'dapaglifozin', 'depagliflozin', 'dapagllflozm', 'dapagllflozln', 'dapaglifozln', 'depagllflozin'],
      forms: ['tablets'],
      commonDosages: ['5mg', '10mg']
    },
    'sitagliptin': {
      correct: 'Sitagliptin',
      variations: ['sitagliptin', 'sitagllptin', 'sitagliotin', 'sltagliptin', 'sitagliptm', 'sitagllptln', 'sltagllptin', 'sitagliptln'],
      forms: ['tablets', 'phosphate'],
      commonDosages: ['25mg', '50mg', '100mg']
    },
    'glynamic': {
      correct: 'GLYNAMIC-MV1',
      variations: ['glynamic', 'giynamic', 'glynamlc', 'glvnamic', 'glynarnlc', 'glynamlc-mv1', 'glvnamlc', 'giynamlc'],
      forms: ['mv1', 'tablets'],
      commonDosages: ['1mg', '0.2mg']
    },
    'glimepiride': {
      correct: 'Glimepiride',
      variations: ['glimepiride', 'gllmepiride', 'glimepirde', 'glimepirlde', 'glimepinde', 'gllmepirde', 'glimepirlde', 'gllmepirlde'],
      forms: ['tablets', 'ip'],
      commonDosages: ['1mg', '2mg', '3mg', '4mg']
    },
    'metformin': {
      correct: 'Metformin',
      variations: ['metformin', 'metformln', 'rnetformin', 'metfornin', 'metformim', 'metformln', 'rnetformln', 'metformln'],
      forms: ['hydrochloride', 'sustained release', 'tablets', 'hcl', 'sr'],
      commonDosages: ['500mg', '850mg', '1000mg']
    },
    'voglibose': {
      correct: 'Voglibose',
      variations: ['voglibose', 'voglibos', 'vogilbose', 'voglibose', 'vogiibose', 'voglibos', 'vogilbos', 'vogllbose'],
      forms: ['tablets'],
      commonDosages: ['0.2mg', '0.3mg']
    }
  };

  // Advanced OCR text preprocessing with comprehensive error corrections
  const preprocessOCRText = (text: string): string => {
    let processed = text
      // Fix common OCR character confusions
      .replace(/[Il1|]/g, (match, offset) => {
        const before = text[offset - 1] || '';
        const after = text[offset + 1] || '';
        
        // In word context, likely 'i' or 'l'
        if (/[a-z]/i.test(before) && /[a-z]/i.test(after)) {
          // Common patterns
          if (text.substring(offset - 2, offset + 3).toLowerCase().includes('il')) return 'l';
          if (text.substring(offset - 2, offset + 3).toLowerCase().includes('in')) return 'i';
          return match === '1' || match === '|' ? 'i' : match;
        }
        
        // Near numbers, likely '1'
        if (/\d/.test(before) || /\d/.test(after)) return '1';
        
        // At word start, likely 'I' or '1'
        if (!before.trim()) return match;
        
        return match;
      })
      // Fix zero/O confusion with context awareness
      .replace(/[O0]/g, (match, offset) => {
        const before = text[offset - 1] || '';
        const after = text[offset + 1] || '';
        const context = text.substring(Math.max(0, offset - 3), offset + 4).toLowerCase();
        
        // In dosage context (e.g., "10mg", "500mg"), use '0'
        if (context.includes('mg') || context.includes('mcg') || context.includes('ml')) {
          if (/\d/.test(before) || /\d/.test(after)) return '0';
        }
        
        // Between letters, likely 'O'
        if (/[a-z]/i.test(before) && /[a-z]/i.test(after)) return 'O';
        
        // Between/near digits, likely '0'
        if (/\d/.test(before) || /\d/.test(after)) return '0';
        
        return match;
      })
      // Fix m/rn/n confusion (very common in OCR)
      .replace(/rn/g, (match, offset) => {
        const context = text.substring(Math.max(0, offset - 5), offset + 8).toLowerCase();
        // Common medicine/dosage contexts where 'm' is likely
        if (context.includes('mg') || context.includes('min') || context.includes('mcg') ||
            context.includes('formin') || context.includes('amin') || context.includes('prazol')) {
          return 'm';
        }
        return match;
      })
      // Fix cl/d confusion
      .replace(/cl(?=[aeiou])/gi, (match, offset) => {
        const context = text.substring(offset, offset + 10).toLowerCase();
        if (context.startsWith('clonidine') || context.startsWith('clon')) return 'cl';
        return match;
      })
      // Fix vv/w confusion
      .replace(/vv/g, 'w')
      // Fix common character substitutions
      .replace(/\[/g, 'I')
      .replace(/\]/g, 'I')
      .replace(/\{/g, 'C')
      .replace(/\}/g, 'C')
      .replace(/\(/g, 'C')
      // Fix digit confusions
      .replace(/\b0(?=[a-z])/gi, 'O') // 0 before letter = O
      .replace(/\b1(?=[a-z])/gi, 'I') // 1 before letter = I
      .replace(/(?<=[a-z])1\b/gi, 'l') // 1 after letter at end = l
      .replace(/(?<=[a-z])0(?=[a-z])/gi, 'o') // 0 between letters = o
      // Fix spacing around hyphens
      .replace(/\s*-\s*/g, '-')
      // Fix common word patterns with better regex
      .replace(/\btabl?ets?\b/gi, 'Tablets')
      .replace(/\bcapsul?es?\b/gi, 'Capsules')
      .replace(/\bsustained\s+release\b/gi, 'Sustained Release')
      .replace(/\bretard\b/gi, 'Retard')
      .replace(/\bhydrochloride\b/gi, 'Hydrochloride')
      .replace(/\bmg\b/gi, 'mg')
      .replace(/\bmcg\b/gi, 'mcg')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    return processed;
  };

  // Advanced fuzzy match against known medicine database with multiple algorithms
  const findBestMedicineMatch = (extractedName: string): { name: string; confidence: number } => {
    const normalized = extractedName.toLowerCase().trim();
    let bestMatch = { name: extractedName, confidence: 0 };

    console.log('🔍 Finding match for:', normalized);
    console.log('📚 Custom training PERMANENTLY DISABLED');

    // Check against known medicines database ONLY with STRICT matching
    console.log('🏥 Checking built-in medicine database...');
    for (const [key, data] of Object.entries(KNOWN_MEDICINES)) {
      // Strategy 1: EXACT match only
      if (normalized === key || normalized === data.correct.toLowerCase()) {
        console.log(`✅ Built-in exact match: ${data.correct}`);
        return { name: data.correct, confidence: 1.0 };
      }

      // Strategy 2: Check EXACT variations only (no fuzzy matching)
      for (const variation of data.variations) {
        if (normalized === variation.toLowerCase()) {
          console.log(`✅ Built-in variation match: ${data.correct}`);
          return { name: data.correct, confidence: 0.95 };
        }
      }
    }

    // Check against extended trained names (exact only)
    if (EXTENDED_MEDICINE_MAP.has(normalized)) {
      const original = EXTENDED_MEDICINE_MAP.get(normalized)!;
      console.log(`✅ Extended exact match: ${original}`);
      return { name: original, confidence: 1.0 };
    }

    // Check against external trained names (exact only)
    const ext = externalExtendedMapRef.current;
    if (ext && ext.has(normalized)) {
      const original = ext.get(normalized)!;
      console.log(`✅ External exact match: ${original}`);
      return { name: original, confidence: 1.0 };
    }

    // NO fuzzy matching - return original text if no exact match
    console.log(`⚠️ No exact match found - using extracted text as-is`);
    return bestMatch;
  };

  // Phonetic similarity for sound-alike medicine names
  const calculatePhoneticSimilarity = (str1: string, str2: string): number => {
    // Simple phonetic normalization
    const phonetic = (s: string) => s
      .replace(/ph/g, 'f')
      .replace(/[aeiou]/g, '') // Remove vowels for consonant skeleton
      .replace(/[^a-z]/g, '');
    
    const p1 = phonetic(str1);
    const p2 = phonetic(str2);
    
    return calculateSimilarity(p1, p2);
  };

  // N-gram similarity for character sequence matching
  const calculateNGramSimilarity = (str1: string, str2: string, n = 2): number => {
    const getNGrams = (s: string) => {
      const grams = new Set<string>();
      for (let i = 0; i <= s.length - n; i++) {
        grams.add(s.substring(i, i + n));
      }
      return grams;
    };

    const grams1 = getNGrams(str1);
    const grams2 = getNGrams(str2);
    
    const intersection = new Set([...grams1].filter(x => grams2.has(x)));
    const union = new Set([...grams1, ...grams2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  };

  // Calculate similarity score between two strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance for fuzzy matching
  const getLevenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  // Intelligent text parsing for medicine information with multiple strategies
  const parseMedicineText = (text: string): { name: string; dosage?: string; notes?: string } => {
    // Preprocess the text
    const preprocessed = preprocessOCRText(text);
    const lines = preprocessed.split('\n').map(line => line.trim()).filter(Boolean);
    
    console.log('OCR Lines:', lines); // Debug
    
    // Enhanced dosage patterns
    const dosagePatterns = [
      /\b(\d+(?:\.\d+)?)\s*(mg|milligrams?)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(mcg|micrograms?|µg)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(g|grams?)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(ml|milliliters?)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(IU|international units?)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*%/gi,
    ];
    
    // CRITICAL: Words/phrases that indicate NOT a medicine name
    const exclusionPatterns = [
      /warning/i, /caution/i, /liver\s+damage/i, /allergic/i, /reaction/i,
      /prescription/i, /physician/i, /doctor/i, /medical/i, /practitioner/i,
      /store/i, /protect/i, /keep/i, /dry\s+place/i, /light/i, /moisture/i,
      /manufactured/i, /mfg/i, /batch/i, /exp/i, /expiry/i, /lot/i,
      /schedule\s+[a-z]/i, /drug/i, /tablet/i, /capsule/i, /only\s+under/i,
      /sold\s+by/i, /retail/i, /contains/i, /each/i, /dosage/i, /directed/i,
      /use\s+with/i, /extreme\s+caution/i, /side\s+effects/i, /adverse/i,
      /contraindication/i, /precaution/i, /registered/i, /trademark/i,
      /village/i, /district/i, /pin\s+code/i, /office/i, /road/i,
      /taking\s+more/i, /daily\s+dose/i, /may\s+cause/i, /serious/i,
      /\d{6}/,  // PIN codes
      /\d{3,}\s*mg/i, // Dosage mentions like "4000 mg"
    ];
    
    // STRONG INDICATORS of medicine names
    const brandNameIndicators = [
      /^[A-Z][A-Z]+$/,  // All caps single word (CYCLOPAM, ARKAMIN)
      /®/,  // Registered trademark
      /™/,  // Trademark
      /^Rx/i,  // Prescription symbol
    ];
    
    let bestName = '';
    let dosage = '';
    const notes: string[] = [];
    const candidates: Array<{ text: string; score: number; line: string }> = [];
    
    // ENHANCED STRATEGY: Multi-pass intelligent extraction
    for (const line of lines) {
      // Skip very short lines or pure numbers
      if (line.length < 3 || /^[0-9\s\-.,]+$/.test(line)) continue;
      
      const lowerLine = line.toLowerCase();
      
      // CRITICAL: Skip lines with exclusion patterns (warnings, instructions, etc.)
      if (exclusionPatterns.some(pattern => pattern.test(line))) {
        console.log(`❌ Excluded line: "${line.substring(0, 50)}..."`);
        continue;
      }
      
      let score = 0;
      
      // HUGE BONUS: All-caps single words (brand names like CYCLOPAM)
      const allCapsMatch = line.match(/^([A-Z]{4,})(?:\s*®)?$/);
      if (allCapsMatch) {
        score += 100; // Massive bonus for all-caps brand names
        console.log(`🎯 ALL-CAPS BRAND NAME FOUND: "${allCapsMatch[1]}" +100 points`);
      }
      
      // HUGE BONUS: Repeated brand names (CYCLOPAM appears multiple times)
      const repetitionCount = lines.filter(l => 
        l.toLowerCase().includes(lowerLine) || lowerLine.includes(l.toLowerCase())
      ).length;
      if (repetitionCount >= 3 && line.length >= 4 && line.length <= 15) {
        score += 80;
        console.log(`🔁 REPEATED NAME: "${line}" appears ${repetitionCount} times +80 points`);
      }
      
      // LARGE BONUS: Contains ® or ™ (registered brand names)
      if (/[®™]/.test(line)) {
        score += 60;
        console.log(`™ TRADEMARK FOUND: "${line}" +60 points`);
      }
      
      // Bonus for being early in text (brand names usually appear first)
      const lineIndex = lines.indexOf(line);
      if (lineIndex < 5) score += 25;
      if (lineIndex < 3) score += 15;
      
      // Bonus for capitalization patterns
      if (/^[A-Z]/.test(line)) score += 15;
      if (/^[A-Z][a-z]+$/.test(line)) score += 10; // Capitalized word
      if (/^[A-Z]+$/.test(line) && line.length >= 4 && line.length <= 12) score += 50; // All caps
      
      // Bonus for reasonable length (medicine names are typically 4-15 chars)
      const words = line.replace(/[®™]/g, '').split(/\s+/);
      if (words.length === 1 && line.length >= 4 && line.length <= 15) score += 30;
      if (words.length === 2 && line.length >= 6 && line.length <= 20) score += 20;
      
      // Penalty for containing excessive numbers
      const numberCount = (line.match(/\d/g) || []).length;
      if (numberCount > 2) score -= 20;
      
      // Penalty for being too long (instructions/warnings are long)
      if (line.length > 30) score -= 30;
      if (line.length > 50) score -= 50;
      
      // Extract clean text
      const cleanText = line
        .replace(/[®™]/g, '')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length >= 3 && score > 0) {
        candidates.push({ text: cleanText, score, line: line });
      }
      
      // Extract dosage from any line
      for (const pattern of dosagePatterns) {
        const match = line.match(pattern);
        if (match && !dosage) {
          dosage = match[0].replace(/\s+/g, ' ').trim();
        }
      }
    }
    
    // Sort candidates by score (highest first)
    candidates.sort((a, b) => b.score - a.score);
    
    console.log('🏆 Top 5 Name Candidates:', candidates.slice(0, 5).map(c => 
      `"${c.text}" (score: ${c.score})`
    ));
    
    if (candidates.length > 0) {
      const topCandidate = candidates[0];
      
      // Use the top candidate as medicine name
      bestName = topCandidate.text.toUpperCase();
      console.log(`✅ SELECTED: "${bestName}" with score ${topCandidate.score}`);
    }
    
    // Fallback: Search for first all-caps word if nothing found
    if (!bestName) {
      for (const line of lines) {
        const allCapsWords = line.match(/\b[A-Z]{4,}\b/g);
        if (allCapsWords && allCapsWords.length > 0) {
          bestName = allCapsWords[0];
          console.log(`🔤 Fallback: Found all-caps word "${bestName}"`);
          break;
        }
      }
    }
    
    // Final fallback
    if (!bestName && candidates.length > 0) {
      bestName = candidates[0].text;
    }
    
    return {
      name: bestName || 'Unknown Medicine',
      dosage: dosage || undefined,
      notes: notes.length > 0 ? notes.slice(0, 3).join(' • ') : undefined
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setImagePreview(imageData);
      setError(null);
      
      try {
        setIsScanning(true);
        setOcrProgress(0);
        // Real OCR with Tesseract.js
        const result = await performOCR(imageData);
        
        setExtractedData(result);
      } catch (err) {
        setError('Failed to process image. Please try again with a clearer image.');
        console.error('OCR Error:', err);
      } finally {
        setIsScanning(false);
        setOcrProgress(0);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions or upload an image.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const captureImage = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setImagePreview(imageData);
        stopCamera();
        
        // Process the captured image with real OCR
        setIsScanning(true);
        setOcrProgress(0);
        try {
          const result = await performOCR(imageData);
          setExtractedData(result);
        } catch (err) {
          setError('Failed to recognize text. Please try again with better lighting.');
          console.error('OCR Error:', err);
        } finally {
          setIsScanning(false);
          setOcrProgress(0);
        }
      }
    }
  };

  const handleUseMedicine = () => {
    if (extractedData && onMedicineExtracted && extractedData.name) {
      // Confirmation for low confidence OCR
      if (extractedData.ocrConfidence && extractedData.ocrConfidence < 85) {
        const confirmed = window.confirm(
          `OCR confidence is ${extractedData.ocrConfidence}%.\nPlease confirm the medicine name "${extractedData.name}" is correct before adding.`
        );
        if (!confirmed) {
          return;
        }
      }
      
      // Training disabled - no longer learning from corrections
      
      onMedicineExtracted({
        name: extractedData.name,
        dosage: extractedData.dosage,
        notes: extractedData.notes
      });
      reset();
    }
  };

  const reset = () => {
    setImagePreview(null);
    setExtractedData(null);
    setOriginalOCRText('');
    setError(null);
    stopCamera();
  };

  // Get training statistics
  const getTrainingStats = () => {
    const trainingData = loadCustomTrainingData();
    const totalMedicines = Object.keys(trainingData).length;
    const totalVariations = Object.values(trainingData).reduce((sum, data) => sum + data.variations.length, 0);
    const totalCorrections = Object.values(trainingData).reduce((sum, data) => sum + data.count, 0);
    
    return { totalMedicines, totalVariations, totalCorrections };
  };

  // Debug function to view training data
  const viewTrainingData = () => {
    const trainingData = loadCustomTrainingData();
    console.log('📚 ALL TRAINING DATA:', trainingData);
    console.log('📊 Statistics:', getTrainingStats());
    alert(`Training Data:\n\n${JSON.stringify(trainingData, null, 2)}\n\nCheck console for detailed view.`);
  };





  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          AI Medicine Scanner
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>Scan medicine labels to automatically extract information</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!imagePreview && !isCameraActive && (
          <div className="grid gap-4">
            <Button
              variant="default"
              size="lg"
              onClick={startCamera}
              className="w-full"
            >
              <Camera className="h-5 w-5 mr-2" />
              Open Camera
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Image
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Alert>
              <AlertDescription className="text-xs space-y-1">
                <p><strong>📸 Enhanced OCR Scanner</strong></p>
                <p>🤖 <strong>Powered by Tesseract.js</strong> - Real text recognition with AI</p>
                <p>🎯 <strong>Smart Parsing:</strong> Automatically detects medicine names & dosages</p>
                <p>✏️ <strong>Editable Results:</strong> Review and correct extracted text</p>
                <p className="pt-2 border-t mt-2"><strong>📋 Tips for Best Results:</strong></p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Use bright, natural lighting</li>
                  <li>Focus on the medicine name area</li>
                  <li>Keep label flat and parallel to camera</li>
                  <li>Avoid shadows and reflections</li>
                  <li>High contrast helps (dark text on light background)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {isCameraActive && (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-4 border-primary/50 w-3/4 h-3/4 rounded-lg" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                size="lg"
                onClick={captureImage}
                className="flex-1"
              >
                <Camera className="h-5 w-5 mr-2" />
                Capture
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={stopCamera}
                className="flex-1"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {imagePreview && (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={imagePreview}
                alt="Medicine label"
                className="w-full h-[300px] object-contain bg-muted"
              />
              {isScanning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-sm font-medium">Processing image with OCR...</p>
                    {ocrProgress > 0 && (
                      <div className="w-48 mx-auto">
                        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-white h-full transition-all duration-300"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                        <p className="text-xs mt-1">{ocrProgress}% complete</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {extractedData && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>Medicine Information Extracted</span>
                  {extractedData.ocrConfidence && (
                    <Badge variant={extractedData.ocrConfidence > 80 ? 'default' : extractedData.ocrConfidence > 60 ? 'secondary' : 'outline'}>
                      {extractedData.ocrConfidence}% OCR Accuracy
                    </Badge>
                  )}
                </AlertTitle>
                <AlertDescription className="space-y-3 mt-3">
                  {extractedData.rawText && (
                    <div className="p-2 bg-muted rounded text-xs">
                      <p className="font-semibold mb-1">Raw OCR Text:</p>
                      <p className="text-muted-foreground whitespace-pre-wrap max-h-20 overflow-y-auto">
                        {extractedData.rawText}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3 p-3 border rounded-lg bg-background">
                    <div>
                      <Label htmlFor="edit-name" className="text-xs font-semibold flex items-center justify-between">
                        <span>Medicine Name: <span className="text-muted-foreground font-normal">(Editable)</span></span>
                      </Label>
                      <Input
                        id="edit-name"
                        value={extractedData.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setExtractedData({ ...extractedData, name: newName });
                        }}
                        className="mt-1"
                        placeholder="Enter medicine name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="edit-dosage" className="text-xs font-semibold">
                        Dosage: <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="edit-dosage"
                        value={extractedData.dosage || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, dosage: e.target.value })}
                        className="mt-1"
                        placeholder="e.g., 500mg, 10ml"
                      />
                    </div>
                    
                    {extractedData.notes && (
                      <div>
                        <Label className="text-xs font-semibold">Additional Info:</Label>
                        <p className="text-sm mt-1 text-muted-foreground">{extractedData.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <div className={cn(
                      "px-2 py-1 rounded",
                      extractedData.confidence === 'high' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                      extractedData.confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                      'bg-red-500/10 text-red-700 dark:text-red-400'
                    )}>
                      Confidence: {extractedData.confidence}
                    </div>
                    <span className="text-muted-foreground">
                      • Review and edit if needed before adding
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {extractedData && extractedData.name && (
                <Button
                  variant="default"
                  onClick={handleUseMedicine}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add This Medicine
                </Button>
              )}
              <Button
                variant="outline"
                onClick={reset}
                className="flex-1"
              >
                Scan Another
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
