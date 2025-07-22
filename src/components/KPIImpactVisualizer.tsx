import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from "@/components/ui/progress";
import { SkillData, WEEKLY_KPI_SKILL_MAPPING } from '@/lib/skillProgression';
import { WEEKLY_KPI_DEFINITIONS, WeeklyKPIValues, calculateKPIProgress } from '@/lib/weeklyKpi';

interface KPIImpactVisualizerProps {
  skill: SkillData;
  currentWeekKPIs: WeeklyKPIValues;
  height?: number;
}

const KPIImpactVisualizer: React.FC<KPIImpactVisualizerProps> = ({ 
  skill, 
  currentWeekKPIs, 
  height = 300 
}) => {
  // Get KPI contributions for this skill
  const contributions = WEEKLY_KPI_SKILL_MAPPING[skill.id] || [];
  
  // Calculate impact data
  const impactData = contributions.map(({ kpiId, weight, formula }) => {
    const kpiDefinition = WEEKLY_KPI_DEFINITIONS.find(def => def.id === kpiId);
    if (!kpiDefinition) return null;
    
    const currentValue = currentWeekKPIs[kpiId] || 0;
    const progress = calculateKPIProgress(kpiId, currentValue);
    
    // Calculate contribution multiplier based on formula
    let contributionMultiplier = 0;
    switch (formula) {
      case 'linear':
        contributionMultiplier = progress / 100;
        break;
      case 'threshold':
        contributionMultiplier = progress >= 80 ? 1 : 0;
        break;
      case 'exponential':
        contributionMultiplier = Math.pow(progress / 100, 2);
        break;
    }
    
    const impactScore = weight * contributionMultiplier;
    
    return {
      kpiId,
      name: kpiDefinition.name,
      weight,
      formula,
      currentValue,
      target: kpiDefinition.target,
      progress,
      contributionMultiplier,
      impactScore,
      color: kpiDefinition.color
    };
  }).filter(Boolean);
  
  // Calculate total potential impact
  const totalPotentialImpact = contributions.reduce((sum, { weight }) => sum + weight, 0);
  const actualImpact = impactData.reduce((sum, item) => sum + (item?.impactScore || 0), 0);
  const impactEfficiency = totalPotentialImpact > 0 ? (actualImpact / totalPotentialImpact) * 100 : 0;
  
  // Prepare data for charts
  const barChartData = impactData.map(item => ({
    name: item?.name || '',
    weight: item?.weight || 0,
    impact: item?.impactScore || 0,
    progress: item?.progress || 0
  }));
  
  const pieChartData = impactData.map(item => ({
    name: item?.name || '',
    value: item?.weight || 0,
    actualValue: item?.impactScore || 0,
    color: item?.color || '#8A8D93'
  }));
  
  return (
    <div className="space-y-6">
      {/* Overall Impact Summary */}
      <div className="p-4 border border-terminal-accent/30 bg-terminal-bg/20">
        <h3 className="text-lg mb-3 text-terminal-accent flex items-center gap-2">
          <span>{skill.icon}</span>
          {skill.name} KPI Impact
        </h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-terminal-accent">{impactEfficiency.toFixed(1)}%</div>
            <div className="text-xs text-terminal-accent/70">Impact Efficiency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: skill.color }}>
              {actualImpact.toFixed(1)}
            </div>
            <div className="text-xs text-terminal-accent/70">Actual Impact</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-terminal-accent/70">{totalPotentialImpact}</div>
            <div className="text-xs text-terminal-accent/70">Max Potential</div>
          </div>
        </div>
        
        <Progress 
          value={impactEfficiency} 
          className="h-2"
          style={{ '--progress-background': skill.color } as React.CSSProperties}
        />
      </div>
      
      {/* KPI Contributions List */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-terminal-accent">KPI Contributions</h4>
        {impactData.map((item, index) => (
          <div key={index} className="border border-terminal-accent/30 p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium text-sm">{item?.name}</div>
                <div className="text-xs text-terminal-accent/70 capitalize">
                  {item?.formula} formula • {item?.weight}% weight
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm" style={{ color: item?.color }}>
                  {item?.currentValue}/{item?.target}
                </div>
                <div className="text-xs text-terminal-accent/70">
                  {item?.progress?.toFixed(1)}% complete
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-terminal-accent/70">Impact Score</span>
              <span className="text-xs font-medium">
                {item?.impactScore?.toFixed(1)}/{item?.weight}
              </span>
            </div>
            
            <Progress 
              value={item?.progress || 0} 
              className="h-1"
              style={{ '--progress-background': item?.color } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
      
      {/* Impact Visualization Chart - Vertical Layout */}
      <div className="border border-terminal-accent/30 p-4">
        <h4 className="text-sm font-medium text-terminal-accent mb-3">Impact Breakdown</h4>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
              <XAxis 
                type="number"
                stroke="var(--text-muted)"
                fontSize={10}
              />
              <YAxis 
                dataKey="name" 
                type="category"
                stroke="var(--text-muted)"
                fontSize={10}
                width={70}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-panel)', 
                  border: '1px solid var(--line-faint)',
                  color: 'var(--text-main)',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}${name === 'progress' ? '%' : ''}`,
                  name === 'weight' ? 'Weight' : name === 'impact' ? 'Impact' : 'Progress'
                ]}
              />
              <Bar dataKey="weight" fill="#8A8D93" name="Weight" radius={[0, 2, 2, 0]} />
              <Bar dataKey="impact" fill={skill.color} name="Impact" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Formula Explanations */}
      <div className="text-xs text-terminal-accent/70 p-3 border border-terminal-accent/20 bg-terminal-bg/10">
        <div className="font-medium mb-2">Formula Types:</div>
        <div className="space-y-1">
          <div><span className="font-medium">Linear:</span> Direct proportional impact (progress × weight)</div>
          <div><span className="font-medium">Threshold:</span> Full impact only when 80%+ target achieved</div>
          <div><span className="font-medium">Exponential:</span> Accelerating impact for network effects</div>
        </div>
      </div>
    </div>
  );
};

export default KPIImpactVisualizer; 