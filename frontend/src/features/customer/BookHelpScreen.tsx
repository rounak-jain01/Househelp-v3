import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
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
      {/* ===== GEOMETRIC BACKGROUND ===== */}
      <View
        pointerEvents="none"
        style={styles.geometry}
      >
        <View style={styles.geoCircleLarge} />
        <View style={styles.geoCircleSmall} />
        <View style={styles.geoPill} />
        <View style={styles.geoDiamond} />
        <View style={styles.geoArc} />
      </View>

      {/* ===== HEADER ===== */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isBooking}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>
            HOMEHELP · BOOKING
          </Text>
          <Text style={styles.headerTitle}>
            Book a Help
          </Text>
        </View>

        <View style={styles.stepIndicator}>
          <Text style={styles.stepMain}>
            01
          </Text>
          <View style={styles.stepLine} />
          <Text style={styles.stepMuted}>
            04
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + 150,
          },
        ]}
      >
        {/* ===== HERO ===== */}
        <View
          style={[
            styles.hero,
            compact && styles.heroCompact,
          ]}
        >
          <Text style={styles.heroEyebrow}>
            LET'S GET STARTED
          </Text>

          <Text style={styles.heroTitle}>
            Make home
            {"\n"}
            <Text style={styles.heroAccent}>
              feel effortless.
            </Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Tell us what you need, when you need it,
            {"\n"}
            and we'll take care of the rest.
          </Text>

          <View style={styles.heroRule} />
        </View>

        {/* ===== SERVICES ===== */}
        <SectionHeader
          eyebrow="01 · SERVICES"
          title="What do you need help with?"
          count={
            selectedServices.length
              ? `${selectedServices.length} selected`
              : "Choose one or more"
          }
        />

        {isLoadingServices ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="small"
              color="#58705C"
            />
            <Text style={styles.loadingText}>
              Loading services...
            </Text>
          </View>
        ) : serviceLoadError ? (
          <View style={styles.errorCardLight}>
            <Text style={styles.errorCardTitle}>
              Services unavailable
            </Text>
            <Text style={styles.errorCardText}>
              {serviceLoadError}
            </Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.errorCardLight}>
            <Text style={styles.errorCardTitle}>
              No services available
            </Text>
            <Text style={styles.errorCardText}>
              Please try again later.
            </Text>
          </View>
        ) : (
          <View style={styles.serviceGrid}>
            {services.map(
              (service, index) => {
                const selected =
                  selectedServices.includes(
                    service.id,
                  );

                const tone =
                  SERVICE_TONES[
                    index %
                      SERVICE_TONES.length
                  ];

                return (
                  <Pressable
                    key={service.id}
                    disabled={isBooking}
                    onPress={() =>
                      toggleService(
                        service.id,
                      )
                    }
                    style={[
                      styles.serviceCard,
                      getToneCardStyle(
                        tone,
                      ),
                      selected &&
                        styles.serviceCardSelected,
                    ]}
                  >
                    <View
                      pointerEvents="none"
                      style={getServiceShapeStyle(
                        tone,
                      )}
                    />

                    <View
                      style={styles.serviceTop}
                    >
                      <View
                        style={[
                          styles.serviceIconBox,
                          getToneIconStyle(
                            tone,
                          ),
                        ]}
                      >
                        <Text
                          style={
                            styles.serviceIndex
                          }
                        >
                          {getServiceShortIcon(
                            service.name,
                          )}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.serviceCheck,
                          selected &&
                            styles.serviceCheckSelected,
                        ]}
                      >
                        {selected ? (
                          <Text
                            style={
                              styles.serviceCheckText
                            }
                          >
                            ✓
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.serviceName,
                        selected &&
                          styles.serviceNameSelected,
                      ]}
                    >
                      {service.name}
                    </Text>

                    <Text
                      style={[
                        styles.serviceRate,
                        selected &&
                          styles.serviceRateSelected,
                      ]}
                    >
                      ₹{service.ratePerHour}/hr
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
        )}

        {/* ===== DURATION ===== */}
        <SectionHeader
          eyebrow="02 · DURATION"
          title="How long do you need help?"
          count={
            duration
              ? `${duration} ${
                  duration === 1
                    ? "hour"
                    : "hours"
                }`
              : "Choose duration"
          }
        />

        <View style={styles.durationRow}>
          {DURATIONS.map((item) => {
            const selected =
              duration === item;

            return (
              <Pressable
                key={item}
                disabled={isBooking}
                onPress={() =>
                  handleDurationSelect(
                    item,
                  )
                }
                style={[
                  styles.durationCard,
                  selected &&
                    styles.durationCardSelected,
                ]}
              >
                <Text
                  style={[
                    styles.durationNumber,
                    selected &&
                      styles.durationSelectedText,
                  ]}
                >
                  {item}
                </Text>

                <Text
                  style={[
                    styles.durationLabel,
                    selected &&
                      styles.durationSelectedText,
                  ]}
                >
                  {item === 1
                    ? "hour"
                    : "hours"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ===== DATE / TIME ===== */}
        <SectionHeader
          eyebrow="03 · SCHEDULE"
          title="When should they arrive?"
          count="At least 2 hours ahead"
        />

        <View style={styles.dateTimeRow}>
          <Pressable
            disabled={isBooking}
            onPress={() => {
              setBookingError("");
              setShowDatePicker(true);
            }}
            style={styles.dateTimeCard}
          >
            <View
              style={[
                styles.dateTimeIcon,
                styles.dateIcon,
              ]}
            >
              <View
                style={styles.calendarGlyph}
              >
                <View
                  style={
                    styles.calendarTop
                  }
                />
                <View
                  style={
                    styles.calendarBody
                  }
                />
              </View>
            </View>

            <View
              style={styles.dateTimeCopy}
            >
              <Text style={styles.dateTimeLabel}>
                DATE
              </Text>
              <Text
                style={[
                  styles.dateTimeValue,
                  !scheduledDateTime &&
                    styles.placeholder,
                ]}
                numberOfLines={1}
              >
                {displayDate}
              </Text>
            </View>

            <Text style={styles.fieldArrow}>
              ›
            </Text>
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
            style={styles.dateTimeCard}
          >
            <View
              style={[
                styles.dateTimeIcon,
                styles.timeIcon,
              ]}
            >
              <View style={styles.clockGlyph}>
                <View
                  style={styles.clockHandHour}
                />
                <View
                  style={styles.clockHandMinute}
                />
              </View>
            </View>

            <View
              style={styles.dateTimeCopy}
            >
              <Text style={styles.dateTimeLabel}>
                TIME
              </Text>
              <Text
                style={[
                  styles.dateTimeValue,
                  !scheduledDateTime &&
                    styles.placeholder,
                ]}
                numberOfLines={1}
              >
                {displayTime}
              </Text>
            </View>

            <Text style={styles.fieldArrow}>
              ›
            </Text>
          </Pressable>
        </View>

        <View style={styles.scheduleHint}>
          <View style={styles.scheduleHintDot} />
          <Text style={styles.scheduleHintText}>
            Choose a slot at least 2 hours from now.
          </Text>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={
              scheduledDateTime ??
              minimumBookingTime
            }
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDateChange}
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
            onChange={handleTimeChange}
          />
        )}

        {/* ===== ADDRESS ===== */}
        <SectionHeader
          eyebrow="04 · LOCATION"
          title="Where should the service happen?"
          count={
            formattedAddress
              ? "Home"
              : "Address required"
          }
        />

        <Pressable
          disabled={isBooking}
          onPress={() =>
            router.push(
              "/customer/profile",
            )
          }
          style={styles.addressCard}
        >
          <View style={styles.addressIconBox}>
            <Text style={styles.addressIcon}>
              ⌖
            </Text>
          </View>

          <View
            style={styles.addressContent}
          >
            <Text style={styles.addressTitle}>
              Home
            </Text>

            {formattedAddress ? (
              <>
                <Text
                  style={styles.addressText}
                  numberOfLines={2}
                >
                  {formattedAddress}
                </Text>

                {landmark ? (
                  <Text
                    style={styles.landmarkText}
                    numberOfLines={1}
                  >
                    Landmark · {landmark}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text
                style={styles.addressMissing}
              >
                Add your service address to continue.
              </Text>
            )}
          </View>

          <View style={styles.changePill}>
            <Text style={styles.changeText}>
              Change
            </Text>
          </View>
        </Pressable>

        {/* ===== PAYMENT NOTE ===== */}
        <View style={styles.paymentNote}>
          <View style={styles.paymentIcon}>
            <Text style={styles.paymentIconText}>
              ₹
            </Text>
          </View>

          <View style={styles.paymentCopy}>
            <Text style={styles.paymentTitle}>
              Pay directly after service
            </Text>

            <Text style={styles.paymentText}>
              Cash or UPI. No online gateway or
              platform payment is required.
            </Text>
          </View>
        </View>

        {/* ===== REVIEW ===== */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <View>
              <Text style={styles.reviewEyebrow}>
                YOUR BOOKING
              </Text>
              <Text style={styles.reviewTitle}>
                Estimated total
              </Text>
            </View>

            <Text style={styles.reviewPrice}>
              ₹{totalPrice}
            </Text>
          </View>

          <View style={styles.reviewDivider} />

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>
              Services
            </Text>

            <Text style={styles.reviewValue}>
              {selectedServices.length
                ? `${selectedServices.length} selected`
                : "Not selected"}
            </Text>
          </View>

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>
              Duration
            </Text>

            <Text style={styles.reviewValue}>
              {duration
                ? `${duration} ${
                    duration === 1
                      ? "hour"
                      : "hours"
                  }`
                : "Not selected"}
            </Text>
          </View>

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>
              Schedule
            </Text>

            <Text style={styles.reviewValue}>
              {scheduledDateTime
                ? `${displayDate} · ${displayTime}`
                : "Not selected"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ===== BOTTOM ACTION ===== */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom:
              Math.max(insets.bottom, 10),
          },
        ]}
      >
        {bookingError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>
              !
            </Text>
            <Text style={styles.errorText}>
              {bookingError}
            </Text>
          </View>
        ) : null}

        {!canContinue &&
        !bookingError ? (
          <Text style={styles.validationText}>
            {!services.length
              ? "Select an available service to continue"
              : !selectedServices.length
                ? "Choose at least one service"
                : !duration
                  ? "Choose your duration"
                  : !scheduledDateTime
                    ? "Choose a date and time"
                    : "Add your service address"}
          </Text>
        ) : null}

        <SlideToBook
          enabled={canContinue}
          loading={isBooking}
          onComplete={handleCreateBooking}
        />
      </View>
    </View>
  );
}

function SectionHeader({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionEyebrow}>
          {eyebrow}
        </Text>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      <Text style={styles.sectionCount}>
        {count}
      </Text>
    </View>
  );
}

function getToneCardStyle(tone: Tone) {
  switch (tone) {
    case "sand":
      return styles.serviceSand;
    case "stone":
      return styles.serviceStone;
    default:
      return styles.serviceSage;
  }
}

function getToneIconStyle(tone: Tone) {
  switch (tone) {
    case "sand":
      return styles.serviceIconSand;
    case "stone":
      return styles.serviceIconStone;
    default:
      return styles.serviceIconSage;
  }
}

function getServiceShapeStyle(tone: Tone) {
  switch (tone) {
    case "sand":
      return [
        styles.serviceShape,
        styles.serviceShapeDiamond,
        { backgroundColor: "#E6D9C5" },
      ];
    case "stone":
      return [
        styles.serviceShape,
        styles.serviceShapeSquare,
        { backgroundColor: "#DADFD6" },
      ];
    default:
      return [
        styles.serviceShape,
        styles.serviceShapeCircle,
        { backgroundColor: "#D4E1D1" },
      ];
  }
}

function SlideToBook({
  enabled,
  loading,
  onComplete,
}: {
  enabled: boolean;
  loading: boolean;
  onComplete: () => void;
}) {
  const translateX =
    useRef(new Animated.Value(0)).current;

  const [trackWidth, setTrackWidth] =
    useState(0);

  const THUMB_SIZE = 50;
  const TRACK_PADDING = 6;

  const maxX = Math.max(
    0,
    trackWidth -
      THUMB_SIZE -
      TRACK_PADDING * 2,
  );

  const enabledRef = useRef(enabled);
  const loadingRef = useRef(loading);
  const maxXRef = useRef(maxX);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    maxXRef.current = maxX;
  }, [maxX]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const reset = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
  };

  const finish = () => {
    const target = maxXRef.current;

    if (target <= 0) {
      reset();
      return;
    }

    Animated.timing(translateX, {
      toValue: target,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      onCompleteRef.current();
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          enabledRef.current &&
          !loadingRef.current,

        onMoveShouldSetPanResponder: (
          _,
          gesture,
        ) =>
          enabledRef.current &&
          !loadingRef.current &&
          Math.abs(gesture.dx) >
            Math.abs(gesture.dy),

        onPanResponderMove: (
          _,
          gesture,
        ) => {
          if (
            !enabledRef.current ||
            loadingRef.current
          ) {
            return;
          }

          const currentMax =
            maxXRef.current;

          if (currentMax <= 0) {
            return;
          }

          const next = Math.min(
            currentMax,
            Math.max(0, gesture.dx),
          );

          translateX.setValue(next);
        },

        onPanResponderRelease: (
          _,
          gesture,
        ) => {
          if (
            !enabledRef.current ||
            loadingRef.current
          ) {
            reset();
            return;
          }

          const currentMax =
            maxXRef.current;

          if (
            currentMax > 0 &&
            gesture.dx >= currentMax * 0.72
          ) {
            finish();
          } else {
            reset();
          }
        },

        onPanResponderTerminate: reset,
        onPanResponderTerminationRequest: () => true,
      }),
    [translateX],
  );

  useEffect(() => {
    if (!enabled || loading) {
      reset();
    }
  }, [enabled, loading]);

  return (
    <View
      style={[
        styles.slideTrack,
        !enabled &&
          styles.slideTrackDisabled,
      ]}
      onLayout={(event) => {
        const width =
          event.nativeEvent.layout.width;

        setTrackWidth(width);

        if (width <= 0) {
          return;
        }
      }}
    >
      <View
        pointerEvents="none"
        style={styles.slideTextWrap}
      >
        <Text
          style={[
            styles.slideLabel,
            !enabled &&
              styles.slideLabelDisabled,
          ]}
        >
          {loading
            ? "Creating your booking..."
            : "Slide to book"}
        </Text>

        {!loading ? (
          <Text
            style={[
              styles.slideHint,
              !enabled &&
                styles.slideHintDisabled,
            ]}
          >
            {enabled
              ? "Drag the arrow all the way →"
              : "Complete the details above"}
          </Text>
        ) : null}
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.slideThumb,
          !enabled &&
            styles.slideThumbDisabled,
          {
            transform: [
              { translateX },
            ],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#3E5647"
          />
        ) : (
          <Text style={styles.slideArrow}>
            →
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F3",
  },

  geometry: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  geoCircleLarge: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -115,
    top: 88,
    backgroundColor: "#DDE5DC",
  },

  geoCircleSmall: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    left: -48,
    top: 430,
    backgroundColor: "#E8DFCE",
  },

  geoPill: {
    position: "absolute",
    width: 100,
    height: 28,
    borderRadius: 16,
    right: 25,
    top: 63,
    backgroundColor: "#C8D3C6",
    transform: [{ rotate: "-14deg" }],
  },

  geoDiamond: {
    position: "absolute",
    width: 76,
    height: 76,
    right: -24,
    top: 500,
    borderRadius: 17,
    backgroundColor: "#E6DED0",
    transform: [{ rotate: "45deg" }],
  },

  geoArc: {
    position: "absolute",
    width: 150,
    height: 150,
    right: -75,
    bottom: 50,
    borderWidth: 25,
    borderColor: "#D9E1D7",
    borderRadius: 75,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: "#F0F1EB",
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: 33,
    lineHeight: 34,
    color: "#222621",
    marginTop: -4,
  },

  headerCopy: {
    flex: 1,
    marginLeft: 12,
  },

  headerEyebrow: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.7,
    color: "#899089",
  },

  headerTitle: {
    marginTop: 3,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#222621",
  },

  stepIndicator: {
    alignItems: "center",
  },

  stepMain: {
    fontSize: 8,
    fontWeight: "900",
    color: "#536658",
  },

  stepLine: {
    width: 15,
    height: 1,
    marginVertical: 3,
    backgroundColor: "#B8BEB6",
  },

  stepMuted: {
    fontSize: 7,
    fontWeight: "700",
    color: "#A2A7A1",
  },

  content: {
    paddingHorizontal: 20,
  },

  hero: {
    marginTop: 39,
    paddingRight: 20,
  },

  heroCompact: {
    marginTop: 24,
  },

  heroEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.25,
    color: "#607062",
  },

  heroTitle: {
    marginTop: 12,
    fontSize: 37,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -1.6,
    color: "#222621",
  },

  heroAccent: {
    fontWeight: "500",
    color: "#66746A",
  },

  heroSubtitle: {
    marginTop: 13,
    fontSize: 12,
    lineHeight: 19,
    color: "#777E78",
  },

  heroRule: {
    width: 40,
    height: 2,
    marginTop: 17,
    backgroundColor: "#647365",
  },

  sectionHeader: {
    marginTop: 31,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  sectionHeaderCopy: {
    flex: 1,
    paddingRight: 12,
  },

  sectionEyebrow: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.65,
    color: "#969C96",
  },

  sectionTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: -0.35,
    color: "#262B26",
  },

  sectionCount: {
    maxWidth: 105,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "800",
    textAlign: "right",
    color: "#909790",
  },

  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 11,
  },

  serviceCard: {
    position: "relative",
    width: "48.1%",
    minHeight: 153,
    padding: 14,
    borderRadius: 21,
    borderWidth: 1,
    overflow: "hidden",
  },

  serviceSage: {
    backgroundColor: "#EEF3ED",
    borderColor: "#D6DFD3",
  },

  serviceSand: {
    backgroundColor: "#F7F3EA",
    borderColor: "#E4DCCF",
  },

  serviceStone: {
    backgroundColor: "#F1F2ED",
    borderColor: "#DCE0D9",
  },

  serviceCardSelected: {
    borderColor: "#617462",
    borderWidth: 1.5,
  },

  serviceShape: {
    position: "absolute",
    right: -24,
    bottom: -24,
  },

  serviceShapeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },

  serviceShapeDiamond: {
    width: 59,
    height: 59,
    borderRadius: 13,
    transform: [{ rotate: "45deg" }],
  },

  serviceShapeSquare: {
    width: 62,
    height: 62,
    borderRadius: 17,
    transform: [{ rotate: "16deg" }],
  },

  serviceTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  serviceIconBox: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  serviceIconSage: {
    backgroundColor: "#DCE6D9",
  },

  serviceIconSand: {
    backgroundColor: "#E9E0D3",
  },

  serviceIconStone: {
    backgroundColor: "#E1E5DE",
  },

  serviceIndex: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#586A5B",
  },

  serviceCheck: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.4,
    borderColor: "#BDC3BB",
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },

  serviceCheckSelected: {
    borderColor: "#607563",
    backgroundColor: "#607563",
  },

  serviceCheckText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  serviceName: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "900",
    color: "#2A2F2A",
  },

  serviceNameSelected: {
    color: "#526658",
  },

  serviceRate: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: "700",
    color: "#878E87",
  },

  serviceRateSelected: {
    color: "#637267",
  },

  loadingCard: {
    minHeight: 90,
    borderRadius: 20,
    backgroundColor: "#F4F5F0",
    borderWidth: 1,
    borderColor: "#E0E3DD",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },

  loadingText: {
    fontSize: 11,
    color: "#777F78",
  },

  errorCardLight: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#F7EFE9",
    borderWidth: 1,
    borderColor: "#E5D4C8",
  },

  errorCardTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6D5145",
  },

  errorCardText: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 16,
    color: "#8A6A5B",
  },

  durationRow: {
    flexDirection: "row",
    gap: 9,
  },

  durationCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: "#F7F7F2",
    borderWidth: 1,
    borderColor: "#DDE1DA",
    alignItems: "center",
    justifyContent: "center",
  },

  durationCardSelected: {
    backgroundColor: "#5D7161",
    borderColor: "#5D7161",
  },

  durationNumber: {
    fontSize: 23,
    fontWeight: "900",
    color: "#2A312B",
  },

  durationLabel: {
    marginTop: 2,
    fontSize: 8.5,
    fontWeight: "800",
    color: "#888F88",
  },

  durationSelectedText: {
    color: "#FFFFFF",
  },

  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
  },

  dateTimeCard: {
    flex: 1,
    minHeight: 84,
    padding: 12,
    borderRadius: 19,
    backgroundColor: "#F8F8F4",
    borderWidth: 1,
    borderColor: "#DDE1DA",
    flexDirection: "row",
    alignItems: "center",
  },

  dateTimeIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  dateIcon: {
    backgroundColor: "#DDE8DB",
  },

  timeIcon: {
    backgroundColor: "#E9E0D2",
  },

  dateTimeCopy: {
    flex: 1,
  },

  dateTimeLabel: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#959B95",
  },

  dateTimeValue: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "800",
    color: "#2C322C",
  },

  placeholder: {
    color: "#A2A7A2",
  },

  fieldArrow: {
    marginLeft: 4,
    fontSize: 21,
    color: "#7A857B",
  },

  calendarGlyph: {
    width: 19,
    height: 18,
    borderWidth: 1.7,
    borderColor: "#526557",
    borderRadius: 4,
    overflow: "hidden",
  },

  calendarTop: {
    height: 5,
    backgroundColor: "#526557",
  },

  calendarBody: {
    flex: 1,
    backgroundColor: "transparent",
  },

  clockGlyph: {
    width: 19,
    height: 19,
    borderWidth: 1.7,
    borderColor: "#796C59",
    borderRadius: 10,
  },

  clockHandHour: {
    position: "absolute",
    width: 1.7,
    height: 6,
    left: 8,
    top: 4,
    backgroundColor: "#796C59",
  },

  clockHandMinute: {
    position: "absolute",
    width: 6,
    height: 1.7,
    left: 8,
    top: 9,
    backgroundColor: "#796C59",
  },

  scheduleHint: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  scheduleHintDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#738076",
    marginRight: 6,
  },

  scheduleHintText: {
    fontSize: 9.5,
    color: "#929992",
  },

  addressCard: {
    minHeight: 96,
    padding: 13,
    borderRadius: 20,
    backgroundColor: "#F7F7F2",
    borderWidth: 1,
    borderColor: "#DDE1DA",
    flexDirection: "row",
    alignItems: "center",
  },

  addressIconBox: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#DDE8DB",
    alignItems: "center",
    justifyContent: "center",
  },

  addressIcon: {
    fontSize: 22,
    color: "#526557",
  },

  addressContent: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 7,
  },

  addressTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#2A302A",
  },

  addressText: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 15,
    color: "#727A72",
  },

  landmarkText: {
    marginTop: 3,
    fontSize: 9,
    color: "#90968F",
  },

  addressMissing: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 15,
    color: "#A56A3B",
  },

  changePill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#E6ECE2",
  },

  changeText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#5B705F",
  },

  paymentNote: {
    marginTop: 13,
    padding: 13,
    borderRadius: 19,
    backgroundColor: "#E9EEE6",
    borderWidth: 1,
    borderColor: "#D7E0D4",
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#CFDCCC",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentIconText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#536655",
  },

  paymentCopy: {
    flex: 1,
    marginLeft: 10,
  },

  paymentTitle: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#4C5E50",
  },

  paymentText: {
    marginTop: 3,
    fontSize: 9.5,
    lineHeight: 14,
    color: "#737D74",
  },

  reviewCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 21,
    backgroundColor: "#2F463A",
    overflow: "hidden",
  },

  reviewTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  reviewEyebrow: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.6,
    color: "#AFC0B2",
  },

  reviewTitle: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  reviewPrice: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  reviewDivider: {
    height: 1,
    marginVertical: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  reviewRow: {
    marginTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  reviewLabel: {
    fontSize: 9,
    color: "#AFC0B2",
  },

  reviewValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: "800",
    color: "#EEF4EE",
    textAlign: "right",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 9,
    paddingHorizontal: 17,
    backgroundColor: "rgba(248,247,243,0.97)",
    borderTopWidth: 1,
    borderTopColor: "#E0E3DD",
  },

  validationText: {
    marginBottom: 7,
    fontSize: 9.5,
    fontWeight: "700",
    color: "#8B938B",
    textAlign: "center",
  },

  errorBox: {
    marginBottom: 7,
    paddingHorizontal: 11,
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

  slideTrack: {
    height: 62,
    borderRadius: 31,
    paddingHorizontal: 6,
    justifyContent: "center",
    backgroundColor: "#3C5749",
    overflow: "hidden",
  },

  slideTrackDisabled: {
    backgroundColor: "#D9DDD7",
  },

  slideTextWrap: {
    position: "absolute",
    left: 28,
    right: 76,
    alignItems: "center",
    justifyContent: "center",
  },

  slideLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  slideLabelDisabled: {
    color: "#8D948E",
  },

  slideHint: {
    marginTop: 2,
    fontSize: 7.5,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: "#C9D7CC",
  },

  slideHintDisabled: {
    color: "#9BA19C",
  },

  slideThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F4F1E8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  slideThumbDisabled: {
    backgroundColor: "#C5CAC4",
  },

  slideArrow: {
    fontSize: 24,
    color: "#3C5749",
    marginTop: -2,
  },
});
