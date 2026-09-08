import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  subscribeToActiveBooking,
  subscribeToCustomerProfile,
  type CustomerBooking,
  type CustomerProfile,
} from '../../services/firebase/customerService';

import { getGreeting } from '../../utils/getGreeting';

const services = [
  {
    id: 'cleaning',
    title: 'Cleaning',
    subtitle: 'Sweeping, mopping & more',
    icon: '✦',
  },
  {
    id: 'cooking',
    title: 'Cooking',
    subtitle: 'Fresh meals at home',
    icon: '◉',
  },
  {
    id: 'laundry',
    title: 'Laundry',
    subtitle: 'Wash & fold assistance',
    icon: '○',
  },
  {
    id: 'dishwashing',
    title: 'Dishwashing',
    subtitle: 'Keep your kitchen tidy',
    icon: '◇',
  },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [activeBooking, setActiveBooking] =
    useState<CustomerBooking | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] =
    useState(new Date());

  useEffect(() => {
    const unsubscribeProfile =
      subscribeToCustomerProfile(
        (customerProfile) => {
          setProfile(customerProfile);
          setIsLoading(false);
        },
        (error) => {
          console.error(
            '[CustomerHome] Profile error:',
            error,
          );

          setIsLoading(false);
        },
      );

    const unsubscribeBooking =
      subscribeToActiveBooking(
        (booking) => {
          setActiveBooking(booking);
        },
        (error) => {
          console.error(
            '[CustomerHome] Booking error:',
            error,
          );
        },
      );

    return () => {
      unsubscribeProfile();
      unsubscribeBooking();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="small"
          color="#172018"
        />
      </View>
    );
  }

  const firstName = profile?.name?.trim()
    ? profile.name.trim().split(/\s+/)[0]
    : 'there';

  const greeting =
    getGreeting(currentTime);

  const locationText =
    profile?.address?.formatted?.trim() ||
    'Add your home address';

  const initials =
    profile?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 102,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              {greeting.toUpperCase()}
            </Text>

            <Text style={styles.title}>
              Hi {firstName}
            </Text>

            <Text style={styles.subtitle}>
              What can we help you with today?
            </Text>
          </View>

          <Pressable
            onPress={() =>
              router.push('/customer/profile')
            }
            style={({ pressed }) => [
              styles.profileButton,
              pressed && styles.pressed,
            ]}
          >
            {profile?.photoUrl ? (
              <Image
                source={{
                  uri: profile.photoUrl,
                }}
                style={styles.profileImage}
              />
            ) : (
              <Text style={styles.profileInitials}>
                {initials}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Location */}
        <Pressable
          onPress={() =>
            router.push('/customer/profile')
          }
          style={({ pressed }) => [
            styles.locationCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.locationIconContainer}>
            <Text style={styles.locationIcon}>
              ⌖
            </Text>
          </View>

          <View style={styles.locationContent}>
            <Text style={styles.locationLabel}>
              HOME LOCATION
            </Text>

            <Text
              numberOfLines={1}
              style={styles.locationText}
            >
              {locationText}
            </Text>

            {profile?.address?.landmark ? (
              <Text
                numberOfLines={1}
                style={styles.locationLandmark}
              >
                {profile.address.landmark}
              </Text>
            ) : null}
          </View>

          <Text style={styles.chevron}>
            ›
          </Text>
        </Pressable>

        {/* Booking CTA */}
        <Pressable
          onPress={() =>
            router.push('/customer/book')
          }
          style={({ pressed }) => [
            styles.bookingCard,
            pressed &&
              styles.bookingCardPressed,
          ]}
        >
          <View style={styles.bookingTop}>
            <View style={styles.bookingBadge}>
              <Text style={styles.bookingBadgeText}>
                HOMEHELP
              </Text>
            </View>

            <Text style={styles.bookingArrow}>
              ↗
            </Text>
          </View>

          <Text style={styles.bookingTitle}>
            Need help at home?
          </Text>

          <Text style={styles.bookingDescription}>
            Book trusted help for cleaning,
            cooking, laundry and more.
          </Text>

          <View style={styles.bookButton}>
            <Text style={styles.bookButtonText}>
              Book a Help
            </Text>

            <Text style={styles.bookButtonArrow}>
              →
            </Text>
          </View>
        </Pressable>

        {/* Live booking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Live booking
            </Text>

            {activeBooking ? (
              <View style={styles.liveStatus}>
                <View style={styles.liveDot} />

                <Text style={styles.liveText}>
                  LIVE
                </Text>
              </View>
            ) : null}
          </View>

          {activeBooking ? (
            <LiveBookingCard
              booking={activeBooking}
              onPress={() =>
                router.push(
                  `/customer/booking/${activeBooking.bookingId}`,
                )
              }
            />
          ) : (
            <View style={styles.emptyBookingCard}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>
                  ✓
                </Text>
              </View>

              <View style={styles.emptyContent}>
                <Text style={styles.emptyTitle}>
                  No active booking
                </Text>

                <Text style={styles.emptyText}>
                  Your live booking will appear here
                  once you book a Help.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              What do you need?
            </Text>

            <Text style={styles.serviceCount}>
              {services.length} services
            </Text>
          </View>

          <View style={styles.servicesGrid}>
            {services.map((service) => (
              <Pressable
                key={service.id}
                onPress={() =>
                  router.push('/customer/book')
                }
                style={({ pressed }) => [
                  styles.serviceCard,
                  pressed &&
                    styles.servicePressed,
                ]}
              >
                <View
                  style={
                    styles.serviceIconContainer
                  }
                >
                  <Text
                    style={styles.serviceIcon}
                  >
                    {service.icon}
                  </Text>
                </View>

                <Text style={styles.serviceTitle}>
                  {service.title}
                </Text>

                <Text
                  style={styles.serviceSubtitle}
                >
                  {service.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: Math.max(
              insets.bottom,
              10,
            ),
          },
        ]}
      >
        <BottomNavItem
          icon="⌂"
          label="Home"
          active
          onPress={() =>
            router.replace('/customer')
          }
        />

        <BottomNavItem
          icon="▣"
          label="Bookings"
          onPress={() =>
            router.push('/customer/bookings')
          }
        />

        <BottomNavItem
          icon="○"
          label="Profile"
          onPress={() =>
            router.push('/customer/profile')
          }
        />
      </View>
    </View>
  );
}

function LiveBookingCard({
  booking,
  onPress,
}: {
  booking: CustomerBooking;
  onPress: () => void;
}) {
  const statusText =
    getBookingStatusText(
      booking.status,
    );

  const categoryText =
    booking.categories?.length
      ? booking.categories
          .map(formatCategory)
          .join(' • ')
      : 'Home service';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.liveBookingCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.liveBookingHeader}>
        <View style={styles.liveBookingInfo}>
          <Text style={styles.liveBookingEyebrow}>
            ACTIVE BOOKING
          </Text>

          <Text style={styles.liveBookingTitle}>
            {categoryText}
          </Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>
            {statusText}
          </Text>
        </View>
      </View>

      <View style={styles.liveDivider} />

      <View style={styles.liveMeta}>
        <View>
          <Text style={styles.metaLabel}>
            DURATION
          </Text>

          <Text style={styles.metaValue}>
            {booking.duration} hr
            {booking.duration !== 1
              ? 's'
              : ''}
          </Text>
        </View>

        <View>
          <Text style={styles.metaLabel}>
            TOTAL
          </Text>

          <Text style={styles.metaValue}>
            ₹{booking.totalPrice}
          </Text>
        </View>

        <Text style={styles.liveArrow}>
          →
        </Text>
      </View>
    </Pressable>
  );
}

function getBookingStatusText(
  status: CustomerBooking['status'],
): string {
  switch (status) {
    case 'pending':
      return 'Finding Help';

    case 'assigned':
      return 'Help Assigned';

    case 'confirmed':
      return 'Confirmed';

    case 'in_progress':
      return 'In Progress';

    default:
      return 'Active';
  }
}

function formatCategory(
  category: string,
): string {
  return category
    .replace(/[-_]/g, ' ')
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}

function BottomNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.navIcon,
          active &&
            styles.navIconActive,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.navLabel,
          active &&
            styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAF8',
  },

  content: {
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  headerText: {
    flex: 1,
    paddingRight: 16,
  },

  greeting: {
    marginBottom: 5,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#7B837C',
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: '#121712',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: '#747B75',
  },

  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EEE7',
  },

  profileImage: {
    width: '100%',
    height: '100%',
  },

  profileInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A211B',
  },

  locationCard: {
    minHeight: 72,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1E6E1',
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3EE',
  },

  locationIcon: {
    fontSize: 23,
    color: '#1A221B',
  },

  locationContent: {
    flex: 1,
    marginLeft: 12,
  },

  locationLabel: {
    marginBottom: 3,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#949A94',
  },

  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#252A25',
  },

  locationLandmark: {
    marginTop: 2,
    fontSize: 11,
    color: '#878E87',
  },

  chevron: {
    marginLeft: 8,
    fontSize: 25,
    color: '#717971',
  },

  bookingCard: {
    padding: 20,
    marginBottom: 28,
    borderRadius: 24,
    backgroundColor: '#172018',
  },

  bookingCardPressed: {
    opacity: 0.92,
  },

  bookingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  bookingBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#2D382E',
  },

  bookingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#BAC5BB',
  },

  bookingArrow: {
    fontSize: 22,
    color: '#C5CEC6',
  },

  bookingTitle: {
    marginTop: 18,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  bookingDescription: {
    maxWidth: 310,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#C0C8C1',
  },

  bookButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 19,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },

  bookButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#172018',
  },

  bookButtonArrow: {
    marginLeft: 9,
    fontSize: 17,
    color: '#172018',
  },

  section: {
    marginBottom: 27,
  },

  sectionHeader: {
    minHeight: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171B17',
  },

  serviceCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#929892',
  },

  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  liveDot: {
    width: 7,
    height: 7,
    marginRight: 5,
    borderRadius: 4,
    backgroundColor: '#4B7756',
  },

  liveText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#4B7756',
  },

  emptyBookingCard: {
    minHeight: 94,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E6E2',
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3EE',
  },

  emptyIconText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#526557',
  },

  emptyContent: {
    flex: 1,
    marginLeft: 12,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#292E29',
  },

  emptyText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#878D87',
  },

  liveBookingCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCE4DC',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },

  liveBookingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  liveBookingInfo: {
    flex: 1,
    paddingRight: 10,
  },

  liveBookingEyebrow: {
    marginBottom: 5,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#8A918A',
  },

  liveBookingTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#202520',
  },

  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EEF3EE',
  },

  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#506053',
  },

  liveDivider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: '#EDF0ED',
  },

  liveMeta: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  metaLabel: {
    marginBottom: 3,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#9A9F9A',
  },

  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A302A',
  },

  liveArrow: {
    fontSize: 21,
    color: '#4E584F',
  },

  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 11,
  },

  serviceCard: {
    width: '48%',
    minHeight: 155,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E6E2',
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
  },

  servicePressed: {
    opacity: 0.8,
  },

  serviceIconContainer: {
    width: 40,
    height: 40,
    marginBottom: 17,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3EE',
  },

  serviceIcon: {
    fontSize: 18,
    color: '#293229',
  },

  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#242924',
  },

  serviceSubtitle: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    color: '#858C85',
  },

  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    paddingHorizontal: 34,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E7EBE7',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  navItem: {
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIcon: {
    fontSize: 19,
    color: '#A0A5A0',
  },

  navIconActive: {
    color: '#172018',
  },

  navLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#A0A5A0',
  },

  navLabelActive: {
    color: '#172018',
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.75,
  },
});