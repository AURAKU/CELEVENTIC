"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { UserEvent } from "@/hooks/use-event-context";
import { formatDate } from "@/lib/utils";

interface EventPickerProps {
  events: UserEvent[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
  label?: string;
}

export function EventPicker({ events, value, onChange, loading, label = "Select Event" }: EventPickerProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading your events...</p>;
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-200/60 bg-brand-50/30 p-6 text-center">
        <p className="text-sm text-slate-500 mb-3">No events yet. Create an event first.</p>
        <Button asChild size="sm">
          <Link href="/dashboard/events/create"><Plus className="h-4 w-4" /> Create Event</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose an event" />
        </SelectTrigger>
        <SelectContent>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.title} — {formatDate(e.startDate)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
