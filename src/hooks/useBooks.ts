/**
 * useBooks Hook
 * 
 * Manages books and reading progress.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Book, BookProgress, BookType, BookStatus } from '@/lib/kpiDefaults';
import { getWeekDates } from '@/lib/weeklyKpi';

export interface NewBook {
  title: string;
  author?: string;
  book_type: BookType;
  total_pages?: number;
}

export interface ProgressUpdate {
  current_page?: number;
  percent_complete?: number;
}

export interface UseBooksReturn {
  activeBooks: Book[];
  completedBooks: Book[];
  completedThisYear: number;
  weeklyPagesRead: number;
  weeklyProgress: BookProgress[];
  addBook: (book: NewBook) => Promise<void>;
  updateProgress: (bookId: string, update: ProgressUpdate) => Promise<void>;
  completeBook: (bookId: string) => Promise<void>;
  pauseBook: (bookId: string) => Promise<void>;
  resumeBook: (bookId: string) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useBooks(weekKey: string): UseBooksReturn {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<BookProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get week date range
  const { start, end } = getWeekDates(weekKey);
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  // Current year for completed count
  const currentYear = new Date().getFullYear();

  // Load books
  const loadBooks = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      return (data || []) as Book[];
    } catch (err) {
      console.error('Failed to load books:', err);
      return [];
    }
  }, [user?.id]);

  // Load weekly progress
  const loadWeeklyProgress = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('book_progress')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (fetchError) throw fetchError;

      return (data || []) as BookProgress[];
    } catch (err) {
      console.error('Failed to load weekly progress:', err);
      return [];
    }
  }, [user?.id, startDate, endDate]);

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [loadedBooks, loadedProgress] = await Promise.all([
        loadBooks(),
        loadWeeklyProgress(),
      ]);

      setBooks(loadedBooks);
      setWeeklyProgress(loadedProgress);
    } catch (err) {
      console.error('Failed to load book data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load book data'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadBooks, loadWeeklyProgress]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload progress when week changes
  useEffect(() => {
    if (!isLoading && user?.id) {
      loadWeeklyProgress().then(setWeeklyProgress);
    }
  }, [weekKey]);

  // Derived data
  const activeBooks = useMemo(() => 
    books.filter(b => b.status === 'reading'),
  [books]);

  const completedBooks = useMemo(() => 
    books.filter(b => b.status === 'completed'),
  [books]);

  const completedThisYear = useMemo(() => 
    completedBooks.filter(b => {
      if (!b.completed_at) return false;
      return new Date(b.completed_at).getFullYear() === currentYear;
    }).length,
  [completedBooks, currentYear]);

  const weeklyPagesRead = useMemo(() => 
    weeklyProgress.reduce((sum, p) => sum + (p.pages_read || 0), 0),
  [weeklyProgress]);

  // Add a new book
  const addBook = useCallback(async (newBook: NewBook) => {
    if (!user?.id) return;

    try {
      const { data, error: insertError } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: newBook.title,
          author: newBook.author,
          book_type: newBook.book_type,
          total_pages: newBook.total_pages,
          current_page: 0,
          percent_complete: 0,
          status: 'reading',
          started_at: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setBooks(prev => [data as Book, ...prev]);
      }
    } catch (err) {
      console.error('Failed to add book:', err);
      throw err;
    }
  }, [user?.id]);

  // Update book progress
  const updateProgress = useCallback(async (bookId: string, update: ProgressUpdate) => {
    if (!user?.id) return;

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // Calculate new values
    let newPage = update.current_page ?? book.current_page;
    let newPercent = update.percent_complete ?? book.percent_complete;

    // If updating page, calculate percent
    if (update.current_page !== undefined && book.total_pages) {
      newPercent = Math.round((newPage / book.total_pages) * 100);
    }

    // Calculate pages/percent read today
    const today = new Date().toISOString().split('T')[0];
    const pagesRead = book.book_type !== 'audiobook' 
      ? Math.max(0, newPage - book.current_page) 
      : 0;
    const percentDelta = newPercent - book.percent_complete;

    try {
      // Update the book
      const { error: updateError } = await supabase
        .from('books')
        .update({
          current_page: newPage,
          percent_complete: newPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record progress for the day
      const { error: progressError } = await supabase
        .from('book_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          date: today,
          pages_read: pagesRead,
          percent_delta: percentDelta,
          page_at: newPage,
          percent_at: newPercent,
        }, { onConflict: 'book_id,date' });

      if (progressError) {
        console.error('Failed to record progress:', progressError);
      }

      // Update local state
      setBooks(prev => 
        prev.map(b => b.id === bookId 
          ? { ...b, current_page: newPage, percent_complete: newPercent }
          : b
        )
      );

      // Reload weekly progress
      const newProgress = await loadWeeklyProgress();
      setWeeklyProgress(newProgress);
    } catch (err) {
      console.error('Failed to update book progress:', err);
      throw err;
    }
  }, [user?.id, books, loadWeeklyProgress]);

  // Complete a book
  const completeBook = useCallback(async (bookId: string) => {
    if (!user?.id) return;

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    try {
      const { error: updateError } = await supabase
        .from('books')
        .update({
          status: 'completed',
          percent_complete: 100,
          current_page: book.total_pages || book.current_page,
          completed_at: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setBooks(prev => 
        prev.map(b => b.id === bookId 
          ? { 
              ...b, 
              status: 'completed' as BookStatus, 
              percent_complete: 100,
              completed_at: new Date().toISOString().split('T')[0],
            }
          : b
        )
      );
    } catch (err) {
      console.error('Failed to complete book:', err);
      throw err;
    }
  }, [user?.id, books]);

  // Pause a book
  const pauseBook = useCallback(async (bookId: string) => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('books')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setBooks(prev => 
        prev.map(b => b.id === bookId 
          ? { ...b, status: 'paused' as BookStatus }
          : b
        )
      );
    } catch (err) {
      console.error('Failed to pause book:', err);
      throw err;
    }
  }, [user?.id]);

  // Resume a book
  const resumeBook = useCallback(async (bookId: string) => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('books')
        .update({
          status: 'reading',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setBooks(prev => 
        prev.map(b => b.id === bookId 
          ? { ...b, status: 'reading' as BookStatus }
          : b
        )
      );
    } catch (err) {
      console.error('Failed to resume book:', err);
      throw err;
    }
  }, [user?.id]);

  // Delete a book
  const deleteBook = useCallback(async (bookId: string) => {
    if (!user?.id) return;

    try {
      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setBooks(prev => prev.filter(b => b.id !== bookId));
    } catch (err) {
      console.error('Failed to delete book:', err);
      throw err;
    }
  }, [user?.id]);

  return {
    activeBooks,
    completedBooks,
    completedThisYear,
    weeklyPagesRead,
    weeklyProgress,
    addBook,
    updateProgress,
    completeBook,
    pauseBook,
    resumeBook,
    deleteBook,
    isLoading,
    error,
  };
}

export default useBooks;
