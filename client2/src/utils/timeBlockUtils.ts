import groomerService from '../services/groomerService';

export interface TimeBlockData {
  startTime: string;
  endTime: string;
  blockType: 'unavailable' | 'break' | 'lunch' | 'personal' | 'maintenance';
  reason?: string;
}

export const createRecurringTimeBlocks = async (
  baseDate: string,
  startTime: string,
  endTime: string,
  blockType: 'unavailable' | 'break' | 'lunch' | 'personal' | 'maintenance',
  reason: string,
  recurringDays: number[],
  recurringEndDate: string
): Promise<void> => {
  if (recurringDays.length === 0 || !recurringEndDate) {
    return;
  }

  const startDateTime = new Date(`${baseDate}T${startTime}:00`);
  const endDateTime = new Date(`${baseDate}T${endTime}:00`);
  const recurringEnd = new Date(recurringEndDate);
  const currentDate = new Date(baseDate);
  
  const recurringBlocks: TimeBlockData[] = [];
  
  // start from day after base date
  currentDate.setDate(currentDate.getDate() + 1);
  
  while (currentDate <= recurringEnd) {
    if (recurringDays.includes(currentDate.getDay())) {
      const blockStart = new Date(currentDate);
      blockStart.setHours(startDateTime.getHours(), startDateTime.getMinutes());
      
      const blockEnd = new Date(currentDate);
      blockEnd.setHours(endDateTime.getHours(), endDateTime.getMinutes());
      
      recurringBlocks.push({
        startTime: blockStart.toISOString(),
        endTime: blockEnd.toISOString(),
        blockType,
        reason: reason || undefined
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // create all recurring blocks
  const createPromises = recurringBlocks.map(block => 
    groomerService.createTimeBlock(block)
  );
  
  await Promise.all(createPromises);
};

export const blockTypeOptions = [
  { value: 'unavailable' as const, label: 'Unavailable', description: 'General unavailability' },
  { value: 'break' as const, label: 'Break', description: 'Short break time' },
  { value: 'lunch' as const, label: 'Lunch', description: 'Lunch break' },
  { value: 'personal' as const, label: 'Personal', description: 'Personal appointment' },
  { value: 'maintenance' as const, label: 'Maintenance', description: 'Equipment or facility maintenance' }
];
