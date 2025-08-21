-- Create work sessions table
CREATE TABLE public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  arrival_time TIME NOT NULL,
  required_work_hours INTEGER NOT NULL DEFAULT 8,
  required_work_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_time TIMESTAMPTZ,
  total_worked_ms BIGINT NOT NULL DEFAULT 0,
  total_paused_ms BIGINT NOT NULL DEFAULT 0,
  current_session_start TIMESTAMPTZ,
  pause_start_time TIMESTAMPTZ,
  is_running BOOLEAN NOT NULL DEFAULT false,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create work entries table for detailed history
CREATE TABLE public.work_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.work_sessions(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  date TIMESTAMPTZ NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  total_worked_ms BIGINT NOT NULL DEFAULT 0,
  total_paused_ms BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for work_sessions
CREATE POLICY "Users can view their own work sessions" 
ON public.work_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own work sessions" 
ON public.work_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work sessions" 
ON public.work_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work sessions" 
ON public.work_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for work_entries
CREATE POLICY "Users can view their own work entries" 
ON public.work_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own work entries" 
ON public.work_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work entries" 
ON public.work_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work entries" 
ON public.work_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_work_sessions_updated_at
  BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_entries_updated_at
  BEFORE UPDATE ON public.work_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_work_sessions_user_id ON public.work_sessions(user_id);
CREATE INDEX idx_work_sessions_date ON public.work_sessions(date);
CREATE INDEX idx_work_sessions_is_active ON public.work_sessions(is_active);
CREATE INDEX idx_work_entries_user_id ON public.work_entries(user_id);
CREATE INDEX idx_work_entries_session_id ON public.work_entries(session_id);
CREATE INDEX idx_work_entries_date ON public.work_entries(date);

-- Enable real-time updates
ALTER TABLE public.work_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.work_entries REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_entries;