import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { TimeEntry } from './TimeTable';

interface DailySummaryProps {
  entries: TimeEntry[];
}

const DailySummary = ({ entries }: DailySummaryProps) => {
  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Group entries by date and calculate totals
  const dailySummaries = entries.reduce((acc, entry) => {
    const dateKey = new Date(entry.date).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: entry.date,
        totalWorked: 0,
        totalPaused: 0,
        sessions: 0
      };
    }
    acc[dateKey].totalWorked += entry.totalWorked;
    acc[dateKey].totalPaused += entry.totalPaused;
    acc[dateKey].sessions += 1;
    return acc;
  }, {} as Record<string, {
    date: string;
    totalWorked: number;
    totalPaused: number;
    sessions: number;
  }>);

  // Convert to array and sort by date (newest first)
  const sortedSummaries = Object.values(dailySummaries).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedSummaries.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Daily Work Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No work sessions recorded yet. Start tracking to see your daily summaries!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Daily Work Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedSummaries.slice(0, 7).map((summary, index) => {
          const isToday = new Date(summary.date).toDateString() === new Date().toDateString();
          const isYesterday = new Date(summary.date).toDateString() === 
            new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
          
          let dateLabel = formatDate(summary.date);
          if (isToday) dateLabel = "Today";
          else if (isYesterday) dateLabel = "Yesterday";
          
          return (
            <div key={summary.date} className={`p-4 rounded-lg border ${isToday ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}>
              <p className="text-sm leading-relaxed">
                <span className={`font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {dateLabel}
                </span>
                {' - '}
                You worked for{' '}
                <span className="font-bold text-accent">
                  {formatDuration(summary.totalWorked)}
                </span>
                {summary.totalPaused > 0 && (
                  <>
                    {' '}with{' '}
                    <span className="font-medium text-orange-600">
                      {formatDuration(summary.totalPaused)}
                    </span>
                    {' '}of break time
                  </>
                )}
                {summary.sessions > 1 && (
                  <span className="text-muted-foreground">
                    {' '}across {summary.sessions} sessions
                  </span>
                )}
                .
              </p>
            </div>
          );
        })}
        {sortedSummaries.length > 7 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing last 7 days
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySummary;