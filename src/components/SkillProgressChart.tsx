import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SkillData, formatSkillValue } from '@/lib/skillProgression';

interface SkillProgressChartProps {
  skills: SkillData[];
  selectedSkillId?: string;
  height?: number;
}

const SkillProgressChart: React.FC<SkillProgressChartProps> = ({ 
  skills, 
  selectedSkillId, 
  height = 300 
}) => {
  // Generate mock historical data for demonstration
  // In a real implementation, this would come from stored historical data
  const generateHistoricalData = () => {
    const data: Record<string, string | number>[] = [];
    const now = new Date();
    
    for (let i = 12; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      
      const dataPoint: Record<string, string | number> = {
        date: date.toISOString().split('T')[0],
        month: date.toLocaleDateString('en-US', { month: 'short' })
      };
      
      skills.forEach(skill => {
        if (selectedSkillId && skill.id !== selectedSkillId) return;
        
        // Mock progression data - in real app this would be historical data
        const progressFactor = (12 - i) / 12;
        const mockProgress = Math.min(100, skill.progressPercentage + (progressFactor * 20));
        dataPoint[skill.id] = mockProgress;
      });
      
      data.push(dataPoint);
    }
    
    return data;
  };

  const chartData = generateHistoricalData();
  const skillsToShow = selectedSkillId 
    ? skills.filter(skill => skill.id === selectedSkillId)
    : skills;

  if (skillsToShow.length === 0) {
    return (
      <div className="text-center py-8 text-terminal-accent/70">
        No skills selected for visualization
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-faint)" />
          <XAxis 
            type="number"
            stroke="var(--text-muted)"
            fontSize={12}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis 
            dataKey="month" 
            type="category"
            stroke="var(--text-muted)"
            fontSize={12}
            width={40}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--bg-panel)', 
              border: '1px solid var(--line-faint)',
              color: 'var(--text-main)',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string) => {
              const skill = skillsToShow.find(s => s.id === name);
              return [
                `${value.toFixed(1)}%`,
                skill ? skill.name : name
              ];
            }}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Legend 
            formatter={(value) => {
              const skill = skillsToShow.find(s => s.id === value);
              return skill ? skill.name : value;
            }}
          />
          
          {skillsToShow.map(skill => (
            <Bar
              key={skill.id}
              dataKey={skill.id}
              fill={skill.color}
              name={skill.name}
              radius={[0, 2, 2, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SkillProgressChart; 