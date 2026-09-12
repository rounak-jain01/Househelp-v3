import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import {
  getFirestore,
  collection,
  getDocs,
} from "@react-native-firebase/firestore";

import {
  getAuth,
} from "@react-native-firebase/auth";

import {
  startBookingWithOtp,
  completeBooking,
  subscribeToMaidBooking,
} from "../../services/firebase/customerBookingLifecycleService";

import { useMaidLanguage } from "./MaidLanguageContext";

type BookingStatus =
  | "pending"
  | "assigned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_maid_found";

type CustomerAddress = {
  formatted?: string;
  landmark?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type Booking = {
  customerName?: string;
  customerPhoneNumber?: string;
  customerAddress?: CustomerAddress;
  categories?: string[];
  duration?: number;
  totalDurationMinutes?: number;
  approvedExtraMinutes?: number;
  extraTimeStatus?: "none" | "requested" | "approved" | "rejected";
  scheduledDateTime?: unknown;
  totalPrice?: number;
  status?: BookingStatus;
  customerId?: string;
  maidId?: string | null;
  winningMaidId?: string | null;
  startedAt?: unknown;
  startOtpUsedAt?: unknown;
  completedAt?: unknown;
  cancelledAt?: unknown;
  cancellationReason?: string;
};

type Language = "en" | "hi";

const copy = {
  en: {
    homehelp: "HOMEHELP",
    activeBooking: "Active booking",
    loading: "Loading booking...",
    bookingNotFound: "Booking not found",
    customer: "Customer",
    serviceLocation: "Service location",
    landmark: "Landmark",
    getDirections: "Get directions",
    bookingDetails: "Booking details",
    services: "Services",
    duration: "Duration",
    scheduled: "Scheduled",
    amount: "Amount",
    hours: "hours",
    hour: "hour",
    customerStartCode: "Customer start code",
    askForCode:
      "Ask the customer for the 6-digit code shown on their booking screen.",
    enterCode: "Enter 6-digit code",
    startJob: "Start job",
    starting: "Starting...",
    jobInProgress: "JOB IN PROGRESS",
    remainingTime: "Remaining booked time",
    markCompleted: "Mark job completed",
    completing: "Completing...",
    completed: "Booking completed",
    completedMessage:
      "This booking has been successfully completed.",
    goHome: "Back to home",
    cancelled: "Booking cancelled",
    cancelledMessage:
      "This booking was cancelled by the customer.",
    noHelpFound: "No Help found",
    noHelpMessage:
      "This booking could not be assigned.",
    assigned: "Help assigned",
    confirmed: "Booking confirmed",
    errorUnableToLoad: "Unable to load booking.",
    errorStartCode:
      "Enter the customer's 6-digit start code.",
    errorUnableToStart:
      "Unable to start the job.",
    errorUnableToComplete:
      "Unable to complete the booking.",
    noServices: "No services",
    addressUnavailable:
      "Address unavailable",
    notAvailable: "Not available",
    invalidBooking: "This booking is no longer available.",
  },

  hi: {
    homehelp: "HOMEHELP",
    activeBooking: "सक्रिय बुकिंग",
    loading: "बुकिंग लोड हो रही है...",
    bookingNotFound: "बुकिंग नहीं मिली",
    customer: "ग्राहक",
    serviceLocation: "सेवा की जगह",
    landmark: "लैंडमार्क",
    getDirections: "रास्ता देखें",
    bookingDetails: "बुकिंग की जानकारी",
    services: "सेवाएं",
    duration: "समय",
    scheduled: "तारीख और समय",
    amount: "राशि",
    hours: "घंटे",
    hour: "घंटा",
    customerStartCode: "ग्राहक का स्टार्ट कोड",
    askForCode:
      "ग्राहक से उसकी स्क्रीन पर दिख रहा 6 अंकों का कोड पूछें।",
    enterCode: "6 अंकों का कोड डालें",
    startJob: "काम शुरू करें",
    starting: "शुरू हो रहा है...",
    jobInProgress: "काम चल रहा है",
    remainingTime: "बुक किए गए समय में बाकी",
    markCompleted: "काम पूरा करें",
    completing: "पूरा किया जा रहा है...",
    completed: "बुकिंग पूरी हो गई",
    completedMessage:
      "यह बुकिंग सफलतापूर्वक पूरी हो गई है।",
    goHome: "होम पर जाएं",
    cancelled: "बुकिंग रद्द",
    cancelledMessage:
      "ग्राहक ने यह बुकिंग रद्द कर दी है।",
    noHelpFound: "Help नहीं मिली",
    noHelpMessage:
      "यह बुकिंग असाइन नहीं हो सकी।",
    assigned: "Help असाइन हो गई",
    confirmed: "बुकिंग कन्फर्म है",
    errorUnableToLoad:
      "बुकिंग लोड नहीं हो सकी।",
    errorStartCode:
      "ग्राहक का 6 अंकों का स्टार्ट कोड डालें।",
    errorUnableToStart:
      "काम शुरू नहीं हो सका।",
    errorUnableToComplete:
      "बुकिंग पूरी नहीं हो सकी।",
    noServices: "कोई सेवा नहीं",
    addressUnavailable:
      "पता उपलब्ध नहीं",
    notAvailable: "उपलब्ध नहीं",
    invalidBooking:
      "यह बुकिंग अब उपलब्ध नहीं है।",
  },
} as const;

function getDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  try {
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (
        value as {
          toDate?: unknown;
        }
      ).toDate === "function"
    ) {
      const date = (
        value as {
          toDate: () => Date;
        }
      ).toDate();

      return date instanceof Date &&
        !Number.isNaN(date.getTime())
        ? date
        : null;
    }

    const date = new Date(String(value));

    return Number.isNaN(date.getTime())
      ? null
      : date;
  } catch {
    return null;
  }
}

function formatDateTime(
  value: unknown,
  language: Language,
): string {
  const date = getDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleString(
    language === "hi"
      ? "hi-IN"
      : "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function formatDuration(
  totalSeconds: number,
): string {
  const safeSeconds = Math.max(
    0,
    Math.floor(totalSeconds),
  );

  const hours = Math.floor(
    safeSeconds / 3600,
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60,
  );

  const secondsPart =
    safeSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secondsPart).padStart(2, "0"),
  ].join(":");
}

function getEffectiveDurationMinutes(
  booking: Booking,
): number {
  const explicitTotal =
    Number(booking.totalDurationMinutes);

  if (
    Number.isFinite(explicitTotal) &&
    explicitTotal > 0
  ) {
    return Math.floor(
      explicitTotal,
    );
  }

  const originalDurationMinutes =
    Number(booking.duration ?? 0) *
    60;

  const approvedExtraMinutes =
    Number(
      booking.approvedExtraMinutes ?? 0,
    );

  return Math.max(
    0,
    originalDurationMinutes +
      (Number.isFinite(
        approvedExtraMinutes,
      )
        ? approvedExtraMinutes
        : 0),
  );
}

export default function MaidActiveBookingScreen({
  bookingId,
}: {
  bookingId: string;
}) {
  const { language } =
    useMaidLanguage();

  const t = copy[language];

  const userId = useMemo(
    () =>
      getAuth().currentUser?.uid ??
      null,
    [],
  );

  const [booking, setBooking] =
    useState<Booking | null>(
      null,
    );

  const [
    categoryNames,
    setCategoryNames,
  ] = useState<
    Record<string, string>
  >({});

  const [otp, setOtp] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isStarting, setIsStarting] =
    useState(false);

  const [isCompleting, setIsCompleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [now, setNow] =
    useState(() => new Date());

  useEffect(() => {
    const normalizedBookingId =
      bookingId?.trim();

    if (!userId || !normalizedBookingId) {
      setIsLoading(false);
      setError(t.errorUnableToLoad);
      return;
    }

    let active = true;

    const unsubscribe =
      subscribeToMaidBooking(
        normalizedBookingId,
        (value) => {
          if (!active) {
            return;
          }

          setBooking(
            value as Booking | null,
          );
          setIsLoading(false);
        },
        (listenerError) => {
          if (!active) {
            return;
          }

          console.error(
            "[MaidActiveBooking] Listener failed:",
            listenerError,
          );

          setError(
            listenerError.message ||
              t.errorUnableToLoad,
          );
          setIsLoading(false);
        },
      );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    bookingId,
    userId,
    t.errorUnableToLoad,
  ]);

  useEffect(() => {
    let mounted = true;

    const loadCategories =
      async () => {
        try {
          const snapshot =
            await getDocs(
              collection(
                getFirestore(),
                "categories",
              ),
            );

          if (!mounted) {
            return;
          }

          const map: Record<
            string,
            string
          > = {};

          snapshot.docs.forEach(
            (document) => {
              const data =
                document.data();

              map[document.id] =
                typeof data.name ===
                "string"
                  ? data.name
                  : document.id;
            },
          );

          setCategoryNames(map);
        } catch (categoryError) {
          console.error(
            "[MaidActiveBooking] Category load failed:",
            categoryError,
          );
        }
      };

    void loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer =
      setInterval(() => {
        setNow(new Date());
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const status =
    booking?.status ??
    "pending";

  const startedAt = getDate(
    booking?.startedAt,
  );

  const effectiveMinutes =
    booking
      ? getEffectiveDurationMinutes(
          booking,
        )
      : 0;

  const bookedSeconds =
    effectiveMinutes * 60;

  const elapsedSeconds =
    startedAt
      ? Math.max(
          0,
          (
            now.getTime() -
            startedAt.getTime()
          ) / 1000,
        )
      : 0;

  const remainingSeconds =
    Math.max(
      0,
      bookedSeconds -
        elapsedSeconds,
    );

  const serviceNames =
    (booking?.categories ?? [])
      .map(
        (categoryId) =>
          categoryNames[
            categoryId
          ] ?? categoryId,
      );

  const directionsUrl =
    useMemo(() => {
      const latitude =
        booking?.customerAddress
          ?.latitude;

      const longitude =
        booking?.customerAddress
          ?.longitude;

      if (
        typeof latitude !==
          "number" ||
        typeof longitude !==
          "number" ||
        !Number.isFinite(
          latitude,
        ) ||
        !Number.isFinite(
          longitude,
        ) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return null;
      }

      return (
        "https://www.google.com/maps/dir/?api=1" +
        `&destination=${latitude},${longitude}`
      );
    }, [
      booking
        ?.customerAddress
        ?.latitude,
      booking
        ?.customerAddress
        ?.longitude,
    ]);

  const handleDirections =
    async () => {
      if (!directionsUrl) {
        setError(
          t.addressUnavailable,
        );
        return;
      }

      try {
        setError("");
        await Linking.openURL(
          directionsUrl,
        );
      } catch (navigationError) {
        console.error(
          "[MaidActiveBooking] Directions failed:",
          navigationError,
        );

        setError(
          t.addressUnavailable,
        );
      }
    };

  const handleStartJob =
    async () => {
      if (
        !booking ||
        booking.status !==
          "confirmed"
      ) {
        setError(
          t.invalidBooking,
        );
        return;
      }

      const cleanOtp =
        otp.trim();

      if (
        !/^\d{6}$/.test(
          cleanOtp,
        )
      ) {
        setError(
          t.errorStartCode,
        );
        return;
      }

      if (isStarting) {
        return;
      }

      try {
        setError("");
        setIsStarting(true);

        await startBookingWithOtp(
          bookingId,
          cleanOtp,
        );

        setOtp("");
      } catch (startError) {
        console.error(
          "[MaidActiveBooking] Start job failed:",
          startError,
        );

        setError(
          startError instanceof
            Error
            ? startError.message
            : t.errorUnableToStart,
        );
      } finally {
        setIsStarting(false);
      }
    };

  const handleComplete =
    async () => {
      if (
        !booking ||
        booking.status !==
          "in_progress"
      ) {
        setError(
          t.invalidBooking,
        );
        return;
      }

      if (isCompleting) {
        return;
      }

      try {
        setError("");
        setIsCompleting(true);

        await completeBooking(
          bookingId,
        );

        router.replace(`/maid/billing/${bookingId}`);
      } catch (completionError) {
        console.error(
          "[MaidActiveBooking] Complete failed:",
          completionError,
        );

        setError(
          completionError instanceof
            Error
            ? completionError.message
            : t.errorUnableToComplete,
        );
      } finally {
        setIsCompleting(false);
      }
    };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#1F7A4C"
        />

        <Text
          style={styles.loadingText}
        >
          {t.loading}
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text
          style={styles.emptyTitle}
        >
          {error ||
            t.bookingNotFound}
        </Text>

        <Pressable
          style={
            styles.homeButton
          }
          onPress={() =>
            router.replace(
              "/maid",
            )
          }
        >
          <Text
            style={
              styles.homeButtonText
            }
          >
            {t.goHome}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      keyboardVerticalOffset={
        Platform.OS === "ios"
          ? 20
          : 0
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={styles.header}
        >
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.replace(
                "/maid",
              )
            }
          >
            <Text
              style={styles.backText}
            >
              ‹
            </Text>
          </Pressable>

          <View
            style={styles.headerText}
          >
            <Text
              style={styles.eyebrow}
            >
              {t.homehelp}
            </Text>

            <Text
              style={styles.title}
            >
              {t.activeBooking}
            </Text>
          </View>
        </View>

        <View
          style={styles.customerCard}
        >
          <Text
            style={
              styles.customerLabel
            }
          >
            {t.customer}
          </Text>

          <Text
            style={
              styles.customerName
            }
          >
            {booking.customerName ||
              t.notAvailable}
          </Text>
        </View>

        <View
          style={styles.locationCard}
        >
          <Text
            style={
              styles.sectionLabel
            }
          >
            {t.serviceLocation}
          </Text>

          <Text
            style={styles.address}
          >
            {booking
              .customerAddress
              ?.formatted ||
              t.addressUnavailable}
          </Text>

          {booking
            .customerAddress
            ?.landmark ? (
            <Text
              style={styles.landmark}
            >
              {t.landmark}:{" "}
              {
                booking
                  .customerAddress
                  .landmark
              }
            </Text>
          ) : null}

          {directionsUrl ? (
            <Pressable
              style={
                styles.directionsButton
              }
              onPress={
                handleDirections
              }
            >
              <Text
                style={
                  styles.directionsText
                }
              >
                {t.getDirections}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={styles.detailsCard}
        >
          <Text
            style={
              styles.detailsTitle
            }
          >
            {t.bookingDetails}
          </Text>

          <DetailRow
            label={t.services}
            value={
              serviceNames.length
                ? serviceNames.join(
                    ", ",
                  )
                : t.noServices
            }
          />

          <DetailRow
            label={t.duration}
            value={
              booking.duration
                ? `${booking.duration} ${
                    booking.duration ===
                    1
                      ? t.hour
                      : t.hours
                  }`
                : "—"
            }
          />

          {Number(
            booking.approvedExtraMinutes ??
              0,
          ) > 0 ? (
            <DetailRow
              label="Extra time"
              value={`+${
                booking.approvedExtraMinutes
              } min`}
            />
          ) : null}

          <DetailRow
            label={t.scheduled}
            value={formatDateTime(
              booking.scheduledDateTime,
              language,
            )}
          />

          <DetailRow
            label={t.amount}
            value={
              typeof booking.totalPrice ===
              "number"
                ? `₹${booking.totalPrice}`
                : "—"
            }
            last
          />
        </View>

        {status ===
        "confirmed" ? (
          <View
            style={styles.startCard}
          >
            <View
              style={styles.statusPill}
            >
              <Text
                style={
                  styles.statusPillText
                }
              >
                {t.confirmed}
              </Text>
            </View>

            <Text
              style={styles.startTitle}
            >
              {t.customerStartCode}
            </Text>

            <Text
              style={
                styles.startInstruction
              }
            >
              {t.askForCode}
            </Text>

            <TextInput
              value={otp}
              onChangeText={(
                value,
              ) =>
                setOtp(
                  value
                    .replace(
                      /[^0-9]/g,
                      "",
                    )
                    .slice(
                      0,
                      6,
                    ),
                )
              }
              keyboardType="number-pad"
              maxLength={6}
              placeholder={
                t.enterCode
              }
              placeholderTextColor="#979D98"
              style={
                styles.otpInput
              }
              returnKeyType="done"
              editable={!isStarting}
            />

            <Pressable
              style={[
                styles.startButton,
                isStarting &&
                  styles.disabled,
              ]}
              onPress={
                handleStartJob
              }
              disabled={
                isStarting
              }
            >
              {isStarting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.startButtonText
                  }
                >
                  {t.startJob}
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {status ===
        "in_progress" ? (
          <View
            style={
              styles.runningCard
            }
          >
            <Text
              style={
                styles.runningLabel
              }
            >
              {t.jobInProgress}
            </Text>

            <Text
              style={
                styles.runningTimer
              }
            >
              {formatDuration(
                remainingSeconds,
              )}
            </Text>

            <Text
              style={
                styles.runningText
              }
            >
              {t.remainingTime}
            </Text>

            <Pressable
              style={[
                styles.completeButton,
                isCompleting &&
                  styles.disabled,
              ]}
              onPress={
                handleComplete
              }
              disabled={
                isCompleting
              }
            >
              {isCompleting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.completeButtonText
                  }
                >
                  {t.markCompleted}
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {status ===
        "completed" ? (
          <View
            style={
              styles.completedCard
            }
          >
            <Text
              style={
                styles.completedTitle
              }
            >
              ✓ {t.completed}
            </Text>

            <Text
              style={
                styles.completedText
              }
            >
              {t.completedMessage}
            </Text>

            <Pressable
              style={
                styles.homeButton
              }
              onPress={() =>
                router.replace(
                  "/maid",
                )
              }
            >
              <Text
                style={
                  styles.homeButtonText
                }
              >
                {t.goHome}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {status ===
        "cancelled" ? (
          <View
            style={
              styles.cancelledCard
            }
          >
            <Text
              style={
                styles.cancelledTitle
              }
            >
              {t.cancelled}
            </Text>

            <Text
              style={
                styles.cancelledText
              }
            >
              {t.cancelledMessage}
            </Text>

            <Pressable
              style={
                styles.homeButton
              }
              onPress={() =>
                router.replace(
                  "/maid",
                )
              }
            >
              <Text
                style={
                  styles.homeButtonText
                }
              >
                {t.goHome}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {status ===
        "no_maid_found" ? (
          <View
            style={
              styles.cancelledCard
            }
          >
            <Text
              style={
                styles.cancelledTitle
              }
            >
              {t.noHelpFound}
            </Text>

            <Text
              style={
                styles.cancelledText
              }
            >
              {t.noHelpMessage}
            </Text>

            <Pressable
              style={
                styles.homeButton
              }
              onPress={() =>
                router.replace(
                  "/maid",
                )
              }
            >
              <Text
                style={
                  styles.homeButtonText
                }
              >
                {t.goHome}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {status ===
          "pending" ||
        status ===
          "assigned" ? (
          <View
            style={
              styles.statusInfo
            }
          >
            <Text
              style={
                styles.statusInfoText
              }
            >
              {status ===
              "assigned"
                ? t.assigned
                : t.loading}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <>
      <View
        style={styles.detailRow}
      >
        <Text
          style={styles.detailLabel}
        >
          {label}
        </Text>

        <Text
          style={styles.detailValue}
        >
          {value}
        </Text>
      </View>

      {!last ? (
        <View
          style={styles.divider}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F6",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    backgroundColor: "#F7F8F6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 11,
    fontSize: 14,
    color: "#777D78",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#171B18",
    textAlign: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E7E3",
  },

  backText: {
    fontSize: 33,
    color: "#111111",
    marginTop: -3,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#1F7A4C",
  },

  title: {
    marginTop: 4,
    fontSize: 25,
    fontWeight: "800",
    color: "#121612",
  },

  customerCard: {
    padding: 19,
    borderRadius: 20,
    backgroundColor: "#172018",
  },

  customerLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#AAB6AD",
  },

  customerName: {
    marginTop: 7,
    fontSize: 23,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  locationCard: {
    marginTop: 15,
    padding: 18,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E7E3",
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#818881",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  address: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#202520",
  },

  landmark: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#707770",
  },

  directionsButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#EAF5EE",
  },

  directionsText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F7A4C",
  },

  detailsCard: {
    marginTop: 15,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E7E3",
  },

  detailsTitle: {
    paddingTop: 16,
    paddingBottom: 4,
    fontSize: 15,
    fontWeight: "800",
    color: "#171B18",
  },

  detailRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
  },

  detailLabel: {
    width: 92,
    fontSize: 11,
    color: "#858C86",
  },

  detailValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#252A26",
    textAlign: "right",
  },

  divider: {
    height: 1,
    backgroundColor: "#ECEFEC",
  },

  startCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#EEF7F1",
    borderWidth: 1,
    borderColor: "#C9E0D1",
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#DDF0E4",
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1F7A4C",
  },

  startTitle: {
    marginTop: 13,
    fontSize: 18,
    fontWeight: "800",
    color: "#162018",
  },

  startInstruction: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: "#677269",
  },

  otpInput: {
    height: 58,
    marginTop: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#C9D9CE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    textAlign: "center",
    fontSize: 25,
    letterSpacing: 7,
    fontWeight: "900",
    color: "#182019",
  },

  startButton: {
    height: 52,
    marginTop: 12,
    borderRadius: 15,
    backgroundColor: "#1F7A4C",
    alignItems: "center",
    justifyContent: "center",
  },

  startButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  runningCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#172018",
    alignItems: "center",
  },

  runningLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
    color: "#AEB9AF",
  },

  runningTimer: {
    marginTop: 10,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#FFFFFF",
  },

  runningText: {
    marginTop: 5,
    fontSize: 11,
    color: "#C1CAC2",
  },

  completeButton: {
    width: "100%",
    height: 52,
    marginTop: 17,
    borderRadius: 15,
    backgroundColor: "#1F7A4C",
    alignItems: "center",
    justifyContent: "center",
  },

  completeButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  completedCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 19,
    backgroundColor: "#EAF5EE",
  },

  completedTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1F7A4C",
  },

  completedText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#697269",
  },

  cancelledCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 19,
    backgroundColor: "#FFF2F0",
  },

  cancelledTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#B42318",
  },

  cancelledText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#756C69",
  },

  statusInfo: {
    marginTop: 18,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#EEF6F1",
  },

  statusInfoText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F7A4C",
    textAlign: "center",
  },

  homeButton: {
    marginTop: 15,
    height: 49,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#1F7A4C",
    alignItems: "center",
    justifyContent: "center",
  },

  homeButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  errorCard: {
    marginTop: 15,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: "#FFF2F0",
  },

  errorText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#B42318",
  },

  disabled: {
    opacity: 0.55,
  },
});
