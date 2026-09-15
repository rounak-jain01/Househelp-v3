import React, { useMemo, useState } from "react";
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

type BookingExtraTimeScreenProps = {
  booking: Booking;
  insets: EdgeInsets;

  bookedSeconds: number;
  elapsedSeconds: number;

  isRequestingExtraTime: boolean;
  extraTimeError: string;

  onRequestExtraTime: (minutes: number) => void;
  onFinishService: () => void;
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
   HELPERS
   ============================================================ */

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

/* ============================================================
   SCREEN
   ============================================================ */

export function BookingExtraTimeScreen({
  booking,
  insets,
  bookedSeconds,
  elapsedSeconds,
  isRequestingExtraTime,
  extraTimeError,
  onRequestExtraTime,
  onFinishService,
}: BookingExtraTimeScreenProps) {
  const maid = booking.maidDetails;

  const [selectedMinutes, setSelectedMinutes] =
    useState<number | null>(null);

  const categories = booking.categories ?? [];

  const serviceText =
    categories.length > 0
      ? categories.map(formatCategory).join(" • ")
      : "Home service";

  /*
   * The completed amount is based on the existing booking
   * duration/price information.
   *
   * No pricing/Firebase logic is changed here.
   */
  const totalPrice = Number(
    booking.totalPrice ?? 0,
  );

  const completedMinutes = Math.round(
    Math.max(
      bookedSeconds,
      elapsedSeconds,
    ) / 60,
  );

  /*
   * Extra-time request handler.
   *
   * The actual lifecycle operation is still handled by
   * the existing parent callback.
   */
  const handleRequestExtraTime = () => {
    if (!selectedMinutes || isRequestingExtraTime) {
      return;
    }

    onRequestExtraTime(selectedMinutes);
  };

  return (
    <View style={styles.screen}>
      {/* ======================================================
          HEADER
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
          <Text style={styles.headerSmall}>
            BOOKING
          </Text>

          <Text style={styles.headerTitle}>
            Time Complete
          </Text>
        </View>

        <View style={styles.donePill}>
          <Text style={styles.donePillText}>
            DONE
          </Text>
        </View>
      </View>

      {/* ======================================================
          CONTENT
          ====================================================== */}

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

        <View style={styles.successIllustration}>
          <View style={styles.successCircle}>
            <Text style={styles.successCheck}>✓</Text>
          </View>

          <View
            style={[
              styles.smallSpark,
              styles.sparkOne,
            ]}
          />

          <View
            style={[
              styles.smallSpark,
              styles.sparkTwo,
            ]}
          />
        </View>

        {/* ==================================================
            TITLE
            ================================================== */}

        <Text style={styles.mainTitle}>
          Your booked time is complete!
        </Text>

        <Text style={styles.subtitle}>
          The booked service duration has ended.
          You can finish the service or request
          additional time.
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

            <View style={styles.helperMeta}>
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
                Completed Service
              </Text>
            </View>

            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>
                COMPLETED
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <SummaryRow
            label="Service"
            value={serviceText}
          />

          <SummaryRow
            label="Total completed"
            value={formatDuration(
              completedMinutes * 60,
            )}
          />

          <SummaryRow
            label="Amount so far"
            value={`₹${totalPrice.toLocaleString(
              "en-IN",
            )}`}
            last
          />
        </View>

        {/* ==================================================
            EXTRA TIME
            ================================================== */}

        <View style={styles.extraSection}>
          <Text style={styles.extraTitle}>
            Need more time?
          </Text>

          <Text style={styles.extraSubtitle}>
            Select how much additional time you
            need.
          </Text>

          <View style={styles.optionRow}>
            {/* 30 MIN */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add 30 minutes"
              onPress={() =>
                setSelectedMinutes(30)
              }
              style={({ pressed }) => [
                styles.timeOption,
                selectedMinutes === 30 &&
                  styles.timeOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.optionPlus,
                  selectedMinutes === 30 &&
                    styles.optionSelectedText,
                ]}
              >
                +
              </Text>

              <Text
                style={[
                  styles.optionMinutes,
                  selectedMinutes === 30 &&
                    styles.optionSelectedText,
                ]}
              >
                30
              </Text>

              <Text
                style={[
                  styles.optionUnit,
                  selectedMinutes === 30 &&
                    styles.optionSelectedText,
                ]}
              >
                MIN
              </Text>
            </Pressable>

            {/* 60 MIN */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add 60 minutes"
              onPress={() =>
                setSelectedMinutes(60)
              }
              style={({ pressed }) => [
                styles.timeOption,
                selectedMinutes === 60 &&
                  styles.timeOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.optionPlus,
                  selectedMinutes === 60 &&
                    styles.optionSelectedText,
                ]}
              >
                +
              </Text>

              <Text
                style={[
                  styles.optionMinutes,
                  selectedMinutes === 60 &&
                    styles.optionSelectedText,
                ]}
              >
                60
              </Text>

              <Text
                style={[
                  styles.optionUnit,
                  selectedMinutes === 60 &&
                    styles.optionSelectedText,
                ]}
              >
                MIN
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ==================================================
            REQUEST BUTTON
            ================================================== */}

        <Pressable
          disabled={
            !selectedMinutes ||
            isRequestingExtraTime
          }
          accessibilityRole="button"
          accessibilityLabel="Request extra time"
          onPress={handleRequestExtraTime}
          style={({ pressed }) => [
  styles.requestButton,
  (!selectedMinutes || isRequestingExtraTime) &&
    styles.requestButtonDisabled,
  pressed && !!selectedMinutes && styles.pressed,
]}
        >
          <Text
            style={[
              styles.requestButtonText,
              (!selectedMinutes ||
                isRequestingExtraTime) &&
                styles.requestButtonTextDisabled,
            ]}
          >
            {isRequestingExtraTime
              ? "Requesting..."
              : selectedMinutes
                ? `Request ${selectedMinutes} Minutes`
                : "Select Extra Time"}
          </Text>

          <Text
            style={[
              styles.requestArrow,
              (!selectedMinutes ||
                isRequestingExtraTime) &&
                styles.requestButtonTextDisabled,
            ]}
          >
            →
          </Text>
        </Pressable>

        {/* ==================================================
            ERROR
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
            FINISH SERVICE
            ================================================== */}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Finish service"
          onPress={onFinishService}
          style={({ pressed }) => [
            styles.finishButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.finishButtonText}>
            Finish Service
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

          <View style={styles.detailsDivider} />

          <SummaryRow
            label="Location"
            value={getAddressText(
              booking.customerAddress,
            )}
          />

          <SummaryRow
            label="Duration"
            value={formatDuration(
              bookedSeconds,
            )}
          />

          <SummaryRow
            label="Total"
            value={`₹${totalPrice.toLocaleString(
              "en-IN",
            )}`}
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
  last = false,
}: {
  label: string;
  value: string;
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
        style={styles.summaryValue}
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

  donePill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: COLORS.paleGreen,
  },

  donePillText: {
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
     SUCCESS
     ======================================================== */

  successIllustration: {
    width: 86,
    height: 86,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 2,
  },

  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.paleGreenStrong,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDCCB",
  },

  successCheck: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    color: COLORS.green,
  },

  smallSpark: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: COLORS.green,
  },

  sparkOne: {
    top: 8,
    right: 8,
    transform: [{ rotate: "45deg" }],
  },

  sparkTwo: {
    bottom: 12,
    left: 6,
    transform: [{ rotate: "45deg" }],
  },

  /* ========================================================
     TITLE
     ======================================================== */

  mainTitle: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  subtitle: {
    maxWidth: 320,
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

  helperMeta: {
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

  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: COLORS.paleGreen,
  },

  completedBadgeText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: COLORS.green,
  },

  summaryDivider: {
    height: 1,
    marginTop: 5,
    backgroundColor: COLORS.border,
  },

  summaryRow: {
    minHeight: 48,
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
    fontWeight: "900",
    color: COLORS.text,
  },

  /* ========================================================
     EXTRA TIME
     ======================================================== */

  extraSection: {
    marginTop: 18,
  },

  extraTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  extraSubtitle: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 10,
    color: COLORS.muted,
  },

  optionRow: {
    marginTop: 11,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },

  timeOption: {
    width: 104,
    height: 76,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  timeOptionSelected: {
    backgroundColor: COLORS.paleGreen,
    borderColor: COLORS.green,
    borderWidth: 1.5,
  },

  optionPlus: {
    position: "absolute",
    top: 9,
    left: 13,
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.green,
  },

  optionMinutes: {
    fontSize: 23,
    lineHeight: 25,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  optionUnit: {
    marginTop: 1,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.muted,
  },

  optionSelectedText: {
    color: COLORS.green,
  },

  /* ========================================================
     BUTTONS
     ======================================================== */

  requestButton: {
    height: 53,
    marginTop: 13,
    borderRadius: 15,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  requestButtonDisabled: {
    backgroundColor: COLORS.disabled,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  requestButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.white,
  },

  requestButtonTextDisabled: {
    color: COLORS.muted,
  },

  requestArrow: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.white,
  },

  finishButton: {
    height: 51,
    marginTop: 8,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },

  finishButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.green,
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

  detailsDivider: {
    height: 1,
    marginTop: 5,
    backgroundColor: COLORS.border,
  },

  pressed: {
    opacity: 0.78,
  },
});