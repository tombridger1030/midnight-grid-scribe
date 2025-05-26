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

  // Helper to check if wake time is between 4-5AM
  const isValidWakeTime = (timeStr: string): boolean => {
    if (!timeStr) return false;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return false;
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 240 && totalMinutes < 300; // 4:00-4:59 AM
  };

  // New habit compliance based on specific criteria
  const calculateHabitCompliance = () => {
    const wakingTimeMetric = getMetric('wakingTime');
    const deepWorkMetric = getMetric('deepWork');
    const jiuJitsuMetric = getMetric('jiuJitsuSessions');
    const weightliftingMetric = getMetric('weightliftingSessions');
    const noDopamineMetric = getMetric('noDopamine');

    let streak = 0;
    let compliantDays = 0;
    
    // Check compliance for each day, starting from most recent
    for (let i = data.dates.length - 1; i >= 0; i--) {
      const date = data.dates[i];
      let dayCompliant = true;

      // Check wake time (4AM-5AM)
      const wakeTime = wakingTimeMetric?.values[date]?.toString() || '';
      if (!isValidWakeTime(wakeTime)) {
        dayCompliant = false;
      }

      // Check deep work (3+ hours)
      const deepWorkHours = parseFloat(deepWorkMetric?.values[date]?.toString() || '0');
      if (deepWorkHours < 3) {
        dayCompliant = false;
      }

      // Check either jiu jitsu or weightlifting (at least 1 session)
      const jiuJitsuSessions = parseFloat(jiuJitsuMetric?.values[date]?.toString() || '0');
      const weightliftingSessions = parseFloat(weightliftingMetric?.values[date]?.toString() || '0');
      if (jiuJitsuSessions < 1 && weightliftingSessions < 1) {
        dayCompliant = false;
      }

      // Check no dopamine (must be true)
      const noDopamine = noDopamineMetric?.values[date];
      if (noDopamine !== true) {
        dayCompliant = false;
      }

      if (dayCompliant) {
        compliantDays++;
        if (i === data.dates.length - 1 - streak) {
          // This extends the current streak
          streak++;
        }
      } else if (i === data.dates.length - 1 - streak) {
        // Streak is broken, stop counting
        break;
      }
    }

    // Calculate percentage over last 30 days
    const last30Days = data.dates.slice(-30);
    let compliantLast30 = 0;
    
    for (const date of last30Days) {
      let dayCompliant = true;

      const wakeTime = wakingTimeMetric?.values[date]?.toString() || '';
      if (!isValidWakeTime(wakeTime)) dayCompliant = false;

      const deepWorkHours = parseFloat(deepWorkMetric?.values[date]?.toString() || '0');
      if (deepWorkHours < 3) dayCompliant = false;

      const jiuJitsuSessions = parseFloat(jiuJitsuMetric?.values[date]?.toString() || '0');
      const weightliftingSessions = parseFloat(weightliftingMetric?.values[date]?.toString() || '0');
      if (jiuJitsuSessions < 1 && weightliftingSessions < 1) dayCompliant = false;

      const noDopamine = noDopamineMetric?.values[date];
      if (noDopamine !== true) dayCompliant = false;

      if (dayCompliant) compliantLast30++;
    }

    const habitsPct = last30Days.length ? Math.round((compliantLast30 / last30Days.length) * 100) : 0;

    return { streak, habitsPct };
  };

  const { streak, habitsPct } = calculateHabitCompliance();

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
    <>
      {/* Deep-Work Summary */}
      <div className="mb-4 p-2 border border-accent-red">
        <h2 className="uppercase"><span>Deep-Work Summary</span><span className="blink">_</span></h2>
        <div>7-Day Avg: {computeAvg('deepWork', 7)} hrs</div>
      </div>
      {/* Sleep Quality */}
      <div className="mb-4 p-2 border border-accent-red">
        <h2 className="uppercase"><span>Sleep Quality</span><span className="blink">_</span></h2>
        <div>7-Day Avg Sleep: {computeAvg('sleepHours', 7)} hrs</div>
        <SparkLine data={last90.map(d => parseFloat(getMetric('sleepHours')?.values[d]?.toString() || '0'))} />
      </div>
      {/* Habit Compliance */}
      <div className="mb-4 p-2 border border-accent-red">
        <h2 className="uppercase"><span>Habit Compliance</span><span className="blink">_</span></h2>
        <div>30-Day Compliance: {habitsPct}%</div>
        <div className={streak > 0 ? 'text-[#5FE3B3]' : ''}>
          Streak: {streak} days
        </div>
      </div>
      {/* Jiu-Jitsu Sessions */}
      <div className="mb-4 p-2 border border-accent-red">
        <h2 className="uppercase"><span>Jiu-Jitsu Sessions</span><span className="blink">_</span></h2>
        <div>Quarterly Sessions: {jitsuCount}</div>
        <SparkLine data={last90.map(d => parseFloat(jitsu?.values[d]?.toString() || '0'))} />
      </div>
      {/* Echo Tasks Closed */}
      <div className="mb-4 p-2 border border-accent-red">
        <h2 className="uppercase"><span>Echo Tasks Closed</span><span className="blink">_</span></h2>
        <div>Sprint Tasks Closed: {echoClosed}</div>
        <SparkLine data={closures} />
      </div>
    </>
  );
};

export default PerformanceSidebar; 