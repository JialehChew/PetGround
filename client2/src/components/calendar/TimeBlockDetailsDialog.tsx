import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';
import { toast } from "sonner";
import groomerService, { type TimeBlock } from '../../services/groomerService';
import RecurringOptions from './RecurringOptions';
import { createRecurringTimeBlocks, blockTypeOptions } from '../../utils/timeBlockUtils';
import { toLocalDate, toLocalClock } from '../../utils/time';

interface TimeBlockDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  timeBlock: TimeBlock | null;
}

const TimeBlockDetailsDialog = ({
  isOpen,
  onClose,
  onSuccess,
  timeBlock
}: TimeBlockDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    date: undefined as Date | undefined,
    startTime: '',
    endTime: '',
    blockType: 'unavailable' as 'unavailable' | 'break' | 'lunch' | 'personal' | 'maintenance',
    reason: '',
    isRecurring: false,
    recurringDays: [] as number[],
    recurringEndDate: undefined as Date | undefined
  });

  // Init form data when timeBlock changes
  useEffect(() => {
    if (timeBlock && isOpen) {
      const startDate = new Date(timeBlock.startTime);
      const endDate = new Date(timeBlock.endTime);
      
      setFormData({
        date: startDate,
        startTime: startDate.toTimeString().slice(0, 5),
        endTime: endDate.toTimeString().slice(0, 5),
        blockType: timeBlock.blockType,
        reason: timeBlock.reason || '',
        isRecurring: false,
        recurringDays: [],
        recurringEndDate: undefined
      });
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [timeBlock, isOpen]);

  const formatDateTime = (dateString: string) => {
    return {
      date: toLocalDate(dateString),
      time: toLocalClock(dateString),
    };
  };

  const getBlockTypeColor = (blockType: string) => {
    switch (blockType) {
      case 'break': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'lunch': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'personal': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'maintenance': return 'bg-[#FFE8A3] text-amber-900 border-amber-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const handleInputChange = (field: string, value: string | boolean | number[] | Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!timeBlock) return;

    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate recurring options
    if (formData.isRecurring) {
      if (formData.recurringDays.length === 0) {
        toast.error('Please select at least one day for recurring schedule');
        return;
      }
      if (!formData.recurringEndDate) {
        toast.error('Please select an end date for recurring schedule');
        return;
      }
    }

    // create DateTime objects
    const dateString = format(formData.date, 'yyyy-MM-dd');
    const startDateTime = new Date(`${dateString}T${formData.startTime}:00`);
    const endDateTime = new Date(`${dateString}T${formData.endTime}:00`);

    // validate times
    if (startDateTime >= endDateTime) {
      toast.error('Start time must be before end time');
      return;
    }

    setLoading(true);
    
    try {
      await groomerService.updateTimeBlock(timeBlock._id, {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        blockType: formData.blockType,
        reason: formData.reason || undefined
      });

      // handle recurring creation if enabled
      if (formData.isRecurring && formData.recurringEndDate) {
        await createRecurringTimeBlocks(
          dateString,
          formData.startTime,
          formData.endTime,
          formData.blockType,
          formData.reason,
          formData.recurringDays,
          format(formData.recurringEndDate, 'yyyy-MM-dd')
        );
      }

      const successMessage = formData.isRecurring 
        ? 'Time block updated and recurring blocks created'
        : 'Time block updated successfully';

      toast.success(successMessage, {
        description: formData.isRecurring && formData.recurringEndDate ? `Recurring blocks created until ${formData.recurringEndDate.toLocaleDateString()}` : undefined
      });

      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error('Error updating time block:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' && 
        error.response.data !== null && 'error' in error.response.data &&
        typeof error.response.data.error === 'string' 
        ? error.response.data.error 
        : 'Please try again.';
      
      toast.error('Failed to update time block', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!timeBlock) return;
    
    setLoading(true);
    
    try {
      await groomerService.deleteTimeBlock(timeBlock._id);
      toast.success('Time block deleted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting time block:', error);
      toast.error('Failed to delete time block', {
        description: 'Please try again.'
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen || !timeBlock) return null;

  const { date, time: startTime } = formatDateTime(timeBlock.startTime);
  const { time: endTime } = formatDateTime(timeBlock.endTime);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-amber-200 bg-gradient-to-b from-[#FFFDF7] via-[#FFFCF2] to-[#FAF6EB] shadow-[0_24px_60px_rgba(120,80,20,0.18)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-200 bg-gradient-to-r from-amber-100/70 via-[#FFE8A3]/55 to-yellow-100/60 p-6">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-amber-100 p-3">
                  <ClockIcon className="h-8 w-8 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#3F2A1E]">
                    {timeBlock.blockType.charAt(0).toUpperCase() + timeBlock.blockType.slice(1)} Time Block
                  </h3>
                  <p className="text-sm text-amber-900/75">
                    {date} • {startTime} - {endTime}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getBlockTypeColor(timeBlock.blockType)}`}>
                  {timeBlock.blockType.charAt(0).toUpperCase() + timeBlock.blockType.slice(1)}
                </span>
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {!isEditing ? (
                // View mode
                <>
                  <Card className="rounded-3xl border border-amber-200 bg-white/85 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[#3F2A1E]">
                        <CalendarDaysIcon className="h-5 w-5 text-amber-700" />
                        Time Block Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-amber-900/70">Date</p>
                          <p className="text-[#3F2A1E]">{date}</p>
                        </div>
                        <div>
                          <p className="font-medium text-amber-900/70">Time</p>
                          <p className="text-[#3F2A1E]">{startTime} - {endTime}</p>
                        </div>
                      </div>
                      
                      {timeBlock.reason && (
                        <div>
                          <p className="font-medium text-amber-900/70">Reason</p>
                          <p className="text-[#3F2A1E]">{timeBlock.reason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </Button>
                    
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </>
              ) : (
                // Edit mode
                <div className="space-y-6">
                  {/* Date and Time */}
                  <Card className="rounded-3xl border border-amber-200 bg-white/85 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-[#3F2A1E]">Edit Time Block</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Date Picker */}
                        <div>
                          <Label className="text-[#3F2A1E]">Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "mt-1 w-full justify-start rounded-2xl border-amber-200 bg-white text-left font-normal text-[#3F2A1E] hover:bg-amber-50",
                                  !formData.date && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.date ? (
                                  format(formData.date, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto rounded-2xl border-amber-200 bg-[#FFFDF7] p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.date}
                                onSelect={(date) => handleInputChange('date', date)}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                captionLayout="dropdown"
                                fromYear={new Date().getFullYear()}
                                toYear={new Date().getFullYear() + 2}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label htmlFor="startTime" className="text-[#3F2A1E]">Start Time *</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => handleInputChange('startTime', e.target.value)}
                            required
                            className="mt-1 rounded-2xl border-amber-200 bg-white text-[#3F2A1E] focus-visible:ring-amber-300"
                          />
                        </div>

                        <div>
                          <Label htmlFor="endTime" className="text-[#3F2A1E]">End Time *</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => handleInputChange('endTime', e.target.value)}
                            required
                            className="mt-1 rounded-2xl border-amber-200 bg-white text-[#3F2A1E] focus-visible:ring-amber-300"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="blockType" className="text-[#3F2A1E]">Block Type *</Label>
                        <Select
                          value={formData.blockType}
                          onValueChange={(value) => handleInputChange('blockType', value)}
                        >
                          <SelectTrigger className="mt-1 rounded-2xl border-amber-200 bg-white text-[#3F2A1E] focus:ring-amber-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-amber-200 bg-[#FFFDF7]">
                            {blockTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-sm text-amber-900/70">{option.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="reason" className="text-[#3F2A1E]">Reason (Optional)</Label>
                        <Textarea
                          id="reason"
                          value={formData.reason}
                          onChange={(e) => handleInputChange('reason', e.target.value)}
                          placeholder="Provide additional details..."
                          className="mt-1 rounded-2xl border-amber-200 bg-white text-[#3F2A1E] focus-visible:ring-amber-300"
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recurring opts */}
                  <RecurringOptions
                    isRecurring={formData.isRecurring}
                    onRecurringChange={(isRecurring) => handleInputChange('isRecurring', isRecurring)}
                    recurringDays={formData.recurringDays}
                    onDaysChange={(days) => handleInputChange('recurringDays', days)}
                    recurringEndDate={formData.recurringEndDate}
                    onEndDateChange={(date) => handleInputChange('recurringEndDate', date)}
                    minEndDate={formData.date}
                  />

                  {/* Actions */}
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={loading}
                      className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                    >
                      {loading ? 'Saving...' : 
                       formData.isRecurring ? 'Save & Create Recurring' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Delete confirmation */}
              {showDeleteConfirm && (
                <Card className="rounded-3xl border border-amber-200 bg-amber-50/70">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-700 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-[#3F2A1E]">Delete Time Block</h4>
                        <p className="mt-1 text-sm text-amber-900/80">
                          Are you sure you want to delete this {timeBlock.blockType} time block? 
                          This action cannot be undone.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={loading}
                            className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleDelete}
                            disabled={loading}
                            className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                          >
                            {loading ? 'Deleting...' : 'Confirm Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default TimeBlockDetailsDialog;
