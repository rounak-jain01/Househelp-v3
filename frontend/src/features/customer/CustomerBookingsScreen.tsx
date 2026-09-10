import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { subscribeToCustomerProfile, type CustomerProfile } from '../../services/firebase/customerService';

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
  customerId?: string;
  maidId?: string | null;
  maidDetails?: {
    name?: string;
    phoneNumber?: string;
    photoUrl?: string;
  };
  maidName?: string;
  categories?: string[];
  duration?: number;
  scheduledDateTime?: any;
  totalPrice?: number;
  status?: BookingStatus;
  customerAddress?: {
    formatted?: string;
    landmark?: string;
  };
};

const terminalStatuses: BookingStatus[] = [
  'completed',
  'cancelled',
  'no_maid_found',
];

function formatDateTime(value: any): string {
  try {
    const date = value?.toDate?.() ?? (value ? new Date(value) : null);
    if (!date || Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Date unavailable';
  }
}

function formatCategory(category: string): string {
  return category
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusLabel(status?: BookingStatus): string {
  switch (status) {
    case 'pending': return 'Finding Help';
    case 'assigned': return 'Help Assigned';
    case 'confirmed': return 'Confirmed';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'no_maid_found': return 'No Help Found';
    default: return 'Booking';
  }
}

function statusStyle(status?: BookingStatus) {
  switch (status) {
    case 'completed':
      return { bg: '#EAF5EE', text: '#1F7A4C' };
    case 'cancelled':
    case 'no_maid_found':
      return { bg: '#FFF1EF', text: '#B42318' };
    case 'confirmed':
    case 'in_progress':
      return { bg: '#EEF3EE', text: '#455A4B' };
    default:
      return { bg: '#FFF7E8', text: '#9A6500' };
  }
}

function initials(name?: string): string {
  const value = name?.trim() ?? '';
  if (!value) return 'H';
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function CustomerBookingsScreen() {
  const insets = useSafeAreaInsets();
  const user = getAuth().currentUser;
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    return subscribeToCustomerProfile(setProfile, (listenerError) => {
      console.error('[CustomerBookings] Profile listener failed:', listenerError);
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    const db = getFirestore();
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid),
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Booking, 'id'>),
        }));

        next.sort((a, b) => {
          const aTime = a.scheduledDateTime?.toMillis?.() ?? 0;
          const bTime = b.scheduledDateTime?.toMillis?.() ?? 0;
          return bTime - aTime;
        });

        setBookings(next);
        setIsLoading(false);
        setIsRefreshing(false);
      },
      (listenerError) => {
        console.error('[CustomerBookings] Booking listener failed:', listenerError);
        setError('Could not load your bookings.');
        setIsLoading(false);
        setIsRefreshing(false);
      },
    );

    return unsubscribe;
  }, [user?.uid, reloadKey]);

  const summary = useMemo(() => {
    const active = bookings.filter((item) => !terminalStatuses.includes(item.status as BookingStatus));
    const completed = bookings.filter((item) => item.status === 'completed');
    return { active, completed };
  }, [bookings]);

  const refresh = () => {
    setIsRefreshing(true);
    setReloadKey((value) => value + 1);
  };

  const displayName = profile?.name?.trim()?.split(/\s+/)[0] || 'Profile';
  const profileInitials = initials(profile?.name);

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#1F7A4C" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 104,
          flexGrow: bookings.length ? 0 : 1,
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Pressable style={styles.backButton} onPress={() => router.replace('/customer')}>
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>HOMEHELP</Text>
                <Text style={styles.title}>Your bookings</Text>
                <Text style={styles.subtitle}>
                  {bookings.length ? `${summary.active.length} active • ${summary.completed.length} completed` : 'Track your bookings in one place.'}
                </Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={refresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>✓</Text>
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>
              Your bookings will appear here after you book a Help.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/customer/book')}>
              <Text style={styles.primaryButtonText}>Book a Help</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const maidName = item.maidDetails?.name || item.maidName || 'Help not assigned';
          const maidPhoto = item.maidDetails?.photoUrl;
          const statusColors = statusStyle(item.status);
          const isTerminal = terminalStatuses.includes(item.status as BookingStatus);

          return (
            <Pressable
              onPress={() => router.push(`/customer/booking/${item.id}`)}
              style={({ pressed }) => [styles.bookingCard, pressed && styles.pressed]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.maidAvatar}>
                  {maidPhoto ? (
                    <Image source={{ uri: maidPhoto }} style={styles.maidAvatarImage} />
                  ) : (
                    <Text style={styles.maidAvatarText}>{initials(maidName)}</Text>
                  )}
                </View>
                <View style={styles.mainInfo}>
                  <Text style={styles.bookingTitle} numberOfLines={2}>
                    {item.categories?.length
                      ? item.categories.map(formatCategory).join(' • ')
                      : 'Home service'}
                  </Text>
                  <Text style={styles.scheduledText}>{formatDateTime(item.scheduledDateTime)}</Text>
                  <Text style={styles.maidName}>{maidName}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Duration</Text>
                  <Text style={styles.metaValue}>
                    {typeof item.duration === 'number' ? `${item.duration} hr` : '—'}
                  </Text>
                </View>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Amount</Text>
                  <Text style={styles.amountValue}>
                    {typeof item.totalPrice === 'number' ? `₹${item.totalPrice}` : '—'}
                  </Text>
                </View>
                <View style={styles.metaBlockWide}>
                  <Text style={styles.metaLabel}>Service at</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {item.customerAddress?.formatted || 'Address unavailable'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.openHint, isTerminal && styles.openHintTerminal]}>
                {isTerminal ? 'View booking details →' : 'View live status →'}
              </Text>
            </Pressable>
          );
        }}
      />

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <BottomNavItem icon="⌂" label="Home" onPress={() => router.replace('/customer')} />
        <BottomNavItem icon="▣" label="Bookings" active onPress={() => router.replace('/customer/bookings')} />
        <BottomNavProfileItem name={profile?.name} photoUrl={profile?.photoUrl} onPress={() => router.replace('/customer/profile')} />
      </View>
    </View>
  );
}

function BottomNavItem({ icon, label, active = false, onPress }: { icon: string; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
      <Text style={[styles.navIcon, active && styles.navIconActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function BottomNavProfileItem({ name, photoUrl, onPress }: { name?: string; photoUrl?: string | null; onPress: () => void }) {
  const displayName = name?.trim()?.split(/\s+/)[0] || 'Profile';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
      <View style={styles.navProfileImageWrap}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.navProfileImage} />
        ) : (
          <Text style={styles.navProfileInitials}>{initials(name)}</Text>
        )}
      </View>
      <Text numberOfLines={1} style={styles.navProfileName}>{displayName}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9F7' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#747B75' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E7E2' },
  backIcon: { fontSize: 29, lineHeight: 30, color: '#141914', marginTop: -2 },
  headerText: { flex: 1, marginLeft: 13 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: '#1F7A4C' },
  title: { marginTop: 4, fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#151A16' },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#7A817B' },
  errorCard: { marginBottom: 15, padding: 13, borderRadius: 14, backgroundColor: '#FFF4F2', borderWidth: 1, borderColor: '#F1D7D3' },
  errorText: { fontSize: 12, lineHeight: 18, color: '#B42318' },
  retryButton: { marginTop: 8, alignSelf: 'flex-start' },
  retryText: { fontSize: 12, fontWeight: '800', color: '#B42318' },
  bookingCard: { marginBottom: 12, padding: 16, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E7E2' },
  pressed: { opacity: 0.82 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  maidAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EAF2EB', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  maidAvatarImage: { width: '100%', height: '100%' },
  maidAvatarText: { fontSize: 13, fontWeight: '800', color: '#1F7A4C' },
  mainInfo: { flex: 1, paddingRight: 8 },
  bookingTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#202620' },
  scheduledText: { marginTop: 3, fontSize: 11, color: '#7C847D' },
  maidName: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#394139' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, alignSelf: 'flex-start' },
  statusText: { fontSize: 8, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#EDF0ED', marginVertical: 13 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaBlock: { minWidth: 65 },
  metaBlockWide: { flex: 1 },
  metaLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.7, color: '#9A9F9A' },
  metaValue: { marginTop: 3, fontSize: 11, color: '#3B423C', fontWeight: '600' },
  amountValue: { marginTop: 3, fontSize: 12, color: '#1F7A4C', fontWeight: '900' },
  openHint: { marginTop: 13, fontSize: 11, fontWeight: '800', color: '#1F7A4C' },
  openHintTerminal: { color: '#5F6861' },
  emptyCard: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, minHeight: 330 },
  emptyIconCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#EAF5EE', alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 20, fontWeight: '900', color: '#1F7A4C' },
  emptyTitle: { marginTop: 13, fontSize: 17, fontWeight: '800', color: '#151A16' },
  emptyText: { marginTop: 6, fontSize: 12, lineHeight: 18, textAlign: 'center', color: '#7A817B' },
  primaryButton: { marginTop: 16, height: 46, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#1F7A4C', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  bottomNav: { position: 'absolute', left: 12, right: 12, bottom: 9, minHeight: 80, paddingTop: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E6E2', flexDirection: 'row', justifyContent: 'space-around', shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  navItem: { minWidth: 62, alignItems: 'center', justifyContent: 'center' },
  navIcon: { fontSize: 19, color: '#858A86' },
  navIconActive: { color: '#1F7A4C' },
  navLabel: { marginTop: 3, fontSize: 9, fontWeight: '700', color: '#858A86' },
  navLabelActive: { color: '#1F7A4C' },
  navProfileImageWrap: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: '#E7EEE7', alignItems: 'center', justifyContent: 'center' },
  navProfileImage: { width: '100%', height: '100%' },
  navProfileInitials: { fontSize: 11, fontWeight: '800', color: '#1A211B' },
  navProfileName: { marginTop: 3, maxWidth: 58, fontSize: 9, fontWeight: '700', color: '#858A86', textAlign: 'center' },
});
