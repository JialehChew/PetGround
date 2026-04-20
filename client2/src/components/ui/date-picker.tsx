"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { formatDateYmdInput } from "@/utils/booking"

interface DatePickerProps {
  /** Prefer YYYY-MM-DD string from Formik; Date is normalized so the calendar never gets Invalid Date. */
  value?: string | Date
  onChange?: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Optional: override popover content classes (e.g. z-index inside modals) */
  contentClassName?: string
  minDate?: string
  maxDate?: string
  error?: boolean
  disableDate?: (date: Date) => boolean
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  disabled = false,
  className,
  contentClassName,
  minDate,
  maxDate,
  error = false,
  disableDate
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const ymd = formatDateYmdInput(value)
  // Noon local avoids DST / TZ edge cases when parsing YYYY-MM-DD for the calendar grid
  const selectedDate = ymd ? new Date(`${ymd}T12:00:00`) : undefined
  
  // Convert min/max strings to Date objects
  const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : undefined
  const maxDateObj = maxDate ? new Date(maxDate + 'T00:00:00') : undefined

  const handleSelect = (date: Date | undefined) => {
    if (date && onChange) {
      // Convert to YYYY-MM-DD format for HTML date input compatibility
      const dateString = format(date, 'yyyy-MM-dd')
      onChange(dateString)
    }
    setOpen(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen && onBlur) {
      onBlur()
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", contentClassName)} align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDateObj && date < minDateObj) return true
            if (maxDateObj && date > maxDateObj) return true
            if (disableDate && disableDate(date)) return true
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
