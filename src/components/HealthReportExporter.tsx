import { useState } from 'react';
import { Medicine, MedicineLog, GlucoseReading } from '@/lib/storage';
import { downloadHealthReport, openHealthReportInNewWindow, HealthReportOptions } from '@/lib/healthReport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, FileSpreadsheet, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface HealthReportExporterProps {
  medicines: Medicine[];
  medicineLogs: MedicineLog[];
  glucoseReadings: GlucoseReading[];
}

export function HealthReportExporter({ medicines, medicineLogs, glucoseReadings }: HealthReportExporterProps) {
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [clinician, setClinician] = useState('');
  const [clinic, setClinic] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [includeInventory, setIncludeInventory] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeGlucose, setIncludeGlucose] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeAdherence, setIncludeAdherence] = useState(true);
  const [includeInteractions, setIncludeInteractions] = useState(true);
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [includeVitals, setIncludeVitals] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');

  const buildOptions = (): HealthReportOptions => ({
    title: 'MediTrack Health Report',
    patient: {
      name: patientName || undefined,
      id: patientId || undefined,
      dob: patientDob || undefined,
      clinician: clinician || undefined,
      clinic: clinic || undefined,
      weight: weight || undefined,
      height: height || undefined,
      bloodType: bloodType || undefined,
      allergies: allergies || undefined,
    },
    dateRange: {
      from: fromDate ? new Date(fromDate) : undefined,
      to: toDate ? new Date(toDate) : undefined,
    },
    include: {
      inventory: includeInventory,
      history: includeHistory,
      glucose: includeGlucose,
      insights: includeInsights,
      adherence: includeAdherence,
      interactions: includeInteractions,
      schedule: includeSchedule,
      vitals: includeVitals,
    },
  });

  const handleDownloadHTML = () => {
    downloadHealthReport(medicines, medicineLogs, glucoseReadings, buildOptions());
  };

  const handlePreview = () => {
    openHealthReportInNewWindow(medicines, medicineLogs, glucoseReadings, buildOptions());
  };

  const handleDownloadPDF = () => {
    // Open in new window with print dialog
    const reportWindow = openHealthReportInNewWindow(medicines, medicineLogs, glucoseReadings, buildOptions());
    
    // Trigger print dialog after short delay to ensure content loaded
    if (reportWindow) {
      setTimeout(() => {
        reportWindow.print();
      }, 500);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Health Report Generator
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Generate comprehensive reports for healthcare providers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-primary/20 bg-primary/5">
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium text-xs sm:text-sm mb-1">Professional Health Reports</h4>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Generate detailed reports including medication history, glucose trends, stock levels, and insights.
              Perfect for sharing with your doctor or healthcare team.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-medium">Patient Info</div>
            <div className="grid gap-2">
              <Input placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="text-sm" />
                <Input placeholder="DOB (e.g. 1999-01-31)" value={patientDob} onChange={(e) => setPatientDob(e.target.value)} className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Clinician" value={clinician} onChange={(e) => setClinician(e.target.value)} className="text-sm" />
                <Input placeholder="Clinic" value={clinic} onChange={(e) => setClinic(e.target.value)} className="text-sm" />
              </div>
              {includeVitals && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Weight (e.g. 70 kg)" value={weight} onChange={(e) => setWeight(e.target.value)} className="text-sm" />
                    <Input placeholder="Height (e.g. 170 cm)" value={height} onChange={(e) => setHeight(e.target.value)} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Blood Type (e.g. O+)" value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="text-sm" />
                    <Input placeholder="Allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} className="text-sm" />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-medium">Date Range</div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-sm" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-sm" />
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Leave blank for full history.</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="inventory" checked={includeInventory} onCheckedChange={(checked) => setIncludeInventory(checked === true)} />
            <Label htmlFor="inventory" className="text-xs sm:text-sm font-normal cursor-pointer">Inventory</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="history" checked={includeHistory} onCheckedChange={(checked) => setIncludeHistory(checked === true)} />
            <Label htmlFor="history" className="text-xs sm:text-sm font-normal cursor-pointer">History</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="glucose" checked={includeGlucose} onCheckedChange={(checked) => setIncludeGlucose(checked === true)} />
            <Label htmlFor="glucose" className="text-xs sm:text-sm font-normal cursor-pointer">Glucose</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="schedule" checked={includeSchedule} onCheckedChange={(checked) => setIncludeSchedule(checked === true)} />
            <Label htmlFor="schedule" className="text-xs sm:text-sm font-normal cursor-pointer">Schedule</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="adherence" checked={includeAdherence} onCheckedChange={(checked) => setIncludeAdherence(checked === true)} />
            <Label htmlFor="adherence" className="text-xs sm:text-sm font-normal cursor-pointer">Adherence</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="interactions" checked={includeInteractions} onCheckedChange={(checked) => setIncludeInteractions(checked === true)} />
            <Label htmlFor="interactions" className="text-xs sm:text-sm font-normal cursor-pointer">Interactions</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="insights" checked={includeInsights} onCheckedChange={(checked) => setIncludeInsights(checked === true)} />
            <Label htmlFor="insights" className="text-xs sm:text-sm font-normal cursor-pointer">Insights</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="vitals" checked={includeVitals} onCheckedChange={(checked) => setIncludeVitals(checked === true)} />
            <Label htmlFor="vitals" className="text-xs sm:text-sm font-normal cursor-pointer">Vital Signs</Label>
          </div>
        </div>

        <div className="grid gap-2 sm:gap-3">
          <Button
            variant="default"
            size="default"
            onClick={handleDownloadPDF}
            className="w-full justify-start bg-green-600 hover:bg-green-700 h-auto py-3 sm:py-4 touch-target"
          >
            <Printer className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <div className="font-semibold text-sm sm:text-base">Save as PDF</div>
              <div className="text-[10px] sm:text-xs opacity-90 truncate">Opens print dialog to save as PDF</div>
            </div>
          </Button>

          <Button
            variant="default"
            size="default"
            onClick={handlePreview}
            className="w-full justify-start h-auto py-3 sm:py-4 touch-target"
          >
            <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <div className="font-semibold text-sm sm:text-base">Preview Report</div>
              <div className="text-[10px] sm:text-xs opacity-90 truncate">View report in new window</div>
            </div>
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={handleDownloadHTML}
            className="w-full justify-start h-auto py-3 sm:py-4 touch-target"
          >
            <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <div className="font-semibold text-sm sm:text-base">Download HTML Report</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">Printable, shareable format</div>
            </div>
          </Button>
        </div>

        <div className="border-t pt-3 sm:pt-4">
          <h4 className="font-semibold mb-2 text-xs sm:text-sm">Report Includes:</h4>
          <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-primary shrink-0">✓</span>
              <span className="flex-1">Complete medication inventory with stock levels</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary shrink-0">✓</span>
              <span className="flex-1">Detailed medication history with timestamps</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary shrink-0">✓</span>
              <span className="flex-1">Glucose readings and trend analysis</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary shrink-0">✓</span>
              <span className="flex-1">Low stock alerts and recommendations</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary shrink-0">✓</span>
              <span className="flex-1">Professional formatting for healthcare providers</span>
            </li>
          </ul>
        </div>

        <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-primary/20 bg-primary/5">
          <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> After previewing, use the print button to save as PDF or print directly.
            Reports are optimized for printing with clean, professional layouts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
