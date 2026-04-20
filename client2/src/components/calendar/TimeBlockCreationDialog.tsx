import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
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
import groomerService from '../../services/groomerService';
import RecurringOptions from './RecurringOptions';
import { createRecurringTimeBlocks } from '../../utils/timeBlockUtils';

const BLOCK_VALUES = ['unavailable', 'break', 'lunch', 'personal', 'maintenance'] as const;

interface TimeBlockCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate?: Date | null;
  selectedStartTime?: Date | null;
  selectedEndTime?: Date | null;
}

const TimeBlockCreationDialog = ({
  isOpen,
  onClose,
  onSuccess,
  selectedDate,
  selectedStartTime,
  selectedEndTime
}: TimeBlockCreationDialogProps) => {
  const { t, i18n } = useTranslation('booking');
  const { t: tc } = useTranslation('common');
  const dfLocale = i18n.language?.startsWith('zh') ? zhCN : enUS;
  const blockTypeOptions = useMemo(
    () =>
      BLOCK_VALUES.map((value) => ({
        value,
        label: t(`blockTypes.${value}.label`),
        description: t(`blockTypes.${value}.description`),
      })),
    [t]
  );

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: selectedDate || undefined,
    startTime: selectedStartTime ? selectedStartTime.toTimeString().slice(0, 5) : '09:00',
    endTime: selectedEndTime ? selectedEndTime.toTimeString().slice(0, 5) : '10:00',
    blockType: 'unavailable' as 'unavailable' | 'break' | 'lunch' | 'personal' | 'maintenance',
    reason: '',
    isRecurring: false,
    recurringDays: [] as number[],
    recurringEndDate: undefined as Date | undefined
  });

  // update form data when props change (when user selects time on calendar)
  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: selectedDate || undefined,
        startTime: selectedStartTime ? selectedStartTime.toTimeString().slice(0, 5) : '09:00',
        endTime: selectedEndTime ? selectedEndTime.toTimeString().slice(0, 5) : '10:00',
        blockType: 'unavailable',
        reason: '',
        isRecurring: false,
        recurringDays: [],
        recurringEndDate: undefined
      });
    }
  }, [isOpen, selectedDate, selectedStartTime, selectedEndTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast.error(t('timeBlock.toastFillRequired'));
      return;
    }

    if (formData.isRecurring) {
      if (formData.recurringDays.length === 0) {
        toast.error(t('timeBlock.toastPickRecurringDay'));
        return;
      }
      if (!formData.recurringEndDate) {
        toast.error(t('timeBlock.toastPickEndDate'));
        return;
      }
    }

    // create DateTime objects
    const dateString = format(formData.date, 'yyyy-MM-dd');
    const startDateTime = new Date(`${dateString}T${formData.startTime}:00`);
    const endDateTime = new Date(`${dateString}T${formData.endTime}:00`);

    // validate times
    if (startDateTime >= endDateTime) {
      toast.error(t('timeBlock.toastTimeOrder'));
      return;
    }

    if (startDateTime < new Date()) {
      toast.error(t('timeBlock.toastPast'));
      return;
    }

    setLoading(true);
    
    try {
      // create initial time block
      await groomerService.createTimeBlock({
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        blockType: formData.blockType,
        reason: formData.reason || undefined
      });

      // create recurring blocks if enabled
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
        ? t('timeBlock.toastCreateOkMany')
        : t('timeBlock.toastCreateOkSingle');

      const successDescription =
        formData.isRecurring && formData.recurringEndDate
          ? t('timeBlock.toastCreateDescMany', {
              date: formData.recurringEndDate.toLocaleDateString(
                i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
              ),
            })
          : t('timeBlock.toastCreateDescSingle', {
              start: formData.startTime,
              end: formData.endTime,
              date: formData.date
                ? formData.date.toLocaleDateString(i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US')
                : '',
            });

      toast.success(successMessage, {
        description: successDescription
      });

      onSuccess();
      onClose();
      
      // reset form will be handled by useEffect when dialog opens next time
    } catch (error: unknown) {
      console.error('Error creating time block:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' && 
        error.response.data !== null && 'error' in error.response.data &&
        typeof error.response.data.error === 'string' 
        ? error.response.data.error 
        : t('auth:errors.tryAgain');

      toast.error(t('timeBlock.toastCreateFail'), {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean | number[] | Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

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
                    {t('timeBlock.createTitle')}
                  </h3>
                  <p className="text-sm text-amber-900/75">
                    {t('timeBlock.createSubtitle')}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="rounded-full p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Date and Time Selection */}
              <Card className="rounded-3xl border border-amber-200 bg-white/85 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Date Picker */}
                    <div className="md:col-span-1">
                      <Label className="flex items-center gap-2 text-[#3F2A1E]">
                        <CalendarDaysIcon className="h-4 w-4 text-amber-700" />
                        {t('timeBlock.date')} *
                      </Label>
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
                              format(formData.date, "PPP", { locale: dfLocale })
                            ) : (
                              <span>{t('timeBlock.pickDate')}</span>
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

                    <div className="md:col-span-1">
                      <Label htmlFor="startTime" className="text-[#3F2A1E]">{t('timeBlock.startTime')} *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        required
                        className="mt-1 rounded-2xl border-amber-200 bg-white text-[#3F2A1E] focus-visible:ring-amber-300"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Label htmlFor="endTime" className="text-[#3F2A1E]">{t('timeBlock.endTime')} *</Label>
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

                  {/* Block type selection */}
                  <div>
                    <Label htmlFor="blockType" className="text-[#3F2A1E]">{t('timeBlock.blockType')} *</Label>
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

                  {/* Reason */}
                  <div>
                    <Label htmlFor="reason" className="text-[#3F2A1E]">{t('timeBlock.reasonOptional')}</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      placeholder={t('timeBlock.reasonPlaceholder')}
                      className="mt-1 rounded-2xl border-amber-200 bg-white text-[#3F2A1E] focus-visible:ring-amber-300"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Recurring Options */}
              <RecurringOptions
                isRecurring={formData.isRecurring}
                onRecurringChange={(isRecurring) => handleInputChange('isRecurring', isRecurring)}
                recurringDays={formData.recurringDays}
                onDaysChange={(days) => handleInputChange('recurringDays', days)}
                recurringEndDate={formData.recurringEndDate}
                onEndDateChange={(date) => handleInputChange('recurringEndDate', date)}
                minEndDate={formData.date}
              />

              {/* Warning */}
              <Card className="rounded-3xl border border-amber-200 bg-amber-50/70">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-[#3F2A1E]">
                      <p className="font-medium">{t('timeBlock.important')}</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        <li>{t('timeBlock.ruleNoBook')}</li>
                        <li>{t('timeBlock.ruleExisting')}</li>
                        <li>{t('timeBlock.ruleDelete')}</li>
                        {formData.isRecurring && (
                          <li className="font-medium">{t('timeBlock.ruleRecurring')}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-amber-200 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                >
                  {tc('actions.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                >
                  {loading ? t('timeBlock.creating') :
                   formData.isRecurring ? t('timeBlock.createRecurring') : t('timeBlock.createOne')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default TimeBlockCreationDialog;
