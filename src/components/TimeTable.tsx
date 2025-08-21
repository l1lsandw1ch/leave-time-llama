import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Calendar, TrendingUp, Edit2, Trash2, Check, X } from 'lucide-react';
import { useState } from 'react';

export interface TimeEntry {
  id: string;
  name?: string; // Optional custom name for the entry
  date: string;
  checkIn: string;
  checkOut: string | null;
  totalWorked: number; // in milliseconds
  totalPaused: number; // in milliseconds
  status: 'active' | 'completed' | 'paused';
}

interface TimeTableProps {
  entries: TimeEntry[];
  onRename: (entryId: string, newName: string) => void;
  onDelete: (entryId: string) => void;
}

const TimeTable = ({ entries, onRename, onDelete }: TimeTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-accent/20 text-accent`;
      case 'completed':
        return `${baseClasses} bg-success-glow/20 text-success-glow`;
      case 'paused':
        return `${baseClasses} bg-orange-500/20 text-orange-600`;
      default:
        return `${baseClasses} bg-muted text-muted-foreground`;
    }
  };

  const startEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name || `Session ${formatDate(entry.date)}`);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (entryId: string) => {
    if (confirm('Are you sure you want to delete this work session?')) {
      onDelete(entryId);
    }
  };

  const totalWorkedToday = entries
    .filter(entry => new Date(entry.date).toDateString() === new Date().toDateString())
    .reduce((sum, entry) => sum + entry.totalWorked, 0);

  if (entries.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Work History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No work sessions recorded yet.</p>
            <p className="text-sm">Start your timer to begin tracking!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Work History
        </CardTitle>
        {totalWorkedToday > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Today's total: {formatDuration(totalWorkedToday)}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name/Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Paused</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(-10).reverse().map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {editingId === entry.id ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <Button size="sm" variant="ghost" onClick={saveEdit} className="h-8 w-8 p-0">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">
                            {entry.name || `Session ${formatDate(entry.date)}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(entry.date)}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatTime(entry.checkIn)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {entry.checkOut ? formatTime(entry.checkOut) : '-'}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {formatDuration(entry.totalWorked)}
                    </TableCell>
                    <TableCell className="font-mono text-orange-600">
                      {formatDuration(entry.totalPaused)}
                    </TableCell>
                    <TableCell>
                      <span className={getStatusBadge(entry.status)}>
                        {entry.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(entry)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(entry.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </div>
        {entries.length > 10 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Showing last 10 entries
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeTable;