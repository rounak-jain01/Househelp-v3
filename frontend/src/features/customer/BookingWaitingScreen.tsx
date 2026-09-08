import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  subscribeToBooking,
  type BookingDocument,
} from '../../services/firebase/bookingService';

export default function BookingWaitingScreen() {
  const insets = useSafeAreaInsets();

  const { bookingId } = useLocalSearchParams<{
    bookingId: string;
  }>();

  const [booking, setBooking] =
    useState<BookingDocument | null>(null);

  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) {
      setError('Booking could not be found.');
      return;
    }

    const unsubscribe = subscribeToBooking(
      bookingId,
      (updatedBooking) => {
        setBooking(updatedBooking);
        setError('');
      },
      (listenerError) => {
        console.error(
          '[BookingWaiting] Listener error:',
          listenerError,
        );

        setError(
          listenerError.message ||
            'Unable to update your booking.',
        );
      },
    );

    return unsubscribe;
  }, [bookingId]);

  const scheduledDate = useMemo(() => {
    if (!booking?.scheduledDateTime) {
      return '';
    }

    const date =
      booking.scheduledDateTime.toDate?.() ??
      null;

    if (!date) {
      return '';
    }

    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [booking]);

  const scheduledTime = useMemo(() => {
    if (!booking?.scheduledDateTime) {
      return '';
    }

    const date =
      booking.scheduledDateTime.toDate?.() ??
      null;

    if (!date) {
      return '';
    }

    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [booking]);

  const isPending =
    booking?.status === 'pending';

  const isAssigned =
    booking?.status === 'assigned' ||
    booking?.status === 'confirmed';

  const noMaidFound =
    booking?.status === 'no_maid_found';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10 },
        ]}
      >
        <Pressable
          style={styles.closeButton}
          onPress={() => router.replace('/customer')}
        >
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {isPending && (
          <>
            <View style={styles.loaderOuter}>
              <View style={styles.loaderInner}>
                <ActivityIndicator
                  size="large"
                  color="#1F7A4C"
                />
              </View>
            </View>

            <Text style={styles.title}>
              Finding a Help for you
            </Text>

            <Text style={styles.subtitle}>
              Your booking request has been sent.
              {'\n'}
              We're finding the right Help for you.
            </Text>
          </>
        )}

        {isAssigned && (
          <>
            <View style={styles.successCircle}>
              <Text style={styles.successIcon}>✓</Text>
            </View>

            <Text style={styles.title}>
              Help found!
            </Text>

            <Text style={styles.subtitle}>
              Your booking has been assigned.
              {'\n'}
              We're getting everything ready for you.
            </Text>
          </>
        )}

        {noMaidFound && (
          <>
            <View style={styles.warningCircle}>
              <Text style={styles.warningIcon}>!</Text>
            </View>

            <Text style={styles.title}>
              No Help available
            </Text>

            <Text style={styles.subtitle}>
              We couldn't find a Help for your
              selected time.
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryText}>
                Choose another time
              </Text>
            </Pressable>
          </>
        )}

        {!booking && !error && (
          <>
            <View style={styles.loaderOuter}>
              <View style={styles.loaderInner}>
                <ActivityIndicator
                  size="large"
                  color="#1F7A4C"
                />
              </View>
            </View>

            <Text style={styles.title}>
              Loading your booking
            </Text>
          </>
        )}

        {error && (
          <>
            <View style={styles.errorCircle}>
              <Text style={styles.errorCircleText}>
                !
              </Text>
            </View>

            <Text style={styles.title}>
              Something went wrong
            </Text>

            <Text style={styles.subtitle}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryText}>
                Go back
              </Text>
            </Pressable>
          </>
        )}

        {booking && (
          <View style={styles.bookingCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                Booking summary
              </Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {isPending
                    ? 'Finding Help'
                    : isAssigned
                      ? 'Assigned'
                      : noMaidFound
                        ? 'Unavailable'
                        : booking.status}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Services
              </Text>

              <Text
                style={styles.infoValue}
                numberOfLines={2}
              >
                {booking.categories?.length ?? 0}{' '}
                selected
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Duration
              </Text>

              <Text style={styles.infoValue}>
                {booking.duration}{' '}
                {booking.duration === 1
                  ? 'hour'
                  : 'hours'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Date
              </Text>

              <Text style={styles.infoValue}>
                {scheduledDate || '—'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Time
              </Text>

              <Text style={styles.infoValue}>
                {scheduledTime || '—'}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Total
              </Text>

              <Text style={styles.totalValue}>
                ₹{booking.totalPrice}
              </Text>
            </View>
          </View>
        )}
      </View>

      {isPending && (
        <View
          style={[
            styles.bottomHint,
            { paddingBottom: insets.bottom + 18 },
          ]}
        >
          <Text style={styles.bottomHintText}>
            Please keep the app open while we find
            your Help.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },

  header: {
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeIcon: {
    fontSize: 28,
    lineHeight: 30,
    color: '#333333',
    fontWeight: '400',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 65,
  },

  loaderOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#E7F3EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loaderInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#DDF1E4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIcon: {
    fontSize: 55,
    fontWeight: '700',
    color: '#1F7A4C',
  },

  warningCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFF1DA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  warningIcon: {
    fontSize: 50,
    fontWeight: '800',
    color: '#A86400',
  },

  errorCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FDE8E7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorCircleText: {
    fontSize: 50,
    fontWeight: '800',
    color: '#B42318',
  },

  title: {
    marginTop: 28,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 11,
    fontSize: 14,
    lineHeight: 21,
    color: '#707772',
    textAlign: 'center',
  },

  bookingCard: {
    width: '100%',
    marginTop: 38,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAE7',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EEF6F1',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F7A4C',
  },

  divider: {
    height: 1,
    backgroundColor: '#ECEFEC',
    marginVertical: 15,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  infoLabel: {
    fontSize: 13,
    color: '#858B87',
  },

  infoValue: {
    maxWidth: '58%',
    fontSize: 13,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'right',
  },

  totalRow: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#ECEFEC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },

  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  retryButton: {
    marginTop: 28,
    minWidth: 210,
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 15,
    backgroundColor: '#1F7A4C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  bottomHint: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  bottomHintText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#858B87',
    textAlign: 'center',
  },
});