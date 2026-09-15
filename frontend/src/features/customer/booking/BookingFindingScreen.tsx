import React from "react";
import type { EdgeInsets } from "react-native-safe-area-context";
import type { Booking, BookingStatus } from "./BookingWaitingTypes";
import { BookingWaitingShell, BookingStatusHero, BookingProgressTimeline, BookingHelpSection, BookingOtpSection, BookingDetailsSection, BookingContextSection, BookingCancelSection, BookingError, BookingTimerSection, BookingExtraTimeSection } from "./BookingWaitingShared";

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

export function BookingFindingScreen(props: BookingScreenProps) {
  return <BookingWaitingShell insets={props.insets} status={props.status}>
    <BookingStatusHero status={props.status} statusIndex={props.statusIndex} booking={props.booking} />
    <BookingProgressTimeline statusIndex={props.statusIndex} />
    <BookingDetailsSection booking={props.booking} />
    <BookingContextSection status={props.status} />
    <BookingCancelSection canCancel={props.canCancel} status={props.status} scheduledAt={props.scheduledAt} hoursUntilBooking={props.hoursUntilBooking} onOpen={props.onOpenCancel} />
    <BookingError error={props.error} />
  </BookingWaitingShell>;
}
