import React, { useState, useEffect, useRef } from 'react';
import TypewriterText from '@/components/TypewriterText';
import { Plus, Calendar, Flag, User, Clock, MoreVertical, Edit3, Trash2, Tag, X } from 'lucide-react';
import { 
  loadKanbanFromSupabase, 
  saveKanbanToSupabase, 
  deleteKanbanTaskFromSupabase,
  moveKanbanTaskInSupabase,
  type KanbanData,
  type KanbanTask,
  type KanbanColumn
} from '@/lib/storage';

const Kanban = () => {
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  const [kanbanData, setKanbanData] = useState<KanbanData>(() => {
    const stored = localStorage.getItem('noctisium-kanban');
    if (stored) return JSON.parse(stored);

    return {
      tasks: {
        'task-1': {
          id: 'task-1',
          title: 'Set up Knowledge Assessment Engine',
          description: 'Implement the core engine for evaluating student understanding',
          assignee: 'Tom',
          priority: 'high',
          dueDate: '2025-03-15',
          labels: ['backend', 'core'],
          timeSpent: 4.5,
          createdAt: '2025-01-15',
          updatedAt: '2025-01-15'
        },
        'task-2': {
          id: 'task-2',
          title: 'Design RAG Retrieval Pipeline',
          description: 'Architecture for retrieving relevant educational content',
          assignee: 'Tom',
          priority: 'medium',
          dueDate: '2025-04-01',
          labels: ['ai', 'architecture'],
          timeSpent: 2.0,
          createdAt: '2025-01-16',
          updatedAt: '2025-01-16'
        },
        'task-3': {
          id: 'task-3',
          title: 'Create User Interface Mockups',
          description: 'Design the main tutor interface and student dashboard',
          assignee: 'Tom',
          priority: 'medium',
          dueDate: '2025-02-28',
          labels: ['frontend', 'design'],
          timeSpent: 1.5,
          createdAt: '2025-01-17',
          updatedAt: '2025-01-17'
        },
        'task-4': {
          id: 'task-4',
          title: 'Research Natural Language Processing',
          description: 'Investigate best practices for educational content processing',
          assignee: 'Tom',
          priority: 'low',
          labels: ['research', 'ai'],
          timeSpent: 0,
          createdAt: '2025-01-18',
          updatedAt: '2025-01-18'
        }
      },
      columns: {
        'backlog': {
          id: 'backlog',
          title: 'Backlog',
          taskIds: ['task-4'],
          color: '#8A8D93'
        },
        'in-progress': {
          id: 'in-progress',
          title: 'In Progress',
          taskIds: ['task-1', 'task-2'],
          color: '#53B4FF'
        },
        'review': {
          id: 'review',
          title: 'Review',
          taskIds: ['task-3'],
          color: '#FFD700'
        },
        'done': {
          id: 'done',
          title: 'Done',
          taskIds: [],
          color: '#5FE3B3'
        }
      },
      columnOrder: ['backlog', 'in-progress', 'review', 'done']
    };
  });

  // Load kanban data from Supabase on mount
  useEffect(() => {
    const loadKanbanData = async () => {
      try {
        setIsLoading(true);
        const data = await loadKanbanFromSupabase('echo');
        
        if (data) {
          setKanbanData(data);
          localStorage.setItem('noctisium-kanban', JSON.stringify(data));
        } else {
          // If no data in Supabase, save current default data
          await saveKanbanToSupabase(kanbanData, 'echo');
        }
      } catch (err) {
        console.error('Failed to load kanban data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadKanbanData();
  }, []);

  // Save kanban data to both localStorage and Supabase when changed
  const saveKanbanData = async (data: KanbanData) => {
    if (isLoading || isSaving) return;
    
    try {
      setIsSaving(true);
      localStorage.setItem('noctisium-kanban', JSON.stringify(data));
      await saveKanbanToSupabase(data, 'echo');
    } catch (err) {
      console.error('Failed to save kanban data:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Update echo tasks counter in localStorage for PerformanceSidebar
  const updateEchoTasksCounter = () => {
    const completedTasks = kanbanData.columns.done?.taskIds?.length || 0;
    
    // Update the roadmap data that PerformanceSidebar reads
    const roadmapsRaw = localStorage.getItem('noctisium-roadmaps');
    let roadmaps: Array<{ id: string; milestones: Array<{ completed: boolean }> }> = [];
    if (roadmapsRaw) {
      try {
        const parsedRoadmaps = JSON.parse(roadmapsRaw);
        if (Array.isArray(parsedRoadmaps)) {
          roadmaps = parsedRoadmaps;
        }
      } catch (error) {
        console.error("Error parsing roadmaps from localStorage:", error);
        // roadmaps remains an empty array if parsing fails
      }
    }
    
    // Find or create echo roadmap entry
    let echoIndex = roadmaps.findIndex((r) => r.id === 'echo');
    if (echoIndex === -1) {
      roadmaps.push({
        id: 'echo',
        milestones: []
      });
      echoIndex = roadmaps.length - 1;
    }
    
    // Update milestones to match completed tasks count
    const milestones = [];
    for (let i = 0; i < completedTasks; i++) {
      milestones.push({ completed: true });
    }
    roadmaps[echoIndex].milestones = milestones;
    
    localStorage.setItem('noctisium-roadmaps', JSON.stringify(roadmaps));
  };

  // Focus on add task input when form opens
  useEffect(() => {
    if (showAddTask && addTaskInputRef.current) {
      addTaskInputRef.current.focus();
    }
  }, [showAddTask]);

  // Update echo tasks counter whenever done column changes
  useEffect(() => {
    if (kanbanData.columns.done) {
      updateEchoTasksCounter();
    }
  }, [kanbanData.columns.done?.taskIds]);

  // Save data whenever kanbanData changes (but not during initial load)
  useEffect(() => {
    if (!isLoading) {
      saveKanbanData(kanbanData);
    }
  }, [kanbanData, isLoading]);

  // Get priority color
  const getPriorityColor = (priority: KanbanTask['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Calculate days until due date
  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    return `${diffDays} days left`;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // Find current column of the dragged task
    let currentColumnId = '';
    for (const [colId, column] of Object.entries(kanbanData.columns)) {
      if (column.taskIds.includes(draggedTask)) {
        currentColumnId = colId;
        break;
      }
    }
    
    // If dropping in the same column, do nothing
    if (currentColumnId === columnId) {
      setDraggedTask(null);
      return;
    }
    
    setKanbanData(prev => {
      const newData = { ...prev };
      
      // Remove task from current column
      Object.keys(newData.columns).forEach(colId => {
        newData.columns[colId] = {
          ...newData.columns[colId],
          taskIds: newData.columns[colId].taskIds.filter(id => id !== draggedTask)
        };
      });
      
      // Add task to new column
      newData.columns[columnId] = {
        ...newData.columns[columnId],
        taskIds: [...newData.columns[columnId].taskIds, draggedTask]
      };
      
      return newData;
    });
    
    // Also update in Supabase directly for immediate consistency
    try {
      await moveKanbanTaskInSupabase(draggedTask, columnId, 'echo');
    } catch (error) {
      console.error('Failed to move task in Supabase:', error);
    }
    
    setDraggedTask(null);
  };

  // Add new task - improved with proper state management
  const addTask = (columnId: string) => {
    const title = newTaskTitle.trim();
    console.log('🔧 Adding task:', { columnId, title, newTaskTitle });
    
    if (!title) {
      console.log('❌ No title provided');
      return;
    }

    const newTaskId = `task-${Date.now()}`;
    const newTask: KanbanTask = {
      id: newTaskId,
      title,
      priority: 'medium',
      labels: [],
      timeSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    };

    console.log('✅ Creating new task:', newTask);

    setKanbanData(prev => {
      const newData = {
        ...prev,
        tasks: {
          ...prev.tasks,
          [newTaskId]: newTask
        },
        columns: {
          ...prev.columns,
          [columnId]: {
            ...prev.columns[columnId],
            taskIds: [...prev.columns[columnId].taskIds, newTaskId]
          }
        }
      };
      
      console.log('📊 Updated kanban data:', newData);
      return newData;
    });

    // Reset form state
    setNewTaskTitle('');
    setShowAddTask(null);
    console.log('🔄 Form reset complete');
  };

  // Cancel add task
  const cancelAddTask = () => {
    setNewTaskTitle('');
    setShowAddTask(null);
  };

  // Delete task (soft delete)
  const deleteTask = async (taskId: string) => {
    setKanbanData(prev => {
      const newData = { ...prev };
      
      // Mark task as deleted instead of removing it
      if (newData.tasks[taskId]) {
        newData.tasks[taskId] = {
          ...newData.tasks[taskId],
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Remove task from all columns (since it's now deleted)
      Object.keys(newData.columns).forEach(colId => {
        newData.columns[colId] = {
          ...newData.columns[colId],
          taskIds: newData.columns[colId].taskIds.filter(id => id !== taskId)
        };
      });
      
      return newData;
    });
    
    // Also soft delete in Supabase
    try {
      await deleteKanbanTaskFromSupabase(taskId, 'echo');
    } catch (error) {
      console.error('Failed to delete task from Supabase:', error);
    }
    
    setSelectedTask(null);
  };

  // Update task - improved with better state management
  const updateTask = (taskId: string, updates: Partial<KanbanTask>) => {
    setKanbanData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...prev.tasks[taskId],
          ...updates,
          updatedAt: new Date().toISOString()
        }
      }
    }));
  };

  // Add label to task
  const addLabel = (taskId: string, label: string) => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    
    const task = kanbanData.tasks[taskId];
    if (!task || task.labels.includes(trimmedLabel)) return;
    
    updateTask(taskId, {
      labels: [...task.labels, trimmedLabel]
    });
  };

  // Remove label from task
  const removeLabel = (taskId: string, labelToRemove: string) => {
    const task = kanbanData.tasks[taskId];
    if (!task) return;
    
    updateTask(taskId, {
      labels: task.labels.filter(label => label !== labelToRemove)
    });
  };

  // Handle task card click - prevent when clicking on form elements
  const handleTaskCardClick = (e: React.MouseEvent, taskId: string) => {
    // Don't toggle if clicking on form elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
      return;
    }
    
    setSelectedTask(taskId === selectedTask ? null : taskId);
  };

  // Render task card
  const renderTaskCard = (task: KanbanTask) => (
    <div
      key={task.id}
      draggable={!editMode}
      onDragStart={(e) => handleDragStart(e, task.id)}
      className={`bg-panel border border-terminal-accent/30 p-3 mb-2 cursor-pointer transition-colors hover:border-terminal-accent/50 ${
        selectedTask === task.id ? 'border-terminal-accent' : ''
      }`}
      onClick={(e) => handleTaskCardClick(e, task.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium">{task.title}</h4>
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} mr-2`}></div>
          {editMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(task.id);
              }}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      
      {task.description && (
        <p className="text-xs text-terminal-text/70 mb-2">{task.description}</p>
      )}
      
      <div className="flex flex-wrap gap-1 mb-2">
        {task.labels.map(label => (
          <span key={label} className="text-xs px-1 py-0.5 bg-terminal-accent/20 text-terminal-accent flex items-center">
            {label}
            {selectedTask === task.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeLabel(task.id, label);
                }}
                className="ml-1 text-terminal-accent/70 hover:text-terminal-accent"
              >
                <X size={10} />
              </button>
            )}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between items-center text-xs text-terminal-text/70">
        <div className="flex items-center">
          {task.assignee && (
            <span className="flex items-center mr-2">
              <User size={10} className="mr-1" />
              {task.assignee}
            </span>
          )}
          <span className="flex items-center">
            <Clock size={10} className="mr-1" />
            {task.timeSpent}h
          </span>
        </div>
        {task.dueDate && (
          <span className="flex items-center">
            <Calendar size={10} className="mr-1" />
            {getDaysUntilDue(task.dueDate)}
          </span>
        )}
      </div>
      
      {/* Expanded view */}
      {selectedTask === task.id && (
        <div 
          className="mt-3 pt-3 border-t border-terminal-accent/20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-terminal-accent">Priority:</label>
              <select
                value={task.priority}
                onChange={(e) => {
                  e.stopPropagation();
                  updateTask(task.id, { priority: e.target.value as KanbanTask['priority'] });
                }}
                className="terminal-input w-full mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-terminal-accent">Due Date:</label>
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  updateTask(task.id, { dueDate: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                className="terminal-input w-full mt-1"
              />
            </div>
            <div>
              <label className="text-terminal-accent">Assignee:</label>
              <input
                type="text"
                value={task.assignee || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  updateTask(task.id, { assignee: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                className="terminal-input w-full mt-1"
                placeholder="Assignee"
              />
            </div>
            <div>
              <label className="text-terminal-accent">Time Spent (hrs):</label>
              <input
                type="number"
                step="0.5"
                value={task.timeSpent}
                onChange={(e) => {
                  e.stopPropagation();
                  updateTask(task.id, { timeSpent: parseFloat(e.target.value) || 0 });
                }}
                onClick={(e) => e.stopPropagation()}
                className="terminal-input w-full mt-1"
              />
            </div>
          </div>
          
          {/* Labels section */}
          <div className="mt-2">
            <label className="text-terminal-accent">Labels:</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => {
                  e.stopPropagation();
                  setNewLabel(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    addLabel(task.id, newLabel);
                    setNewLabel('');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="terminal-input flex-1"
                placeholder="Add label..."
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addLabel(task.id, newLabel);
                  setNewLabel('');
                }}
                className="terminal-button text-xs px-2 py-1"
                disabled={!newLabel.trim()}
              >
                <Tag size={12} />
              </button>
            </div>
          </div>
          
          <div className="mt-2">
            <label className="text-terminal-accent">Description:</label>
            <textarea
              value={task.description || ''}
              onChange={(e) => {
                e.stopPropagation();
                updateTask(task.id, { description: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              className="terminal-input w-full mt-1 h-16 resize-none"
              placeholder="Task description..."
            />
          </div>
        </div>
      )}
    </div>
  );

  // Render add task form
  const renderAddTaskForm = (columnId: string) => (
    <div className="bg-terminal-bg border border-terminal-accent/50 p-3 mb-2">
      <input
        ref={addTaskInputRef}
        type="text"
        placeholder="Enter task title..."
        className="terminal-input w-full mb-2"
        value={newTaskTitle}
        onChange={(e) => setNewTaskTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTask(columnId);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelAddTask();
          }
        }}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => addTask(columnId)}
          className="terminal-button text-xs px-3 py-1 bg-terminal-accent text-terminal-bg hover:bg-terminal-accent/80"
          disabled={!newTaskTitle.trim()}
        >
          Add Task
        </button>
        <button
          onClick={cancelAddTask}
          className="terminal-button text-xs px-3 py-1 border border-terminal-accent/50 hover:border-terminal-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Calculate total time and task count (excluding deleted tasks)
  const activeTasks = Object.values(kanbanData.tasks).filter(task => !task.isDeleted);
  const totalTasks = activeTasks.length;
  const totalTime = activeTasks.reduce((sum, task) => sum + task.timeSpent, 0);
  const completedTasks = kanbanData.columns.done?.taskIds?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-terminal-accent">Loading kanban data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <TypewriterText text="Echo Kanban Board" className="text-xl mb-2" />
            <p className="text-terminal-accent/70 text-sm">Track Echo development tasks and progress.</p>
            {isSaving && (
              <p className="text-terminal-accent/50 text-xs mt-1">Syncing to cloud...</p>
            )}
          </div>
          <button
            className="terminal-button flex items-center min-h-[44px] px-4"
            onClick={() => setEditMode(!editMode)}
          >
            <Edit3 size={16} className="mr-2" />
            {editMode ? 'View Mode' : 'Edit Mode'}
          </button>
        </div>
        
        {/* Project stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="border border-terminal-accent/30 p-2">
            <div className="text-terminal-accent">Total Tasks</div>
            <div className="text-lg">{totalTasks}</div>
          </div>
          <div className="border border-terminal-accent/30 p-2">
            <div className="text-terminal-accent">Completed</div>
            <div className="text-lg">{completedTasks}</div>
          </div>
          <div className="border border-terminal-accent/30 p-2">
            <div className="text-terminal-accent">Completion Rate</div>
            <div className="text-lg">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</div>
          </div>
          <div className="border border-terminal-accent/30 p-2">
            <div className="text-terminal-accent">Time Logged</div>
            <div className="text-lg">{totalTime.toFixed(1)}h</div>
          </div>
        </div>
      </div>
      
      {/* Kanban board */}
      <div className="flex-1 overflow-hidden">
        {/* Mobile: Horizontal scroll container */}
        <div className="md:hidden overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max px-2">
            {kanbanData.columnOrder.map(columnId => {
              const column = kanbanData.columns[columnId];
              if (!column) return null; // Skip if column doesn't exist
              const tasks = column.taskIds.map(taskId => kanbanData.tasks[taskId]).filter(task => task && !task.isDeleted);
              
              return (
                <div key={columnId} className="w-80 flex-shrink-0">
                  <div 
                    className="bg-terminal-bg border border-terminal-accent/30 p-3 h-full"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, columnId)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-terminal-accent uppercase tracking-wider">
                        {column.title}
                      </h3>
                      <span className="text-xs text-terminal-accent/50 bg-terminal-accent/10 px-2 py-1 rounded">
                        {tasks.length}
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {showAddTask === columnId && renderAddTaskForm(columnId)}
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          draggable={!editMode}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="bg-terminal-bg border border-terminal-accent/20 p-3 cursor-pointer hover:border-terminal-accent/40 transition-colors"
                          onClick={(e) => handleTaskCardClick(e, task.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-terminal-accent line-clamp-2">{task.title}</h4>
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} mr-2`}></div>
                              {editMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {task.description && (
                            <p className="text-xs text-terminal-accent/70 mb-2 line-clamp-2">{task.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.labels.map(label => (
                              <span key={label} className="text-xs px-1 py-0.5 bg-terminal-accent/20 text-terminal-accent flex items-center">
                                {label}
                                {selectedTask === task.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeLabel(task.id, label);
                                    }}
                                    className="ml-1 text-terminal-accent/70 hover:text-terminal-accent"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center text-xs text-terminal-accent/70">
                            <div className="flex items-center">
                              {task.assignee && (
                                <span className="flex items-center mr-2">
                                  <User size={10} className="mr-1" />
                                  {task.assignee}
                                </span>
                              )}
                              <span className="flex items-center">
                                <Clock size={10} className="mr-1" />
                                {task.timeSpent}h
                              </span>
                            </div>
                            {task.dueDate && (
                              <span className="flex items-center">
                                <Calendar size={10} className="mr-1" />
                                {getDaysUntilDue(task.dueDate)}
                              </span>
                            )}
                          </div>
                          
                          {/* Expanded view for mobile */}
                          {selectedTask === task.id && (
                            <div 
                              className="mt-3 pt-3 border-t border-terminal-accent/20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="grid grid-cols-1 gap-2 text-xs">
                                <div>
                                  <label className="text-terminal-accent">Priority:</label>
                                  <select
                                    value={task.priority}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateTask(task.id, { priority: e.target.value as KanbanTask['priority'] });
                                    }}
                                    className="terminal-input w-full mt-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-terminal-accent">Due Date:</label>
                                  <input
                                    type="date"
                                    value={task.dueDate || ''}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateTask(task.id, { dueDate: e.target.value });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="terminal-input w-full mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-terminal-accent">Assignee:</label>
                                  <input
                                    type="text"
                                    value={task.assignee || ''}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateTask(task.id, { assignee: e.target.value });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="terminal-input w-full mt-1"
                                    placeholder="Assignee"
                                  />
                                </div>
                                <div>
                                  <label className="text-terminal-accent">Time Spent (hrs):</label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={task.timeSpent}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateTask(task.id, { timeSpent: parseFloat(e.target.value) || 0 });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="terminal-input w-full mt-1"
                                  />
                                </div>
                              </div>
                              
                              {/* Labels section */}
                              <div className="mt-2">
                                <label className="text-terminal-accent">Labels:</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="text"
                                    value={newLabel}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setNewLabel(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        addLabel(task.id, newLabel);
                                        setNewLabel('');
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="terminal-input flex-1"
                                    placeholder="Add label..."
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addLabel(task.id, newLabel);
                                      setNewLabel('');
                                    }}
                                    className="terminal-button text-xs px-2 py-1"
                                    disabled={!newLabel.trim()}
                                  >
                                    <Tag size={12} />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="mt-2">
                                <label className="text-terminal-accent">Description:</label>
                                <textarea
                                  value={task.description || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateTask(task.id, { description: e.target.value });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="terminal-input w-full mt-1 h-16 resize-none"
                                  placeholder="Task description..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => {
                        console.log('🔘 Add Task button clicked for column:', columnId);
                        setShowAddTask(showAddTask === columnId ? null : columnId);
                      }}
                      className="w-full mt-3 p-2 border border-dashed border-terminal-accent/30 text-terminal-accent/50 hover:border-terminal-accent/50 hover:text-terminal-accent transition-colors text-sm min-h-[44px]"
                    >
                      {showAddTask === columnId ? 'Cancel' : '+ Add Task'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 h-full overflow-y-auto">
          {kanbanData.columnOrder.map(columnId => {
            const column = kanbanData.columns[columnId];
            if (!column) return null; // Skip if column doesn't exist
            const tasks = column.taskIds.map(taskId => kanbanData.tasks[taskId]).filter(task => task && !task.isDeleted);
            
            return (
              <div key={columnId} className="bg-terminal-bg border border-terminal-accent/30 p-4 flex flex-col max-h-full overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, columnId)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-terminal-accent uppercase tracking-wider">
                    {column.title}
                  </h3>
                  <span className="text-xs text-terminal-accent/50 bg-terminal-accent/10 px-2 py-1 rounded">
                    {tasks.length}
                  </span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {tasks.map(task => renderTaskCard(task))}
                </div>
                <button 
                  onClick={() => addTask(columnId)}
                  className="mt-4 p-2 border border-dashed border-terminal-accent/30 text-terminal-accent/50 hover:border-terminal-accent/50 hover:text-terminal-accent transition-colors text-sm"
                >
                  + Add Task
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Kanban; 