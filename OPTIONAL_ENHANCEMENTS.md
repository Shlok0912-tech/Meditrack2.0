# 🔧 Optional Enhancements Guide

This guide shows how to add optional external libraries to enhance MediTrack 2.0 features.

---

## 📸 1. Enable Full OCR for Medicine Scanner

### What it does:
Converts medicine label photos to text automatically using OCR (Optical Character Recognition).

### Installation:
```bash
npm install tesseract.js
```

### Implementation:
Edit `/src/components/MedicineScanner.tsx`:

```typescript
// Add import at top
import Tesseract from 'tesseract.js';

// Replace simulateOCR function with:
const extractTextFromImage = async (imageData: string): Promise<any> => {
  try {
    const result = await Tesseract.recognize(
      imageData,
      'eng',
      {
        logger: (m) => console.log(m)
      }
    );

    const text = result.data.text;
    
    // Extract medicine name (usually first line)
    const lines = text.split('\n').filter(l => l.trim());
    const name = lines[0] || 'Unknown Medicine';
    
    // Look for dosage pattern (e.g., "500mg", "10mg")
    const dosageMatch = text.match(/\d+\s*mg|ml|g/i);
    const dosage = dosageMatch ? dosageMatch[0] : '';
    
    return {
      name,
      dosage,
      notes: `Scanned: ${text.substring(0, 100)}...`
    };
  } catch (error) {
    throw new Error('OCR processing failed');
  }
};

// Then in handleFileUpload, replace simulateOCR with:
const result = await extractTextFromImage(imageData);
setExtractedData(result);
```

---

## 📄 2. Enhanced PDF Export (Optional)

### What it does:
Generate actual PDF files instead of HTML reports.

### Installation:
```bash
npm install jspdf html2canvas
```

### Implementation:
Edit `/src/lib/healthReport.ts`:

```typescript
// Add imports
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Add new function:
export async function exportToPDF(
  medicines: Medicine[],
  medicineLogs: MedicineLog[],
  glucoseReadings: GlucoseReading[]
): Promise<void> {
  // Generate HTML first
  const html = generateHealthReportHTML(medicines, medicineLogs, glucoseReadings);
  
  // Create temporary container
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.width = '800px';
  document.body.appendChild(container);
  
  try {
    // Convert to canvas
    const canvas = await html2canvas(container);
    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`meditrack-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
```

Then update `/src/components/HealthReportExporter.tsx`:

```typescript
import { exportToPDF } from '@/lib/healthReport';

// Add new button:
<Button onClick={() => exportToPDF(medicines, medicineLogs, glucoseReadings)}>
  <Download className="h-5 w-5 mr-2" />
  Download PDF
</Button>
```

---

## 🗄️ 3. Cloud Backup (Firebase Example)

### What it does:
Sync data across devices using cloud storage.

### Installation:
```bash
npm install firebase
```

### Implementation:

1. Create `/src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

2. Create `/src/lib/cloudSync.ts`:

```typescript
import { db } from './firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, Medicine, MedicineLog, GlucoseReading } from './storage';

export async function syncToCloud(userId: string) {
  const medicines = await storage.getMedicines();
  const logs = await storage.getMedicineLogs();
  const glucose = await storage.getGlucoseReadings();
  
  await setDoc(doc(db, 'users', userId), {
    medicines,
    logs,
    glucose,
    lastSync: new Date().toISOString()
  });
}

export async function syncFromCloud(userId: string) {
  const docSnap = await getDoc(doc(db, 'users', userId));
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    // Update local storage
    localStorage.setItem('med_tracker_medicines', JSON.stringify(data.medicines));
    localStorage.setItem('med_tracker_logs', JSON.stringify(data.logs));
    localStorage.setItem('med_tracker_glucose', JSON.stringify(data.glucose));
  }
}
```

3. Add sync buttons in Settings panel.

---

## 🔔 4. Push Notifications

### What it does:
Send reminder notifications even when app is closed.

### Implementation:

1. Update `/public/sw.js` (Service Worker):

```javascript
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

2. Request permission in app:

```typescript
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'YOUR_VAPID_KEY'
      });
      
      // Send subscription to server
      console.log('Subscribed:', subscription);
    }
  }
}
```

---

## 📊 5. Advanced Charts with Recharts

### What it does:
Add beautiful interactive charts for data visualization.

### Installation:
```bash
npm install recharts
```

### Implementation:

Create `/src/components/AdvancedCharts.tsx`:

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { GlucoseReading } from '@/lib/storage';

export function GlucoseChart({ readings }: { readings: GlucoseReading[] }) {
  const data = readings.map(r => ({
    date: new Date(r.timestamp).toLocaleDateString(),
    glucose: r.value
  }));

  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="glucose" stroke="#3b82f6" />
    </LineChart>
  );
}
```

---

## 🌐 6. Google Sheets Integration

### What it does:
Export data directly to Google Sheets for analysis.

### Installation:
```bash
npm install gapi-script
```

### Implementation:

```typescript
import { gapi } from 'gapi-script';

const CLIENT_ID = 'YOUR_CLIENT_ID';
const API_KEY = 'YOUR_API_KEY';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export async function exportToGoogleSheets(medicines: Medicine[]) {
  await gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    scope: SCOPES
  });

  const auth = await gapi.auth2.getAuthInstance().signIn();
  
  const data = medicines.map(m => [
    m.name,
    m.dosage,
    m.currentStock,
    m.totalStock
  ]);

  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: 'YOUR_SHEET_ID',
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    resource: { values: data }
  });
}
```

---

## 🧪 7. Testing Setup

### Unit Tests with Vitest:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Create `src/__tests__/predictiveAnalytics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { analyzeConsumptionPattern } from '@/lib/predictiveAnalytics';

describe('Predictive Analytics', () => {
  it('should calculate average daily consumption', () => {
    const medicine = { id: '1', name: 'Test', totalStock: 100, currentStock: 50 };
    const logs = [
      { medicineId: '1', quantity: 2, timestamp: new Date().toISOString() }
    ];
    
    const result = analyzeConsumptionPattern(medicine, logs);
    expect(result.averageDailyConsumption).toBeGreaterThan(0);
  });
});
```

---

## 🎨 8. Custom Themes

Add theme customization:

```typescript
// src/lib/themes.ts
export const themes = {
  default: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    background: '#ffffff'
  },
  medical: {
    primary: '#10b981',
    secondary: '#059669',
    background: '#f0fdf4'
  },
  dark: {
    primary: '#60a5fa',
    secondary: '#a78bfa',
    background: '#0f172a'
  }
};

export function applyTheme(themeName: keyof typeof themes) {
  const theme = themes[themeName];
  document.documentElement.style.setProperty('--primary', theme.primary);
  document.documentElement.style.setProperty('--secondary', theme.secondary);
  document.documentElement.style.setProperty('--background', theme.background);
}
```

---

## 📱 9. Progressive Web App Enhancements

Update `/public/manifest.webmanifest`:

```json
{
  "name": "MediTrack 2.0",
  "short_name": "MediTrack",
  "description": "AI-Powered Medicine Tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Add Medicine",
      "url": "/?action=add-medicine",
      "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }]
    },
    {
      "name": "Voice Assistant",
      "url": "/?tab=voice",
      "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }]
    }
  ]
}
```

---

## 🔒 10. Data Encryption

Add encryption for sensitive data:

```bash
npm install crypto-js
```

```typescript
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'your-secret-key'; // Store securely!

export function encryptData(data: any): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}

export function decryptData(encrypted: string): any {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

// Use in storage.ts:
export const storage = {
  async getMedicines(): Promise<Medicine[]> {
    const encrypted = localStorage.getItem(KEYS.medicines);
    if (!encrypted) return [];
    return decryptData(encrypted);
  },
  
  async addMedicine(medicine: Omit<Medicine, 'id' | 'createdAt'>): Promise<void> {
    const medicines = await this.getMedicines();
    medicines.push({ ...medicine, id: generateId(), createdAt: new Date().toISOString() });
    localStorage.setItem(KEYS.medicines, encryptData(medicines));
  }
};
```

---

## ✅ Implementation Priority

Recommended order:

1. **High Priority:**
   - ✅ OCR (Tesseract.js) - Most user value
   - ✅ Advanced Charts - Better visualization
   - ✅ PDF Export - Professional reports

2. **Medium Priority:**
   - ⚡ Push Notifications - Better UX
   - ⚡ Cloud Sync - Multi-device support
   - ⚡ Data Encryption - Security

3. **Low Priority:**
   - 📊 Google Sheets - Nice to have
   - 🎨 Custom Themes - Aesthetic
   - 🧪 Testing - Development aid

---

## 🎯 Quick Start for OCR

Most requested feature - here's the fastest way:

```bash
# 1. Install
npm install tesseract.js

# 2. Update MedicineScanner.tsx (line 20)
import Tesseract from 'tesseract.js';

# 3. Replace simulateOCR function
# (See section 1 above)

# 4. Test with a medicine photo!
```

---

**Note:** All these enhancements are OPTIONAL. MediTrack 2.0 works perfectly without them!

Choose what you need based on your requirements. 🚀
