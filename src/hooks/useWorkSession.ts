import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

interface WorkSession {
  id: string;
  user_id: string;
  date: string;
  arrival_time: string;
  required_work_hours: number;
  required_work_minutes: number;
  is_active: boolean;
  is_running: boolean;
  is_paused: boolean;
  start_time: string | null;
  total_worked_ms: number;
  total_paused_ms: number;
  current_session_start: string | null;
  pause_start_time: string | null;
  created_at: string;
  updated_at: string;
}

export const useWorkSession = () => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current session on mount
  useEffect(() => {
    if (user) {
      loadCurrentSession();
    }
  }, [user]);

  const loadCurrentSession = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading session:', error);
        toast({
          title: "Error",
          description: "Failed to load work session.",
          variant: "destructive",
        });
        return;
      }

      setCurrentSession(data);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (
    arrivalTime: string,
    requiredWorkHours: number,
    requiredWorkMinutes: number
  ) => {
    if (!user) return null;

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('work_sessions')
        .insert({
          user_id: user.id,
          date: today,
          arrival_time: arrivalTime,
          required_work_hours: requiredWorkHours,
          required_work_minutes: requiredWorkMinutes,
          is_active: true,
          is_running: true,
          is_paused: false,
          start_time: now,
          current_session_start: now,
          total_worked_ms: 0,
          total_paused_ms: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        toast({
          title: "Error",
          description: "Failed to create work session.",
          variant: "destructive",
        });
        return null;
      }

      setCurrentSession(data);
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const updateSession = async (updates: Partial<WorkSession>) => {
    if (!user || !currentSession) return null;

    try {
      const { data, error } = await supabase
        .from('work_sessions')
        .update(updates)
        .eq('id', currentSession.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating session:', error);
        return null;
      }

      setCurrentSession(data);
      return data;
    } catch (error) {
      console.error('Error updating session:', error);
      return null;
    }
  };

  const completeSession = async () => {
    if (!currentSession) return;

    try {
      await updateSession({
        is_active: false,
        is_running: false,
        is_paused: false,
        current_session_start: null,
        pause_start_time: null,
      });

      setCurrentSession(null);
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  return {
    currentSession,
    loading,
    createSession,
    updateSession,
    completeSession,
    refreshSession: loadCurrentSession,
  };
};