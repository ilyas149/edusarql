export const formatTime12h = (timeStr) => {
  if (!timeStr) return '--:--';
  // Check if it's already in 12h format (has AM/PM)
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;

  const [hours, minutes] = timeStr.split(':');
  let h = parseInt(hours);
  const m = minutes || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
};
