/**
 * ReadingKPI Component
 * 
 * Multi-book tracking with page/percent progress.
 * Cyberpunk aesthetic with glow effects.
 */

import React, { useState, useCallback } from 'react';
import { Plus, BookOpen, Headphones, Tablet, Check, Pause, Play, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { colors, shadows } from '@/styles/design-tokens';
import { Book } from '@/lib/kpiDefaults';
import { AddBookModal } from './AddBookModal';

interface ReadingKPIProps {
  target: number | null; // Pages per week target
  activeBooks: Book[];
  completedThisYear: number;
  weeklyPagesRead: number;
  color: string;
  onUpdateProgress: (bookId: string, update: { current_page?: number; percent_complete?: number }) => void;
  onAddBook: (book: { title: string; author?: string; book_type: 'physical' | 'ebook' | 'audiobook'; total_pages?: number }) => void;
  onCompleteBook: (bookId: string) => void;
  onPauseBook: (bookId: string) => void;
  onResumeBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
}

export const ReadingKPI: React.FC<ReadingKPIProps> = ({
  target,
  activeBooks,
  completedThisYear,
  weeklyPagesRead,
  color,
  onUpdateProgress,
  onAddBook,
  onCompleteBook,
  onPauseBook,
  onResumeBook,
  onDeleteBook,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Calculate progress (if target is set)
  const progress = target && target > 0 
    ? Math.min(100, (weeklyPagesRead / target) * 100) 
    : 0;
  const isComplete = progress >= 100;

  // Get progress color
  const getProgressColor = (pct: number): string => {
    if (pct >= 100) return colors.success.DEFAULT;
    if (pct >= 70) return color;
    return color;
  };

  const progressColor = getProgressColor(progress);

  // Get book icon based on type
  const getBookIcon = (bookType: string) => {
    switch (bookType) {
      case 'audiobook': return <Headphones size={16} />;
      case 'ebook': return <Tablet size={16} />;
      default: return <BookOpen size={16} />;
    }
  };

  // Handle page/percent update
  const handleStartEdit = (book: Book) => {
    setEditingBookId(book.id);
    if (book.book_type === 'audiobook') {
      setEditValue(book.percent_complete.toString());
    } else {
      setEditValue(book.current_page.toString());
    }
  };

  const handleSaveEdit = useCallback((book: Book) => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      setEditingBookId(null);
      return;
    }

    if (book.book_type === 'audiobook') {
      onUpdateProgress(book.id, { percent_complete: Math.min(100, value) });
    } else {
      const maxPage = book.total_pages || 999999;
      onUpdateProgress(book.id, { current_page: Math.min(maxPage, Math.floor(value)) });
    }
    setEditingBookId(null);
  }, [editValue, onUpdateProgress]);

  const handleKeyDown = (e: React.KeyboardEvent, book: Book) => {
    if (e.key === 'Enter') {
      handleSaveEdit(book);
    } else if (e.key === 'Escape') {
      setEditingBookId(null);
    }
  };

  return (
    <motion.div 
      className="p-4 rounded-lg"
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${isComplete ? progressColor + '50' : colors.border.accent}`,
        boxShadow: isComplete ? `0 0 20px ${progressColor}25` : undefined,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header - Clickable to toggle collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-3 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ 
              backgroundColor: `${color}20`,
              border: `1px solid ${color}40`,
            }}
          >
            <BookOpen size={16} style={{ color }} />
          </div>
          <div className="text-left">
            <span 
              className="font-semibold text-sm"
              style={{ color: isComplete ? colors.success.DEFAULT : color }}
            >
              Reading
            </span>
            <div 
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {weeklyPagesRead}{target ? `/${target}` : ''} pages • {activeBooks.length} active
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div 
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {completedThisYear} books this year
            </div>
          </div>
          {isCollapsed ? (
            <ChevronDown size={18} style={{ color: colors.text.muted }} />
          ) : (
            <ChevronUp size={18} style={{ color: colors.text.muted }} />
          )}
        </div>
      </button>

      {/* Progress bar (if target is set) - always visible */}
      {target && target > 0 && (
        <div 
          className="h-2 rounded-full overflow-hidden mb-4"
          style={{ backgroundColor: `${colors.primary.DEFAULT}15` }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
            style={{ 
              backgroundColor: progressColor,
              boxShadow: isComplete ? `0 0 10px ${progressColor}` : undefined,
            }}
          />
        </div>
      )}

      {/* Collapsible content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Active books */}
            <AnimatePresence mode="popLayout">
              <div className="space-y-3 mb-4">
                {activeBooks.map((book, index) => {
                  const isEditing = editingBookId === book.id;
                  const bookProgress = book.percent_complete || 0;
                  const bookProgressColor = bookProgress >= 80 ? colors.success.DEFAULT : color;

                  return (
                    <motion.div
                      key={book.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: colors.background.tertiary,
                        border: `1px solid ${colors.border.DEFAULT}`,
                      }}
                    >
                      {/* Book header */}
                      <div className="flex items-start gap-2 mb-2">
                        <span 
                          className="mt-0.5"
                          style={{ color: colors.text.secondary }}
                        >
                          {getBookIcon(book.book_type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="font-medium text-sm truncate"
                            style={{ color: colors.text.primary }}
                          >
                            {book.title}
                          </div>
                          {book.author && (
                            <div 
                              className="text-xs truncate"
                              style={{ color: colors.text.muted }}
                            >
                              {book.author}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCompleteBook(book.id);
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1.5 rounded-md transition-colors"
                            style={{ color: colors.text.muted }}
                            title="Mark as completed"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = `${colors.success.DEFAULT}20`;
                              e.currentTarget.style.color = colors.success.DEFAULT;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = colors.text.muted;
                            }}
                          >
                            <Check size={14} />
                          </motion.button>
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPauseBook(book.id);
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1.5 rounded-md transition-colors"
                            style={{ color: colors.text.muted }}
                            title="Pause"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = `${colors.warning.DEFAULT}20`;
                              e.currentTarget.style.color = colors.warning.DEFAULT;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = colors.text.muted;
                            }}
                          >
                            <Pause size={14} />
                          </motion.button>
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBook(book.id);
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1.5 rounded-md transition-colors"
                            style={{ color: colors.text.muted }}
                            title="Delete"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = `${colors.danger.DEFAULT}20`;
                              e.currentTarget.style.color = colors.danger.DEFAULT;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = colors.text.muted;
                            }}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-2">
                        {book.book_type === 'audiobook' ? (
                          // Audiobook: percent input
                          <div className="flex items-center gap-2 flex-1">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveEdit(book)}
                                onKeyDown={(e) => handleKeyDown(e, book)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 px-2 py-1 text-sm rounded-md text-center focus:outline-none"
                                style={{
                                  backgroundColor: colors.background.secondary,
                                  border: `1px solid ${color}60`,
                                  color: color,
                                }}
                                min="0"
                                max="100"
                                autoFocus
                              />
                            ) : (
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(book);
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-16 px-2 py-1 text-sm rounded-md font-mono"
                                style={{ 
                                  color: bookProgressColor,
                                  backgroundColor: `${bookProgressColor}15`,
                                }}
                              >
                                {book.percent_complete}%
                              </motion.button>
                            )}
                            <span 
                              className="text-xs"
                              style={{ color: colors.text.muted }}
                            >
                              complete
                            </span>
                          </div>
                        ) : (
                          // Physical/ebook: page input
                          <div className="flex items-center gap-2 flex-1">
                            <span 
                              className="text-xs"
                              style={{ color: colors.text.muted }}
                            >
                              Page
                            </span>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveEdit(book)}
                                onKeyDown={(e) => handleKeyDown(e, book)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 px-2 py-1 text-sm rounded-md text-center focus:outline-none"
                                style={{
                                  backgroundColor: colors.background.secondary,
                                  border: `1px solid ${color}60`,
                                  color: color,
                                }}
                                min="0"
                                max={book.total_pages || undefined}
                                autoFocus
                              />
                            ) : (
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(book);
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-16 px-2 py-1 text-sm rounded-md font-mono"
                                style={{ 
                                  color: bookProgressColor,
                                  backgroundColor: `${bookProgressColor}15`,
                                }}
                              >
                                {book.current_page}
                              </motion.button>
                            )}
                            {book.total_pages && (
                              <span 
                                className="text-xs font-mono"
                                style={{ color: colors.text.muted }}
                              >
                                / {book.total_pages}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Progress percentage */}
                        <span 
                          className="text-xs font-mono w-12 text-right"
                          style={{ color: bookProgressColor }}
                        >
                          {Math.round(bookProgress)}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div 
                        className="h-1 rounded-full overflow-hidden mt-2"
                        style={{ backgroundColor: `${colors.primary.DEFAULT}15` }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${bookProgress}%` }}
                          transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
                          style={{ 
                            backgroundColor: bookProgressColor,
                            boxShadow: bookProgress >= 80 ? `0 0 6px ${bookProgressColor}` : undefined,
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })}

                {activeBooks.length === 0 && (
                  <motion.div 
                    className="text-sm py-3 text-center rounded-md"
                    style={{ 
                      color: colors.text.muted,
                      backgroundColor: colors.background.tertiary,
                      border: `1px dashed ${colors.border.DEFAULT}`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    No books currently reading
                  </motion.div>
                )}
              </div>
            </AnimatePresence>

            {/* Add book button */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddModalOpen(true);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm rounded-md transition-all duration-200"
              style={{
                border: `1px dashed ${colors.border.accent}`,
                color: colors.text.secondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.backgroundColor = `${color}10`;
                e.currentTarget.style.color = color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border.accent;
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = colors.text.secondary;
              }}
            >
              <Plus size={16} />
              <span>Add Book</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add book modal */}
      <AddBookModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={onAddBook}
      />
    </motion.div>
  );
};

export default ReadingKPI;
