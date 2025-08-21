import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Play, Pause, RotateCcw, Timer, Target, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import CookieConsent from './CookieConsent';
import TimeTable, { TimeEntry } from './TimeTable';

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
  const [hasConsent, setHasConsent] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<TimeInput>({ hours: '', minutes: '' });
  const [requiredWorkTime, setRequiredWorkTime] = useState<TimeInput>({ hours: '8', minutes: '0' });
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    startTime: null,
    totalWorkedMs: 0,
    totalPausedMs: 0,
    currentSessionStart: null,
    pauseStartTime: null,
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentEntryId = useRef<string | null>(null);

  // Load saved data on consent
  useEffect(() => {
    if (hasConsent) {
      loadSavedData();
    }
  }, [hasConsent]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save data when timer state changes
  useEffect(() => {
    if (hasConsent && isSetupComplete) {
      saveData();
    }
  }, [timer, arrivalTime, requiredWorkTime, isSetupComplete, hasConsent]);

  const loadSavedData = () => {
    try {
      const consent = localStorage.getItem('workday-tracker-consent');
      if (consent !== 'accepted') return;

      const savedData = localStorage.getItem('workday-tracker-data');
      const savedEntries = localStorage.getItem('workday-tracker-entries');
      
      if (savedData) {
        const data = JSON.parse(savedData);
        setArrivalTime(data.arrivalTime || { hours: '', minutes: '' });
        setRequiredWorkTime(data.requiredWorkTime || { hours: '8', minutes: '0' });
        setIsSetupComplete(data.isSetupComplete || false);
        
        if (data.timer) {
          const timerData = data.timer;
          // Restore timer state, but recalculate currentSessionStart if it was running
          setTimer({
            ...timerData,
            startTime: timerData.startTime ? new Date(timerData.startTime) : null,
            currentSessionStart: timerData.isRunning && timerData.currentSessionStart ? 
              new Date(timerData.currentSessionStart) : null,
          });
          currentEntryId.current = data.currentEntryId || null;
        }
      }

      if (savedEntries) {
        setTimeEntries(JSON.parse(savedEntries));
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  };

  const saveData = () => {
    try {
      const consent = localStorage.getItem('workday-tracker-consent');
      if (consent !== 'accepted') return;

      const dataToSave = {
        arrivalTime,
        requiredWorkTime,
        isSetupComplete,
        timer,
        currentEntryId: currentEntryId.current,
      };
      
      localStorage.setItem('workday-tracker-data', JSON.stringify(dataToSave));
      localStorage.setItem('workday-tracker-entries', JSON.stringify(timeEntries));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const updateTimeEntry = (entryData: Partial<TimeEntry>) => {
    setTimeEntries(prev => {
      const existing = prev.find(entry => entry.id === currentEntryId.current);
      if (existing) {
        return prev.map(entry => 
          entry.id === currentEntryId.current 
            ? { ...entry, ...entryData }
            : entry
        );
      } else if (currentEntryId.current) {
        const newEntry: TimeEntry = {
          id: currentEntryId.current,
          date: new Date().toISOString(),
          checkIn: new Date().toISOString(),
          checkOut: null,
          totalWorked: 0,
          totalPaused: 0,
          status: 'active',
          ...entryData
        };
        return [...prev, newEntry];
      }
      return prev;
    });
  };

  // Calculate real-time values
  const calculateCurrentStats = () => {
    if (!isSetupComplete) return null;

    const arrivalMs = new Date().setHours(
      parseInt(arrivalTime.hours), 
      parseInt(arrivalTime.minutes), 
      0, 
      0
    );
    const requiredMs = (parseInt(requiredWorkTime.hours) * 60 + parseInt(requiredWorkTime.minutes)) * 60 * 1000;
    
    let totalWorkedMs = timer.totalWorkedMs;
    
    // Add current session time if timer is running
    if (timer.isRunning && timer.currentSessionStart) {
      totalWorkedMs += currentTime.getTime() - timer.currentSessionStart.getTime();
    }

    const remainingMs = Math.max(0, requiredMs - totalWorkedMs);
    const leaveTime = new Date(arrivalMs + requiredMs);
    
    // If we still have time to work, calculate when we can leave based on current progress
    const adjustedLeaveTime = timer.isRunning ? 
      new Date(currentTime.getTime() + remainingMs) : 
      new Date(arrivalMs + requiredMs);

    return {
      totalWorkedMs,
      remainingMs,
      requiredMs,
      leaveTime: adjustedLeaveTime,
      originalLeaveTime: leaveTime,
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

  const startSetup = () => {
    if (!arrivalTime.hours || !arrivalTime.minutes || !requiredWorkTime.hours) {
      toast({
        title: "Missing Information",
        description: "Please enter arrival time and required work hours.",
        variant: "destructive",
      });
      return;
    }

    // Calculate time already worked since arrival
    const now = new Date();
    const arrivalToday = new Date();
    arrivalToday.setHours(parseInt(arrivalTime.hours), parseInt(arrivalTime.minutes), 0, 0);
    
    // If arrival time is in the future (next day scenario), assume it was today
    if (arrivalToday > now) {
      arrivalToday.setDate(arrivalToday.getDate() - 1);
    }
    
    const alreadyWorkedMs = Math.max(0, now.getTime() - arrivalToday.getTime());
    
    // Create new time entry
    const entryId = `entry-${Date.now()}`;
    currentEntryId.current = entryId;
    
    // Set up timer with already worked time and start it running
    setTimer({
      isRunning: true,
      isPaused: false,
      startTime: arrivalToday,
      totalWorkedMs: alreadyWorkedMs,
      totalPausedMs: 0,
      currentSessionStart: now,
      pauseStartTime: null,
    });
    
    // Create time entry
    updateTimeEntry({
      id: entryId,
      date: arrivalToday.toISOString(),
      checkIn: arrivalToday.toISOString(),
      checkOut: null,
      totalWorked: alreadyWorkedMs,
      totalPaused: 0,
      status: 'active'
    });
    
    setIsSetupComplete(true);
    
    const alreadyWorkedHours = Math.floor(alreadyWorkedMs / (1000 * 60 * 60));
    const alreadyWorkedMinutes = Math.floor((alreadyWorkedMs % (1000 * 60 * 60)) / (1000 * 60));
    
    toast({
      title: "Timer Started!",
      description: `Already worked ${alreadyWorkedHours}h ${alreadyWorkedMinutes}m since arrival. Timer is now running.`,
    });
  };

  const startTimer = () => {
    const now = new Date();
    setTimer(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentSessionStart: now,
      startTime: prev.startTime || now,
    }));
    
    // Update time entry status
    if (currentEntryId.current) {
      updateTimeEntry({ status: 'active' });
    }
    
    toast({
      title: "Timer Started",
      description: "Work session is now active.",
    });
  };

  const pauseTimer = () => {
    const now = new Date();
    setTimer(prev => {
      const sessionTime = prev.currentSessionStart ? 
        now.getTime() - prev.currentSessionStart.getTime() : 0;
      
      const newTotalWorked = prev.totalWorkedMs + sessionTime;
      
      // Update time entry
      if (currentEntryId.current) {
        updateTimeEntry({ 
          totalWorked: newTotalWorked,
          status: 'paused'
        });
      }
      
      return {
        ...prev,
        isRunning: false,
        isPaused: true,
        totalWorkedMs: newTotalWorked,
        currentSessionStart: null,
        pauseStartTime: now,
      };
    });
    toast({
      title: "Timer Paused",
      description: "Work session paused. You can resume anytime.",
    });
  };

  const resumeTimer = () => {
    const now = new Date();
    setTimer(prev => {
      // Add pause time to total paused time
      const pauseTime = prev.pauseStartTime ? 
        now.getTime() - prev.pauseStartTime.getTime() : 0;
      
      // Update time entry with pause time
      if (currentEntryId.current) {
        updateTimeEntry({ 
          totalPaused: prev.totalPausedMs + pauseTime,
          status: 'active'
        });
      }
      
      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        totalPausedMs: prev.totalPausedMs + pauseTime,
        currentSessionStart: now,
        pauseStartTime: null,
      };
    });
    
    // Update time entry status
    if (currentEntryId.current) {
      updateTimeEntry({ status: 'active' });
    }
    
    toast({
      title: "Timer Resumed",
      description: "Work session resumed.",
    });
  };

  const completeWorkday = () => {
    // Mark current entry as completed
    if (currentEntryId.current) {
      const now = new Date();
      const sessionTime = timer.currentSessionStart ? 
        now.getTime() - timer.currentSessionStart.getTime() : 0;
      const totalWorked = timer.totalWorkedMs + sessionTime;
      
      updateTimeEntry({ 
        checkOut: now.toISOString(),
        totalWorked,
        status: 'completed'
      });
    }
    
    // Reset timer
    setTimer({
      isRunning: false,
      isPaused: false,
      startTime: null,
      totalWorkedMs: 0,
      totalPausedMs: 0,
      currentSessionStart: null,
      pauseStartTime: null,
    });
    setIsSetupComplete(false);
    currentEntryId.current = null;
    
    toast({
      title: "Workday Complete!",
      description: "Great job! Your session has been saved to history.",
    });
  };

  const resetAll = () => {
    // Complete current session if exists
    if (currentEntryId.current) {
      completeWorkday();
    } else {
      setTimer({
        isRunning: false,
        isPaused: false,
        startTime: null,
        totalWorkedMs: 0,
        totalPausedMs: 0,
        currentSessionStart: null,
        pauseStartTime: null,
      });
      setIsSetupComplete(false);
      currentEntryId.current = null;
    }
    
    setArrivalTime({ hours: '', minutes: '' });
    setRequiredWorkTime({ hours: '8', minutes: '0' });
    
    toast({
      title: "Reset Complete",
      description: "You can start a fresh workday.",
    });
  };

  const renameEntry = (entryId: string, newName: string) => {
    setTimeEntries(prev => 
      prev.map(entry => 
        entry.id === entryId 
          ? { ...entry, name: newName }
          : entry
      )
    );
    toast({
      title: "Entry Renamed",
      description: "Work session name updated successfully.",
    });
  };

  const deleteEntry = (entryId: string) => {
    setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
    toast({
      title: "Entry Deleted",
      description: "Work session removed from history.",
      variant: "destructive",
    });
  };

  const stats = calculateCurrentStats();

  // Update current entry in real-time
  useEffect(() => {
    if (timer.isRunning && currentEntryId.current && stats) {
      updateTimeEntry({ 
        totalWorked: stats.totalWorkedMs,
        status: stats.isComplete ? 'completed' : 'active'
      });
    }
  }, [stats?.totalWorkedMs, stats?.isComplete, timer.isRunning]);

  if (!hasConsent) {
    return <CookieConsent onAccept={() => setHasConsent(true)} />;
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

        {/* Work History */}
        <TimeTable 
          entries={timeEntries} 
          onRename={renameEntry}
          onDelete={deleteEntry}
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