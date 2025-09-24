import React, { useRef, useState } from 'react';
import { saveContentItemWithMetrics } from '@/lib/storage';

// Lazy import to keep initial bundle smaller
let XLSX: any;

type ImporterProps = {
  defaultPlatform?: 'youtube' | 'tiktok' | 'instagram';
  defaultFormat?: 'long_form' | 'short';
  onImported?: (count: number) => void;
};

type ParsedRow = {
  Date?: string | number;
  'Video Name'?: string;
  Account?: string;
  Caption?: string;
  Script?: string;
  Views?: number;
  Shares?: number;
  Saves?: number;
  Follows?: number;
  'Watch Time'?: number;
  'Length of Video'?: number;
  Retention?: number;
  'Shares:Views'?: number;
  'Saves:Views'?: number;
  'Followers/Reach'?: number;
  'Non-Follower Reach'?: number;
};

function excelSerialToISODate(serial: number): string | null {
  if (!serial || !isFinite(serial)) return null;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const ms = serial * 86400000;
  const d = new Date(epoch.getTime() + ms);
  return d.toISOString().slice(0, 10);
}

const ContentImporter: React.FC<ImporterProps> = ({ defaultPlatform = 'tiktok', defaultFormat = 'short', onImported }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState<'youtube' | 'tiktok' | 'instagram'>(defaultPlatform);
  const [format, setFormat] = useState<'long_form' | 'short'>(defaultFormat);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>('');

  const appendLog = (line: string) => setLog(prev => (prev ? prev + "\n" : '') + line);

  const handleChoose = () => fileRef.current?.click();

  const parseCSV = async (text: string): Promise<ParsedRow[]> => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] ? cols[idx].trim() : '';
      });
      rows.push(obj);
    }
    return rows;
  };

  const findHeaderRowIndex = (aoa: any[][]): number => {
    for (let i = 0; i < Math.min(aoa.length, 10); i++) {
      const firstCell = (aoa[i][0] || '').toString().toLowerCase();
      if (firstCell.includes('date')) return i;
    }
    return 0;
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setLog('');
    try {
      let rows: ParsedRow[] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        rows = await parseCSV(text);
      } else {
        if (!XLSX) XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const headerIndex = findHeaderRowIndex(aoa);
        const data = aoa.slice(headerIndex);
        const headers: string[] = (data[0] || []).map((h: any) => (h || '').toString());
        rows = data.slice(1).map((row: any[]) => {
          const obj: any = {};
          headers.forEach((h, idx) => {
            obj[h] = row[idx];
          });
          return obj as ParsedRow;
        });
      }

      let imported = 0;
      for (const r of rows) {
        const title = r['Video Name'] || '';
        const dateVal: any = r['Date'];
        const iso = typeof dateVal === 'number' ? excelSerialToISODate(dateVal) : (typeof dateVal === 'string' && dateVal ? dateVal : null);
        if (!title || !iso) continue;

        const views = Number(r['Views'] || 0) || 0;
        const shares = Number(r['Shares'] || 0) || 0;
        const saves = Number(r['Saves'] || 0) || 0;
        const follows = Number(r['Follows'] || 0) || 0;
        const awt = Number(r['Watch Time'] || 0) || 0;
        const lengthSec = Number(r['Length of Video'] || 0) || 0;
        const retention = r['Retention'] != null && r['Retention'] !== '' ? Number(r['Retention']) : undefined;
        const savPerView = r['Saves:Views'] != null && r['Saves:Views'] !== '' ? Number(r['Saves:Views']) : undefined;
        const shPerView = r['Shares:Views'] != null && r['Shares:Views'] !== '' ? Number(r['Shares:Views']) : undefined;
        const folPerReach = r['Followers/Reach'] != null && r['Followers/Reach'] !== '' ? Number(r['Followers/Reach']) : undefined;
        const nonFolReach = r['Non-Follower Reach'] != null && r['Non-Follower Reach'] !== '' ? Number(r['Non-Follower Reach']) : undefined;

        try {
          await saveContentItemWithMetrics(
            {
              platform,
              format,
              account_handle: r['Account'] || undefined,
              title,
              caption: r['Caption'] || undefined,
              script: r['Script'] || undefined,
              published_at: iso,
              video_length_seconds: lengthSec || undefined
            },
            {
              views,
              shares,
              saves,
              follows,
              average_watch_time_seconds: awt || undefined,
              retention_ratio: retention,
              saves_per_view: savPerView,
              shares_per_view: shPerView,
              followers_per_reach: folPerReach,
              non_follower_reach_ratio: nonFolReach
            }
          );
          imported += 1;
        } catch (e: any) {
          appendLog(`Failed to import row: ${title} — ${e?.message || e}`);
        }
      }

      appendLog(`Imported ${imported} rows.`);
      onImported?.(imported);
    } catch (e: any) {
      appendLog(`Import error: ${e?.message || e}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  return (
    <div className="border border-[#333] bg-[#111] rounded-sm p-4 space-y-4">
      {/* Platform and Format Settings */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-white mb-2">Import Settings</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8A8D93] mb-1">Platform</label>
            <select
              className="w-full bg-[#0F0F0F] border border-[#333] p-2 rounded-sm text-white text-sm"
              value={platform}
              onChange={e => setPlatform(e.target.value as any)}
            >
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8A8D93] mb-1">Format</label>
            <select
              className="w-full bg-[#0F0F0F] border border-[#333] p-2 rounded-sm text-white text-sm"
              value={format}
              onChange={e => setFormat(e.target.value as any)}
            >
              <option value="long_form">Long Form</option>
              <option value="short">Short</option>
            </select>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className="border-2 border-dashed border-[#333] rounded-sm p-8 text-center hover:border-[#444] transition-colors cursor-pointer"
        onClick={handleChoose}
      >
        <div className="space-y-2">
          <div className="text-2xl">📁</div>
          <div className="text-sm font-medium text-white">
            {busy ? 'Processing...' : 'Choose File to Import'}
          </div>
          <div className="text-xs text-[#8A8D93]">
            Upload Excel (.xlsx) or CSV files with your content data
          </div>
          <div className="text-xs text-[#666]">
            Supported columns: Date, Video Name, Account, Views, Follows, etc.
          </div>
          {!busy && (
            <button className="mt-3 px-4 py-2 bg-terminal-accent text-black text-sm rounded-sm hover:bg-terminal-accent/90 transition-colors">
              Select File
            </button>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileRef}
        onChange={onFileChange}
        accept=".xlsx,.csv"
        className="hidden"
      />

      {/* Import Log */}
      {log && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8A8D93]">Import Results</div>
          <pre className="text-xs whitespace-pre-wrap text-[#8A8D93] bg-[#0F0F0F] border border-[#333] rounded-sm p-3 max-h-40 overflow-auto">
            {log}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ContentImporter;


