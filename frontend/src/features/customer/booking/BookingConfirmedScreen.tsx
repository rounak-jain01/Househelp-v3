import React from "react";
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

import type { Booking, BookingStatus } from "./BookingWaitingTypes";

export type BookingScreenProps = {
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
};

const COLORS = {
  background: "#F7F4EC",
  card: "#FFFDF8",
  white: "#FFFFFF",
  green: "#0E624F",
  darkGreen: "#123F3E",
  text: "#142F32",
  muted: "#667576",
  lightGreen: "#E7F2EC",
  border: "#DDE5DF",
  gold: "#E8A21B",
  danger: "#9A5148",
};

function formatDate(date: Date | null) {
  if (!date) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: Date | null) {
  if (!date) return "Time unavailable";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function getBookingId(booking: Booking) {
  return (
    (
      booking as Booking & {
        id?: string;
      }
    ).id ?? ""
  );
}

export function BookingConfirmedScreen({
  booking,
  insets,
  otp,
  canCancel,
  scheduledAt,
  hoursUntilBooking,
  travelText,
  onCallHelp,
  onOpenCancel,
  error,
}: BookingScreenProps) {
  const maid = booking.maidDetails;
  const categories = booking.categories ?? [];
  const bookingId = getBookingId(booking);

  const totalPrice = Number(booking.totalPrice ?? 0);

  const serviceText =
    categories.length > 0
      ? categories.map(formatCategory).join(" • ")
      : "Home service";

  return (
    <View style={styles.screen}>
      {/* ------------------------------------------------ */}
      {/* FIXED HEADER                                      */}
      {/* ------------------------------------------------ */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 6,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerSmall}>BOOKING</Text>

          <Text style={styles.headerTitle}>Help Confirmed</Text>
        </View>

        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* ------------------------------------------------ */}
      {/* SCROLLABLE CONTENT                                */}
      {/* ------------------------------------------------ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 18) + 115,
          },
        ]}
      >
        {/* ---------------------------------------------- */}
        {/* HERO                                            */}
        {/* ---------------------------------------------- */}
        <View style={styles.hero}>
          {/* decorative dots */}
          <View style={[styles.confetti, styles.confettiOne]} />
          <View style={[styles.confetti, styles.confettiTwo]} />
          <View style={[styles.confetti, styles.confettiThree]} />
          <View style={[styles.confetti, styles.confettiFour]} />
          <View style={[styles.confetti, styles.confettiFive]} />
          <View style={[styles.confetti, styles.confettiSix]} />

          {/* helper photo */}
          <View style={styles.photoOuter}>
            {maid?.photoUrl ? (
              <Image
                source={{
                  uri: maid.photoUrl,
                }}
                style={styles.helperPhoto}
              />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.initials}>{getInitials(maid?.name)}</Text>
              </View>
            )}

            {/* verified check */}
            <View style={styles.photoCheck}>
              <Text style={styles.photoCheckText}>✓</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Your Help is confirmed!</Text>

          <Text style={styles.heroSubtitle}>
            {maid?.name
              ? `${maid.name} will arrive at your location soon.`
              : "Your Help will arrive at your location soon."}
          </Text>
        </View>

        {/* ---------------------------------------------- */}
        {/* HELPER CARD                                     */}
        {/* ---------------------------------------------- */}
        <View style={styles.helperCard}>
          <View style={styles.helperTop}>
            <View style={styles.helperIdentity}>
              <Text numberOfLines={1} style={styles.helperName}>
                {maid?.name || "Your Help"}
              </Text>

              <View style={styles.ratingRow}>
                <Text style={styles.star}>★</Text>

                <Text style={styles.rating}>4.8</Text>

                <View style={styles.verifiedInline}>
                  <Text style={styles.verifiedInlineCheck}>✓</Text>

                  <Text style={styles.verifiedInlineText}>Verified Help</Text>
                </View>
              </View>
            </View>

            {/* Call icon */}
            {maid?.phoneNumber ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call Help"
                style={({ pressed }) => [
                  styles.callIconButton,
                  pressed && styles.pressed,
                ]}
                onPress={onCallHelp}
              >
                <Text style={styles.phoneIcon}>☎</Text>
              </Pressable>
            ) : null}
          </View>

          

          <View style={styles.separator} />

          {/* services */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>≡</Text>
            </View>

            <View style={styles.infoCopy}>
              <Text style={styles.infoLabel}>SERVICES</Text>

              <Text style={styles.infoValue}>{serviceText}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* location */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>●</Text>
            </View>

            <View style={styles.infoCopy}>
              <Text style={styles.infoLabel}>YOUR LOCATION</Text>

              <Text numberOfLines={2} style={styles.infoValue}>
                {getAddressText(booking.customerAddress)}
              </Text>
            </View>
          </View>
        </View>

        {/* ---------------------------------------------- */}
        {/* BOOKING SUMMARY                                 */}
        {/* ---------------------------------------------- */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Date</Text>

              <Text style={styles.summaryValue}>{formatDate(scheduledAt)}</Text>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.summaryLabel}>Time</Text>

              <Text style={styles.summaryValue}>{formatTime(scheduledAt)}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Duration</Text>

              <Text style={styles.summaryValue}>
                {booking.duration ?? "—"} hour
                {(Number(booking.duration) || 0) !== 1 ? "s" : ""}
              </Text>
            </View>

            <View style={styles.summaryRight}>
              <Text style={styles.summaryLabel}>Total</Text>

              <Text style={styles.price}>
                ₹{totalPrice.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* ---------------------------------------------- */}
        {/* OTP — PRESERVED FROM EXISTING LOGIC             */}
        {/* ---------------------------------------------- */}
        {otp && !otp.usedAt ? (
          <View style={styles.otpCard}>
            <View style={styles.otpIcon}>
              <Text style={styles.otpIconText}>#</Text>
            </View>

            <View style={styles.otpCopy}>
              <Text style={styles.otpLabel}>START CODE</Text>

              <Text style={styles.otpTitle}>
                Share this when your Help arrives
              </Text>
            </View>

            <Text style={styles.otpValue}>{otp.otp}</Text>
          </View>
        ) : null}

        {/* ---------------------------------------------- */}
        {/* CALL HELP                                       */}
        {/* ---------------------------------------------- */}
        {maid?.phoneNumber ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Call Help"
            style={({ pressed }) => [
              styles.callButton,
              pressed && styles.pressed,
            ]}
            onPress={onCallHelp}
          >
            <Text style={styles.callButtonIcon}>☎</Text>

            <Text style={styles.callButtonText}>Call Help</Text>
          </Pressable>
        ) : null}

        {/* ---------------------------------------------- */}
        {/* CANCEL BOOKING                                  */}
        {/* ---------------------------------------------- */}
        {canCancel ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
            onPress={onOpenCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>

            {hoursUntilBooking !== null ? (
              <Text style={styles.cancelHint}>
                {hoursUntilBooking.toFixed(1)} hrs before start
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        {/* Error */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Something went wrong</Text>

            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Invisible booking route reference.
            Existing route logic still controls stage changes. */}
        {bookingId ? null : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* HEADER */
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
    backgroundColor: COLORS.lightGreen,
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

  /* CONTENT */
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },

  /* HERO */
  hero: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
    position: "relative",
  },

  photoOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 5,
    backgroundColor: "#E2E6E0",
    position: "relative",
  },

  helperPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 52,
    backgroundColor: "#E5E7E1",
  },

  photoFallback: {
    flex: 1,
    borderRadius: 52,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
  },

  initials: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.green,
  },

  photoCheck: {
    position: "absolute",
    right: -2,
    bottom: 4,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: COLORS.green,
    borderWidth: 3,
    borderColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  photoCheckText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
  },

  confetti: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  confettiOne: {
    top: 30,
    left: "22%",
    backgroundColor: "#62B59B",
  },

  confettiTwo: {
    top: 17,
    left: "40%",
    width: 5,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#F2B55C",
  },

  confettiThree: {
    top: 30,
    right: "25%",
    backgroundColor: "#59A892",
  },

  confettiFour: {
    top: 75,
    left: "16%",
    backgroundColor: "#F09C72",
  },

  confettiFive: {
    top: 76,
    right: "17%",
    width: 5,
    height: 8,
    borderRadius: 2,
    backgroundColor: "#6AB89D",
  },

  confettiSix: {
    top: 48,
    right: "11%",
    backgroundColor: "#F3B458",
  },

  heroTitle: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  heroSubtitle: {
    maxWidth: 310,
    marginTop: 4,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.muted,
  },

  /* HELPER CARD */
  helperCard: {
    backgroundColor: COLORS.card,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  helperTop: {
    flexDirection: "row",
    alignItems: "center",
  },


  helperIdentity: {
    flex: 1,
    marginLeft: 11,
  },

  helperName: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  star: {
    fontSize: 13,
    color: COLORS.gold,
  },

  rating: {
    marginLeft: 3,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  verifiedInline: {
    marginLeft: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  verifiedInlineCheck: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.green,
  },

  verifiedInlineText: {
    marginLeft: 3,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
  },

  callIconButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#BCD5CA",
    backgroundColor: "#F4F8F4",
    alignItems: "center",
    justifyContent: "center",
  },

  phoneIcon: {
    fontSize: 19,
    color: COLORS.green,
  },

  /* INFO ROWS */
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  infoIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
  },

  infoIconText: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: "900",
  },

  infoCopy: {
    flex: 1,
    marginLeft: 10,
  },

  infoLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: COLORS.muted,
  },

  infoValue: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  separator: {
    height: 1,
    backgroundColor: "#E8ECE7",
  },

  /* SUMMARY */
  summaryCard: {
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryRight: {
    alignItems: "flex-end",
    maxWidth: "55%",
  },

  summaryLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.muted,
  },

  summaryValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.darkGreen,
  },

  price: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  /* OTP */
  otpCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 17,
    backgroundColor: "#F1EEDF",
    borderWidth: 1,
    borderColor: "#E5DDC8",
    flexDirection: "row",
    alignItems: "center",
  },

  otpIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },

  otpIconText: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.green,
  },

  otpCopy: {
    flex: 1,
    marginLeft: 9,
  },

  otpLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: COLORS.muted,
  },

  otpTitle: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    color: COLORS.darkGreen,
  },

  otpValue: {
    marginLeft: 7,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 2,
    color: COLORS.green,
  },

  /* CALL */
  callButton: {
    height: 53,
    marginTop: 12,
    borderRadius: 15,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  callButtonIcon: {
    marginRight: 8,
    fontSize: 18,
    color: COLORS.white,
  },

  callButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.white,
  },

  /* CANCEL */
  cancelButton: {
    minHeight: 55,
    marginTop: 7,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.green,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  cancelHint: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.muted,
  },

  /* ERROR */
  errorCard: {
    marginTop: 10,
    padding: 13,
    borderRadius: 15,
    backgroundColor: "#FFF0ED",
    borderWidth: 1,
    borderColor: "#F1D2CC",
  },

  errorTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.danger,
  },

  errorText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#7D625D",
  },

  pressed: {
    opacity: 0.78,
  },
});
