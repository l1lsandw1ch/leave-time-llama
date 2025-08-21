import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Play, Pause, RotateCcw, Timer, Target, AlertCircle, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWorkSession } from '@/hooks/useWorkSession';
import { useWorkEntries, type WorkEntry } from '@/hooks/useWorkEntries';
import TimeTable, { type TimeEntry } from './TimeTable';
import DailySummary from './DailySummary';

interface TimeInput {
  hours: string;
  minutes: string;
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  totalWorkedMs: number;
  totalPausedMs: number;
  currentSessionStart: Date | null;
  pauseStartTime: Date | null;
}

const WorkdayTracker = () => {
  const { user } = useAuth();
  const { currentSession, loading: sessionLoading, createSession, updateSession, completeSession } = useWorkSession();
  const { entries, loading: entriesLoading, createEntry, updateEntry, deleteEntry, renameEntry } = useWorkEntries();
  
  const [arrivalTime, setArrivalTime] = useState<TimeInput>({ hours: '', minutes: '' });
  const [requiredWorkTime, setRequiredWorkTime] = useState<TimeInput>({ hours: '8', minutes: '0' });
  const [manualPauseTime, setManualPauseTime] = useState<TimeInput>({ hours: '0', minutes: '0' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentEntryId = useRef<string | null>(null);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize arrival time from current session and find current entry
  useEffect(() => {
    if (currentSession) {
      const time = currentSession.arrival_time.split(':');
      setArrivalTime({ hours: time[0], minutes: time[1] });
      setRequiredWorkTime({ 
        hours: currentSession.required_work_hours.toString(), 
        minutes: currentSession.required_work_minutes.toString().padStart(2, '0')
      });

      // Find the current active entry for this session
      if (!currentEntryId.current && entries.length > 0) {
        const activeEntry = entries.find(entry => 
          entry.session_id === currentSession.id && 
          (entry.status === 'active' || entry.status === 'paused')
        );
        if (activeEntry) {
          currentEntryId.current = activeEntry.id;
          console.log('Found active entry:', activeEntry.id);
        }
      }
    }
  }, [currentSession, entries]);

  // Get current timer state from session
  const getTimerState = (): TimerState => {
    if (!currentSession) {
      return {
        isRunning: false,
        isPaused: false,
        startTime: null,
        totalWorkedMs: 0,
        totalPausedMs: 0,
        currentSessionStart: null,
        pauseStartTime: null,
      };
    }

    return {
      isRunning: currentSession.is_running,
      isPaused: currentSession.is_paused,
      startTime: currentSession.start_time ? new Date(currentSession.start_time) : null,
      totalWorkedMs: currentSession.total_worked_ms,
      totalPausedMs: currentSession.total_paused_ms,
      currentSessionStart: currentSession.current_session_start ? new Date(currentSession.current_session_start) : null,
      pauseStartTime: currentSession.pause_start_time ? new Date(currentSession.pause_start_time) : null,
    };
  };

  const timer = getTimerState();
  const isSetupComplete = !!currentSession;

  const updateCurrentEntry = async (entryData: Partial<WorkEntry>) => {
    if (!currentEntryId.current) return;
    await updateEntry(currentEntryId.current, entryData);
  };

  // Calculate real-time values
  const calculateCurrentStats = () => {
    if (!isSetupComplete || !currentSession) return null;

    // Use session data for calculations
    const sessionArrivalTime = currentSession.arrival_time.split(':');
    const arrivalHours = parseInt(sessionArrivalTime[0]);
    const arrivalMinutes = parseInt(sessionArrivalTime[1]);
    
    // Calculate arrival time for today
    const arrivalToday = new Date();
    arrivalToday.setHours(arrivalHours, arrivalMinutes, 0, 0);
    
    // If arrival time is in the future (next day scenario), assume it was yesterday
    const now = new Date();
    if (arrivalToday > now) {
      arrivalToday.setDate(arrivalToday.getDate() - 1);
    }
    
    const requiredMs = (currentSession.required_work_hours * 60 + currentSession.required_work_minutes) * 60 * 1000;
    
    // Calculate total time that should have been worked since arrival
    const timeSinceArrivalMs = now.getTime() - arrivalToday.getTime();
    
    // Get session totals
    let totalWorkedMs = timer.totalWorkedMs;
    let totalPausedMs = timer.totalPausedMs;
    
    // Add current session time if timer is running
    if (timer.isRunning && timer.currentSessionStart) {
      totalWorkedMs += now.getTime() - timer.currentSessionStart.getTime();
    }
    
    // Add current pause time if timer is paused (real-time update)
    if (timer.isPaused && timer.pauseStartTime) {
      totalPausedMs += now.getTime() - timer.pauseStartTime.getTime();
    }

    const remainingMs = Math.max(0, requiredMs - totalWorkedMs);
    
    // Calculate leave time: arrival + required work + total paused time
    const leaveTime = new Date(arrivalToday.getTime() + requiredMs + totalPausedMs);
    const originalLeaveTime = new Date(arrivalToday.getTime() + requiredMs);

    return {
      totalWorkedMs,
      totalPausedMs,
      remainingMs,
      requiredMs,
      leaveTime,
      originalLeaveTime,
      progressPercentage: Math.min(100, (totalWorkedMs / requiredMs) * 100),
      isComplete: totalWorkedMs >= requiredMs
    };
  };

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatTimeInput = (value: string, type: 'hours' | 'minutes') => {
    const num = parseInt(value) || 0;
    if (type === 'hours') {
      return Math.min(Math.max(num, 0), 23).toString();
    } else {
      return Math.min(Math.max(num, 0), 59).toString().padStart(2, '0');
    }
  };

  const startSetup = async () => {
    if (!arrivalTime.hours || !arrivalTime.minutes || !requiredWorkTime.hours) {
      toast({
        title: "Missing Information",
        description: "Please enter arrival time and required work hours.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const arrivalTimeString = `${arrivalTime.hours.padStart(2, '0')}:${arrivalTime.minutes.padStart(2, '0')}`;
    
    // Calculate arrival time for today
    const arrivalToday = new Date();
    arrivalToday.setHours(parseInt(arrivalTime.hours), parseInt(arrivalTime.minutes), 0, 0);
    
    // If arrival time is in the future (next day scenario), assume it was yesterday
    if (arrivalToday > now) {
      arrivalToday.setDate(arrivalToday.getDate() - 1);
    }
    
    // Calculate time already worked since arrival
    const alreadyWorkedMs = Math.max(0, now.getTime() - arrivalToday.getTime());
    
    // Create work session
    const session = await createSession(
      arrivalTimeString,
      parseInt(requiredWorkTime.hours),
      parseInt(requiredWorkTime.minutes)
    );

    if (!session) {
      toast({
        title: "Error",
        description: "Failed to create work session.",
        variant: "destructive",
      });
      return;
    }

    // Update session with already worked time and start timer immediately
    await updateSession({
      total_worked_ms: alreadyWorkedMs,
      current_session_start: now.toISOString(),
      is_running: true,
    });

    // Create time entry with arrival time as check-in
    const entry = await createEntry({
      session_id: session.id,
      date: arrivalToday.toISOString(),
      check_in: arrivalToday.toISOString(), // Check in at arrival time
      total_worked_ms: alreadyWorkedMs, // Start with already worked time
      total_paused_ms: 0,
      status: 'active'
    });
    
    if (entry) {
      currentEntryId.current = entry.id;
    }
    
    toast({
      title: "Timer Started!",
      description: "Work session started. Timer is now running and tracking from your arrival time.",
    });
  };

  const startTimer = async () => {
    if (!currentSession) return;
    
    const now = new Date();
    await updateSession({
      is_running: true,
      is_paused: false,
      current_session_start: now.toISOString(),
      start_time: currentSession.start_time || now.toISOString(),
    });
    
    // Update time entry status
    if (currentEntryId.current) {
      await updateCurrentEntry({ status: 'active' });
    }
    
    toast({
      title: "Timer Started",
      description: "Work session is now active.",
    });
  };

  const pauseTimer = async () => {
    if (!currentSession) return;
    
    const now = new Date();
    const sessionTime = currentSession.current_session_start ? 
      now.getTime() - new Date(currentSession.current_session_start).getTime() : 0;
    
    const newTotalWorked = currentSession.total_worked_ms + sessionTime;
    
    await updateSession({
      is_running: false,
      is_paused: true,
      total_worked_ms: newTotalWorked,
      current_session_start: null,
      pause_start_time: now.toISOString(),
    });
    
    // Update time entry
    if (currentEntryId.current) {
      await updateCurrentEntry({ 
        total_worked_ms: newTotalWorked,
        status: 'paused'
      });
    }
    
    toast({
      title: "Timer Paused",
      description: "Work session paused. You can resume anytime.",
    });
  };

  const resumeTimer = async () => {
    if (!currentSession) return;
    
    const now = new Date();
    const pauseTime = currentSession.pause_start_time ? 
      now.getTime() - new Date(currentSession.pause_start_time).getTime() : 0;
    
    const newTotalPaused = currentSession.total_paused_ms + pauseTime;
    
    await updateSession({
      is_running: true,
      is_paused: false,
      total_paused_ms: newTotalPaused,
      current_session_start: now.toISOString(),
      pause_start_time: null,
    });
    
    // Update time entry with pause time
    if (currentEntryId.current) {
      await updateCurrentEntry({ 
        total_paused_ms: newTotalPaused,
        status: 'active'
      });
    }
    
    toast({
      title: "Timer Resumed",
      description: "Work session resumed.",
    });
  };

  const completeWorkday = async () => {
    if (!currentSession) return;
    
    // Mark current entry as completed
    if (currentEntryId.current) {
      const now = new Date();
      const sessionTime = timer.currentSessionStart ? 
        now.getTime() - timer.currentSessionStart.getTime() : 0;
      const totalWorked = timer.totalWorkedMs + sessionTime;
      
      await updateCurrentEntry({ 
        check_out: now.toISOString(),
        total_worked_ms: totalWorked,
        status: 'completed'
      });
    }
    
    // Complete session
    await completeSession();
    currentEntryId.current = null;
    
    toast({
      title: "Workday Complete!",
      description: "Great job! Your session has been saved to history.",
    });
  };

  const resetAll = async () => {
    // Complete current session if exists
    if (currentSession) {
      await completeWorkday();
    }
    
    setArrivalTime({ hours: '', minutes: '' });
    setRequiredWorkTime({ hours: '8', minutes: '0' });
    currentEntryId.current = null;
    
    toast({
      title: "Reset Complete",
      description: "You can start a fresh workday.",
    });
  };

  const handleRenameEntry = async (entryId: string, newName: string) => {
    await renameEntry(entryId, newName);
    toast({
      title: "Entry Renamed",
      description: "Work session name updated successfully.",
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    const success = await deleteEntry(entryId);
    if (success) {
      toast({
        title: "Entry Deleted",
        description: "Work session removed from history.",
        variant: "destructive",
      });
    }
  };

  const addManualPauseTime = async () => {
    if (!currentSession) return;
    
    const additionalPauseMs = (parseInt(manualPauseTime.hours) * 60 + parseInt(manualPauseTime.minutes)) * 60 * 1000;
    
    if (additionalPauseMs <= 0) {
      toast({
        title: "Invalid Time",
        description: "Please enter a valid pause duration.",
        variant: "destructive",
      });
      return;
    }
    
    const newTotalPaused = currentSession.total_paused_ms + additionalPauseMs;
    
    await updateSession({
      total_paused_ms: newTotalPaused,
    });
    
    // Update time entry with additional pause time
    if (currentEntryId.current) {
      await updateCurrentEntry({ 
        total_paused_ms: newTotalPaused
      });
    }
    
    setManualPauseTime({ hours: '0', minutes: '0' });
    
    toast({
      title: "Pause Time Added",
      description: `Added ${formatDuration(additionalPauseMs)} to pause time.`,
    });
  };

  const stats = calculateCurrentStats();

  // Update current entry in real-time
  useEffect(() => {
    if (timer.isRunning && currentEntryId.current && stats && currentSession) {
      updateCurrentEntry({ 
        total_worked_ms: stats.totalWorkedMs,
        status: stats.isComplete ? 'completed' : 'active'
      });
    }
  }, [stats?.totalWorkedMs, stats?.isComplete, timer.isRunning]);

  // Show loading state
  if (sessionLoading || entriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
              <Timer className="h-10 w-10 text-primary" />
              Workday Timer
            </h1>
            <p className="text-muted-foreground text-lg">
              Set up your workday and start tracking time
            </p>
          </div>

          <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl text-card-foreground flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                Today's Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Arrival Time */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-card-foreground">
                  What time did you arrive?
                </Label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Label htmlFor="arrival-hours" className="text-sm text-muted-foreground">Hours</Label>
                    <Input
                      id="arrival-hours"
                      type="number"
                      min="0"
                      max="23"
                      value={arrivalTime.hours}
                      onChange={(e) => setArrivalTime(prev => ({ ...prev, hours: formatTimeInput(e.target.value, 'hours') }))}
                      placeholder="08"
                      className="text-center font-mono text-lg"
                    />
                  </div>
                  <span className="text-2xl font-mono text-time-display mt-6">:</span>
                  <div className="flex-1">
                    <Label htmlFor="arrival-minutes" className="text-sm text-muted-foreground">Minutes</Label>
                    <Input
                      id="arrival-minutes"
                      type="number"
                      min="0"
                      max="59"
                      value={arrivalTime.minutes}
                      onChange={(e) => setArrivalTime(prev => ({ ...prev, minutes: formatTimeInput(e.target.value, 'minutes') }))}
                      placeholder="00"
                      className="text-center font-mono text-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Required Work Time */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-card-foreground">
                  How many hours do you need to work today?
                </Label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Label htmlFor="work-hours" className="text-sm text-muted-foreground">Hours</Label>
                    <Input
                      id="work-hours"
                      type="number"
                      min="0"
                      value={requiredWorkTime.hours}
                      onChange={(e) => setRequiredWorkTime(prev => ({ ...prev, hours: formatTimeInput(e.target.value, 'hours') }))}
                      className="text-center font-mono text-lg"
                    />
                  </div>
                  <span className="text-2xl font-mono text-time-display mt-6">:</span>
                  <div className="flex-1">
                    <Label htmlFor="work-minutes" className="text-sm text-muted-foreground">Minutes</Label>
                    <Input
                      id="work-minutes"
                      type="number"
                      min="0"
                      max="59"
                      value={requiredWorkTime.minutes}
                      onChange={(e) => setRequiredWorkTime(prev => ({ ...prev, minutes: formatTimeInput(e.target.value, 'minutes') }))}
                      className="text-center font-mono text-lg"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={startSetup}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
              >
                Start Work Timer
                <Play className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with current time */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            <Timer className="h-8 w-8 text-primary" />
            Workday Timer
          </h1>
          <p className="text-xl font-mono text-time-display">{formatTime(currentTime)}</p>
        </div>

        {/* Timer Controls */}
        <Card className="shadow-lg border-border/50">
          <CardContent className="pt-6">
            <div className="flex gap-4 justify-center">
              {!timer.isRunning ? (
                <Button
                  onClick={timer.isPaused ? resumeTimer : startTimer}
                  size="lg"
                  className="h-16 px-8 text-lg font-semibold bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
                >
                  {timer.isPaused ? (
                    <>
                      <Play className="mr-2 h-6 w-6" />
                      Resume Timer
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-6 w-6" />
                      Start Timer
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={pauseTimer}
                  size="lg"
                  variant="destructive"
                  className="h-16 px-8 text-lg font-semibold"
                >
                  <Pause className="mr-2 h-6 w-6" />
                  Pause Timer
                </Button>
              )}
              
              <Button
                onClick={resetAll}
                size="lg"
                variant="outline"
                className="h-16 px-8"
              >
                <RotateCcw className="mr-2 h-6 w-6" />
                Reset All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Complete Workday Button */}
        {stats?.isComplete && (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="flex justify-center">
                <Button
                  onClick={completeWorkday}
                  className="bg-gradient-to-r from-accent to-accent/80"
                >
                  Complete Workday
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Time Worked */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Time Worked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-mono font-bold text-primary">
                  {formatDuration(stats.totalWorkedMs)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {stats.progressPercentage.toFixed(1)}% complete
                </div>
                <div className="w-full bg-secondary h-3 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                    style={{ width: `${Math.min(100, stats.progressPercentage)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Time Remaining */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  Time Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-mono font-bold ${stats.isComplete ? 'text-accent' : 'text-foreground'}`}>
                  {stats.isComplete ? 'Complete!' : formatDuration(stats.remainingMs)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {stats.isComplete ? 'You can leave anytime!' : 'Until you can leave'}
                </div>
              </CardContent>
            </Card>

            {/* Pause Time */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pause className="h-5 w-5 text-orange-500" />
                  Pause Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-mono font-bold text-orange-600">
                  {formatDuration(stats.totalPausedMs)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {timer.isPaused ? 'Currently paused' : 'Total paused today'}
                </div>
                
                {/* Manual Pause Time Addition */}
                <div className="mt-4 space-y-3">
                  <Label className="text-sm font-medium">Add forgotten pause time:</Label>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Hours</Label>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={manualPauseTime.hours}
                        onChange={(e) => setManualPauseTime(prev => ({ ...prev, hours: formatTimeInput(e.target.value, 'hours') }))}
                        className="text-center font-mono text-sm h-8"
                      />
                    </div>
                    <span className="text-lg font-mono mb-1">:</span>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Minutes</Label>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={manualPauseTime.minutes}
                        onChange={(e) => setManualPauseTime(prev => ({ ...prev, minutes: formatTimeInput(e.target.value, 'minutes') }))}
                        className="text-center font-mono text-sm h-8"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={addManualPauseTime}
                      className="h-8 px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leave Time */}
            <Card className={`shadow-lg ${stats.isComplete ? 'border-success-glow/50 bg-gradient-to-br from-accent/5 to-accent/10' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className={`h-5 w-5 ${stats.isComplete ? 'text-accent' : 'text-primary'}`} />
                  Leave Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-mono font-bold ${stats.isComplete ? 'text-accent' : 'text-foreground'}`}>
                  {stats.isComplete ? 'Now!' : formatTime(stats.leaveTime)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {stats.isComplete ? 
                    'You\'ve completed your work day' : 
                    timer.isRunning ? 'Estimated (if you keep working)' : 'If you start now'
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily Summary */}
        <DailySummary entries={entries} />

        {/* Work History */}
        <TimeTable 
          entries={entries} 
          onRename={handleRenameEntry}
          onDelete={handleDeleteEntry}
        />

        {/* Status Indicator */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                timer.isRunning ? 'bg-accent/20 text-accent' : 
                timer.isPaused ? 'bg-orange-500/20 text-orange-600' : 
                'bg-muted text-muted-foreground'
              }`}>
                {timer.isRunning ? (
                  <>
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    Timer Running
                  </>
                ) : timer.isPaused ? (
                  <>
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    Timer Paused
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                    Timer Stopped
                  </>
                )}
              </div>
              
              {stats && (
                <p className="text-muted-foreground">
                  Arrived at {arrivalTime.hours}:{arrivalTime.minutes} • 
                  Need to work {requiredWorkTime.hours}:{requiredWorkTime.minutes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkdayTracker;
