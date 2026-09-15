import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { subscribeToBooking } from "../../../services/firebase/bookingService";
import { cancelCustomerBooking } from "../../../services/firebase/customerBookingLifecycleService";

import findingHero from "../../../../assets/CustomerUi/Customerbook/finding-help-hero.png";
import cleaningIcon from "../../../../assets/CustomerUi/Customerbook/cleaning.png";
import clockIcon from "../../../../assets/CustomerUi/Customerbook/clock.png";
import calendarIcon from "../../../../assets/CustomerUi/Customerbook/calendar.png";
import locationIcon from "../../../../assets/CustomerUi/Customerbook/location.png";

type BookingStatus =
  | "pending"
  | "assigned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_maid_found";

type Booking = {
  status?: BookingStatus;
  categories?: string[];
  duration?: number;
  scheduledDateTime?: unknown;
  totalPrice?: number;
  customerAddress?: {
    formatted?: string;
    landmark?: string;
  };
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

function getDate(value: unknown): Date | null {
  if (!value) return null;
  try {
    if (typeof (value as any)?.toDate === "function") {
      const date = (value as any).toDate();
      return Number.isNaN(date?.getTime?.()) ? null : date;
    }
    const date = new Date(value as any);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function formatDate(value: unknown) {
  const date = getDate(value);
  if (!date) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: unknown) {
  const date = getDate(value);
  if (!date) return "Time unavailable";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCategory(category?: string) {
  if (!category) return "Home Help";
  return category
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDuration(hours?: number) {
  const value = Number(hours ?? 0);
  if (!value) return "Flexible duration";
  return value === 1 ? "1 hour" : `${value} hours`;
}

function getBookingId(value: string | string[] | undefined) {
  return typeof value === "string" ? value : value?.[0] ?? "";
}

export default function FindingHelpScreen() {
  const { bookingId: routeBookingId } = useLocalSearchParams<{
    bookingId?: string | string[];
  }>();
  const bookingId = getBookingId(routeBookingId);
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!bookingId.trim()) {
      setError("Booking ID is missing.");
      setIsLoading(false);
      return () => {};
    }

    const unsubscribe = subscribeToBooking(
      bookingId,
      (value) => {
        setBooking(value as Booking | null);
        setError("");
        setIsLoading(false);
      },
      (listenerError) => {
        console.error("[FindingHelp] listener failed:", listenerError);
        setError(listenerError.message || "Unable to load booking.");
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [bookingId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const scheduledAt = getDate(booking?.scheduledDateTime);

  const canCancel = useMemo(() => {
    if (!booking || !scheduledAt) return false;
    if (!["pending", "assigned", "confirmed"].includes(booking.status ?? "pending")) {
      return false;
    }
    return scheduledAt.getTime() - now.getTime() > 60 * 60 * 1000;
  }, [booking, scheduledAt, now]);

  const category = formatCategory(booking?.categories?.[0]);
  const duration = formatDuration(booking?.duration);
  const address = booking?.customerAddress?.formatted || booking?.customerAddress?.landmark || "Location unavailable";
  const status = booking?.status ?? "pending";
  const isAssigned = status === "assigned";

  const handleCancel = async () => {
    if (!selectedReason || !bookingId) return;

    try {
      setIsCancelling(true);
      setError("");
      await cancelCustomerBooking(bookingId, selectedReason);
      setSelectedReason(null);
      setShowCancelSheet(false);
    } catch (cancelError) {
      console.error("[FindingHelp] cancel failed:", cancelError);
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
        <ActivityIndicator size="small" color="#526F5A" />
        <Text style={styles.loadingText}>Loading your booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.emptyTitle}>{error || "Booking not found"}</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/customer")}>
          <Text style={styles.primaryButtonText}>Go to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>HOMEHELP · BOOKING</Text>
          <Text style={styles.headerTitle}>Finding Help</Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: canCancel ? insets.bottom + 112 : insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroArea}>
          <View style={styles.heroGlow} />
          <Image source={findingHero} style={styles.heroImage} resizeMode="contain" />
        </View>

        <Text style={styles.title}>{isAssigned ? "Your request is on its way..." : "Finding the best Help for you..."}</Text>
        <Text style={styles.subtitle}>
          {isAssigned
            ? "Your booking request has been sent to available Helps nearby."
            : "We’re searching for available Helps near your location."}
        </Text>

        <View style={styles.bookingCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardEyebrow}>YOUR BOOKING</Text>
            <Text style={styles.price}>₹{Number(booking.totalPrice ?? 0).toLocaleString("en-IN")}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.iconBox}><Image source={cleaningIcon} style={styles.detailIcon} /></View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{category}</Text>
            </View>
            <Text style={styles.detailMeta}>{duration}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.iconBox}><Image source={calendarIcon} style={styles.detailIcon} /></View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking.scheduledDateTime)}</Text>
            </View>
            <Text style={styles.detailMeta}>{formatTime(booking.scheduledDateTime)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.iconBox}><Image source={locationIcon} style={styles.detailIcon} /></View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Your location</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchCardTop}>
            <View style={styles.searchIndicator}>
              <ActivityIndicator size="small" color="#52725B" />
            </View>
            <View style={styles.searchCopy}>
              <Text style={styles.searchTitle}>{isAssigned ? "Sending your request" : "Checking nearby Helps"}</Text>
              <Text style={styles.searchSubtitle}>This may take a few minutes...</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: isAssigned ? "78%" : "42%" }]} />
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepCheck}><Text style={styles.stepCheckText}>✓</Text></View>
            <Text style={styles.stepDone}>Finding nearby Helps</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, isAssigned && styles.stepDotActive]} />
            <Text style={[styles.stepText, isAssigned && styles.stepActive]}>Checking availability</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>Matching your requirements</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>Sending requests</Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}><Text style={styles.tipBulb}>i</Text></View>
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>Sit back, we’ve got it</Text>
            <Text style={styles.tipText}>We’ll keep checking and update this screen as soon as a Help responds.</Text>
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {canCancel && (
        <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable style={styles.cancelButton} onPress={() => setShowCancelSheet(true)}>
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={showCancelSheet} transparent animationType="slide" onRequestClose={() => setShowCancelSheet(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => setShowCancelSheet(false)} />
          <View style={[styles.cancelSheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Why do you want to cancel?</Text>
            <Text style={styles.sheetSubtitle}>Choose a reason so we can improve the experience.</Text>

            <View style={styles.reasonList}>
              {CANCEL_REASONS.map((reason) => {
                const selected = selectedReason === reason;
                return (
                  <Pressable key={reason} style={[styles.reasonRow, selected && styles.reasonRowSelected]} onPress={() => setSelectedReason(reason)}>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{reason}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              disabled={!selectedReason || isCancelling}
              style={[styles.confirmCancelButton, (!selectedReason || isCancelling) && styles.confirmCancelDisabled]}
              onPress={handleCancel}
            >
              {isCancelling ? <ActivityIndicator color="#F8F5ED" /> : <Text style={styles.confirmCancelText}>Cancel Booking</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F4EC" },
  centerScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F4EC", padding: 24 },
  loadingText: { marginTop: 12, color: "#637166", fontSize: 14 },
  emptyTitle: { color: "#26382D", fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  primaryButton: { backgroundColor: "#234C38", borderRadius: 18, paddingHorizontal: 24, paddingVertical: 14 },
  primaryButtonText: { color: "#FFFDF7", fontSize: 15, fontWeight: "700" },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "center", backgroundColor: "#F7F4EC", zIndex: 5 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#ECEBE2", alignItems: "center", justifyContent: "center" },
  backIcon: { color: "#26382D", fontSize: 32, lineHeight: 32, marginTop: -3 },
  headerCopy: { flex: 1, marginLeft: 12 },
  headerEyebrow: { color: "#718076", fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  headerTitle: { color: "#20372A", fontSize: 18, fontWeight: "800", marginTop: 2 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F0E7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#5A8A64" },
  liveText: { color: "#4E7257", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 2 },
  heroArea: { height: 215, alignItems: "center", justifyContent: "center", position: "relative" },
  heroGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#E7EFE4" },
  heroImage: { width: 280, height: 215 },
  title: { color: "#21372A", fontSize: 31, lineHeight: 36, fontWeight: "800", letterSpacing: -0.7, marginTop: 4 },
  subtitle: { color: "#6A776E", fontSize: 14, lineHeight: 21, marginTop: 9, maxWidth: 340 },
  bookingCard: { marginTop: 22, backgroundColor: "#FFFDF8", borderRadius: 25, padding: 18, borderWidth: 1, borderColor: "#E7E5DC" },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardEyebrow: { color: "#849087", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  price: { color: "#234C38", fontSize: 20, fontWeight: "800" },
  detailRow: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EDF2EA", alignItems: "center", justifyContent: "center" },
  detailIcon: { width: 19, height: 19, resizeMode: "contain" },
  detailCopy: { flex: 1, marginLeft: 12, paddingRight: 8 },
  detailLabel: { color: "#8A948D", fontSize: 10, fontWeight: "700", marginBottom: 2 },
  detailValue: { color: "#2B3B32", fontSize: 14, fontWeight: "700" },
  detailMeta: { color: "#637168", fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#EEECE4", marginVertical: 8 },
  searchCard: { marginTop: 14, backgroundColor: "#EAF1E8", borderRadius: 25, padding: 18 },
  searchCardTop: { flexDirection: "row", alignItems: "center" },
  searchIndicator: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F8FBF5", alignItems: "center", justifyContent: "center" },
  searchCopy: { flex: 1, marginLeft: 12 },
  searchTitle: { color: "#2B4936", fontSize: 15, fontWeight: "800" },
  searchSubtitle: { color: "#758278", fontSize: 12, marginTop: 3 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: "#D4DED2", marginTop: 17, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#557A5E" },
  stepRow: { flexDirection: "row", alignItems: "center", marginTop: 15 },
  stepCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#557A5E", alignItems: "center", justifyContent: "center" },
  stepCheckText: { color: "#FFFDF7", fontSize: 11, fontWeight: "900" },
  stepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#D4DDD2", borderWidth: 1, borderColor: "#C6D1C5" },
  stepDotActive: { backgroundColor: "#B9CDBA", borderColor: "#6D9272" },
  stepDone: { color: "#3D6048", fontSize: 12, fontWeight: "700", marginLeft: 10 },
  stepText: { color: "#88938B", fontSize: 12, fontWeight: "600", marginLeft: 10 },
  stepActive: { color: "#55705C", fontWeight: "700" },
  tipCard: { marginTop: 14, flexDirection: "row", backgroundColor: "#F0EDE2", borderRadius: 21, padding: 16 },
  tipIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFFDF7", alignItems: "center", justifyContent: "center" },
  tipBulb: { color: "#55735C", fontSize: 17, fontWeight: "900" },
  tipCopy: { flex: 1, marginLeft: 11 },
  tipTitle: { color: "#3C4D42", fontSize: 13, fontWeight: "800" },
  tipText: { color: "#78827B", fontSize: 11, lineHeight: 17, marginTop: 3 },
  errorText: { color: "#B42318", fontSize: 12, lineHeight: 17, marginTop: 12 },
  bottomAction: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#F7F4EC", paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E8E5DB" },
  cancelButton: { height: 52, borderRadius: 18, borderWidth: 1.2, borderColor: "#C9C8BF", alignItems: "center", justifyContent: "center", backgroundColor: "#FBF9F2" },
  cancelButtonText: { color: "#59645D", fontSize: 14, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(23,35,28,0.42)", justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  cancelSheet: { backgroundColor: "#FFFDF8", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: "#D8D6CD", marginBottom: 20 },
  sheetTitle: { color: "#26382D", fontSize: 21, fontWeight: "800" },
  sheetSubtitle: { color: "#7B857E", fontSize: 12, lineHeight: 18, marginTop: 5 },
  reasonList: { marginTop: 14 },
  reasonRow: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: 13, borderRadius: 15, marginBottom: 6, borderWidth: 1, borderColor: "#E9E6DD", backgroundColor: "#FBFAF4" },
  reasonRowSelected: { borderColor: "#9CB09D", backgroundColor: "#EDF3EB" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#AEB5AF", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: "#557A5E" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#557A5E" },
  reasonText: { flex: 1, color: "#647068", fontSize: 13, marginLeft: 10 },
  reasonTextSelected: { color: "#35513D", fontWeight: "700" },
  confirmCancelButton: { height: 52, borderRadius: 18, backgroundColor: "#234C38", alignItems: "center", justifyContent: "center", marginTop: 8 },
  confirmCancelDisabled: { opacity: 0.45 },
  confirmCancelText: { color: "#F8F5ED", fontSize: 14, fontWeight: "800" },
});
