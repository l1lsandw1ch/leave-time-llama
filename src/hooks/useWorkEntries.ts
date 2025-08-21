import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface WorkEntry {
  id: string;
  user_id: string;
  session_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  total_worked_ms: number;
  total_paused_ms: number;
  name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useWorkEntries = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load entries on mount
  useEffect(() => {
    if (user) {
      loadEntries();
    }
  }, [user]);

  const loadEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('work_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading entries:', error);
        toast({
          title: "Error",
          description: "Failed to load work entries.",
          variant: "destructive",
        });
        return;
      }

      setEntries(data || []);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEntry = async (entryData: {
    session_id: string;
    date: string;
    check_in: string;
    total_worked_ms?: number;
    total_paused_ms?: number;
    status: string;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('work_entries')
        .insert({
          user_id: user.id,
          ...entryData,
          total_worked_ms: entryData.total_worked_ms || 0,
          total_paused_ms: entryData.total_paused_ms || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating entry:', error);
        toast({
          title: "Error",
          description: "Failed to create work entry.",
          variant: "destructive",
        });
        return null;
      }

      setEntries(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating entry:', error);
      return null;
    }
  };

  const updateEntry = async (entryId: string, updates: Partial<WorkEntry>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('work_entries')
        .update(updates)
        .eq('id', entryId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating entry:', error);
        return null;
      }

      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? data : entry
      ));
      return data;
    } catch (error) {
      console.error('Error updating entry:', error);
      return null;
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('work_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting entry:', error);
        toast({
          title: "Error",
          description: "Failed to delete work entry.",
          variant: "destructive",
        });
        return false;
      }

      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      return false;
    }
  };

  const renameEntry = async (entryId: string, newName: string) => {
    return await updateEntry(entryId, { name: newName });
  };

  return {
    entries,
    loading,
    createEntry,
    updateEntry,
    deleteEntry,
    renameEntry,
    refreshEntries: loadEntries,
  };
};