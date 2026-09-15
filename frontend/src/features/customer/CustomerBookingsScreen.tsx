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
  createdAt?: any;
  updatedAt?: any;
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
          const aCreated =
            a.createdAt?.toMillis?.() ??
            (a.createdAt ? new Date(a.createdAt).getTime() : 0);

          const bCreated =
            b.createdAt?.toMillis?.() ??
            (b.createdAt ? new Date(b.createdAt).getTime() : 0);

          // Latest booking created by the customer stays at the top.
          if (aCreated || bCreated) {
            return bCreated - aCreated;
          }

          // Safe fallback for older booking documents without createdAt.
          const aScheduled =
            a.scheduledDateTime?.toMillis?.() ?? 0;
          const bScheduled =
            b.scheduledDateTime?.toMillis?.() ?? 0;

          return bScheduled - aScheduled;
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


  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#1F7A4C" />
        <Text style={styles.loadingText}>
          Loading your bookings...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* FIXED HEADER */}
      <View
        style={[
          styles.fixedHeader,
          {
            paddingTop: insets.top + 4,
          },
        ]}
      >
        <View style={styles.headerBar}>
          <Image
            source={require("../../../assets/CustomerUi/CustomerBookings/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* SCROLLABLE CONTENT */}
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#0F6B51"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 112,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 115,
          flexGrow: bookings.length ? 0 : 1,
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.heroHeader}>
              <Text style={styles.pageTitle}>My Bookings</Text>
              <Text style={styles.pageSubtitle}>
                Your latest booking stays on top, with all previous bookings below.
              </Text>
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
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/customer/book")}
            >
              <Text style={styles.primaryButtonText}>Book a Help</Text>
              <Text style={styles.primaryButtonArrow}>→</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => {
          const category = item.categories?.length
            ? formatCategory(item.categories[0])
            : "Home service";

          const secondaryCategories =
            item.categories && item.categories.length > 1
              ? ` +${item.categories.length - 1}`
              : "";

          const statusColors = statusStyle(item.status);
          const isTerminal = terminalStatuses.includes(
            item.status as BookingStatus,
          );

          const formatted = formatDateTime(item.scheduledDateTime);
          const parts = formatted.split(", ");
          const datePart = parts.slice(0, 2).join(", ");
          const timePart = parts.slice(2).join(", ") || formatted;

          const maidName =
            item.maidDetails?.name ||
            item.maidName ||
            "Help not assigned";

          const maidPhoto = item.maidDetails?.photoUrl;
          const categoryIcon = getBookingIcon(category);

          return (
            <Pressable
              onPress={() =>
                router.push(`/customer/booking/${item.id}`)
              }
              style={({ pressed }) => [
                styles.bookingCard,
                index === 0 && styles.latestBookingCard,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${category} booking`}
            >
              {/* TOP AREA */}
              <View style={styles.bookingTop}>
                {index === 0 ? (
                  <View style={styles.latestBadge}>
                    <Text style={styles.latestBadgeText}>LATEST BOOKING</Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.categoryIconWrap,
                    {
                      backgroundColor:
                        categoryIcon.backgroundColor,
                    },
                  ]}
                >
                  <Image
                    source={categoryIcon.source}
                    style={styles.categoryIcon}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.bookingMain}>
                  <Text style={styles.bookingTitle} numberOfLines={1}>
                    {category}
                    {secondaryCategories}
                  </Text>

                  <View style={styles.helperLine}>
                    <View style={styles.miniPerson}>
                      {maidPhoto ? (
                        <Image
                          source={{ uri: maidPhoto }}
                          style={styles.miniPersonImage}
                        />
                      ) : (
                        <Text style={styles.miniPersonInitials}>
                          {initials(maidName)}
                        </Text>
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={styles.helperName}
                    >
                      {maidName}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: statusColors.bg },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: statusColors.text },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColors.text },
                    ]}
                  >
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* DATE / TIME */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Image
                    source={require("../../../assets/CustomerUi/CustomerBookings/calendar.png")}
                    style={styles.detailIcon}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.detailCopy}>
                  <Text style={styles.detailLabel}>DATE & TIME</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {datePart} • {timePart}
                  </Text>
                </View>
              </View>

              {/* ADDRESS */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Image
                    source={require("../../../assets/CustomerUi/CustomerBookings/location.png")}
                    style={styles.detailIcon}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.detailCopy}>
                  <Text style={styles.detailLabel}>SERVICE AT</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {item.customerAddress?.formatted ||
                      "Address unavailable"}
                  </Text>
                </View>

                <Text style={styles.cardArrow}>›</Text>
              </View>

              {/* BOTTOM SUMMARY */}
              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>DURATION</Text>
                  <Text style={styles.summaryValue}>
                    {typeof item.duration === "number"
                      ? `${item.duration} ${
                          item.duration === 1 ? "hour" : "hours"
                        }`
                      : "—"}
                  </Text>
                </View>

                <View style={styles.summaryRight}>
                  <Text style={styles.summaryLabel}>AMOUNT</Text>
                  <Text style={styles.amountValue}>
                    {typeof item.totalPrice === "number"
                      ? `₹${item.totalPrice}`
                      : "—"}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.openHint,
                  isTerminal && styles.openHintTerminal,
                ]}
              >
                {isTerminal
                  ? "View booking details"
                  : "View live status"}
                <Text style={styles.openHintArrow}>  →</Text>
              </Text>
            </Pressable>
          );
        }}
      />

      {/* NOTE:
          Home / Bookings / Profile is intentionally NOT rendered here.
          The customer layout supplies the persistent bottom navigation.
      */}
    </View>
  );
}

function getBookingIcon(category: string) {
  switch (category.toLowerCase()) {
    case "cleaning":
      return {
        source: require("../../../assets/CustomerUi/CustomerBookings/cleaning.png"),
        backgroundColor: "#FFF4E7",
      };
    case "cooking":
      return {
        source: require("../../../assets/CustomerUi/CustomerBookings/cooking.png"),
        backgroundColor: "#EEF6F0",
      };
    case "laundry":
      return {
        source: require("../../../assets/CustomerUi/CustomerBookings/laundry.png"),
        backgroundColor: "#EEF4FF",
      };
    case "dishwashing":
      return {
        source: require("../../../assets/CustomerUi/CustomerBookings/dishwashing.png"),
        backgroundColor: "#F1F0FF",
      };
    default:
      return {
        source: require("../../../assets/CustomerUi/CustomerBookings/home-service.png"),
        backgroundColor: "#EEF6F0",
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFCFA",
  },

  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: "#FBFCFA",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1ED",
    elevation: 2,
  },

  headerBar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  heroHeader: {
    paddingTop: 14,
    paddingBottom: 19,
  },

  pageTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.9,
    color: "#102536",
  },

  pageSubtitle: {
    maxWidth: 330,
    marginTop: 5,
    fontSize: 15,
    lineHeight: 21,
    color: "#5E7280",
  },

  logo: {
    width: 132,
    height: 55,
  },

  errorCard: {
    marginTop: 2,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFF4F2",
    borderWidth: 1,
    borderColor: "#F0D8D4",
  },

  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#B42318",
  },

  retryButton: {
    marginTop: 7,
    alignSelf: "flex-start",
  },

  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B42318",
  },

  bookingCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE8",
    shadowColor: "#102536",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },

  latestBookingCard: {
    backgroundColor: "#F1F8F1",
    borderColor: "#CFE4D3",
    shadowOpacity: 0.08,
    elevation: 3,
  },

  latestBadge: {
    position: "absolute",
    top: -5,
    left: 16,
    zIndex: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#0F6B51",
  },

  latestBadgeText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.9,
    color: "#FFFFFF",
  },

  pressed: {
    opacity: 0.76,
  },

  bookingTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 5,
  },

  categoryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryIcon: {
    width: 42,
    height: 42,
  },

  bookingMain: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 6,
  },

  bookingTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: "#102536",
  },

  helperLine: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  miniPerson: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#EAF2EB",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  miniPersonImage: {
    width: "100%",
    height: "100%",
  },

  miniPersonInitials: {
    fontSize: 8,
    fontWeight: "800",
    color: "#1F7A4C",
  },

  helperName: {
    flex: 1,
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "700",
    color: "#6A7A84",
  },

  statusPill: {
    maxWidth: 112,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 99,
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  statusText: {
    fontSize: 8.5,
    fontWeight: "800",
  },

  cardDivider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: "#EEF1EE",
  },

  detailRow: {
    minHeight: 42,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  detailIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#F1F5F1",
    alignItems: "center",
    justifyContent: "center",
  },

  detailIcon: {
    width: 19,
    height: 19,
  },

  detailCopy: {
    flex: 1,
    marginLeft: 9,
    paddingRight: 4,
  },

  detailLabel: {
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#929B9A",
  },

  detailValue: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    color: "#3B505C",
  },

  cardArrow: {
    marginLeft: 4,
    fontSize: 27,
    lineHeight: 28,
    color: "#102536",
  },

  summaryRow: {
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF1EE",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  summaryRight: {
    alignItems: "flex-end",
  },

  summaryLabel: {
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#929B9A",
  },

  summaryValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    color: "#102536",
  },

  amountValue: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "900",
    color: "#0F6B51",
  },

  openHint: {
    marginTop: 12,
    alignSelf: "flex-start",
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0F6B51",
  },

  openHintTerminal: {
    color: "#69736E",
  },

  openHintArrow: {
    fontSize: 14,
  },

  emptyCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    minHeight: 360,
  },

  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#EAF5EE",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    fontSize: 21,
    fontWeight: "900",
    color: "#1F7A4C",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "800",
    color: "#151A16",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
    color: "#77827B",
  },

  primaryButton: {
    marginTop: 17,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "#0F6B51",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  primaryButtonArrow: {
    marginLeft: 10,
    fontSize: 20,
    lineHeight: 21,
    color: "#FFFFFF",
  },

  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBFCFA",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#747B75",
  },
});
