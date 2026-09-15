import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";

import { subscribeToBooking } from "../../../services/firebase/bookingService";
import BookingWaitingScreen from "../BookingWaitingScreen";
import FindingHelpScreen from "./FindingHelpScreen";

type BookingStage = "entry" | "finding" | "confirmed" | "in-progress" | "terminal";
type BookingStatus =
  | "pending"
  | "assigned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_maid_found";

type BookingForRoute = { status?: BookingStatus; billing?: unknown } | null;

function stageForStatus(status: BookingStatus): Exclude<BookingStage, "entry"> {
  if (status === "pending" || status === "assigned") return "finding";
  if (status === "confirmed") return "confirmed";
  if (status === "in_progress") return "in-progress";
  return "terminal";
}

function routeForStage(bookingId: string, stage: Exclude<BookingStage, "entry">) {
  const base = `/customer/booking/${bookingId}`;
  if (stage === "finding") return `${base}/finding`;
  if (stage === "confirmed") return `${base}/confirmed`;
  if (stage === "in-progress") return `${base}/in-progress`;
  return `${base}/terminal`;
}

export default function BookingWaitingStageRoute({ expectedStage }: { expectedStage: BookingStage }) {
  const { bookingId: routeBookingId } = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = typeof routeBookingId === "string" ? routeBookingId : routeBookingId?.[0] ?? "";

  useEffect(() => {
    if (!bookingId.trim()) return () => {};

    const unsubscribe = subscribeToBooking(
      bookingId,
      (value) => {
        const booking = value as BookingForRoute;
        if (!booking?.status) return;
        if (booking.status === "completed" && booking.billing) return;

        const targetStage = stageForStatus(booking.status);
        if (expectedStage === targetStage) return;

        router.replace(routeForStage(bookingId, targetStage));
      },
      (listenerError) => {
        console.error("[BookingWaitingStageRoute] listener failed:", listenerError);
      },
    );

    return unsubscribe;
  }, [bookingId, expectedStage]);

  if (expectedStage === "finding") {
    return <FindingHelpScreen />;
  }

  return <BookingWaitingScreen />;
}
