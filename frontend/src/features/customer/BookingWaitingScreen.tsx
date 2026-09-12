import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  subscribeToBooking,
} from "../../../src/services/firebase/bookingService";
import {
  cancelCustomerBooking,
  requestExtraTime,
  subscribeToCustomerStartOtp,
  type CustomerStartOtp,
} from "../../../src/services/firebase/customerBookingLifecycleService";

type BookingStatus =
  | "pending"
  | "assigned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_maid_found";

type Booking = {
  customerId?: string;
  maidId?: string | null;
  winningMaidId?: string | null;
  categories?: string[];
  duration?: number;
  scheduledDateTime?: unknown;
  totalPrice?: number;

  status?: BookingStatus;

  billing?: {
    baseAmount?: number;
    extraTimeMinutes?: number;
    extraTimeAmount?: number;
    totalAmount?: number;
    currency?: string;
    generatedAt?: unknown;
  };

  customerAddress?: {
    formatted?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  maidDetails?: {
    name?: string;
    phoneNumber?: string;
    photoUrl?: string;
    verificationStatus?: string;
    serviceCategories?: string[];
    serviceArea?: string;
    distanceMeters?: number | null;
    distanceText?: string | null;
    etaText?: string | null;
  };

  createdAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  cancelledAt?: unknown;

  cancellationReason?: string | null;

  extraTimeStatus?:
    | "none"
    | "requested"
    | "accepted"
    | "rejected";
  requestedExtraMinutes?: number;
  approvedExtraMinutes?: number;
  totalDurationMinutes?: number;
  extraTimeRequestedAt?: unknown;
  extraTimeRespondedAt?: unknown;
};

type CancelReason =
  | "Changed my plans"
  | "Booked by mistake"
  | "Found another Help"
  | "Schedule no longer works"
  | "Other";

const CANCEL_REASONS: CancelReason[] = [
  "Changed my plans",
  "Booked by mistake",
  "Found another Help",
  "Schedule no longer works",
  "Other",
];

const STATUS_LABELS: Record<
  BookingStatus,
  string
> = {
  pending: "Searching",
  assigned: "Request sent",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_maid_found: "No Help found",
};

function getDate(value: unknown): Date | null {
  if (!value) return null;

  try {
    if (
      typeof (value as any)?.toDate ===
      "function"
    ) {
      return (value as any).toDate();
    }

    const date = new Date(value as any);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  } catch {
    return null;
  }
}

function formatDateTime(value: unknown) {
  const date = getDate(value);

  if (!date) return "—";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number) {
  const safe = Math.max(
    0,
    Math.floor(seconds),
  );

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor(
    (safe % 3600) / 60,
  );
  const secs = safe % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
}

function getInitials(name?: string) {
  const parts =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];

  if (!parts.length) return "H";

  return parts
    .slice(0, 2)
    .map((part) =>
      part[0]?.toUpperCase(),
    )
    .join("");
}

function formatCategory(
  category: string,
) {
  return category
    .replace(/[-_]/g, " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}

function getStatusIndex(
  status: BookingStatus,
) {
  switch (status) {
    case "pending":
      return 0;
    case "assigned":
      return 1;
    case "confirmed":
      return 2;
    case "in_progress":
      return 3;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

export default function BookingWaitingScreen() {
  const { bookingId: routeBookingId } =
    useLocalSearchParams<{
      bookingId?: string | string[];
    }>();

  const bookingId =
    typeof routeBookingId === "string"
      ? routeBookingId
      : routeBookingId?.[0] ?? "";

  const insets = useSafeAreaInsets();
  const { width, height } =
    useWindowDimensions();

  const compact = height < 760;

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [otp, setOtp] =
    useState<CustomerStartOtp | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [now, setNow] =
    useState(() => new Date());

  const [
    isRequestingExtraTime,
    setIsRequestingExtraTime,
  ] = useState(false);

  const [extraTimeError, setExtraTimeError] =
    useState("");

  const [
    showCancelSheet,
    setShowCancelSheet,
  ] = useState(false);

  const [
    selectedReason,
    setSelectedReason,
  ] = useState<CancelReason | null>(null);

  const [isCancelling, setIsCancelling] =
    useState(false);

  const billingOpened =
    useRef(false);

  useEffect(() => {
    if (!bookingId.trim()) {
      setError("Booking ID is missing.");
      setIsLoading(false);
      return () => {};
    }

    const unsubscribe =
      subscribeToBooking(
        bookingId,
        (value) => {
          const updated =
            value as Booking | null;

          setBooking(updated);
          setError("");
          setIsLoading(false);

          if (
            updated?.status ===
              "completed" &&
            updated.billing &&
            !billingOpened.current
          ) {
            billingOpened.current = true;
            router.replace(
              `/customer/billing/${bookingId}`,
            );
          }
        },
        (listenerError) => {
          console.error(
            "[BookingWaiting] listener failed:",
            listenerError,
          );

          setError(
            listenerError.message ||
              "Unable to load booking.",
          );
          setIsLoading(false);
        },
      );

    return unsubscribe;
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId.trim()) {
      return () => {};
    }

    const unsubscribe =
      subscribeToCustomerStartOtp(
        bookingId,
        setOtp,
        (otpError) => {
          console.error(
            "[BookingWaiting] OTP listener failed:",
            otpError,
          );
        },
      );

    return unsubscribe;
  }, [bookingId]);

  useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()),
      1000,
    );

    return () => clearInterval(timer);
  }, []);

  const status =
    booking?.status ?? "pending";

  const statusIndex = getStatusIndex(status);

  const scheduledAt = getDate(
    booking?.scheduledDateTime,
  );

  const startDate = getDate(
    booking?.startedAt,
  );

  const completedDate = getDate(
    booking?.completedAt,
  );

  const originalBookedMinutes =
    Number(booking?.duration ?? 0) * 60;

  const approvedExtraMinutes =
    Number(
      booking?.approvedExtraMinutes ?? 0,
    );

  const configuredTotalMinutes =
    Number(
      booking?.totalDurationMinutes ?? 0,
    );

  const totalBookedMinutes =
    configuredTotalMinutes > 0
      ? configuredTotalMinutes
      : originalBookedMinutes +
        approvedExtraMinutes;

  const bookedSeconds = Math.max(
    0,
    totalBookedMinutes * 60,
  );

  const elapsedSeconds = startDate
    ? Math.max(
        0,
        (now.getTime() -
          startDate.getTime()) /
          1000,
      )
    : 0;

  const remainingSeconds =
    Math.max(
      0,
      bookedSeconds - elapsedSeconds,
    );

  const progress =
    bookedSeconds > 0
      ? Math.min(
          1,
          elapsedSeconds / bookedSeconds,
        )
      : 0;

  const timeFinished =
    status === "in_progress" &&
    remainingSeconds <= 0;

  const canRequestExtra =
    status === "in_progress" &&
    timeFinished &&
    booking?.extraTimeStatus !==
      "requested" &&
    booking?.extraTimeStatus !==
      "accepted" &&
    !isRequestingExtraTime;

  const canCancel = useMemo(() => {
    if (!booking || !scheduledAt)
      return false;

    if (
      ![
        "pending",
        "assigned",
        "confirmed",
      ].includes(status)
    ) {
      return false;
    }

    return (
      scheduledAt.getTime() -
        now.getTime() >
      60 * 60 * 1000
    );
  }, [
    booking,
    scheduledAt,
    status,
    now,
  ]);

  const hoursUntilBooking =
    scheduledAt
      ? Math.max(
          0,
          (scheduledAt.getTime() -
            now.getTime()) /
            (60 * 60 * 1000),
        )
      : null;

  const travelText =
    booking?.maidDetails
      ?.distanceText &&
    booking?.maidDetails?.etaText
      ? `${booking.maidDetails.distanceText} away · ${booking.maidDetails.etaText}`
      : booking?.maidDetails
          ?.distanceText ||
        booking?.maidDetails
          ?.etaText ||
        "Travel estimate unavailable";

  const handleCallHelp = async () => {
    const phone =
      booking?.maidDetails
        ?.phoneNumber;

    if (!phone) return;

    try {
      await Linking.openURL(
        `tel:${phone}`,
      );
    } catch (callError) {
      console.error(
        "[BookingWaiting] call failed:",
        callError,
      );
    }
  };

  const handleExtraTimeRequest =
    async (minutes: number) => {
      if (!bookingId) return;

      try {
        setExtraTimeError("");
        setIsRequestingExtraTime(true);

        await requestExtraTime(
          bookingId,
          minutes,
        );
      } catch (requestError) {
        console.error(
          "[BookingWaiting] extra time failed:",
          requestError,
        );

        setExtraTimeError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to request extra time.",
        );
      } finally {
        setIsRequestingExtraTime(false);
      }
    };

  const handleCancel = async () => {
    if (!selectedReason) return;

    try {
      setError("");
      setIsCancelling(true);

      await cancelCustomerBooking(
        bookingId,
        selectedReason,
      );

      setSelectedReason(null);
      setShowCancelSheet(false);
    } catch (cancelError) {
      console.error(
        "[BookingWaiting] cancel failed:",
        cancelError,
      );

      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel the booking.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.loadingLogo}>
          <View style={styles.loadingRoof} />
          <View style={styles.loadingHouse} />
        </View>

        <ActivityIndicator
          size="small"
          color="#617365"
          style={{ marginTop: 14 }}
        />

        <Text style={styles.loadingText}>
          Loading your booking...
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.emptyTitle}>
          {error || "Booking not found"}
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.replace("/customer")
          }
        >
          <Text
            style={styles.primaryButtonText}
          >
            Go to Home
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== GEOMETRY ===== */}
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
            paddingTop:
              insets.top + 9,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>
            HOMEHELP · BOOKING
          </Text>
          <Text style={styles.headerTitle}>
            Your booking
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            status === "completed" &&
              styles.statusPillCompleted,
          ]}
        >
          {status !== "completed" ? (
            <View style={styles.statusDot} />
          ) : (
            <Text
              style={styles.completedCheck}
            >
              ✓
            </Text>
          )}

          <Text
            style={[
              styles.statusPillText,
              status === "completed" &&
                styles.statusPillCompletedText,
            ]}
          >
            {STATUS_LABELS[status]}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + 32,
          },
        ]}
      >
        {/* ===== MAIN STATUS ===== */}
        <View
          style={[
            styles.heroStatus,
            status === "completed" &&
              styles.heroStatusCompleted,
            status === "cancelled" &&
              styles.heroStatusCancelled,
          ]}
        >
          <View pointerEvents="none" style={styles.heroGeometry}>
            <View style={styles.heroGeoCircle} />
            <View style={styles.heroGeoRing} />
            <View style={styles.heroGeoDiamond} />
            <View style={styles.heroGeoArc} />
            <View style={styles.heroGeoLine} />
          </View>

          <View style={styles.heroStatusTop}>
            <Text
              style={[
                styles.heroEyebrow,
                status === "completed" &&
                  styles.completedEyebrow,
              ]}
            >
              {status === "pending"
                ? "SEARCHING"
                : status === "assigned"
                  ? "HELP REQUEST SENT"
                  : status === "confirmed"
                    ? "HELP CONFIRMED"
                    : status ===
                        "in_progress"
                      ? "JOB IN PROGRESS"
                      : status === "completed"
                        ? "COMPLETE"
                        : status ===
                            "cancelled"
                          ? "CANCELLED"
                          : "ATTENTION"}
            </Text>

            <Text style={styles.heroIndex}>
              {statusIndex >= 0
                ? `0${statusIndex + 1}`
                : "—"}
              /05
            </Text>
          </View>

          <Text
            style={[
              styles.heroStatusTitle,
              status === "completed" &&
                styles.completedHeroTitle,
              status === "cancelled" &&
                styles.cancelledHeroTitle,
            ]}
          >
            {status === "pending"
              ? "Finding a Help for you"
              : status === "assigned"
                ? "Your request is with available Helps"
                : status === "confirmed"
                  ? "Your Help is confirmed"
                  : status === "in_progress"
                    ? "Your service is in progress"
                    : status === "completed"
                      ? "Your service is complete"
                      : status === "cancelled"
                        ? "This booking was cancelled"
                        : "We couldn't find a Help"}
          </Text>

          <Text
            style={[
              styles.heroStatusText,
              status === "completed" &&
                styles.completedHeroText,
              status === "cancelled" &&
                styles.cancelledHeroText,
            ]}
          >
            {status === "pending"
              ? "We're checking available Helps for your requested time."
              : status === "assigned"
                ? "Your booking request has been sent. The first valid acceptance confirms the booking."
                : status === "confirmed"
                  ? "Keep your 6-digit start code ready for arrival."
                  : status === "in_progress"
                    ? "Your booked time is now running."
                    : status === "completed"
                      ? "Your bill is ready."
                      : status === "cancelled"
                        ? booking.cancellationReason ||
                          "This booking has been cancelled."
                        : "No available Help accepted this booking."}
          </Text>

          {status === "pending" ? (
            <View
              style={styles.searchingRow}
            >
              <ActivityIndicator
                size="small"
                color="#D2DDD3"
              />
              <Text
                style={styles.searchingText}
              >
                Matching your request...
              </Text>
            </View>
          ) : null}
        </View>

        {/* ===== PROGRESS ===== */}
        {[
          "pending",
          "assigned",
          "confirmed",
          "in_progress",
          "completed",
        ].includes(status) ? (
          <View style={styles.progressCard}>
            {[
              ["Finding Help", 0],
              ["Help assigned", 1],
              ["Confirmed", 2],
              ["Started", 3],
              ["Completed", 4],
            ].map(
              ([label, index], itemIndex) => (
                <ProgressStep
                  key={String(label)}
                  label={String(label)}
                  active={
                    statusIndex >=
                    Number(index)
                  }
                  completed={
                    statusIndex >
                    Number(index) ||
                    (statusIndex === 4 &&
                      Number(index) === 4)
                  }
                  last={itemIndex === 4}
                />
              ),
            )}
          </View>
        ) : null}

        {/* ===== HELP ===== */}
        {booking.maidDetails &&
        [
          "confirmed",
          "in_progress",
          "completed",
        ].includes(status) ? (
          <SectionTitle
            eyebrow="YOUR HELP"
            title="Meet your Help"
          />
        ) : null}

        {booking.maidDetails &&
        [
          "confirmed",
          "in_progress",
          "completed",
        ].includes(status) ? (
          <View style={styles.helpCard}>
            {booking.maidDetails
              .photoUrl ? (
              <Image
                source={{
                  uri: booking.maidDetails.photoUrl,
                }}
                style={styles.helpImage}
              />
            ) : (
              <View style={styles.helpInitial}>
                <Text
                  style={
                    styles.helpInitialText
                  }
                >
                  {getInitials(
                    booking.maidDetails
                      .name,
                  )}
                </Text>
              </View>
            )}

            <View style={styles.helpInfo}>
              <View
                style={styles.helpNameRow}
              >
                <Text
                  style={styles.helpName}
                >
                  {booking.maidDetails.name ||
                    "HomeHelp"}
                </Text>

                <View
                  style={styles.verifiedPill}
                >
                  <Text
                    style={
                      styles.verifiedPillText
                    }
                  >
                    ✓ Verified
                  </Text>
                </View>
              </View>

              <Text
                style={styles.helpArea}
              >
                {booking.maidDetails
                  .serviceArea ||
                  "Verified HomeHelp"}
              </Text>

              <Text
                style={styles.travelText}
              >
                {travelText}
              </Text>
            </View>

            {booking.maidDetails
              .phoneNumber ? (
              <Pressable
                style={styles.callButton}
                onPress={handleCallHelp}
              >
                <Text
                  style={styles.callIcon}
                >
                  ☎
                </Text>
                <Text
                  style={styles.callText}
                >
                  Call
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* ===== START CODE ===== */}
        {status === "confirmed" &&
        otp &&
        !otp.usedAt ? (
          <>
            <SectionTitle
              eyebrow="START CODE"
              title="Share this when your Help arrives"
            />

            <View style={styles.otpCard}>
              <View
                style={styles.otpTop}
              >
                <View
                  style={styles.otpIconBox}
                >
                  <Text
                    style={styles.otpIcon}
                  >
                    #
                  </Text>
                </View>

                <View
                  style={styles.otpCopy}
                >
                  <Text style={styles.otpTitle}>
                    Your 6-digit code
                  </Text>
                  <Text
                    style={
                      styles.otpSubtitle
                    }
                  >
                    The timer starts only after
                    this code is verified.
                  </Text>
                </View>
              </View>

              <Text style={styles.otpValue}>
                {otp.otp}
              </Text>
            </View>
          </>
        ) : null}

        {/* ===== TIMER ===== */}
        {status === "in_progress" ? (
          <>
            <SectionTitle
              eyebrow="SERVICE TIME"
              title="Your booked time"
            />

            <View style={styles.timerCard}>
              <Text
                style={styles.timerEyebrow}
              >
                {timeFinished
                  ? "TIME COMPLETE"
                  : "TIME REMAINING"}
              </Text>

              <Text
                style={[
                  styles.timerValue,
                  timeFinished &&
                    styles.timerValueFinished,
                ]}
              >
                {formatDuration(
                  remainingSeconds,
                )}
              </Text>

              <View
                style={styles.timerTrack}
              >
                <View
                  style={[
                    styles.timerFill,
                    {
                      width: `${Math.round(
                        progress * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={styles.timerSubtext}
              >
                {timeFinished
                  ? "Your booked time has finished."
                  : `${formatDuration(
                      elapsedSeconds,
                    )} used of ${formatDuration(
                      bookedSeconds,
                    )}`}
              </Text>
            </View>
          </>
        ) : null}

        {/* ===== EXTRA TIME ===== */}
        {status === "in_progress" ? (
          <>
            <SectionTitle
              eyebrow="OPTIONAL"
              title="Need a little more time?"
            />

            <View
              style={styles.extraTimeCard}
            >
              {booking.extraTimeStatus ===
              "requested" ? (
                <>
                  <Text
                    style={styles.extraTimeTitle}
                  >
                    Extra time requested
                  </Text>

                  <Text
                    style={styles.extraTimeText}
                  >
                    Waiting for your Help to
                    respond.
                  </Text>

                  <View
                    style={styles.pendingRow}
                  >
                    <ActivityIndicator
                      size="small"
                      color="#5D7161"
                    />
                    <Text
                      style={
                        styles.pendingText
                      }
                    >
                      {formatExtraMinutes(
                        booking.requestedExtraMinutes,
                      )}{" "}
                      requested
                    </Text>
                  </View>
                </>
              ) : booking.extraTimeStatus ===
                "accepted" ? (
                <>
                  <Text
                    style={styles.extraTimeTitle}
                  >
                    Extra time accepted
                  </Text>
                  <Text
                    style={styles.extraTimeText}
                  >
                    Your Help accepted the
                    additional time and the
                    booking duration has been
                    extended.
                  </Text>
                </>
              ) : booking.extraTimeStatus ===
                "rejected" ? (
                <>
                  <Text
                    style={styles.extraTimeTitle}
                  >
                    Extra time was declined
                  </Text>

                  <Text
                    style={styles.extraTimeText}
                  >
                    You can request another
                    option now that the previous
                    request was declined.
                  </Text>

                  <ExtraTimeButtons
                    enabled={
                      canRequestExtra
                    }
                    loading={
                      isRequestingExtraTime
                    }
                    onRequest={
                      handleExtraTimeRequest
                    }
                  />

                  {extraTimeError ? (
                    <Text
                      style={styles.extraError}
                    >
                      {extraTimeError}
                    </Text>
                  ) : null}
                </>
              ) : timeFinished ? (
                <>
                  <Text
                    style={styles.extraTimeTitle}
                  >
                    Booked time completed
                  </Text>

                  <Text
                    style={styles.extraTimeText}
                  >
                    Request 30 minutes, 1 hour,
                    or 2 hours from your Help.
                  </Text>

                  <ExtraTimeButtons
                    enabled={
                      canRequestExtra
                    }
                    loading={
                      isRequestingExtraTime
                    }
                    onRequest={
                      handleExtraTimeRequest
                    }
                  />

                  {extraTimeError ? (
                    <Text
                      style={styles.extraError}
                    >
                      {extraTimeError}
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text
                    style={styles.extraTimeTitle}
                  >
                    Extra time is locked
                  </Text>

                  <Text
                    style={styles.extraTimeText}
                  >
                    Options become available
                    when your current booked time
                    reaches 00:00:00.
                  </Text>

                  <View
                    style={styles.lockedPill}
                  >
                    <Text
                      style={
                        styles.lockedPillText
                      }
                    >
                      AVAILABLE AT 00:00:00
                    </Text>
                  </View>
                </>
              )}
            </View>
          </>
        ) : null}

        {/* ===== DETAILS ===== */}
        <SectionTitle
          eyebrow="BOOKING DETAILS"
          title="Your service"
        />

        <View style={styles.detailsCard}>
          <DetailRow
            label="Service"
            value={
              booking.categories
                ?.map(formatCategory)
                .join(" · ") ||
              "Home service"
            }
          />

          <DetailRow
            label="Duration"
            value={
              booking.duration
                ? `${booking.duration} ${
                    booking.duration === 1
                      ? "hour"
                      : "hours"
                  }`
                : "—"
            }
          />

          <DetailRow
            label="Scheduled"
            value={formatDateTime(
              booking.scheduledDateTime,
            )}
          />

          <DetailRow
            label="Total"
            value={
              typeof booking.totalPrice ===
              "number"
                ? `₹${booking.totalPrice}`
                : "—"
            }
          />

          <DetailRow
            label="Address"
            value={
              booking.customerAddress
                ?.formatted || "—"
            }
          />

          {booking.customerAddress
            ?.landmark ? (
            <DetailRow
              label="Landmark"
              value={
                booking.customerAddress
                  .landmark
              }
              last
            />
          ) : null}
        </View>

        {/* ===== CONTEXT CARD ===== */}
        {status === "confirmed" ? (
          <InfoCard
            title="What happens next?"
            text="Your Help will arrive at the scheduled time. Show the start code when they arrive. Your booked time starts after the code is verified."
          />
        ) : status ===
          "in_progress" ? (
          <InfoCard
            title="Your service is underway"
            text="The timer started when your Help verified the start code. Completion is confirmed by the Help after the work is finished."
          />
        ) : status === "completed" ? (
          <InfoCard
            title="Payment summary ready"
            text="Your final bill is available. No online payment gateway is used; payment is settled directly with your Help."
            success
          />
        ) : null}

        {/* ===== CANCEL ===== */}
        {canCancel ? (
          <View style={styles.cancelArea}>
            <Text style={styles.cancelHint}>
              {hoursUntilBooking !== null
                ? `${hoursUntilBooking.toFixed(
                    1,
                  )} hours until your booking`
                : ""}
            </Text>

            <Pressable
              style={styles.cancelButton}
              onPress={() =>
                setShowCancelSheet(true)
              }
            >
              <Text
                style={styles.cancelButtonText}
              >
                Cancel booking
              </Text>
            </Pressable>
          </View>
        ) : [
            "pending",
            "assigned",
            "confirmed",
          ].includes(status) &&
          scheduledAt ? (
          <View
            style={styles.lockedCancel}
          >
            <Text
              style={styles.lockedCancelTitle}
            >
              Cancellation unavailable
            </Text>
            <Text
              style={styles.lockedCancelText}
            >
              Cancellation is available only
              more than 1 hour before the
              scheduled start time.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ===== CANCEL SHEET ===== */}
      <Modal
        visible={showCancelSheet}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowCancelSheet(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelSheet}>
            <View
              style={styles.sheetHandle}
            />

            <Text style={styles.sheetEyebrow}>
              CHANGE OF PLANS
            </Text>

            <Text style={styles.sheetTitle}>
              Why are you cancelling?
            </Text>

            <Text
              style={styles.sheetSubtitle}
            >
              Select the closest reason.
            </Text>

            {CANCEL_REASONS.map(
              (reason) => {
                const selected =
                  selectedReason ===
                  reason;

                return (
                  <Pressable
                    key={reason}
                    onPress={() =>
                      setSelectedReason(
                        reason,
                      )
                    }
                    style={[
                      styles.reasonOption,
                      selected &&
                        styles.reasonSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        selected &&
                          styles.radioSelected,
                      ]}
                    >
                      {selected ? (
                        <View
                          style={
                            styles.radioDot
                          }
                        />
                      ) : null}
                    </View>

                    <Text
                      style={
                        styles.reasonText
                      }
                    >
                      {reason}
                    </Text>
                  </Pressable>
                );
              },
            )}

            <Pressable
              disabled={
                !selectedReason ||
                isCancelling
              }
              onPress={handleCancel}
              style={[
                styles.confirmCancel,
                (!selectedReason ||
                  isCancelling) &&
                  styles.disabledButton,
              ]}
            >
              {isCancelling ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.confirmCancelText
                  }
                >
                  Confirm cancellation
                </Text>
              )}
            </Pressable>

            <Pressable
              disabled={isCancelling}
              onPress={() =>
                setShowCancelSheet(false)
              }
              style={styles.keepButton}
            >
              <Text
                style={styles.keepButtonText}
              >
                Keep booking
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionEyebrow}>
        {eyebrow}
      </Text>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>
    </View>
  );
}

function ProgressStep({
  label,
  active,
  completed,
  last,
}: {
  label: string;
  active: boolean;
  completed: boolean;
  last: boolean;
}) {
  return (
    <View style={styles.progressStep}>
      <View style={styles.progressLeft}>
        <View
          style={[
            styles.progressCircle,
            active &&
              styles.progressCircleActive,
          ]}
        >
          {completed ? (
            <Text
              style={styles.progressCheck}
            >
              ✓
            </Text>
          ) : (
            <View
              style={[
                styles.progressInner,
                active &&
                  styles.progressInnerActive,
              ]}
            />
          )}
        </View>

        {!last ? (
          <View
            style={[
              styles.progressLine,
              completed &&
                styles.progressLineActive,
            ]}
          />
        ) : null}
      </View>

      <Text
        style={[
          styles.progressLabel,
          active &&
            styles.progressLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
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
    <View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>
        <Text
          style={styles.detailValue}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>

      {!last ? (
        <View
          style={styles.detailDivider}
        />
      ) : null}
    </View>
  );
}

function InfoCard({
  title,
  text,
  success = false,
}: {
  title: string;
  text: string;
  success?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoCard,
        success &&
          styles.infoCardSuccess,
      ]}
    >
      <View
        style={[
          styles.infoBadge,
          success &&
            styles.infoBadgeSuccess,
        ]}
      >
        <Text
          style={[
            styles.infoBadgeText,
            success &&
              styles.infoBadgeTextSuccess,
          ]}
        >
          {success ? "✓" : "i"}
        </Text>
      </View>

      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>
          {title}
        </Text>
        <Text style={styles.infoText}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function ExtraTimeButtons({
  enabled,
  loading,
  onRequest,
}: {
  enabled: boolean;
  loading: boolean;
  onRequest: (
    minutes: number,
  ) => void;
}) {
  const options = [
    [30, "+30 min"],
    [60, "+1 hour"],
    [120, "+2 hours"],
  ] as const;

  return (
    <View
      style={styles.extraButtons}
    >
      {options.map(
        ([minutes, label]) => (
          <Pressable
            key={minutes}
            disabled={!enabled || loading}
            onPress={() =>
              onRequest(minutes)
            }
            style={[
              styles.extraButton,
              (!enabled || loading) &&
                styles.extraButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={
                  enabled
                    ? "#526558"
                    : "#969D97"
                }
              />
            ) : (
              <Text
                style={[
                  styles.extraButtonText,
                  (!enabled || loading) &&
                    styles.extraButtonTextDisabled,
                ]}
              >
                {label}
              </Text>
            )}
          </Pressable>
        ),
      )}
    </View>
  );
}

function formatExtraMinutes(
  minutes?: number,
) {
  const value = Number(minutes ?? 0);

  if (value >= 60) {
    const hours = value / 60;
    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    }`;
  }

  return `${value} minutes`;
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
    width: 300,
    height: 300,
    borderRadius: 150,
    right: -175,
    top: 72,
    backgroundColor: "#DDE6DB",
  },

  geoCircleSmall: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    left: -62,
    top: 360,
    backgroundColor: "#E9DFCC",
  },

  geoPill: {
    position: "absolute",
    width: 138,
    height: 34,
    borderRadius: 20,
    right: 18,
    top: 54,
    backgroundColor: "#C7D4C5",
    transform: [{ rotate: "-17deg" }],
  },

  geoDiamond: {
    position: "absolute",
    width: 86,
    height: 86,
    left: -34,
    top: 585,
    borderRadius: 24,
    backgroundColor: "#E6DCCB",
    transform: [{ rotate: "45deg" }],
  },

  geoArc: {
    position: "absolute",
    width: 190,
    height: 190,
    right: -102,
    bottom: 38,
    borderWidth: 28,
    borderColor: "#D8E1D6",
    borderRadius: 96,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 13,
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
    color: "#242824",
    marginTop: -4,
  },

  headerCopy: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },

  headerEyebrow: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.7,
    color: "#8C938C",
  },

  headerTitle: {
    marginTop: 3,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#252925",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#E4EADF",
  },

  statusPillCompleted: {
    backgroundColor: "#DDE9DC",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
    backgroundColor: "#5E765F",
  },

  completedCheck: {
    marginRight: 4,
    fontSize: 10,
    fontWeight: "900",
    color: "#507056",
  },

  statusPillText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#5E705F",
  },

  statusPillCompletedText: {
    color: "#4F6B54",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  heroGeometry: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  heroGeoCircle: {
    position: "absolute",
    width: 185,
    height: 185,
    borderRadius: 93,
    right: -58,
    top: -52,
    backgroundColor: "rgba(210,224,211,0.22)",
  },

  heroGeoRing: {
    position: "absolute",
    width: 122,
    height: 122,
    borderRadius: 61,
    right: 20,
    top: -22,
    borderWidth: 10,
    borderColor: "rgba(229,236,228,0.42)",
  },

  heroGeoDiamond: {
    position: "absolute",
    width: 58,
    height: 58,
    right: 40,
    bottom: 20,
    borderRadius: 16,
    backgroundColor: "rgba(221,207,182,0.22)",
    transform: [{ rotate: "45deg" }],
  },

  heroGeoArc: {
    position: "absolute",
    width: 92,
    height: 92,
    left: -45,
    bottom: -42,
    borderWidth: 14,
    borderColor: "rgba(209,222,210,0.28)",
    borderRadius: 48,
  },

  heroGeoLine: {
    position: "absolute",
    width: 92,
    height: 5,
    right: 32,
    bottom: 70,
    borderRadius: 99,
    backgroundColor: "rgba(220,230,220,0.25)",
    transform: [{ rotate: "-22deg" }],
  },

  heroStatus: {
    minHeight: 255,
    padding: 21,
    borderRadius: 34,
    backgroundColor: "#30483B",
    overflow: "hidden",
  },

  heroStatusCompleted: {
    minHeight: 235,
    backgroundColor: "#E8F0E6",
    borderWidth: 1,
    borderColor: "#CFDDD0",
  },

  heroStatusCancelled: {
    minHeight: 235,
    backgroundColor: "#EEEAE4",
    borderWidth: 1,
    borderColor: "#DED4C8",
  },

  heroStatusTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: "#AFC0B2",
  },

  completedEyebrow: {
    color: "#6A816C",
  },

  heroIndex: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#AFC0B2",
  },

  heroStatusTitle: {
    marginTop: 12,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#FFFFFF",
  },

  completedHeroTitle: {
    color: "#31513B",
  },

  cancelledHeroTitle: {
    color: "#554C44",
  },

  heroStatusText: {
    marginTop: 9,
    fontSize: 11,
    lineHeight: 17,
    color: "#D0D8D1",
  },

  completedHeroText: {
    color: "#6D7C70",
  },

  cancelledHeroText: {
    color: "#776D62",
  },

  searchingRow: {
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  searchingText: {
    marginLeft: 8,
    fontSize: 9.5,
    fontWeight: "700",
    color: "#C7D3CA",
  },

  progressCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 26,
    backgroundColor: "#F2F3EE",
    borderWidth: 1,
    borderColor: "#DCE1D9",
  },

  progressStep: {
    minHeight: 34,
    flexDirection: "row",
  },

  progressLeft: {
    width: 24,
    alignItems: "center",
  },

  progressCircle: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#E1E5DE",
    alignItems: "center",
    justifyContent: "center",
  },

  progressCircleActive: {
    backgroundColor: "#5C7260",
  },

  progressInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#A5ADA6",
  },

  progressInnerActive: {
    backgroundColor: "#FFFFFF",
  },

  progressCheck: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  progressLine: {
    flex: 1,
    width: 2,
    marginVertical: 2,
    backgroundColor: "#E0E4DE",
  },

  progressLineActive: {
    backgroundColor: "#5C7260",
  },

  progressLabel: {
    marginLeft: 10,
    paddingTop: 1,
    fontSize: 10.5,
    fontWeight: "600",
    color: "#8A918B",
  },

  progressLabelActive: {
    color: "#293229",
    fontWeight: "900",
  },

  sectionTitleWrap: {
    marginTop: 31,
    marginBottom: 12,
  },

  sectionEyebrow: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.7,
    color: "#969C96",
  },

  sectionTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: -0.35,
    color: "#292E29",
  },

  helpCard: {
    padding: 15,
    borderRadius: 28,
    backgroundColor: "#EEF3ED",
    borderWidth: 1,
    borderColor: "#D6DED4",
    flexDirection: "row",
    alignItems: "center",
  },

  helpImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCE5D9",
  },

  helpInitial: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D8E5D5",
    alignItems: "center",
    justifyContent: "center",
  },

  helpInitialText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#55705A",
  },

  helpInfo: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 6,
  },

  helpNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  helpName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#293129",
  },

  verifiedPill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: "#D9E6D7",
  },

  verifiedPillText: {
    fontSize: 6.8,
    fontWeight: "900",
    color: "#55705A",
  },

  helpArea: {
    marginTop: 4,
    fontSize: 9.5,
    color: "#79827A",
  },

  travelText: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: "800",
    color: "#5C7160",
  },

  callButton: {
    width: 47,
    height: 47,
    borderRadius: 17,
    backgroundColor: "#DCE7D9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  callIcon: {
    fontSize: 16,
    color: "#56705A",
  },

  callText: {
    marginTop: 1,
    fontSize: 6.8,
    fontWeight: "900",
    color: "#56705A",
  },

  otpCard: {
    padding: 17,
    borderRadius: 22,
    backgroundColor: "#F0F4ED",
    borderWidth: 1,
    borderColor: "#D7E1D5",
  },

  otpTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  otpIconBox: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: "#DCE7D9",
    alignItems: "center",
    justifyContent: "center",
  },

  otpIcon: {
    fontSize: 18,
    fontWeight: "900",
    color: "#526957",
  },

  otpCopy: {
    flex: 1,
    marginLeft: 10,
  },

  otpTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2C342D",
  },

  otpSubtitle: {
    marginTop: 3,
    fontSize: 9.5,
    lineHeight: 14,
    color: "#748074",
  },

  otpValue: {
    marginTop: 18,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 8,
    textAlign: "center",
    color: "#283329",
  },

  timerCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#253A30",
    alignItems: "center",
  },

  timerEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: "#AFC1B4",
  },

  timerValue: {
    marginTop: 7,
    fontSize: 39,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#FFFFFF",
  },

  timerValueFinished: {
    color: "#D4E4D5",
  },

  timerTrack: {
    width: "100%",
    height: 7,
    marginTop: 15,
    borderRadius: 4,
    backgroundColor: "#3A4B41",
    overflow: "hidden",
  },

  timerFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#91B299",
  },

  timerSubtext: {
    marginTop: 9,
    fontSize: 9.5,
    color: "#C6D1C9",
  },

  extraTimeCard: {
    padding: 16,
    borderRadius: 21,
    backgroundColor: "#F6F3EB",
    borderWidth: 1,
    borderColor: "#E2DBCD",
  },

  extraTimeTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#383C36",
  },

  extraTimeText: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 15,
    color: "#7F827A",
  },

  extraButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },

  extraButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#E3EADF",
    borderWidth: 1,
    borderColor: "#CFD9CE",
    alignItems: "center",
    justifyContent: "center",
  },

  extraButtonDisabled: {
    backgroundColor: "#ECECE7",
    borderColor: "#E1E2DC",
  },

  extraButtonText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#536655",
  },

  extraButtonTextDisabled: {
    color: "#999E98",
  },

  pendingRow: {
    marginTop: 12,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "#ECEFE8",
    flexDirection: "row",
    alignItems: "center",
  },

  pendingText: {
    marginLeft: 8,
    fontSize: 9.5,
    fontWeight: "800",
    color: "#667067",
  },

  lockedPill: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#E7E6DF",
  },

  lockedPillText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#8B8F88",
  },

  extraError: {
    marginTop: 9,
    fontSize: 9.5,
    lineHeight: 14,
    color: "#A45A4E",
  },

  detailsCard: {
    paddingHorizontal: 15,
    borderRadius: 21,
    backgroundColor: "#F8F8F4",
    borderWidth: 1,
    borderColor: "#DDE1DA",
  },

  detailRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
  },

  detailLabel: {
    width: 92,
    fontSize: 9,
    fontWeight: "800",
    color: "#929991",
  },

  detailValue: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: "right",
    fontWeight: "800",
    color: "#313731",
  },

  detailDivider: {
    height: 1,
    backgroundColor: "#E7E9E3",
  },

  infoCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 19,
    backgroundColor: "#ECEFE7",
    borderWidth: 1,
    borderColor: "#DCE2D8",
    flexDirection: "row",
  },

  infoCardSuccess: {
    backgroundColor: "#E8F0E6",
    borderColor: "#D1DFD0",
  },

  infoBadge: {
    width: 31,
    height: 31,
    borderRadius: 12,
    backgroundColor: "#D8E3D5",
    alignItems: "center",
    justifyContent: "center",
  },

  infoBadgeSuccess: {
    backgroundColor: "#D3E4D2",
  },

  infoBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#5D7161",
  },

  infoBadgeTextSuccess: {
    color: "#4F6A55",
  },

  infoCopy: {
    flex: 1,
    marginLeft: 10,
  },

  infoTitle: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#465548",
  },

  infoText: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 15,
    color: "#727D73",
  },

  cancelArea: {
    marginTop: 22,
    alignItems: "center",
  },

  cancelHint: {
    marginBottom: 8,
    fontSize: 8.5,
    color: "#949A94",
  },

  cancelButton: {
    minWidth: 150,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: "#F3EAE5",
    borderWidth: 1,
    borderColor: "#E4D2CB",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#9B554A",
  },

  lockedCancel: {
    marginTop: 22,
    padding: 13,
    borderRadius: 17,
    backgroundColor: "#ECEDE8",
    borderWidth: 1,
    borderColor: "#E0E2DC",
  },

  lockedCancelTitle: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#6F756F",
  },

  lockedCancelText: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 14,
    color: "#8B918B",
  },

  errorCard: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8EDEA",
    borderWidth: 1,
    borderColor: "#E9D4CF",
  },

  errorText: {
    fontSize: 9.5,
    lineHeight: 14,
    color: "#8D5147",
  },

  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8F7F3",
  },

  loadingLogo: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#202420",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingRoof: {
    position: "absolute",
    width: 18,
    height: 18,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: "#F8F7F3",
    transform: [{ rotate: "45deg" }],
    top: 10,
  },

  loadingHouse: {
    width: 17,
    height: 13,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: "#F8F7F3",
    marginTop: 10,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 11,
    color: "#7B827B",
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#2A2F2A",
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 18,
    minWidth: 145,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#5D7161",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(24,28,24,0.42)",
    justifyContent: "flex-end",
  },

  cancelSheet: {
    paddingHorizontal: 20,
    paddingTop: 9,
    paddingBottom: 25,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#F8F7F3",
  },

  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CDD2CA",
  },

  sheetEyebrow: {
    marginTop: 18,
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: "#9A9F99",
  },

  sheetTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "900",
    color: "#292E29",
  },

  sheetSubtitle: {
    marginTop: 5,
    marginBottom: 14,
    fontSize: 10.5,
    color: "#7E857E",
  },

  reasonOption: {
    minHeight: 45,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E0E3DC",
    backgroundColor: "#FBFAF6",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  reasonSelected: {
    borderColor: "#8EA590",
    backgroundColor: "#EDF3EB",
  },

  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#AEB5AD",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#5D7161",
  },

  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#5D7161",
  },

  reasonText: {
    marginLeft: 10,
    fontSize: 10.5,
    fontWeight: "700",
    color: "#363C36",
  },

  confirmCancel: {
    marginTop: 9,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#A25A4D",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmCancelText: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  disabledButton: {
    opacity: 0.45,
  },

  keepButton: {
    marginTop: 8,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  keepButtonText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#555D55",
  },
});
