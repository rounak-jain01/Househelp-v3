import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "@react-native-firebase/auth";
import {
  doc,
  getFirestore,
  onSnapshot,
} from "@react-native-firebase/firestore";

/* ============================================================
   TYPES
   ============================================================ */

type Billing = {
  baseAmount?: number;
  extraTimeMinutes?: number;
  extraTimeAmount?: number;
  totalAmount?: number;
};

type Booking = {
  customerId?: string;

  maidDetails?: {
    name?: string;
  };

  categories?: string[];

  duration?: number;

  scheduledDateTime?: unknown;

  status?: string;

  billing?: Billing;

  paymentStatus?: "pending" | "received";

  paymentMethod?: "cash" | "upi" | null;
};

/* ============================================================
   COLORS
   ============================================================ */

const COLORS = {
  background: "#F7F4EC",
  card: "#FFFDF8",

  darkGreen: "#123F3E",
  green: "#08785D",
  greenDark: "#075B48",

  text: "#142F32",
  muted: "#687777",

  border: "#DDE5DF",

  paleGreen: "#E7F3EC",
  paleGreenStrong: "#D9EDE2",

  white: "#FFFFFF",

  yellow: "#E5A51A",
  paleYellow: "#FFF4D9",

  red: "#D95B55",
  paleRed: "#FBE9E6",
};

/* ============================================================
   HELPERS
   ============================================================ */

function money(value: unknown) {
  const n = Number(value);

  return Number.isFinite(n) ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—";
}

function formatCategory(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getServiceName(booking: Booking) {
  const categories = booking.categories ?? [];

  if (!categories.length) {
    return "Home Service";
  }

  return categories.map(formatCategory).join(" • ");
}

function getDurationText(booking: Booking) {
  const duration = Number(booking.duration ?? 0);

  if (!duration) {
    return "—";
  }

  return `${duration} ${duration === 1 ? "hour" : "hours"}`;
}

/* ============================================================
   MAIN SCREEN
   ============================================================ */

export default function CustomerBillingRoute() {
  const { bookingId: routeBookingId } = useLocalSearchParams<{
    bookingId: string | string[];
  }>();

  const bookingId =
    typeof routeBookingId === "string"
      ? routeBookingId
      : (routeBookingId?.[0] ?? "");

  const [booking, setBooking] = useState<Booking | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* ==========================================================
     FIREBASE LISTENER
     ========================================================== */

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;

    if (!uid || !bookingId) {
      setError("Unable to load bill.");

      setLoading(false);

      return;
    }

    const unsubscribe = onSnapshot(
      doc(getFirestore(), "bookings", bookingId),
      (snap) => {
        if (!snap.exists()) {
          setError("Booking not found.");

          setLoading(false);

          return;
        }

        const data = snap.data() as Booking;

        /*
         * Keep existing ownership
         * validation.
         */

        if (data.customerId !== uid) {
          setError("You do not have access to this bill.");

          setLoading(false);

          return;
        }

        setBooking(data);

        setError("");

        setLoading(false);
      },
      (listenerError) => {
        console.error("[CustomerBilling] Listener failed:", listenerError);

        setError(listenerError.message || "Unable to load bill.");

        setLoading(false);
      },
    );

    return unsubscribe;
  }, [bookingId]);

  /* ==========================================================
     LOADING STATE
     ========================================================== */

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <Text style={styles.loadingIconText}>₹</Text>
        </View>

        <ActivityIndicator
          size="small"
          color={COLORS.green}
          style={{
            marginTop: 15,
          }}
        />

        <Text style={styles.loadingText}>Preparing your bill...</Text>
      </View>
    );
  }

  /* ==========================================================
     BILL UNAVAILABLE
     ========================================================== */

  if (!booking || !booking.billing) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>₹</Text>
        </View>

        <Text style={styles.emptyTitle}>Bill not available</Text>

        <Text style={styles.emptyText}>
          {error || "Your final bill is not available yet."}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace("/customer")}
        >
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  const billing = booking.billing;

  const serviceName = getServiceName(booking);

  const durationText = getDurationText(booking);

  const extraTimeMinutes = Number(billing.extraTimeMinutes ?? 0);

  const extraTimeAmount = Number(billing.extraTimeAmount ?? 0);

  const baseAmount = Number(billing.baseAmount ?? 0);

  const totalAmount = Number(billing.totalAmount ?? 0);

  const isPaid = booking.paymentStatus === "received";

  /* ==========================================================
     MAIN BILL UI
     ========================================================== */

  return (
    <View style={styles.screen}>
      {/* ======================================================
          FIXED HEADER
          ====================================================== */}

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>HOMEHELP</Text>

          <Text style={styles.headerTitle}>Bill & Payment</Text>
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
             * Persistent bottom navigation
             * ke liye extra space.
             */
            paddingBottom: 105,
          },
        ]}
      >
        {/* ==================================================
            PAYMENT SUCCESS HERO
            ================================================== */}

        <View style={styles.successHero}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>

          <View style={styles.successContent}>
            <Text style={styles.successTitle}>Service completed</Text>

            <Text style={styles.successSubtitle}>
              Your final bill is ready.
            </Text>
          </View>
        </View>

        {/* ==================================================
            HELPER CARD
            ================================================== */}

        <View style={styles.helperCard}>
          <View style={styles.helperAvatar}>
            <Text style={styles.helperAvatarText}>
              {(booking.maidDetails?.name || "H").charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.helperContent}>
            <Text style={styles.helperLabel}>YOUR HELP</Text>

            <Text style={styles.helperName}>
              {booking.maidDetails?.name || "Help"}
            </Text>

            <Text style={styles.helperService}>{serviceName}</Text>
          </View>

          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>DONE</Text>
          </View>
        </View>

        {/* ==================================================
            TOTAL AMOUNT CARD
            ================================================== */}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>

          <Text style={styles.totalAmount}>{money(totalAmount)}</Text>

          <View style={styles.totalDivider} />

          <View style={styles.totalMetaRow}>
            <View>
              <Text style={styles.metaLabel}>Service duration</Text>

              <Text style={styles.metaValue}>{durationText}</Text>
            </View>

            <View style={styles.totalMetaRight}>
              <Text style={styles.metaLabel}>Extra time</Text>

              <Text style={styles.metaValue}>
                {extraTimeMinutes > 0 ? `${extraTimeMinutes} min` : "None"}
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            BILL BREAKDOWN
            ================================================== */}

        <Text style={styles.sectionTitle}>Bill details</Text>

        <View style={styles.breakdownCard}>
          <BillRow label="Base amount" value={money(baseAmount)} />

          <BillRow
            label="Extra time"
            value={extraTimeMinutes > 0 ? `${extraTimeMinutes} min` : "0 min"}
          />

          <BillRow label="Extra time amount" value={money(extraTimeAmount)} />

          <View style={styles.divider} />

          <BillRow label="Total" value={money(totalAmount)} strong />
        </View>

        {/* ==================================================
            PAYMENT STATUS
            ================================================== */}

        <Text style={styles.sectionTitle}>Payment</Text>

        <View style={styles.paymentCard}>
          <View style={styles.paymentIcon}>
            <Text style={styles.paymentIconText}>₹</Text>
          </View>

          <View style={styles.paymentContent}>
            <Text style={styles.paymentLabel}>Payment status</Text>

            <Text style={styles.paymentValue}>
              {isPaid ? "Payment received" : "Payment pending"}
            </Text>

            {booking.paymentMethod ? (
              <Text style={styles.paymentMethod}>
                Method: {booking.paymentMethod.toUpperCase()}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.paymentBadge,
              isPaid ? styles.paidBadge : styles.pendingBadge,
            ]}
          >
            <Text
              style={[
                styles.paymentBadgeText,
                isPaid ? styles.paidText : styles.pendingText,
              ]}
            >
              {isPaid ? "PAID" : "PENDING"}
            </Text>
          </View>
        </View>

        {/* ==================================================
            PAYMENT NOTE
            ================================================== */}

        <View style={styles.noteCard}>
          <View style={styles.noteIcon}>
            <Text style={styles.noteIconText}>i</Text>
          </View>

          <Text style={styles.noteText}>
            No online payment gateway is used. This is your final billing
            summary.
          </Text>
        </View>

        {/* ==================================================
            BACK HOME
            ================================================== */}

        <Pressable
          style={({ pressed }) => [
            styles.homeButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          onPress={() => router.replace("/customer")}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/* ============================================================
   BILL ROW
   ============================================================ */

function BillRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, strong && styles.billLabelStrong]}>
        {label}
      </Text>

      <Text style={[styles.billValue, strong && styles.billValueStrong]}>
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
    minHeight: 76,
    paddingHorizontal: 18,
    paddingTop: 7,
    paddingBottom: 10,
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

  headerEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.6,
    color: COLORS.green,
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  /* ========================================================
     CONTENT
     ======================================================== */

  content: {
    paddingHorizontal: 18,
    paddingTop: 13,
  },

  /* ========================================================
     SUCCESS HERO
     ======================================================== */

  successHero: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.paleGreen,
    borderWidth: 1,
    borderColor: "#D4E8DC",
  },

  successIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.green,
  },

  successIconText: {
    color: COLORS.white,
    fontSize: 25,
    lineHeight: 28,
    fontWeight: "900",
  },

  successContent: {
    flex: 1,
    marginLeft: 11,
  },

  successTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  successSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.muted,
  },

  /* ========================================================
     HELPER
     ======================================================== */

  helperCard: {
    marginTop: 10,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  helperAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paleGreenStrong,
  },

  helperAvatarText: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.green,
  },

  helperContent: {
    flex: 1,
    marginLeft: 10,
  },

  helperLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.muted,
  },

  helperName: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },

  helperService: {
    marginTop: 1,
    fontSize: 9.5,
    color: COLORS.muted,
  },

  completedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.paleGreen,
  },

  completedBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: COLORS.green,
  },

  /* ========================================================
     TOTAL
     ======================================================== */

  totalCard: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 15,
    borderRadius: 19,
    backgroundColor: COLORS.darkGreen,
  },

  totalLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#A9C4B8",
    textAlign: "center",
  },

  totalAmount: {
    marginTop: 4,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: COLORS.white,
    textAlign: "center",
  },

  totalDivider: {
    height: 1,
    marginTop: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  totalMetaRow: {
    marginTop: 11,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  totalMetaRight: {
    alignItems: "flex-end",
  },

  metaLabel: {
    fontSize: 8,
    color: "#A9C4B8",
  },

  metaValue: {
    marginTop: 2,
    fontSize: 10.5,
    fontWeight: "800",
    color: COLORS.white,
  },

  /* ========================================================
     SECTION
     ======================================================== */

  sectionTitle: {
    marginTop: 17,
    marginBottom: 7,
    paddingHorizontal: 2,
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.darkGreen,
  },

  /* ========================================================
     BREAKDOWN
     ======================================================== */

  breakdownCard: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  billRow: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  billLabel: {
    flex: 1,
    fontSize: 11,
    color: COLORS.muted,
  },

  billValue: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  billLabelStrong: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.text,
  },

  billValueStrong: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.green,
  },

  divider: {
    height: 1,
    backgroundColor: "#E7ECE8",
  },

  /* ========================================================
     PAYMENT
     ======================================================== */

  paymentCard: {
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paleGreen,
  },

  paymentIconText: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.green,
  },

  paymentContent: {
    flex: 1,
    marginLeft: 10,
  },

  paymentLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.muted,
  },

  paymentValue: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.text,
  },

  paymentMethod: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.muted,
  },

  paymentBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  paidBadge: {
    backgroundColor: COLORS.paleGreen,
  },

  pendingBadge: {
    backgroundColor: COLORS.paleYellow,
  },

  paymentBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  paidText: {
    color: COLORS.green,
  },

  pendingText: {
    color: "#A36E05",
  },

  /* ========================================================
     NOTE
     ======================================================== */

  noteCard: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.paleYellow,
  },

  noteIcon: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.yellow,
  },

  noteIconText: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.white,
  },

  noteText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 9.5,
    lineHeight: 14,
    color: "#756542",
  },

  /* ========================================================
     HOME BUTTON
     ======================================================== */

  homeButton: {
    height: 51,
    marginTop: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.green,
  },

  homeButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.white,
  },

  pressed: {
    opacity: 0.78,
  },

  /* ========================================================
     CENTER STATES
     ======================================================== */

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    backgroundColor: COLORS.background,
  },

  loadingIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paleGreen,
  },

  loadingIconText: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.green,
  },

  loadingText: {
    marginTop: 9,
    fontSize: 11,
    color: COLORS.muted,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.paleYellow,
  },

  emptyIconText: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.yellow,
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.darkGreen,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
    textAlign: "center",
  },

  primaryButton: {
    minWidth: 170,
    height: 50,
    marginTop: 18,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.green,
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.white,
  },
});
