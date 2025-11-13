import { Medicine, MedicineLog, GlucoseReading } from './storage';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { analyzeMedicineInventory, calculateAdherenceRate, generateInsights } from './predictiveAnalytics';
import { findInteractions } from './drugInteractions';

export interface HealthReportOptions {
  title?: string;
  patient?: {
    name?: string;
    id?: string;
    dob?: string; // ISO or display-ready
    clinician?: string;
    clinic?: string;
    weight?: string;
    height?: string;
    bloodType?: string;
    allergies?: string;
  };
  dateRange?: { from?: Date | string; to?: Date | string };
  include?: {
    inventory?: boolean;
    history?: boolean;
    glucose?: boolean;
    insights?: boolean;
    adherence?: boolean;
    interactions?: boolean;
    schedule?: boolean;
    vitals?: boolean;
  };
}

function parseDate(d?: Date | string): Date | undefined {
  if (!d) return undefined;
  return typeof d === 'string' ? new Date(d) : d;
}

function filterByDateRange<T extends { timestamp: string | number | Date }>(
  items: T[],
  range?: { from?: Date | string; to?: Date | string }
): T[] {
  if (!range?.from && !range?.to) return items;
  const from = range?.from ? startOfDay(parseDate(range.from)!) : undefined;
  const to = range?.to ? endOfDay(parseDate(range.to)!) : undefined;
  return items.filter((i) => {
    const t = new Date(i.timestamp);
    if (from && isBefore(t, from)) return false;
    if (to && isAfter(t, to)) return false;
    return true;
  });
}

function buildSparklineSVG(values: number[], width = 520, height = 120, padding = 8): string {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const step = innerW / Math.max(1, values.length - 1);
  const points = values.map((v, i) => {
    const x = padding + i * step;
    const y = padding + innerH - ((v - min) / span) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const avgY = padding + innerH - ((avg - min) / span) * innerH;
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Glucose trend">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
      <polyline fill="none" stroke="#93c5fd" stroke-width="2" points="${points.join(' ')}" />
      <line x1="${padding}" y1="${avgY.toFixed(1)}" x2="${width - padding}" y2="${avgY.toFixed(1)}" stroke="#ef4444" stroke-dasharray="4,4" />
      <text x="${width - padding}" y="${Math.max(12, avgY - 6).toFixed(1)}" font-size="10" text-anchor="end" fill="#ef4444">Avg ${avg.toFixed(1)}</text>
    </svg>
  `;
}

// Generate a comprehensive health report in HTML format
export function generateHealthReportHTML(
  medicines: Medicine[],
  medicineLogs: MedicineLog[],
  glucoseReadings: GlucoseReading[],
  options?: HealthReportOptions
): string {
  const now = new Date();
  const include = {
    inventory: true,
    history: true,
    glucose: true,
    insights: true,
    adherence: true,
    interactions: true,
    schedule: true,
    vitals: true,
    ...(options?.include || {}),
  };

  const range = options?.dateRange;
  const filteredLogs = filterByDateRange(medicineLogs, range);
  const filteredReadings = filterByDateRange(glucoseReadings, range);

  const title = options?.title || 'MediTrack Health Report';
  const patient = options?.patient || {};
  const periodText = range?.from || range?.to
    ? `${range?.from ? format(parseDate(range.from)!, 'MMM dd, yyyy') : 'Start'} → ${range?.to ? format(parseDate(range.to)!, 'MMM dd, yyyy') : 'Today'}`
    : 'Comprehensive Medical History';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${format(now, 'MMMM dd, yyyy')}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
        }
        
        .report-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            border-bottom: 4px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #3b82f6;
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        .header .meta {
            color: #666;
            font-size: 14px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h2 {
            color: #1e40af;
            font-size: 24px;
            margin-bottom: 15px;
            border-left: 4px solid #3b82f6;
            padding-left: 15px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        
        .stat-card .label {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .stat-card .value {
            color: #1e40af;
            font-size: 28px;
            font-weight: bold;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        
        th {
            background: #f1f5f9;
            color: #1e40af;
            font-weight: 600;
        }
        
        tr:hover {
            background: #f8fafc;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .badge-low {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .badge-medium {
            background: #fef3c7;
            color: #92400e;
        }
        
        .badge-good {
            background: #d1fae5;
            color: #065f46;
        }
        
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .alert-warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            color: #92400e;
        }
        
        .alert-info {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            color: #1e40af;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .report-container {
                box-shadow: none;
                padding: 20px;
            }
            
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
      <div class="header">
        <h1>📋 ${title}</h1>
        <div class="meta" style="display:flex; gap:24px; flex-wrap:wrap;">
          <p><strong>Generated:</strong> ${format(now, 'MMMM dd, yyyy \'at\' HH:mm')}</p>
          <p><strong>Report Period:</strong> ${periodText}</p>
          ${patient.name ? `<p><strong>Patient:</strong> ${patient.name}</p>` : ''}
          ${patient.id ? `<p><strong>ID:</strong> ${patient.id}</p>` : ''}
          ${patient.dob ? `<p><strong>DOB:</strong> ${patient.dob}</p>` : ''}
          ${patient.clinician ? `<p><strong>Clinician:</strong> ${patient.clinician}</p>` : ''}
          ${patient.clinic ? `<p><strong>Clinic:</strong> ${patient.clinic}</p>` : ''}
          ${patient.weight ? `<p><strong>Weight:</strong> ${patient.weight}</p>` : ''}
          ${patient.height ? `<p><strong>Height:</strong> ${patient.height}</p>` : ''}
          ${patient.bloodType ? `<p><strong>Blood Type:</strong> ${patient.bloodType}</p>` : ''}
          ${patient.allergies ? `<p><strong>Allergies:</strong> ${patient.allergies}</p>` : ''}
        </div>
      </div>

        <!-- Summary Statistics -->
        <div class="section">
          <h2>📊 Summary Statistics</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="label">Total Medicines</div>
                    <div class="value">${medicines.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Medication Logs</div>
              <div class="value">${filteredLogs.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Glucose Readings</div>
              <div class="value">${filteredReadings.length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Low Stock Items</div>
                    <div class="value">${medicines.filter(m => m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < 20).length}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Avg Daily Glucose</div>
                    <div class="value">${filteredReadings.length > 0 ? (filteredReadings.reduce((sum, r) => sum + r.value, 0) / filteredReadings.length).toFixed(1) : 'N/A'}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Active Medications</div>
                    <div class="value">${medicines.filter(m => m.schedule).length}</div>
                </div>
            </div>
        </div>

        <!-- Medication Schedule Overview -->
        ${include.schedule ? `
        <div class="section">
          <h2>🕐 Daily Medication Schedule</h2>
          ${generateScheduleOverview(medicines)}
        </div>
        ` : ''}

        <!-- Current Medications -->
        ${include.inventory ? `
        <div class="section">
          <h2>💊 Current Medication Inventory</h2>
          ${generateMedicineInventoryTable(medicines)}
        </div>
        ` : ''}

        <!-- Medication History -->
        ${include.history ? `
        <div class="section">
          <h2>📅 Medication History${range?.from || range?.to ? '' : ' (Last 30 entries)'} </h2>
          ${generateMedicationHistoryTable((range?.from || range?.to) ? filteredLogs : medicineLogs.slice(-30).reverse())}
        </div>
        ` : ''}

        <!-- Glucose Readings -->
        ${include.glucose && filteredReadings.length > 0 ? `
        <div class="section">
          <h2>🩸 Glucose Readings${range?.from || range?.to ? '' : ' (Last 30 entries)'} </h2>
          ${generateGlucoseTable((range?.from || range?.to) ? filteredReadings : glucoseReadings.slice(-30).reverse())}
          ${generateGlucoseAnalysis(filteredReadings)}
          <div style="margin-top:16px">${buildSparklineSVG(filteredReadings.map(r => r.value))}</div>
        </div>
        ` : ''}

        ${include.adherence ? `
        <div class="section">
          <h2>📈 Adherence Summary</h2>
          ${generateAdherenceTable(medicines, filteredLogs)}
        </div>
        ` : ''}

        ${include.interactions ? `
        <div class="section">
          <h2>🔄 Potential Drug Interactions</h2>
          ${generateInteractionsSection(medicines)}
        </div>
        ` : ''}

        <!-- Alerts and Recommendations -->
        ${include.insights ? `
        <div class="section">
          <h2>⚠️ Alerts & Recommendations</h2>
          ${generateAlerts(medicines)}
          ${generateInsightsSection(medicines, filteredLogs)}
        </div>
        ` : ''}

        <div class="footer">
            <p><strong>MediTrack 2.0</strong> - Personal Medicine & Glucose Tracking System</p>
            <p>This report is for personal health management. Always consult with healthcare professionals for medical decisions.</p>
            <p>Report ID: ${Date.now()}</p>
        </div>
    </div>

    <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            🖨️ Print Report
        </button>
    </div>
</body>
</html>
  `;
}

function generateMedicineInventoryTable(medicines: Medicine[]): string {
  if (medicines.length === 0) {
    return '<p class="alert alert-info">No medicines in inventory.</p>';
  }

  const rows = medicines.map(med => {
    const stockPercent = med.totalStock > 0 ? (med.currentStock / med.totalStock) * 100 : 0;
    const stockBadge = stockPercent < 20 ? 'badge-low' : stockPercent < 50 ? 'badge-medium' : 'badge-good';
    
    return `
      <tr>
        <td><strong>${med.name}</strong></td>
        <td>${med.dosage}</td>
        <td>${med.currentStock} / ${med.totalStock}</td>
        <td><span class="badge ${stockBadge}">${stockPercent.toFixed(0)}%</span></td>
        <td>${med.schedule ? formatSchedule(med.schedule) : 'As needed'}</td>
        <td>${med.category ? formatCategory(med.category) : 'N/A'}</td>
      </tr>
    `;
  }).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Medicine Name</th>
          <th>Dosage</th>
          <th>Stock</th>
          <th>Stock %</th>
          <th>Schedule</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateMedicationHistoryTable(logs: MedicineLog[]): string {
  if (logs.length === 0) {
    return '<p class="alert alert-info">No medication history available.</p>';
  }

  const rows = logs.map(log => `
    <tr>
      <td>${format(new Date(log.timestamp), 'MMM dd, yyyy')}</td>
      <td>${format(new Date(log.timestamp), 'HH:mm')}</td>
      <td><strong>${log.medicineName}</strong></td>
      <td>${log.quantity}</td>
      <td>${log.notes || '-'}</td>
    </tr>
  `).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Medicine</th>
          <th>Quantity</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateGlucoseTable(readings: GlucoseReading[]): string {
  const rows = readings.map(reading => {
    const level = reading.value < 70 ? 'badge-low' : reading.value > 130 ? 'badge-low' : 'badge-good';
    
    return `
      <tr>
        <td>${format(new Date(reading.timestamp), 'MMM dd, yyyy')}</td>
        <td>${format(new Date(reading.timestamp), 'HH:mm')}</td>
        <td><span class="badge ${level}">${reading.value} ${reading.unit || 'mg/dL'}</span></td>
        <td>${reading.measurementType || 'Random'}</td>
        <td>${reading.notes || '-'}</td>
      </tr>
    `;
  }).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Reading</th>
          <th>Type</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function generateGlucoseAnalysis(readings: GlucoseReading[]): string {
  if (readings.length === 0) return '';

  const values = readings.map(r => r.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return `
    <div style="margin-top: 20px;">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">Average</div>
          <div class="value">${avg.toFixed(1)} mg/dL</div>
        </div>
        <div class="stat-card">
          <div class="label">Minimum</div>
          <div class="value">${min} mg/dL</div>
        </div>
        <div class="stat-card">
          <div class="label">Maximum</div>
          <div class="value">${max} mg/dL</div>
        </div>
      </div>
    </div>
  `;
}

function generateAdherenceTable(medicines: Medicine[], logs: MedicineLog[]): string {
  if (!medicines.length) return '<p class="alert alert-info">No medicines to analyze.</p>';
  const rows = medicines.map((m) => {
    // Estimate expected doses from schedule
    let expectedDaily = 1;
    if (m.schedule === 'three_times') expectedDaily = 3;
    else if (m.schedule && m.schedule.includes('_')) expectedDaily = 2;
    const a = calculateAdherenceRate(m, logs, expectedDaily);
    const badge = a.adherenceRate >= 95 ? 'badge-good' : a.adherenceRate >= 80 ? 'badge-medium' : 'badge-low';
    return `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td>${m.schedule ? String(m.schedule).replace(/_/g, ' & ') : 'N/A'}</td>
        <td>${a.expectedDoses}</td>
        <td>${a.actualDoses}</td>
        <td><span class="badge ${badge}">${a.adherenceRate.toFixed(0)}%</span></td>
      </tr>
    `;
  }).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Medicine</th>
          <th>Schedule</th>
          <th>Expected Doses</th>
          <th>Taken</th>
          <th>Adherence</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function generateInteractionsSection(medicines: Medicine[]): string {
  const names = medicines.map(m => m.name);
  const interactions = findInteractions(names);
  if (!interactions.length) {
    return '<p class="alert alert-info">No common interactions detected among current medicines.</p>';
  }
  const rows = interactions.map(i => `
    <tr>
      <td>${i.drug1}</td>
      <td>${i.drug2}</td>
      <td>${i.severity}</td>
      <td>${i.description}</td>
      <td>${i.recommendation}</td>
    </tr>
  `).join('');
  return `
    <table>
      <thead>
        <tr>
          <th>Drug 1</th>
          <th>Drug 2</th>
          <th>Severity</th>
          <th>Description</th>
          <th>Recommendation</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function generateInsightsSection(medicines: Medicine[], logs: MedicineLog[]): string {
  const insights = generateInsights(medicines, logs);
  if (!insights.length) return '';
  return `
    <ul style="margin-top: 12px; padding-left: 16px;">
      ${insights.map(i => `<li style="margin:6px 0;">${i}</li>`).join('')}
    </ul>
  `;
}

function generateAlerts(medicines: Medicine[]): string {
  const alerts: string[] = [];

  // Low stock alerts
  const lowStock = medicines.filter(m => m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < 20);
  if (lowStock.length > 0) {
    alerts.push(`
      <div class="alert alert-warning">
        <strong>⚠️ Low Stock Alert:</strong> The following medicines are running low: 
        ${lowStock.map(m => `<strong>${m.name}</strong> (${m.currentStock} remaining)`).join(', ')}
      </div>
    `);
  }

  // Out of stock alerts
  const outOfStock = medicines.filter(m => m.currentStock === 0);
  if (outOfStock.length > 0) {
    alerts.push(`
      <div class="alert alert-warning">
        <strong>🚨 Out of Stock:</strong> ${outOfStock.map(m => m.name).join(', ')}
      </div>
    `);
  }

  if (alerts.length === 0) {
    alerts.push(`
      <div class="alert alert-info">
        <strong>✅ All Good:</strong> No critical alerts at this time. All medicines are adequately stocked.
      </div>
    `);
  }

  return alerts.join('');
}

function formatSchedule(schedule: string): string {
  const scheduleMap: { [key: string]: string } = {
    'morning': 'Morning',
    'noon': 'Noon',
    'night': 'Night',
    'morning_noon': 'Morning & Noon',
    'morning_night': 'Morning & Night',
    'noon_night': 'Noon & Night',
    'three_times': 'Three Times Daily'
  };
  return scheduleMap[schedule] || schedule;
}

function formatCategory(category: string): string {
  const categoryMap: { [key: string]: string } = {
    'pain_relief': 'Pain Relief',
    'diabetes': 'Diabetes',
    'heart': 'Heart',
    'blood_pressure': 'Blood Pressure',
    'antibiotic': 'Antibiotic',
    'vitamin': 'Vitamin',
    'other': 'Other'
  };
  return categoryMap[category] || category;
}

function generateScheduleOverview(medicines: Medicine[]): string {
  const morningMeds = medicines.filter(m => m.schedule && (m.schedule === 'morning' || m.schedule === 'morning_noon' || m.schedule === 'morning_night' || m.schedule === 'three_times'));
  const noonMeds = medicines.filter(m => m.schedule && (m.schedule === 'noon' || m.schedule === 'morning_noon' || m.schedule === 'noon_night' || m.schedule === 'three_times'));
  const nightMeds = medicines.filter(m => m.schedule && (m.schedule === 'night' || m.schedule === 'morning_night' || m.schedule === 'noon_night' || m.schedule === 'three_times'));

  const scheduleHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
      <div style="padding: 16px; border: 2px solid #dbeafe; border-radius: 8px; background: #eff6ff;">
        <h3 style="color: #1e40af; margin-bottom: 12px;">🌅 Morning (${morningMeds.length})</h3>
        ${morningMeds.length > 0 ? `
          <ul style="padding-left: 20px; margin: 0;">
            ${morningMeds.map(m => `<li style="margin: 4px 0;"><strong>${m.name}</strong> - ${m.dosage || 'As prescribed'}</li>`).join('')}
          </ul>
        ` : '<p style="color: #64748b; font-style: italic;">No morning medications</p>'}
      </div>

      <div style="padding: 16px; border: 2px solid #fed7aa; border-radius: 8px; background: #fff7ed;">
        <h3 style="color: #c2410c; margin-bottom: 12px;">☀️ Noon (${noonMeds.length})</h3>
        ${noonMeds.length > 0 ? `
          <ul style="padding-left: 20px; margin: 0;">
            ${noonMeds.map(m => `<li style="margin: 4px 0;"><strong>${m.name}</strong> - ${m.dosage || 'As prescribed'}</li>`).join('')}
          </ul>
        ` : '<p style="color: #64748b; font-style: italic;">No noon medications</p>'}
      </div>

      <div style="padding: 16px; border: 2px solid #e9d5ff; border-radius: 8px; background: #faf5ff;">
        <h3 style="color: #7c3aed; margin-bottom: 12px;">🌙 Night (${nightMeds.length})</h3>
        ${nightMeds.length > 0 ? `
          <ul style="padding-left: 20px; margin: 0;">
            ${nightMeds.map(m => `<li style="margin: 4px 0;"><strong>${m.name}</strong> - ${m.dosage || 'As prescribed'}</li>`).join('')}
          </ul>
        ` : '<p style="color: #64748b; font-style: italic;">No night medications</p>'}
      </div>
    </div>

    <div style="margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 6px;">
      <p style="margin: 0; color: #475569;"><strong>Total Scheduled Medications:</strong> ${new Set([...morningMeds, ...noonMeds, ...nightMeds]).size} unique medicines across ${morningMeds.length + noonMeds.length + nightMeds.length} doses per day</p>
    </div>
  `;

  return scheduleHTML;
}

// Export as downloadable HTML file
export function downloadHealthReport(
  medicines: Medicine[],
  medicineLogs: MedicineLog[],
  glucoseReadings: GlucoseReading[],
  options?: HealthReportOptions
): void {
  const html = generateHealthReportHTML(medicines, medicineLogs, glucoseReadings, options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meditrack-health-report-${format(new Date(), 'yyyy-MM-dd')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Open report in new window
export function openHealthReportInNewWindow(
  medicines: Medicine[],
  medicineLogs: MedicineLog[],
  glucoseReadings: GlucoseReading[],
  options?: HealthReportOptions
): void {
  const html = generateHealthReportHTML(medicines, medicineLogs, glucoseReadings, options);
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}
