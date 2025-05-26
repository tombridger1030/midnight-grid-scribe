import React, { useState, useEffect } from 'react';
import { MetricData, loadData, saveData } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface CustomMetric {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'text' | 'time';
  isCustom: boolean;
}

const MetricManager: React.FC = () => {
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMetric, setNewMetric] = useState<{
    name: string;
    type: 'number' | 'boolean' | 'text' | 'time';
  }>({
    name: '',
    type: 'number'
  });
  const { toast } = useToast();

  // Load existing metrics on mount
  useEffect(() => {
    const data = loadData();
    const customMetrics: CustomMetric[] = data.metrics.map(metric => ({
      id: metric.id,
      name: metric.name,
      type: metric.type,
      isCustom: !metric.id.startsWith('builtin_') && 
               !['deepWork', 'jiuJitsuSessions', 'weightliftingSessions', 'proteinIntake', 'dailyWeight', 
                 'hrv', 'wakingTime', 'sleepTime', 'recovery', 'coldShower', 'noDopamine', 
                 'sleepHours', 'calories', 'waterIntake', 'readingHours'].includes(metric.id)
    }));
    setMetrics(customMetrics);
  }, []);

  // Add new metric
  const handleAddMetric = () => {
    if (!newMetric.name.trim()) {
      toast({
        title: "Error",
        description: "Metric name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    const data = loadData();
    const metricId = `custom_${Date.now()}_${newMetric.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    // Check if metric name already exists
    if (data.metrics.some(m => m.name.toLowerCase() === newMetric.name.toLowerCase())) {
      toast({
        title: "Error",
        description: "A metric with this name already exists",
        variant: "destructive"
      });
      return;
    }

    const newMetricData: MetricData = {
      id: metricId,
      name: newMetric.name,
      type: newMetric.type,
      values: {}
    };

    const updatedData = {
      ...data,
      metrics: [...data.metrics, newMetricData]
    };

    saveData(updatedData);
    
    setMetrics(prev => [...prev, {
      id: metricId,
      name: newMetric.name,
      type: newMetric.type,
      isCustom: true
    }]);

    // Notify other components
    window.dispatchEvent(new CustomEvent('metricsUpdated'));

    setNewMetric({ name: '', type: 'number' });
    setShowAddForm(false);

    toast({
      title: "Success",
      description: `Metric "${newMetric.name}" added successfully`
    });
  };

  // Remove metric (archive data, don't delete)
  const handleRemoveMetric = (metricId: string, metricName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${metricName}"? The data will be preserved but the metric will be hidden.`)) {
      return;
    }

    const data = loadData();
    const updatedData = {
      ...data,
      metrics: data.metrics.filter(m => m.id !== metricId)
    };

    saveData(updatedData);
    setMetrics(prev => prev.filter(m => m.id !== metricId));

    // Notify other components
    window.dispatchEvent(new CustomEvent('metricsUpdated'));

    toast({
      title: "Success",
      description: `Metric "${metricName}" removed successfully`
    });
  };

  // Edit metric name
  const handleEditMetric = (metricId: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Metric name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    const data = loadData();
    
    // Check if new name already exists (excluding current metric)
    if (data.metrics.some(m => m.id !== metricId && m.name.toLowerCase() === newName.toLowerCase())) {
      toast({
        title: "Error",
        description: "A metric with this name already exists",
        variant: "destructive"
      });
      return;
    }

    const updatedData = {
      ...data,
      metrics: data.metrics.map(m => 
        m.id === metricId ? { ...m, name: newName } : m
      )
    };

    saveData(updatedData);
    
    setMetrics(prev => prev.map(m => 
      m.id === metricId ? { ...m, name: newName } : m
    ));

    // Notify other components
    window.dispatchEvent(new CustomEvent('metricsUpdated'));

    setEditingId(null);

    toast({
      title: "Success",
      description: "Metric name updated successfully"
    });
  };

  return (
    <div className="border border-terminal-accent/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-terminal-accent">Metric Manager</h3>
        <button
          className="terminal-button flex items-center min-h-[44px] px-4"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={16} className="mr-2" />
          Add Metric
        </button>
      </div>

      {/* Add new metric form */}
      {showAddForm && (
        <div className="mb-4 p-3 border border-terminal-accent/50 bg-terminal-bg/20">
          <h4 className="text-sm mb-2 text-terminal-accent">Add New Metric</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <input
              type="text"
              placeholder="Metric name"
              className="terminal-input"
              value={newMetric.name}
              onChange={(e) => setNewMetric(prev => ({ ...prev, name: e.target.value }))}
            />
            <select
              className="terminal-input"
              value={newMetric.type}
              onChange={(e) => setNewMetric(prev => ({ ...prev, type: e.target.value as 'number' | 'boolean' | 'text' | 'time' }))}
            >
              <option value="number">Number</option>
              <option value="boolean">Yes/No</option>
              <option value="text">Text</option>
              <option value="time">Time</option>
            </select>
            <div className="flex gap-2">
              <button
                className="terminal-button flex items-center justify-center min-h-[44px] flex-1"
                onClick={handleAddMetric}
              >
                <Save size={16} className="mr-1" />
                Add
              </button>
              <button
                className="terminal-button flex items-center justify-center min-h-[44px]"
                onClick={() => setShowAddForm(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics list */}
      <div className="space-y-2">
        <div className="text-sm text-terminal-accent/70 mb-2">
          {metrics.length} metric{metrics.length !== 1 ? 's' : ''} configured
        </div>
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center justify-between p-2 border border-terminal-accent/40 bg-terminal-bg/10"
          >
            <div className="flex items-center flex-1">
              {editingId === metric.id ? (
                <input
                  type="text"
                  className="terminal-input flex-1 mr-2"
                  defaultValue={metric.name}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEditMetric(metric.id, e.currentTarget.value);
                    } else if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  onBlur={(e) => handleEditMetric(metric.id, e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="flex-1">
                  <span className="font-medium">{metric.name}</span>
                  <span className="ml-2 text-xs text-terminal-accent/70">
                    ({metric.type}) {!metric.isCustom && '• Built-in'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {metric.isCustom && (
                <>
                  <button
                    className="terminal-button p-2 min-h-[36px] min-w-[36px]"
                    onClick={() => setEditingId(metric.id === editingId ? null : metric.id)}
                    title="Edit metric name"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="terminal-button p-2 min-h-[36px] min-w-[36px] hover:bg-red-600"
                    onClick={() => handleRemoveMetric(metric.id, metric.name)}
                    title="Remove metric"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {metrics.length === 0 && (
        <div className="text-center py-8 text-terminal-accent/70">
          No metrics configured. Add your first metric to get started.
        </div>
      )}
    </div>
  );
};

export default MetricManager; 