import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Clock, AlertCircle } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';

interface TimeSlot {
  start: string;
  end: string;
  duration: number;
}

interface BookedSlot {
  start: string;
  end: string;
  renter: string;
  bookingId: string;
}

interface TimeSlotSelectorProps {
  availableFrom: string; // "09:00"
  availableUntil: string; // "09:00" (next day)
  bookedSlots?: BookedSlot[];
  minimumHours: number;
  onSlotSelect: (startTime: string, endTime: string, duration: number) => void;
  selectedStartTime?: string;
  selectedEndTime?: string;
}

// Helper functions - defined before component to avoid hoisting issues
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  
  // Handle 12-hour format (e.g., "7:45 PM", "7:35 AM")
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = parseInt(ampmMatch[2]);
    const ampm = ampmMatch[3].toUpperCase();
    
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  }
  
  // Handle 24-hour format (e.g., "19:45", "07:35")
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    return hours * 60 + minutes;
  }
  
  return 0;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const calculateDuration = (start: string, end: string): number => {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  let durationMinutes = endMinutes - startMinutes;
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  return durationMinutes / 60;
};

const timeSlotsOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  let end1Adj = end1Minutes;
  let end2Adj = end2Minutes;

  if (end1Minutes < start1Minutes) end1Adj = end1Minutes + 24 * 60;
  if (end2Minutes < start2Minutes) end2Adj = end2Minutes + 24 * 60;

  return start1Minutes < end2Adj && end1Adj > start2Minutes;
};

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  availableFrom,
  availableUntil,
  bookedSlots = [],
  minimumHours,
  onSlotSelect,
  selectedStartTime,
  selectedEndTime,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(minimumHours);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(
    selectedStartTime && selectedEndTime ? { start: selectedStartTime, end: selectedEndTime } : null
  );
  const [error, setError] = useState<string>('');

  // Generate available time slots for selected duration
  const getAvailableTimeSlots = (): Array<{ start: string; end: string; duration: number }> => {
    if (!availableFrom || !availableUntil || !selectedDuration) {
      return [];
    }
    
    const startMinutes = timeToMinutes(availableFrom);
    const endMinutes = timeToMinutes(availableUntil);
    
    if (isNaN(startMinutes) || isNaN(endMinutes)) {
      console.warn('⚠️ Invalid time format:', { availableFrom, availableUntil });
      return [];
    }
    
    let endAdj = endMinutes;
    if (endMinutes < startMinutes) {
      endAdj = endMinutes + 24 * 60; // Next day
    }

    const availableSlots: Array<{ start: string; end: string; duration: number }> = [];
    const durationMinutes = selectedDuration * 60;

    // Check each possible start time
    for (let startMins = startMinutes; startMins + durationMinutes <= endAdj; startMins += 60) {
      const endMins = startMins + durationMinutes;
      const startTimeStr = minutesToTime(startMins % (24 * 60));
      const endTimeStr = minutesToTime(endMins % (24 * 60));

      // Check if this slot conflicts with booked slots
      const hasConflict = bookedSlots.some((slot) => {
        return timeSlotsOverlap(startTimeStr, endTimeStr, slot.start, slot.end);
      });

      if (!hasConflict) {
        availableSlots.push({
          start: startTimeStr,
          end: endTimeStr,
          duration: selectedDuration,
        });
      }
    }

    return availableSlots;
  };

  const availableSlots = getAvailableTimeSlots();

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    setSelectedSlot(null); // Reset selected slot when duration changes
    setError('');
  };

  const handleSlotSelect = (slot: { start: string; end: string; duration: number }) => {
    setSelectedSlot({ start: slot.start, end: slot.end });
    setError('');
    onSlotSelect(slot.start, slot.end, slot.duration);
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Generate duration options (from minimumHours to max possible)
  const getDurationOptions = (): number[] => {
    if (!availableFrom || !availableUntil) return [];
    
    const startMinutes = timeToMinutes(availableFrom);
    const endMinutes = timeToMinutes(availableUntil);
    let endAdj = endMinutes;
    if (endMinutes < startMinutes) {
      endAdj = endMinutes + 24 * 60;
    }
    
    const maxDuration = Math.floor((endAdj - startMinutes) / 60);
    const options: number[] = [];
    for (let hours = minimumHours; hours <= maxDuration; hours++) {
      options.push(hours);
    }
    return options;
  };

  const durationOptions = getDurationOptions();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Clock size={20} color={COLORS.primary} />
        <Text style={styles.title}>Select Rental Duration</Text>
      </View>

      {/* Duration Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Select Duration (Hours)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
          {durationOptions.map((hours) => {
            const isSelected = selectedDuration === hours;
            return (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.timeButton,
                  isSelected && styles.timeButtonSelected,
                ]}
                onPress={() => handleDurationSelect(hours)}
              >
                <Text
                  style={[
                    styles.timeButtonText,
                    isSelected && styles.timeButtonTextSelected,
                  ]}
                >
                  {hours} {hours === 1 ? 'Hour' : 'Hours'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Available Time Slots for Selected Duration */}
      {selectedDuration > 0 && availableSlots.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Available Time Slots ({selectedDuration} {selectedDuration === 1 ? 'Hour' : 'Hours'})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
            {availableSlots.map((slot, index) => {
              const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
              return (
                <TouchableOpacity
                  key={`${slot.start}-${slot.end}-${index}`}
                  style={[
                    styles.slotButton,
                    isSelected && styles.slotButtonSelected,
                  ]}
                  onPress={() => handleSlotSelect(slot)}
                >
                  <Text
                    style={[
                      styles.slotButtonText,
                      isSelected && styles.slotButtonTextSelected,
                    ]}
                  >
                    {formatTime(slot.start)} - {formatTime(slot.end)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* No Slots Available Message */}
      {selectedDuration > 0 && availableSlots.length === 0 && (
        <View style={styles.noSlotsContainer}>
          <Text style={styles.noSlotsText}>
            No available time slots for {selectedDuration} {selectedDuration === 1 ? 'hour' : 'hours'}. Try a different duration.
          </Text>
        </View>
      )}

      {/* Selected Slot Display */}
      {selectedSlot && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>
            Selected: {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)} ({selectedDuration} {selectedDuration === 1 ? 'hour' : 'hours'})
          </Text>
        </View>
      )}

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Booked Slots Info */}
      {bookedSlots.length > 0 && (
        <View style={styles.bookedInfo}>
          <Text style={styles.bookedInfoText}>
            {bookedSlots.length} time slot{bookedSlots.length > 1 ? 's' : ''} already booked
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  timeScroll: {
    flexDirection: 'row',
  },
  timeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightGray,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeButtonDisabled: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.5,
  },
  timeButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  timeButtonTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  timeButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  durationContainer: {
    backgroundColor: `${COLORS.primary}15`,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  durationText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: `${COLORS.error}15`,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    flex: 1,
  },
  bookedInfo: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bookedInfoText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  slotButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightGray,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 120,
  },
  slotButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  slotButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  slotButtonTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  noSlotsContainer: {
    backgroundColor: `${COLORS.warning}15`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  noSlotsText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    textAlign: 'center',
  },
});

export default TimeSlotSelector;
