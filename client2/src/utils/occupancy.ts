export const getOccupancyColor = (occupied: number, capacity: number): string => {
  if (!capacity || capacity <= 0) return "text-gray-500";
  const ratio = occupied / capacity;
  if (ratio < 0.5) return "text-green-500";
  if (ratio < 0.8) return "text-yellow-500";
  return "text-red-500";
};

export const getOccupancyBgColor = (occupied: number, capacity: number): string => {
  if (!capacity || capacity <= 0) return "bg-gray-100";
  const ratio = occupied / capacity;
  if (ratio < 0.5) return "bg-green-100";
  if (ratio < 0.8) return "bg-yellow-100";
  return "bg-red-100";
};

export const getOccupancyIndicator = (occupied: number, capacity: number): string => {
  if (!capacity || capacity <= 0) return "⚪";
  const ratio = occupied / capacity;
  if (ratio < 0.5) return "🟢";
  if (ratio < 0.8) return "🟡";
  return "🔴";
};
