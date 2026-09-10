import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';
import { useMaidLanguage } from './MaidLanguageContext';

type Language = 'en' | 'hi';

type BookingStatus =
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_maid_found';

type Booking = {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: {
    formatted?: string;
    landmark?: string;
  };
  categories?: string[];
  duration?: number;
  scheduledDateTime?: any;
  totalPrice?: number;
  status?: BookingStatus;
};

const ACTIVE_STATUSES: BookingStatus[] = [
  'assigned',
  'confirmed',
  'in_progress',
];

const copy = {
  en: {
    title: 'Bookings',
    subtitle: 'Your active and upcoming bookings.',
    active: 'Active',
    upcoming: 'Upcoming',
    customer: 'Customer',
    location: 'Location',
    duration: 'Duration',
    earning: 'Your earning',
    services: 'Services',
    open: 'Open booking',
    emptyTitle: 'No bookings yet',
    emptyText: 'Accepted and active bookings will appear here.',
    loading: 'Loading bookings...',
    error: 'Could not load your bookings.',
    retry: 'Try again',
    hr: 'hr',
  },
  hi: {
    title: 'बुकिंग्स',
    subtitle: 'आपकी एक्टिव और आने वाली बुकिंग्स।',
    active: 'एक्टिव',
    upcoming: 'आने वाली',
    customer: 'ग्राहक',
    location: 'जगह',
    duration: 'समय',
    earning: 'आपकी कमाई',
    services: 'सेवाएं',
    open: 'बुकिंग खोलें',
    emptyTitle: 'अभी कोई बुकिंग नहीं है',
    emptyText: 'स्वीकार की गई और एक्टिव बुकिंग्स यहां दिखेंगी।',
    loading: 'बुकिंग्स लोड हो रही हैं...',
    error: 'बुकिंग्स लोड नहीं हो सकीं।',
    retry: 'फिर कोशिश करें',
    hr: 'घं.',
  },
} as const;

function formatDateTime(value: any, language: Language): string {
  try {
    const date = value?.toDate?.() ?? (value ? new Date(value) : null);
    if (!date || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(language === 'en' ? 'en-IN' : 'hi-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getInitials(name?: string): string {
  const value = name?.trim() ?? '';
  if (!value) return 'C';
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function statusLabel(status: BookingStatus | undefined, language: Language): string {
  switch (status) {
    case 'assigned':
      return language === 'en' ? 'Assigned' : 'असाइन';
    case 'confirmed':
      return language === 'en' ? 'Confirmed' : 'कन्फर्म';
    case 'in_progress':
      return language === 'en' ? 'In progress' : 'काम जारी';
    default:
      return language === 'en' ? 'Booking' : 'बुकिंग';
  }
}

export default function MaidBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useMaidLanguage();
  const t = copy[language];
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user?.uid) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    const db = getFirestore();
    const q = query(
      collection(db, 'bookings'),
      where('maidId', '==', user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...(item.data() as Omit<Booking, 'id'>),
          }))
          .filter((booking) => ACTIVE_STATUSES.includes(booking.status as BookingStatus));

        next.sort((a, b) => {
          const aTime = a.scheduledDateTime?.toMillis?.() ?? 0;
          const bTime = b.scheduledDateTime?.toMillis?.() ?? 0;
          return aTime - bTime;
        });

        setBookings(next);
        setIsLoading(false);
        setIsRefreshing(false);
      },
      (listenerError) => {
        console.error('[MaidBookings] Listener failed:', listenerError);
        setError(t.error);
        setIsLoading(false);
        setIsRefreshing(false);
      },
    );

    return unsubscribe;
  }, [user?.uid, reloadKey, t.error]);

  const sections = useMemo(() => {
    const active = bookings.filter((booking) => booking.status === 'in_progress');
    const upcoming = bookings.filter((booking) => booking.status !== 'in_progress');
    return { active, upcoming };
  }, [bookings]);

  const refresh = () => {
    setIsRefreshing(true);
    setReloadKey((value) => value + 1);
  };

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#1F7A4C" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 100 },
          bookings.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
              <View style={styles.titleWrap}>
                <Text style={styles.eyebrow}>HOMEHELP • HELP</Text>
                <Text style={styles.title}>{t.title}</Text>
                <Text style={styles.subtitle}>{t.subtitle}</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={refresh}>
                  <Text style={styles.retryText}>{t.retry}</Text>
                </Pressable>
              </View>
            ) : null}

            {sections.active.length > 0 ? (
              <Text style={styles.sectionTitle}>{t.active}</Text>
            ) : null}
            {sections.upcoming.length > 0 && sections.active.length > 0 ? (
              <Text style={[styles.sectionTitle, styles.upcomingHeading]}>{t.upcoming}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>✓</Text>
            </View>
            <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
            <Text style={styles.emptyText}>{t.emptyText}</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isActive = item.status === 'in_progress';
          const showUpcomingHeading =
            sections.active.length > 0 &&
            !isActive &&
            index === sections.active.length;

          return (
            <View>
              {showUpcomingHeading ? (
                <Text style={[styles.sectionTitle, styles.upcomingHeading]}>
                  {t.upcoming}
                </Text>
              ) : null}
              <Pressable
                style={styles.bookingCard}
                onPress={() => router.push(`/maid/booking/${item.id}`)}
              >
                <View style={styles.bookingTopRow}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>
                      {getInitials(item.customerName)}
                    </Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {item.customerName || t.customer}
                    </Text>
                    <Text style={styles.dateTime}>
                      {formatDateTime(item.scheduledDateTime, language)}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>
                      {statusLabel(item.status, language)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.rowLabel}>{t.location}</Text>
                <Text style={styles.rowValue} numberOfLines={2}>
                  {item.customerAddress?.formatted || '—'}
                </Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>{t.duration}</Text>
                    <Text style={styles.metaValue}>
                      {typeof item.duration === 'number'
                        ? `${item.duration} ${t.hr}`
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>{t.services}</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.categories?.join(', ') || '—'}
                    </Text>
                  </View>
                  <View style={styles.metaBlockRight}>
                    <Text style={styles.metaLabel}>{t.earning}</Text>
                    <Text style={styles.earningValue}>
                      {typeof item.totalPrice === 'number' ? `₹${item.totalPrice}` : '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.openButton}>
                  <Text style={styles.openButtonText}>{t.open}</Text>
                  <Text style={styles.openButtonArrow}>→</Text>
                </View>
              </Pressable>
            </View>
          );
        }}
      />

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}> 
        <Pressable style={styles.navItem} onPress={() => router.replace('/maid')}>
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={styles.navLabel}>Home</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navIconActive]}>▣</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>{t.title}</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/maid/history')}>
          <Text style={styles.navIcon}>◷</Text>
          <Text style={styles.navLabel}>Job History</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/maid/profile')}>
          <Text style={styles.navIcon}>○</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8F6' },
  content: { paddingHorizontal: 20 },
  emptyListContent: { flexGrow: 1 },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F6',
  },
  loadingText: { marginTop: 12, fontSize: 13, color: '#737873' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E1E6E2',
  },
  backIcon: { fontSize: 30, lineHeight: 30, color: '#141914', marginTop: -3 },
  titleWrap: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, color: '#1F7A4C' },
  title: { marginTop: 5, fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#111111' },
  subtitle: { marginTop: 5, fontSize: 12, lineHeight: 18, color: '#777D78' },
  errorCard: {
    marginTop: 15,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#FFF4F2',
    borderWidth: 1,
    borderColor: '#F3C9C3',
  },
  errorText: { color: '#B42318', fontSize: 12, flex: 1 },
  retryButton: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: { color: '#9D2F22', fontSize: 12, fontWeight: '800' },
  sectionTitle: { marginTop: 22, marginBottom: 9, fontSize: 17, fontWeight: '800', color: '#111111' },
  upcomingHeading: { marginTop: 22 },
  bookingCard: {
    marginBottom: 12,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6E2',
  },
  bookingTopRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  customerAvatarText: { fontSize: 12, fontWeight: '800', color: '#1F7A4C' },
  customerInfo: { flex: 1, paddingRight: 8 },
  customerName: { fontSize: 14, fontWeight: '800', color: '#111111' },
  dateTime: { marginTop: 3, fontSize: 11, color: '#757B76' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: '#EAF5EE' },
  statusText: { fontSize: 9, fontWeight: '900', color: '#1F7A4C' },
  divider: { height: 1, backgroundColor: '#ECEFEC', marginVertical: 12 },
  rowLabel: { fontSize: 9, fontWeight: '800', color: '#1F7A4C', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#4A524C' },
  metaRow: { flexDirection: 'row', marginTop: 13, gap: 8 },
  metaBlock: { flex: 1 },
  metaBlockRight: { minWidth: 70, alignItems: 'flex-end' },
  metaLabel: { fontSize: 9, color: '#8A908B' },
  metaValue: { marginTop: 2, fontSize: 11, fontWeight: '700', color: '#4A524C' },
  earningValue: { marginTop: 2, fontSize: 15, fontWeight: '900', color: '#1F7A4C' },
  openButton: {
    marginTop: 13,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F8F3',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  openButtonText: { fontSize: 12, fontWeight: '800', color: '#1F7A4C' },
  openButtonArrow: { marginLeft: 7, fontSize: 16, fontWeight: '800', color: '#1F7A4C' },
  emptyCard: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6E2',
  },
  emptyIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EAF5EE', alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 20, fontWeight: '900', color: '#1F7A4C' },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: '800', color: '#111111' },
  emptyText: { marginTop: 6, maxWidth: 260, fontSize: 12, lineHeight: 18, color: '#7A807B', textAlign: 'center' },
  bottomNav: {
    position: 'absolute', left: 12, right: 12, bottom: 9, paddingTop: 8,
    borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E6E2',
    flexDirection: 'row', justifyContent: 'space-around', elevation: 5,
  },
  navItem: { minWidth: 62, alignItems: 'center', justifyContent: 'center' },
  navIcon: { fontSize: 19, color: '#858A86' },
  navIconActive: { color: '#1F7A4C' },
  navLabel: { marginTop: 3, fontSize: 9, fontWeight: '700', color: '#858A86' },
  navLabelActive: { color: '#1F7A4C' },
});
