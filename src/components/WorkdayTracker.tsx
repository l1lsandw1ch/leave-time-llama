import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Coffee, Calendar, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TimeInput {
  hours: string;
  minutes: string;
}

const WorkdayTracker = () => {
  const [arrivalTime, setArrivalTime] = useState<TimeInput>({ hours: '', minutes: '' });
  const [lunchStart, setLunchStart] = useState<TimeInput>({ hours: '', minutes: '' });
  const [lunchEnd, setLunchEnd] = useState<TimeInput>({ hours: '', minutes: '' });
  const [debtTime, setDebtTime] = useState<TimeInput>({ hours: '0', minutes: '0' });
  const [leaveTime, setLeaveTime] = useState<string>('');
  const [isCalculated, setIsCalculated] = useState(false);

  const formatTimeInput = (value: string, type: 'hours' | 'minutes') => {
    const num = parseInt(value) || 0;
    if (type === 'hours') {
      return Math.min(Math.max(num, 0), 23).toString();
    } else {
      return Math.min(Math.max(num, 0), 59).toString().padStart(2, '0');
    }
  };

  const calculateLeaveTime = () => {
    try {
      // Validate inputs
      if (!arrivalTime.hours || !arrivalTime.minutes) {
        toast({
          title: "Missing Information",
          description: "Please enter your arrival time.",
          variant: "destructive",
        });
        return;
      }

      // Convert times to minutes for easier calculation
      const arrivalMinutes = parseInt(arrivalTime.hours) * 60 + parseInt(arrivalTime.minutes);
      const lunchStartMinutes = lunchStart.hours && lunchStart.minutes ? 
        parseInt(lunchStart.hours) * 60 + parseInt(lunchStart.minutes) : null;
      const lunchEndMinutes = lunchEnd.hours && lunchEnd.minutes ? 
        parseInt(lunchEnd.hours) * 60 + parseInt(lunchEnd.minutes) : null;
      const debtMinutes = parseInt(debtTime.hours) * 60 + parseInt(debtTime.minutes);

      // Calculate lunch break duration
      let lunchDuration = 0;
      if (lunchStartMinutes !== null && lunchEndMinutes !== null) {
        lunchDuration = lunchEndMinutes - lunchStartMinutes;
        if (lunchDuration < 0) {
          toast({
            title: "Invalid Lunch Time",
            description: "Lunch end time must be after start time.",
            variant: "destructive",
          });
          return;
        }
      }

      // 8 hours = 480 minutes + debt time + lunch break
      const totalWorkMinutes = 480 + debtMinutes + lunchDuration;
      const leaveMinutes = arrivalMinutes + totalWorkMinutes;

      // Convert back to hours and minutes
      const leaveHours = Math.floor(leaveMinutes / 60) % 24;
      const leaveMins = leaveMinutes % 60;

      const formattedLeaveTime = `${leaveHours.toString().padStart(2, '0')}:${leaveMins.toString().padStart(2, '0')}`;
      setLeaveTime(formattedLeaveTime);
      setIsCalculated(true);

      toast({
        title: "Calculation Complete!",
        description: `You can leave at ${formattedLeaveTime}`,
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setArrivalTime({ hours: '', minutes: '' });
    setLunchStart({ hours: '', minutes: '' });
    setLunchEnd({ hours: '', minutes: '' });
    setDebtTime({ hours: '0', minutes: '0' });
    setLeaveTime('');
    setIsCalculated(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
            <Clock className="h-10 w-10 text-primary" />
            Workday Tracker
          </h1>
          <p className="text-muted-foreground text-lg">
            Calculate your exact leave time based on arrival, lunch, and debt
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-card-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Arrival Time */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Arrival Time
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

            {/* Lunch Break */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                <Coffee className="h-5 w-5 text-primary" />
                Lunch Break (Optional)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Start Time</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={lunchStart.hours}
                      onChange={(e) => setLunchStart(prev => ({ ...prev, hours: formatTimeInput(e.target.value, 'hours') }))}
                      placeholder="12"
                      className="text-center font-mono"
                    />
                    <span className="font-mono text-time-display">:</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={lunchStart.minutes}
                      onChange={(e) => setLunchStart(prev => ({ ...prev, minutes: formatTimeInput(e.target.value, 'minutes') }))}
                      placeholder="00"
                      className="text-center font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">End Time</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={lunchEnd.hours}
                      onChange={(e) => setLunchEnd(prev => ({ ...prev, hours: formatTimeInput(e.target.value, 'hours') }))}
                      placeholder="13"
                      className="text-center font-mono"
                    />
                    <span className="font-mono text-time-display">:</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={lunchEnd.minutes}
                      onChange={(e) => setLunchEnd(prev => ({ ...prev, minutes: formatTimeInput(e.target.value, 'minutes') }))}
                      placeholder="00"
                      className="text-center font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Debt Time */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold text-card-foreground">
                Extra Time Owed (Debt)
              </Label>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <Label htmlFor="debt-hours" className="text-sm text-muted-foreground">Hours</Label>
                  <Input
                    id="debt-hours"
                    type="number"
                    min="0"
                    value={debtTime.hours}
                    onChange={(e) => setDebtTime(prev => ({ ...prev, hours: formatTimeInput(e.target.value, 'hours') }))}
                    className="text-center font-mono text-lg"
                  />
                </div>
                <span className="text-2xl font-mono text-time-display mt-6">:</span>
                <div className="flex-1">
                  <Label htmlFor="debt-minutes" className="text-sm text-muted-foreground">Minutes</Label>
                  <Input
                    id="debt-minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={debtTime.minutes}
                    onChange={(e) => setDebtTime(prev => ({ ...prev, minutes: formatTimeInput(e.target.value, 'minutes') }))}
                    className="text-center font-mono text-lg"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={calculateLeaveTime}
                className="flex-1 h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
              >
                Calculate Leave Time
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                onClick={reset}
                variant="outline"
                className="h-12 px-6"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Display */}
        {isCalculated && leaveTime && (
          <Card className="shadow-xl border-success-glow/20 bg-gradient-to-br from-accent/5 to-accent/10 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-card-foreground">
                  You can leave at:
                </h3>
                <div className="text-6xl font-mono font-bold text-accent drop-shadow-lg">
                  {leaveTime}
                </div>
                <p className="text-lg text-muted-foreground">
                  Based on 8-hour workday + your debt + lunch break
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-muted/30 border-border/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p className="font-semibold">💡 How it works:</p>
              <p>Standard 8-hour workday + debt time + lunch break duration = total work time</p>
              <p>Arrival time + total work time = your leave time</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkdayTracker;