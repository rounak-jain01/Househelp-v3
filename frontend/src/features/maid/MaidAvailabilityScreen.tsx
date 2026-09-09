import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import {
  doc,
  getFirestore,
  onSnapshot,
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

import {
  formatDateKey,
  formatTimeKey,
  getDateLabel,
  saveMaidAvailability,
  type AvailabilitySlot,
} from '../../services/firebase/availabilityService';
import { useMaidLanguage } from './MaidLanguageContext';

type Language = 'en' | 'hi';

const text = {
  en: {
    title: 'Upcoming availability',
    subtitle:
      'Choose the days and time slots when you are available for work.',
    addTitle: 'Add availability',
    date: 'Date',
    start: 'Start time',
    end: 'End time',
    chooseDate: 'Choose date',
    chooseStart: 'Choose start time',
    chooseEnd: 'Choose end time',
    addSlot: 'Add slot',
    updateSlot: 'Update slot',
    edit: 'Edit',
    saved: 'Saved availability',
    noSlots:
      'No upcoming availability yet.',
    delete: 'Remove',
    back: 'Back',
    save: 'Save availability',
    saving: 'Saving...',
    errorDate:
      'Please choose a date at least today.',
    errorTime:
      'End time must be after start time.',
    errorPast:
      'This time slot has already ended.',
    error:
      'Unable to save availability. Please try again.',
    info:
      'During a scheduled slot, Available Now will automatically turn ON and turn OFF when the slot ends.',
  },
  hi: {
    title: 'आने वाली उपलब्धता',
    subtitle:
      'जिन दिनों और समय पर आप काम के लिए उपलब्ध रहेंगी, उन्हें चुनें।',
    addTitle: 'उपलब्धता जोड़ें',
    date: 'तारीख',
    start: 'शुरू',
    end: 'समाप्त',
    chooseDate: 'तारीख चुनें',
    chooseStart: 'शुरू होने का समय चुनें',
    chooseEnd: 'समाप्त होने का समय चुनें',
    addSlot: 'स्लॉट जोड़ें',
    updateSlot: 'स्लॉट अपडेट करें',
    edit: 'संपादित करें',
    saved: 'सेव की गई उपलब्धता',
    noSlots:
      'अभी कोई आने वाला स्लॉट नहीं है।',
    delete: 'हटाएं',
    back: 'वापस',
    save: 'उपलब्धता सेव करें',
    saving: 'सेव हो रहा है...',
    errorDate:
      'कृपया आज या उसके बाद की तारीख चुनें।',
    errorTime:
      'समाप्त होने का समय शुरू होने के समय के बाद होना चाहिए।',
    errorPast:
      'यह समय पहले ही निकल चुका है।',
    error:
      'उपलब्धता सेव नहीं हो सकी। फिर से कोशिश करें।',
    info:
      'तय किए गए समय पर Available Now अपने-आप ON होगा और स्लॉट खत्म होने पर OFF हो जाएगा।',
  },
} as const;

export default function MaidAvailabilityScreen() {
  const insets = useSafeAreaInsets();
  const user = getAuth().currentUser;

  const { language, setLanguage } = useMaidLanguage();
  const [slots, setSlots] =
    useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] =
    useState<Date>(() => {
      const value = new Date();
      value.setHours(0, 0, 0, 0);
      return value;
    });
  const [startTime, setStartTime] =
    useState<Date>(() => {
      const value = new Date();
      value.setHours(9, 0, 0, 0);
      return value;
    });
  const [endTime, setEndTime] =
    useState<Date>(() => {
      const value = new Date();
      value.setHours(13, 0, 0, 0);
      return value;
    });
  const [showDatePicker, setShowDatePicker] =
    useState(false);
  const [showStartPicker, setShowStartPicker] =
    useState(false);
  const [showEndPicker, setShowEndPicker] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);
  const [editingSlotId, setEditingSlotId] =
    useState<string | null>(null);
  const [error, setError] =
    useState('');

  const t = text[language];

  useEffect(() => {
    if (!user) {
      router.replace('/auth/welcome');
      return;
    }

    const unsubscribe = onSnapshot(
      doc(getFirestore(), 'maids', user.uid),
      (snapshot) => {
        const data =
          snapshot.data() as
            | {
                availabilitySlots?: AvailabilitySlot[];
              }
            | undefined;

        const next = (
          data?.availabilitySlots ?? []
        ).filter(
          (slot) =>
            `${slot.date} ${slot.endTime}` >=
            `${formatDateKey(new Date())} ${formatTimeKey(
              new Date(),
            )}`,
        );

        setSlots(next);
        setIsLoading(false);
      },
      (snapshotError) => {
        console.error(
          '[MaidAvailability] Load failed:',
          snapshotError,
        );
        setError(t.error);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  const sortedSlots = useMemo(
    () =>
      [...slots].sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(
          `${b.date} ${b.startTime}`,
        ),
      ),
    [slots],
  );

  const addSlot = () => {
    setError('');

    const dateKey = formatDateKey(selectedDate);
    const startKey = formatTimeKey(startTime);
    const endKey = formatTimeKey(endTime);
    const today = new Date();
    const todayKey = formatDateKey(today);

    if (dateKey < todayKey) {
      setError(t.errorDate);
      return;
    }

    if (
      dateKey === todayKey &&
      endKey <= formatTimeKey(today)
    ) {
      setError(t.errorPast);
      return;
    }

    if (endKey <= startKey) {
      setError(t.errorTime);
      return;
    }

    const slot: AvailabilitySlot = {
      id:
        editingSlotId ??
        `${dateKey}-${startKey}-${endKey}-${Date.now()}`,
      date: dateKey,
      startTime: startKey,
      endTime: endKey,
    };

    setSlots((current) => {
      const withoutCurrent = editingSlotId
        ? current.filter((item) => item.id !== editingSlotId)
        : current;

      const withoutOverlap = withoutCurrent.filter(
        (existing) =>
          !(
            existing.date === slot.date &&
            existing.startTime < slot.endTime &&
            slot.startTime < existing.endTime
          ),
      );

      return [...withoutOverlap, slot];
    });

    setEditingSlotId(null);
  };

  const editSlot = (slot: AvailabilitySlot) => {
    const [year, month, day] = slot.date
      .split('-')
      .map(Number);

    const [startHour, startMinute] = slot.startTime
      .split(':')
      .map(Number);

    const [endHour, endMinute] = slot.endTime
      .split(':')
      .map(Number);

    setSelectedDate(new Date(year, month - 1, day));

    const nextStart = new Date();
    nextStart.setHours(startHour, startMinute, 0, 0);
    setStartTime(nextStart);

    const nextEnd = new Date();
    nextEnd.setHours(endHour, endMinute, 0, 0);
    setEndTime(nextEnd);

    setEditingSlotId(slot.id);
    setError('');
  };

  const removeSlot = (slotId: string) => {
    setSlots((current) =>
      current.filter((slot) => slot.id !== slotId),
    );
    if (editingSlotId === slotId) {
      setEditingSlotId(null);
    }
  };

  const save = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      setError('');

      const futureSlots = slots.filter(
        (slot) =>
          `${slot.date} ${slot.endTime}` >=
          `${formatDateKey(new Date())} ${formatTimeKey(
            new Date(),
          )}`,
      );

      await saveMaidAvailability(
        user.uid,
        futureSlots,
      );

      router.back();
    } catch (saveError) {
      console.error(
        '[MaidAvailability] Save failed:',
        saveError,
      );
      setError(t.error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#1F7A4C" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 35,
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backIcon}>
                ‹
              </Text>
            </Pressable>

            <Text style={styles.headerTitle}>
              {t.title}
            </Text>

            <View style={styles.languageToggle}>
              <Pressable
                style={[
                  styles.languageOption,
                  language === 'en' &&
                    styles.languageActive,
                ]}
                onPress={() => setLanguage('en')}
              >
                <Text
                  style={[
                    styles.languageText,
                    language === 'en' &&
                      styles.languageTextActive,
                  ]}
                >
                  EN
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.languageOption,
                  language === 'hi' &&
                    styles.languageActive,
                ]}
                onPress={() => setLanguage('hi')}
              >
                <Text
                  style={[
                    styles.languageText,
                    language === 'hi' &&
                      styles.languageTextActive,
                  ]}
                >
                  HI
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.subtitle}>
            {t.subtitle}
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>⏱</Text>
            <Text style={styles.infoText}>
              {t.info}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            {t.addTitle}
          </Text>

          <Text style={styles.label}>
            {t.date}
          </Text>

          <Pressable
            style={styles.pickerButton}
            onPress={() =>
              setShowDatePicker(true)
            }
          >
            <Text style={styles.pickerText}>
              {selectedDate.toLocaleDateString(
                language === 'hi'
                  ? 'hi-IN'
                  : 'en-IN',
                {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                },
              )}
            </Text>
            <Text style={styles.pickerArrow}>
              ›
            </Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) {
                  date.setHours(0, 0, 0, 0);
                  setSelectedDate(date);
                }
              }}
            />
          )}

          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.label}>
                {t.start}
              </Text>

              <Pressable
                style={styles.pickerButton}
                onPress={() =>
                  setShowStartPicker(true)
                }
              >
                <Text style={styles.pickerText}>
                  {startTime.toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </Text>
                <Text style={styles.pickerArrow}>
                  ›
                </Text>
              </Pressable>
            </View>

            <View style={styles.timeColumn}>
              <Text style={styles.label}>
                {t.end}
              </Text>

              <Pressable
                style={styles.pickerButton}
                onPress={() =>
                  setShowEndPicker(true)
                }
              >
                <Text style={styles.pickerText}>
                  {endTime.toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </Text>
                <Text style={styles.pickerArrow}>
                  ›
                </Text>
              </Pressable>
            </View>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              onChange={(_, date) => {
                setShowStartPicker(false);
                if (date) setStartTime(date);
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              onChange={(_, date) => {
                setShowEndPicker(false);
                if (date) setEndTime(date);
              }}
            />
          )}

          <Pressable
            style={styles.addButton}
            onPress={addSlot}
          >
            <Text style={styles.addButtonText}>
              + {editingSlotId ? t.updateSlot : t.addSlot}
            </Text>
          </Pressable>

          <Text style={styles.sectionTitle}>
            {t.saved}
          </Text>

          {sortedSlots.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {t.noSlots}
              </Text>
            </View>
          ) : (
            <View style={styles.slotList}>
              {sortedSlots.map((slot) => (
                <View
                  key={slot.id}
                  style={styles.slotCard}
                >
                  <View style={styles.slotMain}>
                    <Text style={styles.slotDate}>
                      {getDateLabel(
                        slot.date,
                        language,
                      )}
                    </Text>

                    <Text style={styles.slotTime}>
                      {slot.startTime} – {slot.endTime}
                    </Text>
                  </View>

                  <View style={styles.slotActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => editSlot(slot)}
                    >
                      <Text style={styles.editText}>
                        {t.edit}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removeSlot(slot.id)}
                    >
                      <Text style={styles.removeText}>
                        {t.delete}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>
                ⚠
              </Text>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={[
              styles.saveButton,
              isSaving &&
                styles.saveButtonDisabled,
            ]}
            onPress={save}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {t.save}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  keyboard: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 34,
    lineHeight: 34,
    marginTop: -3,
    color: '#111111',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
  },
  languageToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6E2',
  },
  languageOption: {
    minWidth: 35,
    height: 29,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageActive: {
    backgroundColor: '#1F7A4C',
  },
  languageText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#717771',
  },
  languageTextActive: {
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#737873',
  },
  infoCard: {
    marginTop: 16,
    padding: 13,
    borderRadius: 15,
    backgroundColor: '#EEF6F1',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 17,
    marginRight: 9,
    color: '#1F7A4C',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#657168',
  },
  sectionTitle: {
    marginTop: 23,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },
  label: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '700',
    color: '#343934',
  },
  pickerButton: {
    minHeight: 51,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6E2',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
  },
  pickerArrow: {
    fontSize: 23,
    color: '#7B817C',
  },
  timeRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  timeColumn: {
    flex: 1,
  },
  addButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#EAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F7A4C',
  },
  emptyCard: {
    padding: 20,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E4',
  },
  emptyTitle: {
    fontSize: 12,
    color: '#7A807B',
    textAlign: 'center',
  },
  slotList: {
    gap: 9,
  },
  slotCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotMain: {
    flex: 1,
  },
  slotDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#222222',
  },
  slotTime: {
    marginTop: 4,
    fontSize: 11,
    color: '#1F7A4C',
    fontWeight: '700',
  },
  slotActions: {
    alignItems: 'flex-end',
    gap: 7,
    marginLeft: 10,
  },

  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#EAF5EE',
  },

  editText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#FFF2F0',
  },
  removeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B42318',
  },
  errorBox: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF4F2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 15,
    color: '#B42318',
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#B42318',
  },
  saveButton: {
    marginTop: 22,
    height: 53,
    borderRadius: 16,
    backgroundColor: '#1F7A4C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#AAB3AD',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
