import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import type { EdgeInsets } from "react-native-safe-area-context";

import type { Booking, BookingStatus } from "./BookingWaitingTypes";

type BookingScreenProps = {
  booking: Booking;
  status: BookingStatus;
  statusIndex: number;
  insets: EdgeInsets;
  otp: any;
  canCancel: boolean;
  scheduledAt: Date | null;
  hoursUntilBooking: number | null;
  travelText: string;
  onCallHelp: () => void;
  onOpenCancel: () => void;
  error: string;

  remainingSeconds: number;
  progress: number;
  elapsedSeconds: number;
  bookedSeconds: number;
  timeFinished: boolean;
  canRequestExtra: boolean;
  isRequestingExtraTime: boolean;
  extraTimeError: string;
  onRequestExtraTime: (minutes: number) => void;
};

const COLORS = {
  background: "#F7F4EC",
  card: "#FFFDF8",
  white: "#FFFFFF",

  green: "#08785D",
  darkGreen: "#123F3E",

  text: "#142F32",
  muted: "#687777",

  border: "#DDE5DF",

  paleGreen: "#E7F3EC",
  paleGreenStrong: "#DCEDE3",

  gold: "#E7A21A",

  disabled: "#E9EEE9",
};

/* ============================================================
   TIME HELPERS
   ============================================================ */

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(safeSeconds / 3600);

  const minutes = Math.floor((safeSeconds % 3600) / 60);

  const secs = safeSeconds % 60;

  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatShortDuration(seconds: number) {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));

  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hr ${minutes} min`;
  }

  if (hours > 0) {
    return `${hours} hr`;
  }

  return `${minutes} min`;
}

function formatTime(date: Date | null) {
  if (!date) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ============================================================
   BOOKING HELPERS
   ============================================================ */

function formatCategory(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (!parts.length) return "H";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getAddressText(
  address:
    | string
    | {
        formatted?: string;
        landmark?: string;
        latitude?: number | null;
        longitude?: number | null;
      }
    | null
    | undefined,
) {
  if (!address) {
    return "Address unavailable";
  }

  if (typeof address === "string") {
    return address;
  }

  return address.formatted || address.landmark || "Address unavailable";
}

function getDateFromBookingValue(value: unknown) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (
        value as {
          toDate: () => Date;
        }
      ).toDate();
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && value !== null && "_seconds" in value) {
    const seconds = Number(
      (
        value as {
          _seconds?: number;
        }
      )._seconds ?? 0,
    );

    if (seconds > 0) {
      return new Date(seconds * 1000);
    }
  }

  return null;
}

/* ============================================================
   MAIN SCREEN
   ============================================================ */

export function BookingInProgressScreen({
  booking,
  insets,
  scheduledAt,
  remainingSeconds,
  progress,
  bookedSeconds,
  timeFinished,
  canRequestExtra,
  isRequestingExtraTime,
  extraTimeError,
  onRequestExtraTime,
  onCallHelp,
  error,
}: BookingScreenProps) {
  const maid = booking.maidDetails;

  const startDate = useMemo(
    () => getDateFromBookingValue(booking.startedAt),
    [booking.startedAt],
  );

  const categories = booking.categories ?? [];

  const serviceText =
    categories.length > 0
      ? categories.map(formatCategory).join(" • ")
      : "Home service";

  const durationHours = Number(booking.duration ?? 0);

  const totalMinutes =
    bookedSeconds > 0
      ? Math.round(bookedSeconds / 60)
      : durationHours * 60;

  const endDate =
    startDate && totalMinutes > 0
      ? new Date(startDate.getTime() + totalMinutes * 60 * 1000)
      : null;

  /*
   * Keep progress safely between 0 and 1.
   *
   * 0   = service just started
   * 1   = booked time completed
   */
  const safeProgress = Math.max(0, Math.min(1, progress));

  /*
   * Circle geometry
   */
  const TIMER_SIZE = 190;
  const TIMER_RADIUS = 82;
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

  /*
   * As time passes:
   *
   * progress 0 -> dashOffset = full circumference
   * progress 1 -> dashOffset = 0
   *
   * Therefore the green ring gradually fills around
   * the timer in sync with the actual booking progress.
   */
  const timerDashOffset =
    TIMER_CIRCUMFERENCE * (1 - safeProgress);

  return (
    <View style={styles.screen}>
      {/* ======================================================
          FIXED HEADER
          ====================================================== */}

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 6,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerSmall}>BOOKING</Text>

          <Text style={styles.headerTitle}>In Progress</Text>
        </View>

        <View style={styles.livePill}>
          <View style={styles.liveDot} />

          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* ======================================================
          SCROLLABLE CONTENT
          ====================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            /*
             * Customer layout ka persistent bottom navigation
             * content ke upar aata hai, isliye extra space.
             */
            paddingBottom: Math.max(insets.bottom, 18) + 105,
          },
        ]}
      >
        {/* ==================================================
            STATUS PILL
            ================================================== */}

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />

          <Text style={styles.statusText}>
            Service in Progress
          </Text>
        </View>

        {/* ==================================================
            CIRCULAR TIMER
            ================================================== */}

        <View style={styles.timerArea}>
          <View style={styles.timerOuter}>
            <Svg
              width={TIMER_SIZE}
              height={TIMER_SIZE}
              viewBox={`0 0 ${TIMER_SIZE} ${TIMER_SIZE}`}
              style={styles.timerSvg}
            >
              {/* Background track */}
              <Circle
                cx="95"
                cy="95"
                r={TIMER_RADIUS}
                fill="none"
                stroke="#D6E8DE"
                strokeWidth="9"
              />

              {/* Actual live progress */}
              <Circle
                cx="95"
                cy="95"
                r={TIMER_RADIUS}
                fill="none"
                stroke={COLORS.green}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={TIMER_CIRCUMFERENCE}
                strokeDashoffset={timerDashOffset}
                transform="rotate(-90 95 95)"
              />
            </Svg>

            <View style={styles.timerInner}>
              <Text style={styles.timerValue}>
                {formatClock(remainingSeconds)}
              </Text>

              <Text style={styles.timerLabel}>
                Time remaining
              </Text>

              <Text style={styles.timerSub}>
                of {formatShortDuration(bookedSeconds)}
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            HELPER MINI CARD
            ================================================== */}

        <View style={styles.helperCard}>
          {maid?.photoUrl ? (
            <Image
              source={{
                uri: maid.photoUrl,
              }}
              style={styles.helperPhoto}
            />
          ) : (
            <View
              style={[
                styles.helperPhoto,
                styles.photoFallback,
              ]}
            >
              <Text style={styles.initials}>
                {getInitials(maid?.name)}
              </Text>
            </View>
          )}

          <View style={styles.helperInfo}>
            <Text
              numberOfLines={1}
              style={styles.helperName}
            >
              {maid?.name || "Your Help"}
            </Text>

            <View style={styles.ratingRow}>
              <Text style={styles.star}>★</Text>

              <Text style={styles.rating}>4.8</Text>

              <View style={styles.verifiedWrap}>
                <Text style={styles.verifiedCheck}>✓</Text>

                <Text style={styles.verifiedText}>
                  Verified Help
                </Text>
              </View>
            </View>
          </View>

          {maid?.phoneNumber ? (
            <Pressable
              style={({ pressed }) => [
                styles.callIcon,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Call Help"
              onPress={onCallHelp}
            >
              <Text style={styles.phoneIcon}>☎</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ==================================================
            START / END
            ================================================== */}

        <View style={styles.timeCard}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>
              STARTED AT
            </Text>

            <Text style={styles.timeValue}>
              {formatTime(startDate)}
            </Text>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>
              ENDS AT
            </Text>

            <Text style={styles.timeValue}>
              {formatTime(endDate)}
            </Text>
          </View>
        </View>

        {/* ==================================================
            NEED MORE TIME
            ================================================== */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>

          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>
              Need more time?
            </Text>

            <Text style={styles.infoText}>
              {timeFinished
                ? "Your booked time is complete. Request extra time to continue the service."
                : "You can request extra time before the session ends."}
            </Text>
          </View>
        </View>

        {/* ==================================================
            EXTRA TIME BUTTON
            ================================================== */}

        <Pressable
          disabled={
            !canRequestExtra || isRequestingExtraTime
          }
          accessibilityRole="button"
          accessibilityLabel="Request Extra Time"
          style={({ pressed }) => [
            styles.extraButton,
            !canRequestExtra &&
              styles.extraButtonDisabled,
            pressed &&
              canRequestExtra &&
              styles.pressed,
          ]}
          onPress={() => {
            if (canRequestExtra) {
              /*
               * Existing lifecycle logic remains responsible
               * for processing the extra-time request.
               */
              onRequestExtraTime(30);
            }
          }}
        >
          <Text style={styles.extraButtonIcon}>◷</Text>

          <Text
            style={[
              styles.extraButtonText,
              !canRequestExtra &&
                styles.extraButtonTextDisabled,
            ]}
          >
            {isRequestingExtraTime
              ? "Requesting..."
              : "Request Extra Time"}
          </Text>
        </Pressable>

        {/* ==================================================
            EXTRA TIME ERROR
            ================================================== */}

        {extraTimeError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Extra time request failed
            </Text>

            <Text style={styles.errorText}>
              {extraTimeError}
            </Text>
          </View>
        ) : null}

        {/* ==================================================
            BOOKING DETAILS
            ================================================== */}

        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <View>
              <Text style={styles.detailsEyebrow}>
                BOOKING
              </Text>

              <Text style={styles.detailsTitle}>
                Booking Details
              </Text>
            </View>

            <Text style={styles.chevron}>⌄</Text>
          </View>

          <View style={styles.detailsDivider} />

          <DetailRow
            icon="⌂"
            label="Service"
            value={serviceText}
          />

          <DetailRow
            icon="◷"
            label="Duration"
            value={
              bookedSeconds > 0
                ? formatShortDuration(bookedSeconds)
                : `${durationHours} hours`
            }
          />

          <DetailRow
            icon="●"
            label="Location"
            value={getAddressText(
              booking.customerAddress,
            )}
          />

          <DetailRow
            icon="₹"
            label="Total"
            value={`₹${Number(
              booking.totalPrice ?? 0,
            ).toLocaleString("en-IN")}`}
          />

          <DetailRow
            icon="▣"
            label="Scheduled"
            value={
              scheduledAt
                ? `${scheduledAt.toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )} · ${formatTime(scheduledAt)}`
                : "—"
            }
            last
          />
        </View>

        {/* ==================================================
            GENERAL ERROR
            ================================================== */}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Something went wrong
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ============================================================
   DETAIL ROW
   ============================================================ */

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        !last && styles.detailRowBorder,
      ]}
    >
      <View style={styles.detailIcon}>
        <Text style={styles.detailIconText}>
          {icon}
        </Text>
      </View>

      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text
          numberOfLines={2}
          style={styles.detailValue}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* ========================================================
     HEADER
     ======================================================== */

  header: {
    minHeight: 70,
    paddingHorizontal: 18,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E5DC",
    zIndex: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: 31,
    lineHeight: 34,
    color: COLORS.darkGreen,
    marginTop: -2,
  },

  headerTitleWrap: {
    flex: 1,
    marginLeft: 8,
  },

  headerSmall: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: COLORS.muted,
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: COLORS.paleGreen,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    marginRight: 5,
  },

  liveText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.green,
  },

  /* ========================================================
     CONTENT
     ======================================================== */

  content: {
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 10,
  },

  /* ========================================================
     STATUS
     ======================================================== */

  statusPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.paleGreen,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: COLORS.green,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.green,
  },

  /* ========================================================
     TIMER
     ======================================================== */

  timerArea: {
    alignItems: "center",
    paddingVertical: 16,
  },

  timerOuter: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  timerSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },

  timerInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  timerValue: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: COLORS.darkGreen,
  },

  timerLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  timerSub: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.muted,
  },

  /* ========================================================
     HELPER
     ======================================================== */

  helperCard: {
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },

  helperPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E5E8E2",
  },

  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paleGreen,
  },

  initials: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.green,
  },

  helperInfo: {
    flex: 1,
    marginLeft: 10,
  },

  helperName: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  ratingRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },

  star: {
    fontSize: 12,
    color: COLORS.gold,
  },

  rating: {
    marginLeft: 3,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.text,
  },

  verifiedWrap: {
    marginLeft: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  verifiedCheck: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.green,
  },

  verifiedText: {
    marginLeft: 3,
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.muted,
  },

  callIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BCD5CA",
    backgroundColor: "#F5F9F5",
  },

  phoneIcon: {
    fontSize: 18,
    color: COLORS.green,
  },

  /* ========================================================
     START / END
     ======================================================== */

  timeCard: {
    marginTop: 9,
    minHeight: 75,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },

  timeColumn: {
    flex: 1,
  },

  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 15,
  },

  timeLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: COLORS.muted,
  },

  timeValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  /* ========================================================
     INFO
     ======================================================== */

  infoCard: {
    marginTop: 9,
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.paleGreen,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },

  infoIconText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
  },

  infoCopy: {
    flex: 1,
    marginLeft: 9,
  },

  infoTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  infoText: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.muted,
  },

  /* ========================================================
     EXTRA TIME
     ======================================================== */

  extraButton: {
    height: 52,
    marginTop: 7,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  extraButtonDisabled: {
    backgroundColor: COLORS.disabled,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  extraButtonIcon: {
    marginRight: 8,
    fontSize: 18,
    color: COLORS.white,
  },

  extraButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.white,
  },

  extraButtonTextDisabled: {
    color: COLORS.muted,
  },

  /* ========================================================
     DETAILS
     ======================================================== */

  detailsCard: {
    marginTop: 9,
    paddingHorizontal: 14,
    paddingTop: 13,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  detailsHeader: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  detailsEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: COLORS.muted,
  },

  detailsTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  chevron: {
    fontSize: 22,
    color: COLORS.darkGreen,
    marginTop: -5,
  },

  detailsDivider: {
    height: 1,
    marginTop: 5,
    backgroundColor: COLORS.border,
  },

  detailRow: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
  },

  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E9EDE8",
  },

  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paleGreen,
  },

  detailIconText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.green,
  },

  detailCopy: {
    flex: 1,
    marginLeft: 9,
  },

  detailLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.muted,
  },

  detailValue: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  /* ========================================================
     ERROR
     ======================================================== */

  errorCard: {
    marginTop: 9,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF0ED",
    borderWidth: 1,
    borderColor: "#F1D2CC",
  },

  errorTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#9A5148",
  },

  errorText: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    color: "#7D625D",
  },

  /* ========================================================
     PRESS
     ======================================================== */

  pressed: {
    opacity: 0.78,
  },
});