import React, { useState, useEffect } from 'react';
import { Target, Edit2, Check, X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { userStorage } from '@/lib/userStorage';
import { getCurrentWorkSlice } from '@/lib/storage';

// Define AvoidanceItem type locally to match userStorage interface
type AvoidanceItem = {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
};

interface PriorityManagerProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export const PriorityManager: React.FC<PriorityManagerProps> = ({
  className,
  variant = 'full'
}) => {
  const [avoidanceItems, setAvoidanceItems] = useState<AvoidanceItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [isActiveSlice, setIsActiveSlice] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const items = await userStorage.getAvoidanceItems();
        setAvoidanceItems(items);

        const slice = getCurrentWorkSlice();
        setIsActiveSlice(!!slice?.isActive);
      } catch (error) {
        console.error('Failed to load avoidance items:', error);
        setAvoidanceItems([]);
      }
    };

    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAddItem = async () => {
    if (newItemText.trim()) {
      try {
        const newItem = await userStorage.addAvoidanceItem(newItemText);
        if (newItem) {
          setAvoidanceItems(prev => [...prev, newItem]);
        }
        setNewItemText('');
        setIsAddingItem(false);
      } catch (error) {
        console.error('Failed to add avoidance item:', error);
        // Still close the input but show error in console
        setNewItemText('');
        setIsAddingItem(false);
      }
    }
  };

  const handleToggleItem = async (itemId: string) => {
    // Optimistically update UI first
    setAvoidanceItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );

    try {
      await userStorage.toggleAvoidanceItem(itemId);
    } catch (error) {
      console.error('Failed to toggle avoidance item:', error);
      // Revert the optimistic update
      setAvoidanceItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
        )
      );
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Optimistically remove from UI first
    const removedItem = avoidanceItems.find(item => item.id === itemId);
    setAvoidanceItems(prev => prev.filter(item => item.id !== itemId));

    try {
      await userStorage.deleteAvoidanceItem(itemId);
    } catch (error) {
      console.error('Failed to delete avoidance item:', error);
      // Revert the optimistic update by adding the item back
      if (removedItem) {
        setAvoidanceItems(prev => [...prev, removedItem].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    } else if (e.key === 'Escape') {
      setIsAddingItem(false);
      setNewItemText('');
    }
  };

  if (variant === 'compact') {
    const incompleteCount = avoidanceItems.filter(item => !item.isCompleted).length;
    
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <AlertCircle size={16} className="text-red-400" />
        <span className="text-sm text-terminal-accent">
          Avoiding: {incompleteCount} thing{incompleteCount !== 1 ? 's' : ''}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className="text-red-400" />
          <h3 className="text-lg text-terminal-accent font-medium">Shit You are Avoiding</h3>
        </div>
        <button
          onClick={() => setIsAddingItem(true)}
          className="p-1 hover:bg-[#333] transition-colors rounded"
          title="Add avoidance item"
        >
          <Plus size={16} className="text-terminal-accent/70" />
        </button>
      </div>

      <div className="border border-terminal-accent/30 p-4 bg-terminal-bg/20 rounded">
        {isAddingItem && (
          <div className="space-y-3 mb-4 pb-4 border-b border-terminal-accent/20">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="What are you avoiding? Be honest..."
              className="w-full bg-transparent border border-terminal-accent/30 text-terminal-accent px-3 py-2 focus:outline-none focus:border-red-400 resize-none rounded"
              maxLength={150}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-terminal-accent/50">
                {newItemText.length}/150 characters
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsAddingItem(false);
                    setNewItemText('');
                  }}
                  className="px-3 py-1 text-sm text-terminal-accent/70 hover:text-terminal-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItemText.trim()}
                  className="px-3 py-1 text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                  Add to List
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {avoidanceItems.length > 0 ? (
            avoidanceItems.map((item) => (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center gap-3 p-2 rounded border transition-colors",
                  item.isCompleted 
                    ? "bg-green-900/20 border-green-600/30 text-terminal-accent/60" 
                    : "bg-red-900/20 border-red-600/30 hover:bg-red-900/30"
                )}
              >
                <button
                  onClick={() => handleToggleItem(item.id)}
                  className={cn(
                    "w-4 h-4 rounded border-2 flex-shrink-0 transition-colors",
                    item.isCompleted 
                      ? "bg-green-600 border-green-600" 
                      : "border-red-400 hover:border-red-300"
                  )}
                >
                  {item.isCompleted && (
                    <Check size={10} className="text-white m-auto" />
                  )}
                </button>
                <span 
                  className={cn(
                    "flex-1 text-sm",
                    item.isCompleted && "line-through"
                  )}
                >
                  {item.text}
                </span>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1 hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors rounded"
                  title="Delete item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <AlertCircle size={32} className="mx-auto mb-2 text-red-400/50" />
              <p className="text-terminal-accent/70 mb-2">Nothing on the avoidance list</p>
              <p className="text-sm text-terminal-accent/50">
                Be honest - what are you procrastinating on?
              </p>
            </div>
          )}
        </div>
      </div>

      {avoidanceItems.length > 0 && (
        <div className="text-xs text-terminal-accent/50 text-center">
          {avoidanceItems.filter(item => !item.isCompleted).length} of {avoidanceItems.length} items still being avoided
        </div>
      )}
    </div>
  );
};