import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { subscribeToBooking } from "../../services/firebase/bookingService";

import {
  cancelCustomerBooking,
  requestExtraTime,
  subscribeToCustomerStartOtp,
  type CustomerStartOtp,
} from "../../services/firebase/customerBookingLifecycleService";

import {
  CANCEL_REASONS,
  type Booking,
  type BookingStatus,
  type CancelReason,
} from "./booking/BookingWaitingTypes";

import { getDate, getStatusIndex } from "./booking/BookingWaitingUtils";

import { styles } from "./booking/BookingWaitingStyles";

import { BookingCancelSheet } from "./booking/BookingWaitingShared";

import { BookingFindingScreen } from "./booking/BookingFindingScreen";

import { BookingConfirmedScreen } from "./booking/BookingConfirmedScreen";

import { BookingInProgressScreen } from "./booking/BookingInProgressScreen";

import { BookingTerminalScreen } from "./booking/BookingTerminalScreen";

import { BookingCompletedScreen } from "./booking/BookingCompletedScreen";

export default function BookingWaitingScreen() {
  /*
   * ---------------------------------------------------------
   * ROUTE PARAMS
   * ---------------------------------------------------------
   */

  const { bookingId: routeBookingId } = useLocalSearchParams<{
    bookingId?: string | string[];
  }>();

  const bookingId =
    typeof routeBookingId === "string"
      ? routeBookingId
      : (routeBookingId?.[0] ?? "");

  /*
   * ---------------------------------------------------------
   * SAFE AREA
   * ---------------------------------------------------------
   */

  const insets = useSafeAreaInsets();

  /*
   * ---------------------------------------------------------
   * STATE
   * ---------------------------------------------------------
   */

  const [booking, setBooking] = useState<Booking | null>(null);

  const [otp, setOtp] = useState<CustomerStartOtp | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState("");

  const [now, setNow] = useState(() => new Date());

  const [isRequestingExtraTime, setIsRequestingExtraTime] = useState(false);

  const [extraTimeError, setExtraTimeError] = useState("");

  const [showCancelSheet, setShowCancelSheet] = useState(false);

  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(
    null,
  );

  const [isCancelling, setIsCancelling] = useState(false);

  /*
   * ---------------------------------------------------------
   * BOOKING LISTENER
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * Do NOT redirect completed bookings to billing here.
   *
   * Completed booking must first render the new
   * BookingCompletedScreen.
   *
   * The Completed screen itself handles:
   * View Bill -> billing screen
   * Book Again -> book screen
   *
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!bookingId.trim()) {
      setError("Booking ID is missing.");

      setIsLoading(false);

      return () => {};
    }

    const unsubscribe = subscribeToBooking(
      bookingId,
      (value) => {
        const updated = value as Booking | null;

        setBooking(updated);

        setError("");

        setIsLoading(false);
      },
      (listenerError) => {
        console.error("[BookingWaiting] listener failed:", listenerError);

        setError(listenerError.message || "Unable to load booking.");

        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [bookingId]);

  /*
   * ---------------------------------------------------------
   * CUSTOMER START OTP LISTENER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!bookingId.trim()) {
      return () => {};
    }

    const unsubscribe = subscribeToCustomerStartOtp(
      bookingId,
      setOtp,
      (otpError) => {
        console.error("[BookingWaiting] OTP listener failed:", otpError);
      },
    );

    return unsubscribe;
  }, [bookingId]);

  /*
   * ---------------------------------------------------------
   * CLOCK
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * BOOKING STATUS
   * ---------------------------------------------------------
   */

  const status = booking?.status ?? "pending";

  const statusIndex = getStatusIndex(status);

  /*
   * ---------------------------------------------------------
   * IMPORTANT DATES
   * ---------------------------------------------------------
   */

  const scheduledAt = getDate(booking?.scheduledDateTime);

  const startDate = getDate(booking?.startedAt);

  /*
   * ---------------------------------------------------------
   * SERVICE DURATION
   * ---------------------------------------------------------
   */

  const durationHours = Number(booking?.duration ?? 0);

  const originalBookedMinutes = durationHours * 60;

  const approvedExtraMinutes = Number(booking?.approvedExtraMinutes ?? 0);

  const configuredTotalMinutes = Number(booking?.totalDurationMinutes ?? 0);

  /*
   * If Firebase already contains totalDurationMinutes,
   * use that value.
   *
   * Otherwise:
   *
   * original duration + approved extra time
   */

  const totalBookedMinutes =
    configuredTotalMinutes > 0
      ? configuredTotalMinutes
      : originalBookedMinutes + approvedExtraMinutes;

  /*
   * ---------------------------------------------------------
   * BOOKED SECONDS
   * ---------------------------------------------------------
   */

  const bookedSeconds = Math.max(0, totalBookedMinutes * 60);

  /*
   * ---------------------------------------------------------
   * ELAPSED SECONDS
   * ---------------------------------------------------------
   */

  const elapsedSeconds = startDate
    ? Math.max(0, (now.getTime() - startDate.getTime()) / 1000)
    : 0;

  /*
   * ---------------------------------------------------------
   * REMAINING SECONDS
   * ---------------------------------------------------------
   */

  const remainingSeconds = Math.max(0, bookedSeconds - elapsedSeconds);

  /*
   * ---------------------------------------------------------
   * PROGRESS
   * ---------------------------------------------------------
   */

  const progress =
    bookedSeconds > 0 ? Math.min(1, elapsedSeconds / bookedSeconds) : 0;

  /*
   * ---------------------------------------------------------
   * TIME FINISHED
   * ---------------------------------------------------------
   */

  const timeFinished = status === "in_progress" && remainingSeconds <= 0;

  /*
   * ---------------------------------------------------------
   * EXTRA TIME
   * ---------------------------------------------------------
   */

  const canRequestExtra =
    status === "in_progress" &&
    timeFinished &&
    booking?.extraTimeStatus !== "requested" &&
    booking?.extraTimeStatus !== "accepted" &&
    !isRequestingExtraTime;

  /*
   * ---------------------------------------------------------
   * CANCEL AVAILABILITY
   * ---------------------------------------------------------
   */

  const canCancel = useMemo(() => {
    if (!booking || !scheduledAt) {
      return false;
    }

    if (!["pending", "assigned", "confirmed"].includes(status)) {
      return false;
    }

    return scheduledAt.getTime() - now.getTime() > 60 * 60 * 1000;
  }, [booking, scheduledAt, status, now]);

  /*
   * ---------------------------------------------------------
   * HOURS UNTIL BOOKING
   * ---------------------------------------------------------
   */

  const hoursUntilBooking = scheduledAt
    ? Math.max(0, (scheduledAt.getTime() - now.getTime()) / (60 * 60 * 1000))
    : null;

  /*
   * ---------------------------------------------------------
   * TRAVEL INFORMATION
   * ---------------------------------------------------------
   */

  const travelText =
    booking?.maidDetails?.distanceText && booking?.maidDetails?.etaText
      ? `${booking.maidDetails.distanceText} away · ${booking.maidDetails.etaText}`
      : booking?.maidDetails?.distanceText ||
        booking?.maidDetails?.etaText ||
        "Travel estimate unavailable";

  /*
   * ---------------------------------------------------------
   * CALL HELP
   * ---------------------------------------------------------
   */

  const handleCallHelp = async () => {
    const phone = booking?.maidDetails?.phoneNumber;

    if (!phone) {
      return;
    }

    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (callError) {
      console.error("[BookingWaiting] call failed:", callError);
    }
  };

  /*
   * ---------------------------------------------------------
   * EXTRA TIME REQUEST
   * ---------------------------------------------------------
   */

  const handleExtraTimeRequest = async (minutes: number) => {
    if (!bookingId) {
      return;
    }

    try {
      setExtraTimeError("");

      setIsRequestingExtraTime(true);

      await requestExtraTime(bookingId, minutes);
    } catch (requestError) {
      console.error("[BookingWaiting] extra time failed:", requestError);

      setExtraTimeError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request extra time.",
      );
    } finally {
      setIsRequestingExtraTime(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * CANCEL BOOKING
   * ---------------------------------------------------------
   */

  const handleCancel = async () => {
    if (!selectedReason) {
      return;
    }

    try {
      setError("");

      setIsCancelling(true);

      await cancelCustomerBooking(bookingId, selectedReason);

      setSelectedReason(null);

      setShowCancelSheet(false);
    } catch (cancelError) {
      console.error("[BookingWaiting] cancel failed:", cancelError);

      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel the booking.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

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
          style={{
            marginTop: 14,
          }}
        />

        <Text style={styles.loadingText}>Loading your booking...</Text>
      </View>
    );
  }

  /*
   * ---------------------------------------------------------
   * BOOKING NOT FOUND
   * ---------------------------------------------------------
   */

  if (!booking) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.emptyTitle}>{error || "Booking not found"}</Text>
      </View>
    );
  }

  /*
   * ---------------------------------------------------------
   * COMMON SCREEN PROPS
   * ---------------------------------------------------------
   */

  const screenProps = {
    booking,
    status,
    statusIndex,
    insets,
    otp,
    canCancel,
    scheduledAt,
    hoursUntilBooking,
    travelText,
    onCallHelp: handleCallHelp,
    onOpenCancel: () => setShowCancelSheet(true),
    error,
  };

  /*
   * ---------------------------------------------------------
   * SCREEN RENDERING
   * ---------------------------------------------------------
   */

  return (
    <>
      {/*
       * -----------------------------------------------------
       * FINDING HELP
       * -----------------------------------------------------
       */}

      {status === "pending" || status === "assigned" ? (
        <BookingFindingScreen {...screenProps} />
      ) : status === "confirmed" ? (
        /*
         * ---------------------------------------------------
         * HELP CONFIRMED
         * ---------------------------------------------------
         */

        <BookingConfirmedScreen {...screenProps} />
      ) : status === "in_progress" ? (
        /*
         * ---------------------------------------------------
         * SERVICE IN PROGRESS
         * ---------------------------------------------------
         */

        <BookingInProgressScreen
          {...screenProps}
          remainingSeconds={remainingSeconds}
          progress={progress}
          elapsedSeconds={elapsedSeconds}
          bookedSeconds={bookedSeconds}
          timeFinished={timeFinished}
          canRequestExtra={canRequestExtra}
          isRequestingExtraTime={isRequestingExtraTime}
          extraTimeError={extraTimeError}
          onRequestExtraTime={handleExtraTimeRequest}
        />
      ) : status === "completed" ? (
        /*
         * ---------------------------------------------------
         * SERVICE COMPLETED
         * ---------------------------------------------------
         */

        <BookingCompletedScreen
          booking={booking}
          insets={insets}
          bookedSeconds={bookedSeconds}
          elapsedSeconds={elapsedSeconds}
          onViewBill={() => {
            router.replace(`/customer/billing/${bookingId}`);
          }}
          onBookAgain={() => {
            router.replace("/customer/book");
          }}
        />
      ) : (
        /*
         * ---------------------------------------------------
         * CANCELLED / NO HELP FOUND
         * ---------------------------------------------------
         */

        <BookingTerminalScreen {...screenProps} />
      )}

      {/*
       * -------------------------------------------------------
       * CANCEL BOOKING SHEET
       * -------------------------------------------------------
       */}

      <BookingCancelSheet
        visible={showCancelSheet}
        selectedReason={selectedReason}
        isCancelling={isCancelling}
        onSelectReason={setSelectedReason}
        onConfirm={handleCancel}
        onClose={() => setShowCancelSheet(false)}
        reasons={CANCEL_REASONS}
      />
    </>
  );
}
