export const getOccupancyColor = (occupied: number, capacity: number): string => {
  if (!capacity || capacity <= 0) return "text-gray-500";
  const ratio = occupied / capacity;
  if (ratio < 0.5) return "text-green-600";
  if (ratio <= 0.8) return "text-amber-600";
  return "text-red-600";
};
