import React, { useState, useEffect } from 'react';
import { loadData, MetricData } from '@/lib/storage';
import SparkLine from './SparkLine';

const PerformanceSidebar: React.FC = () => {
  const [data, setData] = useState(() => loadData());

  useEffect(() => {
    const handler = () => setData(loadData());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Sprint calculations
  const sprintKey = 'noctisium-sprint-start-date';
  const sprintStartRaw = localStorage.getItem(sprintKey) || new Date(new Date().getFullYear(), 0, 1).toISOString();
  const sprintStartDate = new Date(sprintStartRaw);
  const today = new Date();
  const diffTime = today.getTime() - sprintStartDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const cycleLength = 21 + 7;
  const cyclePos = diffDays % cycleLength;
  const dayOfSprint = cyclePos + 1;
  const isOn = cyclePos < 21;
  const sprintProgress = isOn ? dayOfSprint / 21 : 1;
  const barLen = 20;
  const filled = Math.round(sprintProgress * barLen);
  const progressBar = '[' + '='.repeat(filled) + ' '.repeat(barLen - filled) + ']';

  // Helper to get a metric by id
  const getMetric = (id: string): MetricData | undefined => data.metrics.find(m => m.id === id);

  // Compute average for a metric over last N days
  const computeAvg = (metricId: string, days: number): string => {
    const metric = getMetric(metricId);
    if (!metric) return '0.0';
    const recent = data.dates.slice(-days);
    const vals = recent.map(d => parseFloat(metric.values[d]?.toString() || '0'));
    const sum = vals.reduce((a, b) => a + b, 0);
    return vals.length ? (sum / vals.length).toFixed(1) : '0.0';
  };

  // Habit compliance (core: coldShower, noDopamine)
  const coreIds = ['coldShower', 'noDopamine'];
  const sprintDates = data.dates.filter(d => {
    const dayDiff = Math.floor((new Date(d).getTime() - sprintStartDate.getTime()) / (1000 * 60 * 60 * 24));
    return dayDiff % cycleLength < 21;
  });
  const totalChecks = sprintDates.length * coreIds.length;
  const trueChecks = sprintDates.reduce((acc, d) => {
    coreIds.forEach(id => { if (getMetric(id)?.values[d] === true) acc++; });
    return acc;
  }, 0);
  const habitsPct = totalChecks ? Math.round((trueChecks / totalChecks) * 100) : 0;
  let streak = 0;
  for (let i = data.dates.length - 1; i >= 0; i--) {
    const d = data.dates[i];
    if (coreIds.every(id => getMetric(id)?.values[d] === true)) streak++;
    else break;
  }

  // Jiu-Jitsu sessions count (last 90 days)
  const jitsu = getMetric('jiuJitsuSessions');
  const last90 = data.dates.slice(-90);
  const jitsuCount = last90.reduce((a, d) => a + (parseFloat(jitsu?.values[d]?.toString() || '0') || 0), 0);

  // Echo tasks closed (from roadmap)
  type RoadmapRaw = { id: string; milestones: { completed: boolean }[] };
  const roadmapsRaw = localStorage.getItem('noctisium-roadmaps') || '[]';
  const roadmaps = JSON.parse(roadmapsRaw) as RoadmapRaw[];
  const echo = roadmaps.find(r => r.id === 'echo');
  const echoClosed = echo ? echo.milestones.filter(m => m.completed).length : 0;
  const closures = echo ? echo.milestones.map((_, i) => i + 1) : [];

  return (
    <div className="sidebar w-[20ch] border-r border-accent-primary bg-sidebar p-2 shrink-0 overflow-y-auto font-mono text-xs text-main">
      {/* Sprint Progress */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Sprint Progress</span><span className="blink">_</span></h2>
        <pre className="border border-[#5FE3B3] p-1 mb-1">Day {dayOfSprint} / 21</pre>
        <pre className="border border-[#5FE3B3] p-1">{progressBar}</pre>
      </div>
      {/* Deep-Work Summary */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Deep-Work Summary</span><span className="blink">_</span></h2>
        <div>7-Day Avg: {computeAvg('deepWork', 7)} hrs</div>
        <div>Sprint Avg: {computeAvg('deepWork', 21)} hrs</div>
        <div>Quarterly Avg: {computeAvg('deepWork', 90)} hrs</div>
      </div>
      {/* Sleep Quality */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Sleep Quality</span><span className="blink">_</span></h2>
        <div>7-Day Avg Sleep: {computeAvg('sleepHours', 7)} hrs</div>
        <SparkLine data={last90.map(d => parseFloat(getMetric('sleepHours')?.values[d]?.toString() || '0'))} />
      </div>
      {/* Habit Compliance */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Habit Compliance</span><span className="blink">_</span></h2>
        <div>Sprint Habits Done: {habitsPct}%</div>
        <div>Streak: {streak} days</div>
      </div>
      {/* Jiu-Jitsu Sessions */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Jiu-Jitsu Sessions</span><span className="blink">_</span></h2>
        <div>Quarterly Sessions: {jitsuCount}</div>
        <SparkLine data={last90.map(d => parseFloat(jitsu?.values[d]?.toString() || '0'))} />
      </div>
      {/* Echo Tasks Closed */}
      <div className="mb-4">
        <h2 className="uppercase"><span>Echo Tasks Closed</span><span className="blink">_</span></h2>
        <div>Sprint Tasks Closed: {echoClosed}</div>
        <SparkLine data={closures} />
      </div>
    </div>
  );
};

export default PerformanceSidebar; 