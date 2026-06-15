import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parseDate, time12 } from '../format.js';

const pad = (n) => String(n).padStart(2, '0');

function parse12(time) {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return { h12: h % 12 || 12, minute: m || 0, period: h >= 12 ? 'PM' : 'AM' };
}
function to24(h12, minute, period) {
  let h = h12 % 12;
  if (period === 'PM') h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

/**
 * Date-only picker (shadcn Calendar in a Popover). Works inside dialogs.
 * Props: date (ISO yyyy-mm-dd), onChange(iso), className, placeholder.
 */
export function DatePicker({ date, onChange, className, placeholder = 'Pick a date' }) {
  const [open, setOpen] = useState(false);
  const selected = date ? parseDate(date) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-10 w-full justify-start gap-2 px-3 font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarDays className="size-4 opacity-70" />
          <span className="truncate">{selected ? format(selected, 'MMM d, yyyy') : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * shadcn date + time picker.
 * Props: date (ISO yyyy-mm-dd), time (HH:MM 24h), onDateChange(iso), onTimeChange(hhmm).
 */
export function DateTimePicker({ date, time, onDateChange, onTimeChange, className }) {
  const [open, setOpen] = useState(false);
  const selected = date ? parseDate(date) : undefined;

  const label = selected
    ? `${format(selected, 'EEE, MMM d, yyyy')}${time ? ` · ${time12(time)}` : ''}`
    : 'Pick a date';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-10 w-full justify-start gap-2 px-3 font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarDays className="size-4 opacity-70" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (d) onDateChange(format(d, 'yyyy-MM-dd'));
          }}
          initialFocus
        />
        <TimePicker value={time} onChange={onTimeChange} />
      </PopoverContent>
    </Popover>
  );
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTE_PRESETS = [0, 15, 30, 45];

/**
 * Hour-first time picker: tap an hour (with AM/PM and quick :00/:15/:30/:45),
 * or switch to a custom minute for anything in between.
 */
function TimePicker({ value, onChange }) {
  const { h12, minute, period } = parse12(value);
  const [custom, setCustom] = useState(!MINUTE_PRESETS.includes(minute));
  const set = (h, m, p) => onChange(to24(h, m, p));

  return (
    <div className="w-[268px] space-y-3 border-t p-3">
      <div className="flex items-center justify-between">
        <Label className="text-foreground">
          <Clock className="size-3.5" /> Time
        </Label>
        <span className="text-foreground text-sm font-semibold tabular-nums">{time12(value)}</span>
      </div>

      {/* AM / PM */}
      <div className="grid grid-cols-2 gap-1.5">
        {['AM', 'PM'].map((p) => (
          <Button key={p} type="button" size="sm" variant={period === p ? 'default' : 'outline'} onClick={() => set(h12, minute, p)}>
            {p}
          </Button>
        ))}
      </div>

      {/* Hours */}
      <div className="space-y-1.5">
        <div className="text-muted-foreground text-xs">Hour</div>
        <div className="grid grid-cols-4 gap-1.5">
          {HOURS.map((h) => (
            <Button key={h} type="button" size="sm" variant={h12 === h ? 'default' : 'outline'} className="tabular-nums" onClick={() => set(h, minute, period)}>
              {h}
            </Button>
          ))}
        </div>
      </div>

      {/* Minutes */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Minute</span>
          <button type="button" className="text-primary text-xs font-semibold" onClick={() => setCustom((c) => !c)}>
            {custom ? 'Quick picks' : 'Custom'}
          </button>
        </div>
        {custom ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-lg font-semibold tabular-nums">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(e) => set(h12, Math.max(0, Math.min(59, Number(e.target.value) || 0)), period)}
              className="h-9 tabular-nums"
            />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {MINUTE_PRESETS.map((m) => (
              <Button key={m} type="button" size="sm" variant={minute === m ? 'default' : 'outline'} className="tabular-nums" onClick={() => set(h12, m, period)}>
                :{pad(m)}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
