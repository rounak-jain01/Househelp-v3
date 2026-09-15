import React from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import type { EdgeInsets } from "react-native-safe-area-context";

import { styles } from "./BookingWaitingStyles";
import {
  STATUS_LABELS,
  type Booking,
  type BookingStatus,
  type CancelReason,
} from "./BookingWaitingTypes";
import {
  formatCategory,
  formatDateTime,
  formatDuration,
  getInitials,
} from "./BookingWaitingUtils";

export function BookingWaitingShell({
  insets,
  status,
  children,
}: {
  insets: EdgeInsets;
  status: BookingStatus;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.geometry}>
        <View style={styles.geoCircleLarge} />
        <View style={styles.geoCircleSmall} />
        <View style={styles.geoPill} />
        <View style={styles.geoDiamond} />
        <View style={styles.geoArc} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 9 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>HOMEHELP · BOOKING</Text>
          <Text style={styles.headerTitle}>Your booking</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            status === "completed" && styles.statusPillCompleted,
          ]}
        >
          {status !== "completed" ? (
            <View style={styles.statusDot} />
          ) : (
            <Text style={styles.completedCheck}>✓</Text>
          )}
          <Text
            style={[
              styles.statusPillText,
              status === "completed" && styles.statusPillCompletedText,
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
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function BookingStatusHero({
  status,
  statusIndex,
  booking,
}: {
  status: BookingStatus;
  statusIndex: number;
  booking: Booking;
}) {
  return (
    <View
      style={[
        styles.heroStatus,
        status === "completed" && styles.heroStatusCompleted,
        status === "cancelled" && styles.heroStatusCancelled,
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
            status === "completed" && styles.completedEyebrow,
          ]}
        >
          {status === "pending"
            ? "SEARCHING"
            : status === "assigned"
              ? "HELP REQUEST SENT"
              : status === "confirmed"
                ? "HELP CONFIRMED"
                : status === "in_progress"
                  ? "JOB IN PROGRESS"
                  : status === "completed"
                    ? "COMPLETE"
                    : status === "cancelled"
                      ? "CANCELLED"
                      : "ATTENTION"}
        </Text>
        <Text style={styles.heroIndex}>
          {statusIndex >= 0 ? `0${statusIndex + 1}` : "—"}/05
        </Text>
      </View>

      <Text
        style={[
          styles.heroStatusTitle,
          status === "completed" && styles.completedHeroTitle,
          status === "cancelled" && styles.cancelledHeroTitle,
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
          status === "completed" && styles.completedHeroText,
          status === "cancelled" && styles.cancelledHeroText,
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
        <View style={styles.searchingRow}>
          <ActivityIndicator size="small" color="#D2DDD3" />
          <Text style={styles.searchingText}>Matching your request...</Text>
        </View>
      ) : null}
    </View>
  );
}

export function BookingProgressTimeline({
  statusIndex,
}: {
  statusIndex: number;
}) {
  return (
    <View style={styles.progressCard}>
      {[
        ["Finding Help", 0],
        ["Help assigned", 1],
        ["Confirmed", 2],
        ["Started", 3],
        ["Completed", 4],
      ].map(([label, index], itemIndex) => (
        <ProgressStep
          key={String(label)}
          label={String(label)}
          active={statusIndex >= Number(index)}
          completed={
            statusIndex > Number(index) ||
            (statusIndex === 4 && Number(index) === 4)
          }
          last={itemIndex === 4}
        />
      ))}
    </View>
  );
}

export function BookingHelpSection({
  booking,
  travelText,
  onCall,
}: {
  booking: Booking;
  travelText: string;
  onCall: () => void;
}) {
  if (!booking.maidDetails) return null;
  return (
    <>
      <SectionTitle eyebrow="YOUR HELP" title="Meet your Help" />
      <View style={styles.helpCard}>
        {booking.maidDetails.photoUrl ? (
          <Image
            source={{ uri: booking.maidDetails.photoUrl }}
            style={styles.helpImage}
          />
        ) : (
          <View style={styles.helpInitial}>
            <Text style={styles.helpInitialText}>
              {getInitials(booking.maidDetails.name)}
            </Text>
          </View>
        )}
        <View style={styles.helpInfo}>
          <View style={styles.helpNameRow}>
            <Text style={styles.helpName}>
              {booking.maidDetails.name || "HomeHelp"}
            </Text>
            <View style={styles.verifiedPill}>
              <Text style={styles.verifiedPillText}>✓ Verified</Text>
            </View>
          </View>
          <Text style={styles.helpArea}>
            {booking.maidDetails.serviceArea || "Verified HomeHelp"}
          </Text>
          <Text style={styles.travelText}>{travelText}</Text>
        </View>
        {booking.maidDetails.phoneNumber ? (
          <Pressable style={styles.callButton} onPress={onCall}>
            <Text style={styles.callIcon}>☎</Text>
            <Text style={styles.callText}>Call</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

export function BookingOtpSection({ otp }: { otp: any }) {
  if (!otp || otp.usedAt) return null;
  return (
    <>
      <SectionTitle
        eyebrow="START CODE"
        title="Share this when your Help arrives"
      />
      <View style={styles.otpCard}>
        <View style={styles.otpTop}>
          <View style={styles.otpIconBox}>
            <Text style={styles.otpIcon}>#</Text>
          </View>
          <View style={styles.otpCopy}>
            <Text style={styles.otpTitle}>Your 6-digit code</Text>
            <Text style={styles.otpSubtitle}>
              The timer starts only after this code is verified.
            </Text>
          </View>
        </View>
        <Text style={styles.otpValue}>{otp.otp}</Text>
      </View>
    </>
  );
}

export function BookingTimerSection({
  remainingSeconds,
  progress,
  elapsedSeconds,
  bookedSeconds,
}: {
  remainingSeconds: number;
  progress: number;
  elapsedSeconds: number;
  bookedSeconds: number;
}) {
  const timeFinished = remainingSeconds <= 0;
  return (
    <>
      <SectionTitle eyebrow="SERVICE TIME" title="Your booked time" />
      <View style={styles.timerCard}>
        <Text style={styles.timerEyebrow}>
          {timeFinished ? "TIME COMPLETE" : "TIME REMAINING"}
        </Text>
        <Text
          style={[styles.timerValue, timeFinished && styles.timerValueFinished]}
        >
          {formatDuration(remainingSeconds)}
        </Text>
        <View style={styles.timerTrack}>
          <View
            style={[
              styles.timerFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.timerSubtext}>
          {timeFinished
            ? "Your booked time has finished."
            : `${formatDuration(elapsedSeconds)} used of ${formatDuration(bookedSeconds)}`}
        </Text>
      </View>
    </>
  );
}

export function BookingExtraTimeSection({
  booking,
  canRequestExtra,
  isRequestingExtraTime,
  extraTimeError,
  onRequest,
  timeFinished,
}: {
  booking: Booking;
  canRequestExtra: boolean;
  isRequestingExtraTime: boolean;
  extraTimeError: string;
  onRequest: (minutes: number) => void;
  timeFinished: boolean;
}) {
  return (
    <>
      <SectionTitle eyebrow="OPTIONAL" title="Need a little more time?" />
      <View style={styles.extraTimeCard}>
        {booking.extraTimeStatus === "requested" ? (
          <>
            <Text style={styles.extraTimeTitle}>Extra time requested</Text>
            <Text style={styles.extraTimeText}>
              Waiting for your Help to respond.
            </Text>
            <View style={styles.pendingRow}>
              <ActivityIndicator size="small" color="#5D7161" />
              <Text style={styles.pendingText}>
                {formatExtraMinutes(booking.requestedExtraMinutes)} requested
              </Text>
            </View>
          </>
        ) : booking.extraTimeStatus === "accepted" ? (
          <>
            <Text style={styles.extraTimeTitle}>Extra time accepted</Text>
            <Text style={styles.extraTimeText}>
              Your Help accepted the additional time and the booking duration
              has been extended.
            </Text>
          </>
        ) : booking.extraTimeStatus === "rejected" ? (
          <>
            <Text style={styles.extraTimeTitle}>Extra time was declined</Text>
            <Text style={styles.extraTimeText}>
              You can request another option now that the previous request was
              declined.
            </Text>
            <ExtraTimeButtons
              enabled={canRequestExtra}
              loading={isRequestingExtraTime}
              onRequest={onRequest}
            />
            {extraTimeError ? (
              <Text style={styles.extraError}>{extraTimeError}</Text>
            ) : null}
          </>
        ) : timeFinished ? (
          <>
            <Text style={styles.extraTimeTitle}>Booked time completed</Text>
            <Text style={styles.extraTimeText}>
              Request 30 minutes, 1 hour, or 2 hours from your Help.
            </Text>
            <ExtraTimeButtons
              enabled={canRequestExtra}
              loading={isRequestingExtraTime}
              onRequest={onRequest}
            />
            {extraTimeError ? (
              <Text style={styles.extraError}>{extraTimeError}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.extraTimeTitle}>Extra time is locked</Text>
            <Text style={styles.extraTimeText}>
              Options become available when your current booked time reaches
              00:00:00.
            </Text>
            <View style={styles.lockedPill}>
              <Text style={styles.lockedPillText}>AVAILABLE AT 00:00:00</Text>
            </View>
          </>
        )}
      </View>
    </>
  );
}

export function BookingDetailsSection({ booking }: { booking: Booking }) {
  return (
    <>
      <SectionTitle eyebrow="BOOKING DETAILS" title="Your service" />
      <View style={styles.detailsCard}>
        <DetailRow
          label="Service"
          value={
            booking.categories?.map(formatCategory).join(" · ") ||
            "Home service"
          }
        />
        <DetailRow
          label="Duration"
          value={
            booking.duration
              ? `${booking.duration} ${booking.duration === 1 ? "hour" : "hours"}`
              : "—"
          }
        />
        <DetailRow
          label="Scheduled"
          value={formatDateTime(booking.scheduledDateTime)}
        />
        <DetailRow
          label="Total"
          value={
            typeof booking.totalPrice === "number"
              ? `₹${booking.totalPrice}`
              : "—"
          }
        />
        <DetailRow
          label="Address"
          value={booking.customerAddress?.formatted || "—"}
        />
        {booking.customerAddress?.landmark ? (
          <DetailRow
            label="Landmark"
            value={booking.customerAddress.landmark}
            last
          />
        ) : null}
      </View>
    </>
  );
}

export function BookingContextSection({ status }: { status: BookingStatus }) {
  if (status === "confirmed")
    return (
      <InfoCard
        title="What happens next?"
        text="Your Help will arrive at the scheduled time. Show the start code when they arrive. Your booked time starts after the code is verified."
      />
    );
  if (status === "in_progress")
    return (
      <InfoCard
        title="Your service is underway"
        text="The timer started when your Help verified the start code. Completion is confirmed by the Help after the work is finished."
      />
    );
  if (status === "completed")
    return (
      <InfoCard
        title="Payment summary ready"
        text="Your final bill is available. No online payment gateway is used; payment is settled directly with your Help."
        success
      />
    );
  return null;
}

export function BookingCancelSection({
  canCancel,
  status,
  scheduledAt,
  hoursUntilBooking,
  onOpen,
}: {
  canCancel: boolean;
  status: BookingStatus;
  scheduledAt: Date | null;
  hoursUntilBooking: number | null;
  onOpen: () => void;
}) {
  if (canCancel)
    return (
      <View style={styles.cancelArea}>
        <Text style={styles.cancelHint}>
          {hoursUntilBooking !== null
            ? `${hoursUntilBooking.toFixed(1)} hours until your booking`
            : ""}
        </Text>
        <Pressable style={styles.cancelButton} onPress={onOpen}>
          <Text style={styles.cancelButtonText}>Cancel booking</Text>
        </Pressable>
      </View>
    );
  if (["pending", "assigned", "confirmed"].includes(status) && scheduledAt)
    return (
      <View style={styles.lockedCancel}>
        <Text style={styles.lockedCancelTitle}>Cancellation unavailable</Text>
        <Text style={styles.lockedCancelText}>
          Cancellation is available only more than 1 hour before the scheduled
          start time.
        </Text>
      </View>
    );
  return null;
}

export function BookingError({ error }: { error: string }) {
  if (!error) return null;
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
}

export function BookingCancelSheet({
  visible,
  selectedReason,
  isCancelling,
  onSelectReason,
  onConfirm,
  onClose,
  reasons,
}: {
  visible: boolean;
  selectedReason: CancelReason | null;
  isCancelling: boolean;
  onSelectReason: (reason: CancelReason) => void;
  onConfirm: () => void;
  onClose: () => void;
  reasons: CancelReason[];
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.cancelSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetEyebrow}>CHANGE OF PLANS</Text>
          <Text style={styles.sheetTitle}>Why are you cancelling?</Text>
          <Text style={styles.sheetSubtitle}>Select the closest reason.</Text>
          {reasons.map((reason) => {
            const selected = selectedReason === reason;
            return (
              <Pressable
                key={reason}
                onPress={() => onSelectReason(reason)}
                style={[styles.reasonOption, selected && styles.reasonSelected]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.reasonText}>{reason}</Text>
              </Pressable>
            );
          })}
          <Pressable
            disabled={!selectedReason || isCancelling}
            onPress={onConfirm}
            style={[
              styles.confirmCancel,
              (!selectedReason || isCancelling) && styles.disabledButton,
            ]}
          >
            {isCancelling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmCancelText}>Confirm cancellation</Text>
            )}
          </Pressable>
          <Pressable
            disabled={isCancelling}
            onPress={onClose}
            style={styles.keepButton}
          >
            <Text style={styles.keepButtonText}>Keep booking</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function ProgressStep({
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
          style={[styles.progressCircle, active && styles.progressCircleActive]}
        >
          {completed ? (
            <Text style={styles.progressCheck}>✓</Text>
          ) : (
            <View
              style={[
                styles.progressInner,
                active && styles.progressInnerActive,
              ]}
            />
          )}
        </View>

        {!last ? (
          <View
            style={[
              styles.progressLine,
              completed && styles.progressLineActive,
            ]}
          />
        ) : null}
      </View>

      <Text
        style={[styles.progressLabel, active && styles.progressLabelActive]}
      >
        {label}
      </Text>
    </View>
  );
}

export function DetailRow({
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
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={3}>
          {value}
        </Text>
      </View>

      {!last ? <View style={styles.detailDivider} /> : null}
    </View>
  );
}

export function InfoCard({
  title,
  text,
  success = false,
}: {
  title: string;
  text: string;
  success?: boolean;
}) {
  return (
    <View style={[styles.infoCard, success && styles.infoCardSuccess]}>
      <View style={[styles.infoBadge, success && styles.infoBadgeSuccess]}>
        <Text
          style={[styles.infoBadgeText, success && styles.infoBadgeTextSuccess]}
        >
          {success ? "✓" : "i"}
        </Text>
      </View>

      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

export function ExtraTimeButtons({
  enabled,
  loading,
  onRequest,
}: {
  enabled: boolean;
  loading: boolean;
  onRequest: (minutes: number) => void;
}) {
  const options = [
    [30, "+30 min"],
    [60, "+1 hour"],
    [120, "+2 hours"],
  ] as const;

  return (
    <View style={styles.extraButtons}>
      {options.map(([minutes, label]) => (
        <Pressable
          key={minutes}
          disabled={!enabled || loading}
          onPress={() => onRequest(minutes)}
          style={[
            styles.extraButton,
            (!enabled || loading) && styles.extraButtonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={enabled ? "#526558" : "#969D97"}
            />
          ) : (
            <Text
              style={[
                styles.extraButtonText,
                (!enabled || loading) && styles.extraButtonTextDisabled,
              ]}
            >
              {label}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

export function formatExtraMinutes(minutes?: number) {
  const value = Number(minutes ?? 0);

  if (value >= 60) {
    const hours = value / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${value} minutes`;
}
