import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  subscribeToCustomerProfile,
  type CustomerProfile,
} from "../../services/firebase/customerService";
import { createBooking } from "../../services/firebase/bookingService";
import {
  getActiveCategories,
  type ServiceCategory,
} from "../../services/firebase/categoryService";

const DURATIONS = [1, 2, 3, 4];

type Tone = "sage" | "sand" | "stone";

const SERVICE_TONES: Tone[] = [
  "sage",
  "sand",
  "stone",
  "sage",
  "sand",
  "stone",
];

function getServiceShortIcon(name: string) {
  switch (name.toLowerCase()) {
    case "cleaning":
      return "01";
    case "cooking":
      return "02";
    case "laundry":
      return "03";
    case "dishwashing":
      return "04";
    default:
      return "•";
  }
}

export default function BookHelpScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 760;

  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [services, setServices] =
    useState<ServiceCategory[]>([]);

  const [
    isLoadingServices,
    setIsLoadingServices,
  ] = useState(true);

  const [
    serviceLoadError,
    setServiceLoadError,
  ] = useState("");

  const [
    selectedServices,
    setSelectedServices,
  ] = useState<string[]>([]);

  const [duration, setDuration] =
    useState<number | null>(null);

  const [
    scheduledDateTime,
    setScheduledDateTime,
  ] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [showTimePicker, setShowTimePicker] =
    useState(false);

  const [isBooking, setIsBooking] =
    useState(false);

  const [bookingError, setBookingError] =
    useState("");

  const minimumBookingTime = useMemo(
    () =>
      new Date(
        Date.now() + 2 * 60 * 60 * 1000,
      ),
    [],
  );

  useEffect(() => {
    const unsubscribe =
      subscribeToCustomerProfile(
        (customerProfile) => {
          setProfile(customerProfile);
        },
        (error) => {
          console.error(
            "[BookHelp] Profile load failed:",
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
        setServiceLoadError("");

        const categories =
          await getActiveCategories();

        if (!mounted) return;

        setServices(categories);
      } catch (error) {
        console.error(
          "[BookHelp] Category load failed:",
          error,
        );

        if (!mounted) return;

        setServiceLoadError(
          "Unable to load services. Please try again.",
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

  const totalPrice = useMemo(() => {
    if (!duration) return 0;

    return services
      .filter((service) =>
        selectedServices.includes(service.id),
      )
      .reduce(
        (total, service) =>
          total + service.ratePerHour * duration,
        0,
      );
  }, [
    services,
    selectedServices,
    duration,
  ]);

  const formattedAddress =
    profile?.address?.formatted?.trim() || "";

  const landmark =
    profile?.address?.landmark?.trim() || "";

  const toggleService = (serviceId: string) => {
    setBookingError("");

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
    setBookingError("");
    setDuration(value);
  };

  const handleDateChange = (
    _event: unknown,
    date?: Date,
  ) => {
    setShowDatePicker(false);

    if (!date) return;

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
    setBookingError("");

    setTimeout(
      () => setShowTimePicker(true),
      250,
    );
  };

  const handleTimeChange = (
    _event: unknown,
    date?: Date,
  ) => {
    setShowTimePicker(false);

    if (!date) return;

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
        "Please choose a time at least 2 hours from now.",
      );

      return;
    }

    setScheduledDateTime(updatedDate);
    setBookingError("");
  };

  const displayDate = scheduledDateTime
    ? scheduledDateTime.toLocaleDateString(
        "en-IN",
        {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      )
    : "Select date";

  const displayTime = scheduledDateTime
    ? scheduledDateTime.toLocaleTimeString(
        "en-IN",
        {
          hour: "numeric",
          minute: "2-digit",
        },
      )
    : "Select time";

  const canContinue =
    services.length > 0 &&
    selectedServices.length > 0 &&
    duration !== null &&
    scheduledDateTime !== null &&
    !!formattedAddress &&
    !isBooking;

  const handleCreateBooking =
    async () => {
      if (!scheduledDateTime || !duration)
        return;

      if (!services.length) {
        setBookingError(
          "No services are currently available.",
        );
        return;
      }

      if (!selectedServices.length) {
        setBookingError(
          "Please select at least one service.",
        );
        return;
      }

      if (!formattedAddress) {
        setBookingError(
          "Please add your service address first.",
        );
        return;
      }

      if (
        scheduledDateTime.getTime() <
        minimumBookingTime.getTime()
      ) {
        setBookingError(
          "Please choose a time at least 2 hours from now.",
        );
        return;
      }

      try {
        setBookingError("");
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
          "[BookHelp] Booking creation failed:",
          error,
        );

        setBookingError(
          error instanceof Error
            ? error.message
            : "Unable to create your booking. Please try again.",
        );

        setIsBooking(false);
      }
    };


  return (
    <View style={styles.container}>
      {/* FIXED HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isBooking}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Book a Service</Text>
            <Text style={styles.headerSubtitle}>
              Select the services you need
            </Text>
          </View>
        </View>


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 10,
            // Leave enough room for the CTA and the persistent customer layout.
            paddingBottom: insets.bottom + 165,
          },
        ]}
      >
        {/* SERVICES */}
        <View style={styles.serviceSection}>
          <Text style={styles.sectionTitle}>Select a service</Text>
          <Text style={styles.sectionHint}>
            Choose one or more services
          </Text>

          {isLoadingServices ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#123F3C" />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : serviceLoadError ? (
            <View style={styles.errorCardLight}>
              <Text style={styles.errorCardTitle}>Services unavailable</Text>
              <Text style={styles.errorCardText}>{serviceLoadError}</Text>
            </View>
          ) : services.length === 0 ? (
            <View style={styles.errorCardLight}>
              <Text style={styles.errorCardTitle}>No services available</Text>
              <Text style={styles.errorCardText}>
                Please try again later.
              </Text>
            </View>
          ) : (
            <View style={styles.serviceGrid}>
              {services
                .filter((service) =>
                  ["cleaning", "cooking", "laundry", "dishwashing"].includes(
                    service.name.trim().toLowerCase(),
                  ),
                )
                .map((service) => {
                  const selected = selectedServices.includes(service.id);
                  const icon = getServiceIcon(service.name);

                  return (
                    <Pressable
                      key={service.id}
                      disabled={isBooking}
                      onPress={() => toggleService(service.id)}
                      style={({ pressed }) => [
                        styles.serviceCard,
                        selected && styles.serviceCardSelected,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${service.name}`}
                    >
                      <View
                        style={[
                          styles.serviceIconBox,
                          selected && styles.serviceIconBoxSelected,
                        ]}
                      >
                        {icon ? (
                          <Image
                            source={icon}
                            style={styles.serviceImage}
                            resizeMode="contain"
                          />
                        ) : null}
                      </View>

                      <Text
                        numberOfLines={1}
                        style={[
                          styles.serviceName,
                          selected && styles.serviceNameSelected,
                        ]}
                      >
                        {service.name}
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={[
                          styles.serviceRate,
                          selected && styles.serviceRateSelected,
                        ]}
                      >
                        ₹{service.ratePerHour}/hr
                      </Text>

                      {selected ? (
                        <View style={styles.serviceCheck}>
                          <Text style={styles.serviceCheckText}>✓</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
            </View>
          )}
        </View>

        {/* DURATION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                How long do you need help?
              </Text>
            </View>

            <Text style={styles.sectionValue}>
              {duration
                ? `${duration} ${duration === 1 ? "hr" : "hrs"}`
                : "Select"}
            </Text>
          </View>

          <View style={styles.durationRow}>
            {DURATIONS.map((item) => {
              const selected = duration === item;

              return (
                <Pressable
                  key={item}
                  disabled={isBooking}
                  onPress={() => handleDurationSelect(item)}
                  style={({ pressed }) => [
                    styles.durationCard,
                    selected && styles.durationCardSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationText,
                      selected && styles.durationSelectedText,
                    ]}
                  >
                    {item} {item === 1 ? "hr" : "hrs"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* DATE + TIME */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Date & Time</Text>
          </View>

          <View style={styles.dateTimeRow}>
            <Pressable
              disabled={isBooking}
              onPress={() => {
                setBookingError("");
                setShowDatePicker(true);
              }}
              style={({ pressed }) => [
                styles.dateTimeCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.dateTimeIconBox, styles.dateIconBox]}>
                <Image
                  source={require("../../../assets/CustomerUi/Customerbook/calendar.png")}
                  style={styles.dateTimeIcon}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.dateTimeCopy}>
                <Text style={styles.dateTimeLabel}>DATE</Text>
                <Text
                  style={[
                    styles.dateTimeValue,
                    !scheduledDateTime && styles.placeholder,
                  ]}
                  numberOfLines={1}
                >
                  {displayDate}
                </Text>
              </View>
            </Pressable>

            <Pressable
              disabled={isBooking}
              onPress={() => {
                setBookingError("");
                if (!scheduledDateTime) {
                  setShowDatePicker(true);
                } else {
                  setShowTimePicker(true);
                }
              }}
              style={({ pressed }) => [
                styles.dateTimeCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.dateTimeIconBox, styles.timeIconBox]}>
                <Image
                  source={require("../../../assets/CustomerUi/Customerbook/clock.png")}
                  style={styles.dateTimeIcon}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.dateTimeCopy}>
                <Text style={styles.dateTimeLabel}>TIME</Text>
                <Text
                  style={[
                    styles.dateTimeValue,
                    !scheduledDateTime && styles.placeholder,
                  ]}
                  numberOfLines={1}
                >
                  {displayTime}
                </Text>
              </View>
            </Pressable>
          </View>

          <Text style={styles.scheduleHint}>
            Service time must be at least 2 hours from now.
          </Text>
        </View>

        {showDatePicker ? (
          <DateTimePicker
            value={scheduledDateTime ?? minimumBookingTime}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        ) : null}

        {showTimePicker ? (
          <DateTimePicker
            value={scheduledDateTime ?? minimumBookingTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        ) : null}

        {/* ADDRESS */}
        <Pressable
          disabled={isBooking}
          onPress={() => router.push("/customer/profile")}
          style={({ pressed }) => [
            styles.addressCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.addressIconBox}>
            <Image
              source={require("../../../assets/CustomerUi/Customerbook/location.png")}
              style={styles.addressIcon}
              resizeMode="contain"
            />
          </View>

          <View style={styles.addressCopy}>
            <Text style={styles.addressLabel}>SERVICE ADDRESS</Text>
            <Text
              numberOfLines={2}
              style={[
                styles.addressValue,
                !formattedAddress && styles.addressMissing,
              ]}
            >
              {formattedAddress || "Add your home address"}
            </Text>

            {landmark ? (
              <Text numberOfLines={1} style={styles.landmarkText}>
                {landmark}
              </Text>
            ) : null}
          </View>

          <Text style={styles.addressArrow}>›</Text>
        </Pressable>

        {/* ESTIMATED PRICE */}
        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>Estimated Price</Text>
            <Text style={styles.priceHint}>
              {duration && selectedServices.length
                ? `₹${services
                    .filter((service) =>
                      selectedServices.includes(service.id),
                    )
                    .reduce(
                      (total, service) => total + service.ratePerHour,
                      0,
                    )}/hr × ${duration} ${duration === 1 ? "hr" : "hrs"}`
                : "Select service & duration"}
            </Text>
          </View>

          <Text style={styles.priceValue}>₹{totalPrice}</Text>
        </View>

        {bookingError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorText}>{bookingError}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* CTA — intentionally above the persistent Customer layout */}
      <View
        style={[
          styles.bottomAction,
          {
            paddingBottom: Math.max(insets.bottom + 10, 16),
          },
        ]}
      >
        <Pressable
          disabled={!canContinue}
          onPress={handleCreateBooking}
          style={({ pressed }) => [
            styles.continueButton,
            !canContinue && styles.continueButtonDisabled,
            pressed && canContinue && styles.continueButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue with booking"
        >
          {isBooking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.continueText}>Continue</Text>
              <Text style={styles.continueArrow}>→</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}


function getServiceIcon(name: string) {
  switch (name.toLowerCase().trim()) {
    case "cleaning":
      return require("../../../assets/CustomerUi/Customerbook/cleaning.png");
    case "cooking":
      return require("../../../assets/CustomerUi/Customerbook/cooking.png");
    case "laundry":
      return require("../../../assets/CustomerUi/Customerbook/laundry.png");
    case "dishwashing":
      return require("../../../assets/CustomerUi/Customerbook/dishwashing.png");
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    zIndex: 20,
    elevation: 2,
  },

  backButton: {
    width: 34,
    height: 38,
    justifyContent: "center",
    alignItems: "flex-start",
  },

  backIcon: {
    fontSize: 34,
    lineHeight: 36,
    color: "#102536",
    marginTop: -3,
  },

  headerCopy: {
    flex: 1,
    marginLeft: 3,
  },

  headerTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: "#102536",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    color: "#63727D",
  },

  serviceSection: {
    marginTop: 17,
  },

  section: {
    marginTop: 25,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 16.5,
    lineHeight: 21,
    fontWeight: "800",
    color: "#102536",
    letterSpacing: -0.25,
  },

  sectionHint: {
    marginTop: 2,
    marginBottom: 11,
    fontSize: 11,
    color: "#7A8790",
  },

  sectionValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64747E",
  },

  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },

  serviceCard: {
    width: "31.7%",
    minHeight: 94,
    paddingTop: 10,
    paddingBottom: 9,
    paddingHorizontal: 7,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E7EAE8",
    backgroundColor: "#FCFCFB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  serviceCardSelected: {
    backgroundColor: "#123F3C",
    borderColor: "#123F3C",
  },

  serviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F2F5F1",
    alignItems: "center",
    justifyContent: "center",
  },

  serviceIconBoxSelected: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  serviceImage: {
    width: 34,
    height: 34,
  },

  serviceFallbackIcon: {
    fontSize: 24,
    fontWeight: "700",
    color: "#123F3C",
  },

  serviceName: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#102536",
    textAlign: "center",
  },

  serviceNameSelected: {
    color: "#FFFFFF",
  },

  serviceRate: {
    marginTop: 2,
    fontSize: 8.5,
    fontWeight: "600",
    color: "#89959D",
    textAlign: "center",
  },

  serviceRateSelected: {
    color: "#DCEAE3",
  },

  serviceCheck: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  serviceCheckText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    color: "#123F3C",
  },

  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    columnGap: 9,
  },

  durationCard: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "#FAFAF8",
    borderWidth: 1,
    borderColor: "#E3E7E4",
    alignItems: "center",
    justifyContent: "center",
  },

  durationCardSelected: {
    backgroundColor: "#123F3C",
    borderColor: "#123F3C",
  },

  durationText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#102536",
  },

  durationSelectedText: {
    color: "#FFFFFF",
  },

  dateTimeRow: {
    flexDirection: "row",
    columnGap: 10,
  },

  dateTimeCard: {
    flex: 1,
    minHeight: 70,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 17,
    backgroundColor: "#FAFAF8",
    borderWidth: 1,
    borderColor: "#E3E7E4",
    flexDirection: "row",
    alignItems: "center",
  },

  dateTimeIconBox: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  dateIconBox: {
    backgroundColor: "#E8F0E7",
  },

  timeIconBox: {
    backgroundColor: "#F4EBDF",
  },

  dateTimeIcon: {
    width: 22,
    height: 22,
  },

  dateTimeCopy: {
    flex: 1,
  },

  dateTimeLabel: {
    fontSize: 7.5,
    lineHeight: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#8B969D",
  },

  dateTimeValue: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: "#102536",
  },

  placeholder: {
    color: "#A1A8AD",
  },

  scheduleHint: {
    marginTop: 7,
    fontSize: 9.5,
    lineHeight: 13,
    color: "#89949A",
  },

  addressCard: {
    marginTop: 24,
    minHeight: 72,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 17,
    backgroundColor: "#FAFAF8",
    borderWidth: 1,
    borderColor: "#E3E7E4",
    flexDirection: "row",
    alignItems: "center",
  },

  addressIconBox: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: "#E8F0E7",
    alignItems: "center",
    justifyContent: "center",
  },

  addressIcon: {
    width: 22,
    height: 22,
  },

  addressCopy: {
    flex: 1,
    marginLeft: 9,
    paddingRight: 8,
  },

  addressLabel: {
    fontSize: 7.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#8B969D",
  },

  addressValue: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: "#102536",
  },

  addressMissing: {
    color: "#A56A3B",
  },

  landmarkText: {
    marginTop: 2,
    fontSize: 8.5,
    color: "#8A949A",
  },

  addressArrow: {
    fontSize: 27,
    lineHeight: 28,
    color: "#102536",
  },

  priceCard: {
    marginTop: 16,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  priceLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102536",
  },

  priceHint: {
    marginTop: 3,
    fontSize: 9.5,
    color: "#879198",
  },

  priceValue: {
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "800",
    color: "#102536",
  },

  loadingCard: {
    minHeight: 94,
    borderRadius: 17,
    backgroundColor: "#F7F8F6",
    borderWidth: 1,
    borderColor: "#E4E8E4",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    columnGap: 9,
  },

  loadingText: {
    fontSize: 11,
    color: "#7D888D",
  },

  errorCardLight: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FBF1EC",
    borderWidth: 1,
    borderColor: "#EAD8CF",
  },

  errorCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#704D42",
  },

  errorCardText: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 15,
    color: "#8B675A",
  },

  errorBox: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F8EDEA",
    borderWidth: 1,
    borderColor: "#E9D4CF",
    flexDirection: "row",
    alignItems: "center",
  },

  errorIcon: {
    width: 17,
    height: 17,
    borderRadius: 9,
    marginRight: 7,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#A85D50",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  errorText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 14,
    color: "#8D5147",
  },

  bottomAction: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 76,
    paddingTop: 8,
    paddingHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopWidth: 1,
    borderTopColor: "#EEF0EF",
  },

  continueButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: "#123F3C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  continueButtonDisabled: {
    backgroundColor: "#D7DEDB",
  },

  continueButtonPressed: {
    opacity: 0.88,
  },

  continueText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  continueArrow: {
    marginLeft: 12,
    fontSize: 23,
    lineHeight: 24,
    color: "#FFFFFF",
  },

  pressed: {
    opacity: 0.75,
  },
});
