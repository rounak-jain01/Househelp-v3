import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import type { EdgeInsets } from "react-native-safe-area-context";

import type { Booking } from "./BookingWaitingTypes";

type BookingCompletedScreenProps = {
  booking: Booking;
  insets: EdgeInsets;
  bookedSeconds: number;
  elapsedSeconds: number;
  onViewBill: () => void;
  onBookAgain: () => void;
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
};

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(
    0,
    Math.round(seconds / 60),
  );

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

function formatCategory(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getInitials(name?: string) {
  const parts =
    name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (!parts.length) return "H";

  return parts
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
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

  return (
    address.formatted ||
    address.landmark ||
    "Address unavailable"
  );
}

function getDateFromBookingValue(value: unknown) {
  if (!value) return null;

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as { toDate?: unknown }
    ).toDate === "function"
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

  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value
  ) {
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

export function BookingCompletedScreen({
  booking,
  insets,
  bookedSeconds,
  elapsedSeconds,
  onViewBill,
  onBookAgain,
}: BookingCompletedScreenProps) {
  const maid = booking.maidDetails;

  const completedAt = useMemo(
    () =>
      getDateFromBookingValue(
        booking.completedAt,
      ),
    [booking.completedAt],
  );

  const categories = booking.categories ?? [];

  const serviceText =
    categories.length > 0
      ? categories.map(formatCategory).join(" • ")
      : "Home service";

  const totalPrice = Number(
    booking.totalPrice ?? 0,
  );

  const bookedDurationSeconds =
    bookedSeconds > 0
      ? bookedSeconds
      : Number(booking.duration ?? 0) * 3600;

  const actualDurationSeconds =
    elapsedSeconds > bookedDurationSeconds
      ? elapsedSeconds
      : bookedDurationSeconds;

  const extraTimeSeconds = Math.max(
    0,
    actualDurationSeconds -
      bookedDurationSeconds,
  );

  const hasExtraTime = extraTimeSeconds >= 60;

  return (
    <View style={styles.screen}>
      {/* ====================================================
          FIXED HEADER
          ==================================================== */}

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
          <Text style={styles.headerSmall}>
            BOOKING
          </Text>

          <Text style={styles.headerTitle}>
            Completed
          </Text>
        </View>

        <View style={styles.completedPill}>
          <Text style={styles.completedPillText}>
            DONE
          </Text>
        </View>
      </View>

      {/* ====================================================
          SCROLLABLE CONTENT
          ==================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Math.max(insets.bottom, 18) + 105,
          },
        ]}
      >
        {/* ==================================================
            SUCCESS ILLUSTRATION
            ================================================== */}

        <View style={styles.illustration}>
          <View style={styles.illustrationOuter}>
            <View style={styles.illustrationInner}>
              <Text style={styles.check}>✓</Text>
            </View>
          </View>

          <View
            style={[
              styles.spark,
              styles.sparkTop,
            ]}
          />

          <View
            style={[
              styles.spark,
              styles.sparkRight,
            ]}
          />

          <View
            style={[
              styles.spark,
              styles.sparkBottom,
            ]}
          />
        </View>

        {/* ==================================================
            TITLE
            ================================================== */}

        <Text style={styles.mainTitle}>
          Service completed!
        </Text>

        <Text style={styles.subtitle}>
          Your HomeHelp service has been
          successfully completed.
        </Text>

        {/* ==================================================
            HELPER CARD
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

              <Text style={styles.rating}>
                4.8
              </Text>

              <View style={styles.verifiedWrap}>
                <Text style={styles.verifiedCheck}>
                  ✓
                </Text>

                <Text style={styles.verifiedText}>
                  Verified Help
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>
              COMPLETED
            </Text>
          </View>
        </View>

        {/* ==================================================
            SERVICE SUMMARY
            ================================================== */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryEyebrow}>
                SERVICE SUMMARY
              </Text>

              <Text style={styles.summaryTitle}>
                Final Summary
              </Text>
            </View>

            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>
                ✓ DONE
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <SummaryRow
            label="Service"
            value={serviceText}
          />

          <SummaryRow
            label="Total duration"
            value={formatDuration(
              actualDurationSeconds,
            )}
          />

          <SummaryRow
            label="Extra time"
            value={
              hasExtraTime
                ? formatDuration(
                    extraTimeSeconds,
                  )
                : "None"
            }
          />

          <SummaryRow
            label="Completed"
            value={
              completedAt
                ? completedAt.toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )
                : "—"
            }
          />

          <SummaryRow
            label="Amount"
            value={`₹${totalPrice.toLocaleString(
              "en-IN",
            )}`}
            strong
            last
          />
        </View>

        {/* ==================================================
            BILL CTA
            ================================================== */}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Bill and Payment"
          onPress={onViewBill}
          style={({ pressed }) => [
            styles.billButton,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.billButtonIcon}>
            <Text style={styles.billIconText}>
              ₹
            </Text>
          </View>

          <View style={styles.billButtonCopy}>
            <Text style={styles.billButtonTitle}>
              View Bill & Payment
            </Text>

            <Text style={styles.billButtonSubtitle}>
              Review your final bill and payment
            </Text>
          </View>

          <Text style={styles.billArrow}>
            →
          </Text>
        </Pressable>

        {/* ==================================================
            BOOK AGAIN
            ================================================== */}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Book Again"
          onPress={onBookAgain}
          style={({ pressed }) => [
            styles.bookAgainButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.bookAgainText}>
            Book Again
          </Text>
        </Pressable>

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

            <Text style={styles.chevron}>
              ⌄
            </Text>
          </View>

          <View style={styles.divider} />

          <SummaryRow
            label="Location"
            value={getAddressText(
              booking.customerAddress,
            )}
          />

          <SummaryRow
            label="Booked duration"
            value={formatDuration(
              bookedDurationSeconds,
            )}
          />

          <SummaryRow
            label="Total paid"
            value={`₹${totalPrice.toLocaleString(
              "en-IN",
            )}`}
            strong
            last
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* ============================================================
   SUMMARY ROW
   ============================================================ */

function SummaryRow({
  label,
  value,
  strong = false,
  last = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        !last && styles.summaryRowBorder,
      ]}
    >
      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.summaryValue,
          strong && styles.summaryValueStrong,
        ]}
      >
        {value}
      </Text>
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

  completedPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: COLORS.paleGreen,
  },

  completedPillText: {
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
    paddingTop: 18,
  },

  /* ========================================================
     ILLUSTRATION
     ======================================================== */

  illustration: {
    width: 100,
    height: 100,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  illustrationOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.paleGreenStrong,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDCCB",
  },

  illustrationInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },

  check: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    color: COLORS.white,
  },

  spark: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: COLORS.green,
    transform: [{ rotate: "45deg" }],
  },

  sparkTop: {
    top: 5,
    right: 22,
  },

  sparkRight: {
    right: 4,
    top: 53,
  },

  sparkBottom: {
    bottom: 8,
    left: 12,
  },

  /* ========================================================
     TITLE
     ======================================================== */

  mainTitle: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  subtitle: {
    maxWidth: 310,
    alignSelf: "center",
    marginTop: 6,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
  },

  /* ========================================================
     HELPER
     ======================================================== */

  helperCard: {
    minHeight: 76,
    marginTop: 18,
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
    marginLeft: 7,
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

  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: COLORS.paleGreen,
  },

  completedBadgeText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: COLORS.green,
  },

  /* ========================================================
     SUMMARY
     ======================================================== */

  summaryCard: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingTop: 13,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryHeader: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: COLORS.muted,
  },

  summaryTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  successBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: COLORS.paleGreen,
  },

  successBadgeText: {
    fontSize: 7,
    fontWeight: "900",
    color: COLORS.green,
  },

  divider: {
    height: 1,
    marginTop: 5,
    backgroundColor: COLORS.border,
  },

  summaryRow: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E9EDE8",
  },

  summaryLabel: {
    flex: 1,
    fontSize: 10,
    color: COLORS.muted,
  },

  summaryValue: {
    maxWidth: "62%",
    marginLeft: 10,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  summaryValueStrong: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.green,
  },

  /* ========================================================
     BILL BUTTON
     ======================================================== */

  billButton: {
    minHeight: 68,
    marginTop: 13,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
  },

  billButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  billIconText: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.white,
  },

  billButtonCopy: {
    flex: 1,
    marginLeft: 10,
  },

  billButtonTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.white,
  },

  billButtonSubtitle: {
    marginTop: 2,
    fontSize: 9,
    color: "#DCEDE5",
  },

  billArrow: {
    marginLeft: 8,
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.white,
  },

  /* ========================================================
     BOOK AGAIN
     ======================================================== */

  bookAgainButton: {
    height: 51,
    marginTop: 8,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },

  bookAgainText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.green,
  },

  /* ========================================================
     DETAILS
     ======================================================== */

  detailsCard: {
    marginTop: 10,
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

  pressed: {
    opacity: 0.78,
  },
});