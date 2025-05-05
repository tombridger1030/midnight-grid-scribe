import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { predefinedMetrics, TrackerData } from '../src/lib/storage';

// Helper to parse a date string like "Mon, Apr 21" into YYYY-MM-DD assuming 2025
function parseDate(raw: string): string | null {
  const parts = raw.split(',').map(p => p.trim());
  if (parts.length < 2) return null;
  const dateStr = parts[1] + ' 2025';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

(async () => {
  const csvPath = path.resolve(__dirname, '../Midnight Log Daily 2025.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    process.exit(1);
  }
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse<{ [key: string]: string }>(csvContent, { header: true, skipEmptyLines: true });
  const rows = parsed.data;

  const output: TrackerData = {
    metrics: predefinedMetrics.map(m => ({ ...m, values: {} })),
    dates: []
  };
  const dateSet = new Set<string>();

  for (const row of rows) {
    const rawDate = row['Date'];
    const iso = rawDate ? parseDate(rawDate) : null;
    if (!iso) continue;
    dateSet.add(iso);

    // deepWork: sum DW1 mins + DW2 mins as hours
    const dw1 = parseFloat(row['DW1 mins'] || '0');
    const dw2 = parseFloat(row['DW2 mins'] || '0');
    const deepWorkVal = +((dw1 + dw2) / 60).toFixed(2);
    output.metrics.find(m => m.id === 'deepWork')!.values[iso] = deepWorkVal;

    // sleepTime and wakingTime
    const sleepTime = row['Sleep']?.trim();
    if (sleepTime) output.metrics.find(m => m.id === 'sleepTime')!.values[iso] = sleepTime;
    const wakeTime = row['Wake']?.trim();
    if (wakeTime) output.metrics.find(m => m.id === 'wakingTime')!.values[iso] = wakeTime;
    if (sleepTime && wakeTime) {
      const [sh, sm] = sleepTime.split(':').map(Number);
      const [wh, wm] = wakeTime.split(':').map(Number);
      const sleepMs = ((24 - sh + wh) * 60 + (wm - sm)) * 60 * 1000;
      const hrs = +(sleepMs / (1000 * 60 * 60)).toFixed(2);
      output.metrics.find(m => m.id === 'sleepHours')!.values[iso] = hrs;
    }

    // other metrics
    const weight = parseFloat(row['Weight'] || '0');
    if (weight) output.metrics.find(m => m.id === 'dailyWeight')!.values[iso] = weight;
    const hrv = parseFloat(row['HRV'] || '0');
    if (hrv) output.metrics.find(m => m.id === 'hrv')!.values[iso] = hrv;
    const recovery = parseFloat(row['Recovery'] || '0');
    if (recovery) output.metrics.find(m => m.id === 'recovery')!.values[iso] = recovery;
    const cs = row['Cold Shower'];
    if (cs !== undefined && cs !== '') output.metrics.find(m => m.id === 'coldShower')!.values[iso] = Boolean(parseFloat(cs));
    const nd = row['No Dopamine'];
    if (nd !== undefined && nd !== '') output.metrics.find(m => m.id === 'noDopamine')!.values[iso] = Boolean(parseFloat(nd));
    const cal = parseFloat(row['CalsBurn'] || '0');
    if (cal) output.metrics.find(m => m.id === 'calories')!.values[iso] = cal;
    const prot = parseFloat(row['Protein Intake'] || '0');
    if (prot) output.metrics.find(m => m.id === 'proteinIntake')!.values[iso] = prot;
  }

  output.dates = Array.from(dateSet).sort();
  const outPath = path.resolve(__dirname, '../src/lib/importedData.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Imported ${output.dates.length} days into ${outPath}`);
})(); 