/**
 * AddBookModal Component
 * 
 * Modal for adding a new book.
 * Cyberpunk aesthetic with design tokens.
 */

import React, { useState } from 'react';
import { X, BookOpen, Headphones, Tablet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookType } from '@/lib/kpiDefaults';
import { cn } from '@/lib/utils';
import { colors, shadows } from '@/styles/design-tokens';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (book: {
    title: string;
    author?: string;
    book_type: BookType;
    total_pages?: number;
  }) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [bookType, setBookType] = useState<BookType>('physical');
  const [totalPages, setTotalPages] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      author: author.trim() || undefined,
      book_type: bookType,
      total_pages: bookType !== 'audiobook' && totalPages 
        ? parseInt(totalPages, 10) 
        : undefined,
    });

    // Reset form
    setTitle('');
    setAuthor('');
    setBookType('physical');
    setTotalPages('');
    onClose();
  };

  const bookTypes: { value: BookType; label: string; icon: React.ReactNode }[] = [
    { value: 'physical', label: 'Physical', icon: <BookOpen size={18} /> },
    { value: 'ebook', label: 'E-book', icon: <Tablet size={18} /> },
    { value: 'audiobook', label: 'Audiobook', icon: <Headphones size={18} /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-4 rounded-lg shadow-2xl overflow-hidden"
            style={{
              backgroundColor: colors.background.tertiary,
              border: `1px solid ${colors.border.accent}`,
              boxShadow: shadows.glow.cyan,
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4"
              style={{ borderBottom: `1px solid ${colors.border.DEFAULT}` }}
            >
              <h2 
                className="text-lg font-bold"
                style={{ color: colors.primary.DEFAULT }}
              >
                Add Book
              </h2>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: colors.text.muted }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.danger.DEFAULT}20`;
                  e.currentTarget.style.color = colors.danger.DEFAULT;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors.text.muted;
                }}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Title */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-wider mb-2"
                  style={{ color: colors.text.muted }}
                >
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Book title..."
                  className="w-full px-3 py-2.5 rounded-md focus:outline-none transition-colors"
                  style={{
                    backgroundColor: colors.background.secondary,
                    border: `1px solid ${colors.border.DEFAULT}`,
                    color: colors.text.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.primary.DEFAULT;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.primary.DEFAULT}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border.DEFAULT;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  autoFocus
                />
              </div>

              {/* Author */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-wider mb-2"
                  style={{ color: colors.text.muted }}
                >
                  Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author name..."
                  className="w-full px-3 py-2.5 rounded-md focus:outline-none transition-colors"
                  style={{
                    backgroundColor: colors.background.secondary,
                    border: `1px solid ${colors.border.DEFAULT}`,
                    color: colors.text.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.primary.DEFAULT;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.primary.DEFAULT}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border.DEFAULT;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Book Type */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-wider mb-2"
                  style={{ color: colors.text.muted }}
                >
                  Format
                </label>
                <div className="flex gap-2">
                  {bookTypes.map((type) => {
                    const isSelected = bookType === type.value;
                    return (
                      <motion.button
                        key={type.value}
                        type="button"
                        onClick={() => setBookType(type.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 flex flex-col items-center gap-1.5 py-3 px-3 rounded-md transition-all duration-200"
                        style={{
                          border: `1px solid ${isSelected ? colors.primary.DEFAULT : colors.border.DEFAULT}`,
                          backgroundColor: isSelected ? `${colors.primary.DEFAULT}15` : 'transparent',
                          color: isSelected ? colors.primary.DEFAULT : colors.text.muted,
                          boxShadow: isSelected ? `0 0 10px ${colors.primary.DEFAULT}20` : undefined,
                        }}
                      >
                        {type.icon}
                        <span className="text-xs font-medium">{type.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Total Pages (for physical/ebook) */}
              <AnimatePresence>
                {bookType !== 'audiobook' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label 
                      className="block text-xs uppercase tracking-wider mb-2"
                      style={{ color: colors.text.muted }}
                    >
                      Total Pages
                    </label>
                    <input
                      type="number"
                      value={totalPages}
                      onChange={(e) => setTotalPages(e.target.value)}
                      placeholder="Number of pages..."
                      min="1"
                      className="w-full px-3 py-2.5 rounded-md focus:outline-none transition-colors"
                      style={{
                        backgroundColor: colors.background.secondary,
                        border: `1px solid ${colors.border.DEFAULT}`,
                        color: colors.text.primary,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.primary.DEFAULT;
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.primary.DEFAULT}20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = colors.border.DEFAULT;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 rounded-md font-medium transition-colors"
                  style={{
                    border: `1px solid ${colors.border.DEFAULT}`,
                    color: colors.text.secondary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.text.secondary;
                    e.currentTarget.style.backgroundColor = `${colors.text.secondary}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border.DEFAULT;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={!title.trim()}
                  whileHover={{ scale: title.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: title.trim() ? 0.98 : 1 }}
                  className="flex-1 py-2.5 rounded-md font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: `${colors.primary.DEFAULT}20`,
                    border: `1px solid ${colors.primary.DEFAULT}60`,
                    color: colors.primary.DEFAULT,
                    boxShadow: title.trim() ? `0 0 15px ${colors.primary.DEFAULT}20` : undefined,
                  }}
                >
                  Add Book
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddBookModal;
