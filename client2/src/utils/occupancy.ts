export const getOccupancyColor = (occupied: number, capacity: number): string => {
  if (!capacity || capacity <= 0) return "text-gray-500";
  const ratio = occupied / capacity;
  if (ratio < 0.5) return "text-green-500";
  if (ratio < 0.8) return "text-yellow-500";
  return "text-red-500";
};
