"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddToCalendarButtonProps {
  title: string;
  startDateRaw: string;
  venue?: string;
  description?: string;
}

function toGoogleDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

export function AddToCalendarButton({ title, startDateRaw, venue, description }: AddToCalendarButtonProps) {
  const start = toGoogleDate(startDateRaw);
  const endDate = new Date(startDateRaw);
  endDate.setHours(endDate.getHours() + 4);
  const end = toGoogleDate(endDate.toISOString());

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${start}/${end}`);
  if (venue) url.searchParams.set("location", venue);
  if (description) url.searchParams.set("details", description.slice(0, 500));

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={url.toString()} target="_blank" rel="noopener noreferrer">
        <CalendarPlus className="h-4 w-4" />
        Add to Calendar
      </a>
    </Button>
  );
}
