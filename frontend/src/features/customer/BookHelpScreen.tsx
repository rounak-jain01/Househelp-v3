import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  subscribeToCustomerProfile,
  type CustomerProfile,
} from '../../services/firebase/customerService';
import { createBooking } from '../../services/firebase/bookingService';
import {
  getActiveCategories,
  type ServiceCategory,
} from '../../services/firebase/categoryService';

function getServiceIcon(name: string): string {
  switch (name.toLowerCase()) {
    case 'cleaning':
      return '🧹';

    case 'cooking':
      return '🍳';

    case 'laundry':
      return '🧺';

    case 'dishwashing':
      return '🍽️';

    default:
      return '✨';
  }
}

const DURATIONS = [1, 2, 3, 4];

export default function BookHelpScreen() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [services, setServices] = useState<
    ServiceCategory[]
  >([]);

  const [isLoadingServices, setIsLoadingServices] =
    useState(true);

  const [serviceLoadError, setServiceLoadError] =
    useState('');

  const [selectedServices, setSelectedServices] =
    useState<string[]>([]);

  const [duration, setDuration] =
    useState<number | null>(null);

  const [scheduledDateTime, setScheduledDateTime] =
    useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [showTimePicker, setShowTimePicker] =
    useState(false);

  const [isBooking, setIsBooking] = useState(false);

  const [bookingError, setBookingError] =
    useState('');

  useEffect(() => {
    const unsubscribe =
      subscribeToCustomerProfile(
        (customerProfile) => {
          setProfile(customerProfile);
        },
        (error) => {
          console.error(
            '[BookHelp] Profile load failed:',
            error,
          );
        },
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadServices() {
      try {
        setIsLoadingServices(true);
        setServiceLoadError('');

        const categories =
          await getActiveCategories();

        if (!mounted) return;

        setServices(categories);
      } catch (error) {
        console.error(
          '[BookHelp] Category load failed:',
          error,
        );

        if (!mounted) return;

        setServiceLoadError(
          'Unable to load services. Please try again.',
        );
      } finally {
        if (mounted) {
          setIsLoadingServices(false);
        }
      }
    }

    loadServices();

    return () => {
      mounted = false;
    };
  }, []);

  const minimumBookingTime = useMemo(() => {
    return new Date(
      Date.now() + 2 * 60 * 60 * 1000,
    );
  }, []);

  const totalPrice = useMemo(() => {
    if (!duration) {
      return 0;
    }

    return services
      .filter((service) =>
        selectedServices.includes(service.id),
      )
      .reduce(
        (total, service) =>
          total +
          service.ratePerHour * duration,
        0,
      );
  }, [services, selectedServices, duration]);

  const formattedAddress =
    profile?.address?.formatted?.trim() || '';

  const landmark =
    profile?.address?.landmark?.trim() || '';

  const toggleService = (serviceId: string) => {
    setBookingError('');

    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter(
            (id) => id !== serviceId,
          )
        : [...current, serviceId],
    );
  };

  const handleDurationSelect = (
    value: number,
  ) => {
    setBookingError('');
    setDuration(value);
  };

  const handleDateChange = (
    _event: unknown,
    date?: Date,
  ) => {
    setShowDatePicker(false);

    if (!date) {
      return;
    }

    const currentTime =
      scheduledDateTime ??
      minimumBookingTime;

    const updatedDate = new Date(date);

    updatedDate.setHours(
      currentTime.getHours(),
      currentTime.getMinutes(),
      0,
      0,
    );

    setScheduledDateTime(updatedDate);
    setBookingError('');

    setTimeout(() => {
      setShowTimePicker(true);
    }, 250);
  };

  const handleTimeChange = (
    _event: unknown,
    date?: Date,
  ) => {
    setShowTimePicker(false);

    if (!date) {
      return;
    }

    const baseDate =
      scheduledDateTime ??
      minimumBookingTime;

    const updatedDate = new Date(baseDate);

    updatedDate.setHours(
      date.getHours(),
      date.getMinutes(),
      0,
      0,
    );

    if (
      updatedDate.getTime() <
      minimumBookingTime.getTime()
    ) {
      setScheduledDateTime(
        minimumBookingTime,
      );

      setBookingError(
        'Please choose a time at least 2 hours from now.',
      );

      return;
    }

    setScheduledDateTime(updatedDate);
    setBookingError('');
  };

  const openDatePicker = () => {
    setBookingError('');
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setBookingError('');

    if (!scheduledDateTime) {
      setShowDatePicker(true);
      return;
    }

    setShowTimePicker(true);
  };

  const displayDate = scheduledDateTime
    ? scheduledDateTime.toLocaleDateString(
        'en-IN',
        {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
      )
    : 'Select date';

  const displayTime = scheduledDateTime
    ? scheduledDateTime.toLocaleTimeString(
        'en-IN',
        {
          hour: 'numeric',
          minute: '2-digit',
        },
      )
    : 'Select time';

  const canContinue =
    services.length > 0 &&
    selectedServices.length > 0 &&
    duration !== null &&
    scheduledDateTime !== null &&
    !!formattedAddress &&
    !isBooking;

  const handleCreateBooking =
    async () => {
      if (!scheduledDateTime || !duration) {
        return;
      }

      if (services.length === 0) {
        setBookingError(
          'No services are currently available.',
        );
        return;
      }

      if (!selectedServices.length) {
        setBookingError(
          'Please select at least one service.',
        );
        return;
      }

      if (!formattedAddress) {
        setBookingError(
          'Please add your service address first.',
        );
        return;
      }

      if (
        scheduledDateTime.getTime() <
        minimumBookingTime.getTime()
      ) {
        setBookingError(
          'Please choose a time at least 2 hours from now.',
        );
        return;
      }

      try {
        setBookingError('');
        setIsBooking(true);

        const booking =
          await createBooking({
            categoryIds:
              selectedServices,
            duration,
            scheduledDateTime,
          });

        router.replace(
          `/customer/booking/${booking.bookingId}`,
        );
      } catch (error) {
        console.error(
          '[BookHelp] Booking creation failed:',
          error,
        );

        const message =
          error instanceof Error
            ? error.message
            : 'Unable to create your booking. Please try again.';

        setBookingError(message);
        setIsBooking(false);
      }
    };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 12,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isBooking}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <View>
          <Text style={styles.headerTitle}>
            Book a Help
          </Text>

          <Text style={styles.headerSubtitle}>
            Tell us what you need
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + 130,
          },
        ]}
      >
        <Text style={styles.sectionTitle}>
          What do you need help with?
        </Text>

        {isLoadingServices ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="small"
              color="#1F7A4C"
            />

            <Text style={styles.loadingText}>
              Loading services...
            </Text>
          </View>
        ) : serviceLoadError ? (
          <View style={styles.serviceErrorCard}>
            <Text style={styles.serviceErrorIcon}>
              ⚠
            </Text>

            <Text style={styles.serviceErrorText}>
              {serviceLoadError}
            </Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.serviceErrorCard}>
            <Text style={styles.serviceErrorIcon}>
              ⚠
            </Text>

            <Text style={styles.serviceErrorText}>
              No services are currently available.
            </Text>
          </View>
        ) : (
          <View style={styles.serviceGrid}>
            {services.map((service) => {
              const selected =
                selectedServices.includes(
                  service.id,
                );

              return (
                <Pressable
                  key={service.id}
                  onPress={() =>
                    toggleService(
                      service.id,
                    )
                  }
                  disabled={isBooking}
                  style={[
                    styles.serviceCard,
                    selected &&
                      styles.serviceCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      selected &&
                        styles.iconCircleSelected,
                    ]}
                  >
                    <Text
                      style={
                        styles.serviceIcon
                      }
                    >
                      {getServiceIcon(
                        service.name,
                      )}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.serviceName,
                      selected &&
                        styles.selectedGreenText,
                    ]}
                  >
                    {service.name}
                  </Text>

                  <Text
                    style={[
                      styles.serviceRate,
                      selected &&
                        styles.selectedGreenText,
                    ]}
                  >
                    ₹
                    {
                      service.ratePerHour
                    }
                    /hr
                  </Text>

                  {selected && (
                    <View
                      style={
                        styles.checkBadge
                      }
                    >
                      <Text
                        style={
                          styles.checkText
                        }
                      >
                        ✓
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>
          How long?
        </Text>

        <View style={styles.durationRow}>
          {DURATIONS.map((item) => {
            const selected =
              duration === item;

            return (
              <Pressable
                key={item}
                onPress={() =>
                  handleDurationSelect(
                    item,
                  )
                }
                disabled={isBooking}
                style={[
                  styles.durationButton,
                  selected &&
                    styles.durationButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.durationNumber,
                    selected &&
                      styles.selectedWhiteText,
                  ]}
                >
                  {item}
                </Text>

                <Text
                  style={[
                    styles.durationLabel,
                    selected &&
                      styles.selectedWhiteText,
                  ]}
                >
                  {item === 1
                    ? 'hour'
                    : 'hours'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
          When do you need help?
        </Text>

        <View style={styles.dateTimeRow}>
          <Pressable
            style={
              styles.dateTimeCard
            }
            onPress={
              openDatePicker
            }
            disabled={isBooking}
          >
            <View
              style={
                styles.dateTimeIcon
              }
            >
              <Text
                style={
                  styles.calendarIcon
                }
              >
                📅
              </Text>
            </View>

            <View
              style={
                styles.dateTimeContent
              }
            >
              <Text
                style={
                  styles.dateTimeLabel
                }
              >
                Date
              </Text>

              <Text
                style={[
                  styles.dateTimeValue,
                  !scheduledDateTime &&
                    styles.placeholderText,
                ]}
              >
                {displayDate}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={
              styles.dateTimeCard
            }
            onPress={
              openTimePicker
            }
            disabled={isBooking}
          >
            <View
              style={
                styles.dateTimeIcon
              }
            >
              <Text
                style={
                  styles.clockIcon
                }
              >
                ◷
              </Text>
            </View>

            <View
              style={
                styles.dateTimeContent
              }
            >
              <Text
                style={
                  styles.dateTimeLabel
                }
              >
                Time
              </Text>

              <Text
                style={[
                  styles.dateTimeValue,
                  !scheduledDateTime &&
                    styles.placeholderText,
                ]}
              >
                {displayTime}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.helperText}>
          ⓘ Choose a time at least 2
          hours from now.
        </Text>

        {showDatePicker && (
          <DateTimePicker
            value={
              scheduledDateTime ??
              minimumBookingTime
            }
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={
              handleDateChange
            }
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={
              scheduledDateTime ??
              minimumBookingTime
            }
            mode="time"
            display="default"
            onChange={
              handleTimeChange
            }
          />
        )}

        <Text style={styles.sectionTitle}>
          Service address
        </Text>

        <View style={styles.addressCard}>
          <View
            style={
              styles.addressIconCircle
            }
          >
            <Text
              style={
                styles.addressIcon
              }
            >
              ⌖
            </Text>
          </View>

          <View
            style={
              styles.addressContent
            }
          >
            <Text
              style={
                styles.addressTitle
              }
            >
              Home
            </Text>

            {formattedAddress ? (
              <>
                <Text
                  style={
                    styles.addressText
                  }
                  numberOfLines={3}
                >
                  {formattedAddress}
                </Text>

                {landmark ? (
                  <Text
                    style={
                      styles.landmarkText
                    }
                    numberOfLines={1}
                  >
                    Landmark:{' '}
                    {landmark}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text
                style={
                  styles.addressMissing
                }
              >
                Please add your address
                to continue.
              </Text>
            )}
          </View>

          <Pressable
            onPress={() =>
              router.push(
                '/customer/profile',
              )
            }
            disabled={isBooking}
          >
            <Text
              style={
                styles.changeText
              }
            >
              Change
            </Text>
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <Text
            style={styles.infoIcon}
          >
            ⓘ
          </Text>

          <Text
            style={styles.infoText}
          >
            You will pay the Help
            directly by cash or UPI
            after the service.
          </Text>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <View
            style={
              styles.summaryContent
            }
          >
            <Text
              style={
                styles.summaryLabel
              }
            >
              Estimated total
            </Text>

            <Text
              style={
                styles.summaryNote
              }
            >
              {selectedServices.length >
                0 && duration
                ? `${
                    selectedServices.length
                  } service${
                    selectedServices.length >
                    1
                      ? 's'
                      : ''
                  } × ${duration} ${
                    duration === 1
                      ? 'hour'
                      : 'hours'
                  }`
                : 'Select services and duration'}
            </Text>
          </View>

          <Text
            style={
              styles.totalPrice
            }
          >
            ₹{totalPrice}
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom:
              insets.bottom + 10,
          },
        ]}
      >
        {bookingError ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorIcon
              }
            >
              ⚠
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {bookingError}
            </Text>
          </View>
        ) : !canContinue ? (
          <Text
            style={
              styles.validationText
            }
          >
            {!services.length
              ? '⚠ Services unavailable'
              : !selectedServices.length
                ? '⚠ Select at least one service'
                : !duration
                  ? '⚠ Select a duration'
                  : !scheduledDateTime
                    ? '⚠ Select date and time'
                    : '⚠ Add your service address'}
          </Text>
        ) : null}

        <Pressable
          disabled={!canContinue}
          style={[
            styles.bookButton,
            !canContinue &&
              styles.bookButtonDisabled,
          ]}
          onPress={
            handleCreateBooking
          }
        >
          {isBooking ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={[
                  styles.bookButtonText,
                  {
                    marginLeft: 9,
                  },
                ]}
              >
                Creating booking...
              </Text>
            </>
          ) : (
            <>
              <Text
                style={
                  styles.bookButtonText
                }
              >
                Book Help
              </Text>

              <Text
                style={
                  styles.bookButtonArrow
                }
              >
                →
              </Text>
            </>
          )}
        </Pressable>
      </View>
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
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    color: '#111111',
    marginTop: -3,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#777777',
  },

  content: {
    paddingHorizontal: 20,
  },

  sectionTitle: {
    marginTop: 18,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },

  loadingCard: {
    minHeight: 90,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    color: '#777777',
  },

  serviceErrorCard: {
    minHeight: 75,
    paddingHorizontal: 15,
    borderRadius: 17,
    backgroundColor: '#FFF7E8',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },

  serviceErrorIcon: {
    fontSize: 17,
    color: '#A86400',
  },

  serviceErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8A5A10',
  },

  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  serviceCard: {
    width: '48%',
    minHeight: 145,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EBE8',
  },

  serviceCardSelected: {
    borderColor: '#1F7A4C',
    backgroundColor: '#F0F8F3',
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F2F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  iconCircleSelected: {
    backgroundColor: '#DCEFE3',
  },

  serviceIcon: {
    fontSize: 24,
  },

  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },

  serviceRate: {
    marginTop: 5,
    fontSize: 13,
    color: '#777777',
  },

  selectedGreenText: {
    color: '#1F7A4C',
  },

  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1F7A4C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },

  durationButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EBE8',
    alignItems: 'center',
  },

  durationButtonSelected: {
    backgroundColor: '#1F7A4C',
    borderColor: '#1F7A4C',
  },

  durationNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
  },

  durationLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#777777',
  },

  selectedWhiteText: {
    color: '#FFFFFF',
  },

  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  dateTimeCard: {
    flex: 1,
    minHeight: 80,
    padding: 13,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EBE8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  dateTimeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  calendarIcon: {
    fontSize: 20,
  },

  clockIcon: {
    fontSize: 25,
    color: '#1F7A4C',
  },

  dateTimeContent: {
    flex: 1,
  },

  dateTimeLabel: {
    fontSize: 11,
    color: '#777777',
  },

  dateTimeValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },

  placeholderText: {
    color: '#9A9E9B',
  },

  helperText: {
    marginTop: 9,
    fontSize: 11,
    color: '#777777',
  },

  addressCard: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EBE8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  addressIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  addressIcon: {
    fontSize: 24,
    color: '#1F7A4C',
  },

  addressContent: {
    flex: 1,
  },

  addressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },

  addressText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666D68',
    lineHeight: 17,
  },

  landmarkText: {
    marginTop: 4,
    fontSize: 11,
    color: '#858B87',
  },

  addressMissing: {
    marginTop: 4,
    fontSize: 12,
    color: '#B06A00',
  },

  changeText: {
    color: '#1F7A4C',
    fontSize: 12,
    fontWeight: '700',
  },

  infoBox: {
    marginTop: 14,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#F0F4F1',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoIcon: {
    marginRight: 8,
    fontSize: 16,
    color: '#1F7A4C',
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#56605A',
  },

  summaryCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryContent: {
    flex: 1,
    paddingRight: 12,
  },

  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  summaryNote: {
    marginTop: 4,
    color: '#A8AEA9',
    fontSize: 11,
  },

  totalPrice: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F7F8F6',
    borderTopWidth: 1,
    borderTopColor: '#E7E9E6',
  },

  validationText: {
    marginBottom: 7,
    fontSize: 12,
    color: '#9A5B00',
  },

  errorBox: {
    marginBottom: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF4F2',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorIcon: {
    marginRight: 7,
    fontSize: 14,
    color: '#B42318',
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#B42318',
  },

  bookButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1F7A4C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookButtonDisabled: {
    backgroundColor: '#BFC5C1',
  },

  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  bookButtonArrow: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '600',
  },
});