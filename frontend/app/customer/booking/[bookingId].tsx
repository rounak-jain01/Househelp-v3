import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import {
  subscribeToBooking,
} from "../../../src/services/firebase/bookingService";

import {
  cancelCustomerBooking,
  subscribeToCustomerStartOtp,
  type CustomerStartOtp,
} from "../../../src/services/firebase/customerBookingLifecycleService";

type BookingStatus =
  | "pending"
  | "assigned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_maid_found";

type Booking = {
  customerId?: string;

  maidId?: string | null;

  winningMaidId?: string | null;

  categories?: string[];

  duration?: number;

  scheduledDateTime?: any;

  totalPrice?: number;
  billing?: {
    baseAmount?: number;
    extraTimeMinutes?: number;
    extraTimeAmount?: number;
    totalAmount?: number;
    currency?: string;
    generatedAt?: unknown;
  };

  status?: BookingStatus;

  customerAddress?: {
    formatted?: string;
    landmark?: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  maidDetails?: {
    name?: string;
    phoneNumber?: string;
    photoUrl?: string;
    verificationStatus?: string;

    serviceCategories?: string[];
    serviceArea?: string;

    distanceMeters?: number | null;
    distanceText?: string | null;
    etaText?: string | null;
  };

  createdAt?: any;
  startedAt?: any;
  completedAt?: any;
  cancelledAt?: any;

  cancellationReason?: string | null;

  startOtpHash?: string | null;
  startOtpUsedAt?: any;
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

function formatDateTime(
  value: any,
): string {
  if (!value) {
    return "—";
  }

  try {
    const date =
      typeof value?.toDate ===
      "function"
        ? value.toDate()
        : new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "—";
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    );
  } catch {
    return "—";
  }
}

function getDate(
  value: any,
): Date | null {
  if (!value) {
    return null;
  }

  try {
    if (
      typeof value?.toDate ===
      "function"
    ) {
      return value.toDate();
    }

    const result =
      new Date(value);

    return Number.isNaN(
      result.getTime(),
    )
      ? null
      : result;
  } catch {
    return null;
  }
}

function formatDuration(
  totalSeconds: number,
): string {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(totalSeconds),
    );

  const hours =
    Math.floor(
      safeSeconds / 3600,
    );

  const minutes =
    Math.floor(
      (safeSeconds % 3600) / 60,
    );

  const seconds =
    safeSeconds % 60;

  return [
    String(hours).padStart(
      2,
      "0",
    ),
    String(minutes).padStart(
      2,
      "0",
    ),
    String(seconds).padStart(
      2,
      "0",
    ),
  ].join(":");
}

function getInitials(
  name?: string,
): string {
  const parts =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];

  if (!parts.length) {
    return "H";
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0].toUpperCase(),
    )
    .join("");
}

function statusIndex(
  status: BookingStatus,
): number {
  if (
    status === "pending"
  ) {
    return 0;
  }

  if (
    status === "assigned"
  ) {
    return 1;
  }

  if (
    status === "confirmed"
  ) {
    return 2;
  }

  if (
    status ===
      "in_progress"
  ) {
    return 3;
  }

  if (
    status === "completed"
  ) {
    return 4;
  }

  return -1;
}

export default function BookingWaitingScreen() {
  const { bookingId: routeBookingId } =
    useLocalSearchParams<{
      bookingId?: string | string[];
    }>();

  const bookingId =
    typeof routeBookingId === "string"
      ? routeBookingId
      : routeBookingId?.[0] ?? "";
  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [otp, setOtp] =
    useState<CustomerStartOtp | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [now, setNow] =
    useState(
      () => new Date(),
    );

  const [
    showCancelSheet,
    setShowCancelSheet,
  ] = useState(false);

  const [
    isCancelling,
    setIsCancelling,
  ] = useState(false);

  const [
    selectedReason,
    setSelectedReason,
  ] =
    useState<CancelReason | null>(
      null,
    );

  useEffect(() => {
    if (!bookingId.trim()) {
      setIsLoading(false);
      setError("Booking ID is missing.");
      return () => {};
    }

    const unsubscribe =
      subscribeToBooking(
        bookingId,
        (value) => {
          setBooking(
            value as Booking | null,
          );

          setIsLoading(false);
          setError("");
        },
        (listenerError) => {
          console.error(
            "[BookingWaiting] Booking listener failed:",
            listenerError,
          );

          setError(
            listenerError.message ||
              "Unable to load booking.",
          );

          setIsLoading(false);
        },
      );

    return unsubscribe;
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId.trim()) {
      return () => {};
    }

    const unsubscribe =
      subscribeToCustomerStartOtp(
        bookingId,
        setOtp,
        (otpError) => {
          console.error(
            "[BookingWaiting] OTP listener failed:",
            otpError,
          );
        },
      );

    return unsubscribe;
  }, [bookingId]);

  useEffect(() => {
    if (booking?.status !== "completed" || !booking.billing) {
      return;
    }

    router.replace(`/customer/billing/${bookingId}`);
  }, [booking?.status, booking?.billing, bookingId]);

  useEffect(() => {
    const timer =
      setInterval(() => {
        setNow(
          new Date(),
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, []);

  const status =
    booking?.status ??
    "pending";

  const currentIndex =
    statusIndex(status);

  const scheduledAt =
    getDate(
      booking?.scheduledDateTime,
    );

  const canCancel = useMemo(() => {
    if (
      !booking ||
      !scheduledAt
    ) {
      return false;
    }

    if (
      ![
        "pending",
        "assigned",
        "confirmed",
      ].includes(status)
    ) {
      return false;
    }

    const oneHourMs =
      60 *
      60 *
      1000;

    return (
      scheduledAt.getTime() -
        now.getTime() >
      oneHourMs
    );
  }, [
    booking,
    scheduledAt,
    status,
    now,
  ]);

  const hoursUntilBooking =
    scheduledAt
      ? Math.max(
          0,
          (
            scheduledAt.getTime() -
            now.getTime()
          ) /
            (60 * 60 * 1000),
        )
      : null;

  const startDate =
    getDate(
      booking?.startedAt,
    );

  const completedDate =
    getDate(
      booking?.completedAt,
    );

  const bookedSeconds =
    Math.max(
      0,
      Number(
        booking?.duration ??
          0,
      ) *
        60 *
        60,
    );

  const elapsedSeconds =
    startDate
      ? Math.max(
          0,
          (
            now.getTime() -
            startDate.getTime()
          ) / 1000,
        )
      : 0;

  const remainingSeconds =
    Math.max(
      0,
      bookedSeconds -
        elapsedSeconds,
    );

  const progress =
    bookedSeconds > 0
      ? Math.min(
          1,
          elapsedSeconds /
            bookedSeconds,
        )
      : 0;

  const travelText =
    booking?.maidDetails
      ?.distanceText &&
    booking?.maidDetails
      ?.etaText
      ? `${booking.maidDetails.distanceText} away • ${booking.maidDetails.etaText}`
      : booking?.maidDetails
          ?.distanceText ||
        booking?.maidDetails
          ?.etaText ||
        "Travel estimate unavailable";

  const callMaid =
    async () => {
      const phone =
        booking?.maidDetails
          ?.phoneNumber;

      if (!phone) {
        return;
      }

      try {
        await Linking.openURL(
          `tel:${phone}`,
        );
      } catch (linkError) {
        console.error(
          "[BookingWaiting] Could not open phone:",
          linkError,
        );
      }
    };

  const handleCancel =
    async () => {
      if (
        !selectedReason
      ) {
        return;
      }

      try {
        setError("");
        setIsCancelling(
          true,
        );

        await cancelCustomerBooking(
          bookingId,
          selectedReason,
        );

        setShowCancelSheet(
          false,
        );
        setSelectedReason(
          null,
        );
      } catch (
        cancelError
      ) {
        console.error(
          "[BookingWaiting] Cancel failed:",
          cancelError,
        );

        setError(
          cancelError instanceof
            Error
            ? cancelError.message
            : "Unable to cancel the booking.",
        );
      } finally {
        setIsCancelling(
          false,
        );
      }
    };

  if (isLoading) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <ActivityIndicator
          size="large"
          color="#1F7A4C"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading your booking...
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <Text
          style={
            styles.emptyTitle
          }
        >
          Booking not found
        </Text>

        <Pressable
          style={
            styles.primaryButton
          }
          onPress={() =>
            router.replace(
              "/customer",
            )
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Go to Home
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View
        style={styles.container}
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.content
          }
        >
          <View
            style={
              styles.headerRow
            }
          >
            <View
              style={
                styles.headerText
              }
            >
              <Text
                style={
                  styles.eyebrow
                }
              >
                HOMEHELP
              </Text>

              <Text
                style={
                  styles.headerTitle
                }
              >
                Your booking
              </Text>
            </View>

            {status !==
            "completed" ? (
              <View
                style={
                  styles.livePill
                }
              >
                <View
                  style={
                    styles.liveDot
                  }
                />

                <Text
                  style={
                    styles.liveText
                  }
                >
                  LIVE
                </Text>
              </View>
            ) : null}
          </View>

          {/* MAIN STATUS */}

          {status ===
          "no_maid_found" ? (
            <View
              style={
                styles.specialCard
              }
            >
              <Text
                style={
                  styles.specialIcon
                }
              >
                !
              </Text>

              <Text
                style={
                  styles.specialTitle
                }
              >
                We couldn't find a
                Help
              </Text>

              <Text
                style={
                  styles.specialText
                }
              >
                No available Help
                accepted this booking
                request.
              </Text>

              <Pressable
                style={
                  styles.primaryButton
                }
                onPress={() =>
                  router.replace(
                    "/customer/book",
                  )
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Book again
                </Text>
              </Pressable>
            </View>
          ) : status ===
            "cancelled" ? (
            <View
              style={
                styles.specialCard
              }
            >
              <Text
                style={
                  styles.specialIcon
                }
              >
                ✓
              </Text>

              <Text
                style={
                  styles.specialTitle
                }
              >
                Booking cancelled
              </Text>

              <Text
                style={
                  styles.specialText
                }
              >
                {booking.cancellationReason ||
                  "This booking has been cancelled."}
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.statusCard
              }
            >
              <Text
                style={
                  styles.statusEyebrow
                }
              >
                {status ===
                "pending"
                  ? "SEARCHING"
                  : status ===
                      "assigned"
                    ? "HELP REQUEST SENT"
                    : status ===
                        "confirmed"
                      ? "HELP CONFIRMED"
                      : status ===
                          "in_progress"
                        ? "JOB IN PROGRESS"
                        : "JOB COMPLETED"}
              </Text>

              <Text
                style={
                  styles.statusTitle
                }
              >
                {status ===
                "pending"
                  ? "Finding a Help for you"
                  : status ===
                      "assigned"
                    ? "Finding the best available Help"
                    : status ===
                        "confirmed"
                      ? "Your Help is confirmed"
                      : status ===
                          "in_progress"
                        ? "Your job has started"
                        : "Your booking is complete"}
              </Text>

              <Text
                style={
                  styles.statusSubtext
                }
              >
                {status ===
                "pending"
                  ? "We're checking available Helps for your requested time."
                  : status ===
                      "assigned"
                    ? "Your booking request has been sent to available Helps. The first valid acceptance confirms the booking."
                    : status ===
                        "confirmed"
                      ? "Your Help has accepted the booking. Keep the start code ready for arrival."
                      : status ===
                          "in_progress"
                        ? "Your booked hours are now running."
                        : "The Help has marked this booking completed."}
              </Text>

              {status ===
              "pending" ? (
                <View
                  style={
                    styles.searchingIndicator
                  }
                >
                  <ActivityIndicator
                    color="#1F7A4C"
                  />

                  <Text
                    style={
                      styles.searchingText
                    }
                  >
                    Looking for available
                    Helps...
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* STATUS STEPPER */}

          {[
            "pending",
            "assigned",
            "confirmed",
            "in_progress",
            "completed",
          ].includes(status) ? (
            <View
              style={
                styles.stepperCard
              }
            >
              <StatusStep
                label="Finding Help"
                active={
                  currentIndex >= 0
                }
                complete={
                  currentIndex > 0
                }
                last={false}
              />

              <StatusStep
                label="Help assigned"
                active={
                  currentIndex >= 1
                }
                complete={
                  currentIndex > 1
                }
                last={false}
              />

              <StatusStep
                label="Confirmed"
                active={
                  currentIndex >= 2
                }
                complete={
                  currentIndex > 2
                }
                last={false}
              />

              <StatusStep
                label="Job started"
                active={
                  currentIndex >= 3
                }
                complete={
                  currentIndex > 3
                }
                last={false}
              />

              <StatusStep
                label="Completed"
                active={
                  currentIndex >= 4
                }
                complete={
                  currentIndex >= 4
                }
                last
              />
            </View>
          ) : null}

          {/* MAID CARD */}

          {booking.maidDetails &&
          [
            "confirmed",
            "in_progress",
            "completed",
          ].includes(status) ? (
            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Your Help
              </Text>

              <View
                style={
                  styles.maidCard
                }
              >
                {booking.maidDetails
                  .photoUrl ? (
                  <Image
                    source={{
                      uri:
                        booking
                          .maidDetails
                          .photoUrl,
                    }}
                    style={
                      styles.maidImage
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.maidInitial
                    }
                  >
                    <Text
                      style={
                        styles.maidInitialText
                      }
                    >
                      {getInitials(
                        booking
                          .maidDetails
                          .name,
                      )}
                    </Text>
                  </View>
                )}

                <View
                  style={
                    styles.maidInfo
                  }
                >
                  <View
                    style={
                      styles.maidNameRow
                    }
                  >
                    <Text
                      style={
                        styles.maidName
                      }
                    >
                      {booking
                        .maidDetails
                        .name ||
                        "HomeHelp"}
                    </Text>

                    <View
                      style={
                        styles.verifiedBadge
                      }
                    >
                      <Text
                        style={
                          styles.verifiedBadgeText
                        }
                      >
                        ✓ Verified
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.maidArea
                    }
                  >
                    {booking
                      .maidDetails
                      .serviceArea ||
                      "Verified HomeHelp"}
                  </Text>

                  <Text
                    style={
                      styles.travelText
                    }
                  >
                    {travelText}
                  </Text>
                </View>

                {booking
                  .maidDetails
                  .phoneNumber ? (
                  <Pressable
                    style={
                      styles.callButton
                    }
                    onPress={callMaid}
                  >
                    <Text
                      style={
                        styles.callIcon
                      }
                    >
                      ☎
                    </Text>

                    <Text
                      style={
                        styles.callText
                      }
                    >
                      Call
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* START CODE */}

          {status ===
            "confirmed" &&
          otp &&
          !otp.usedAt ? (
            <View
              style={
                styles.otpCard
              }
            >
              <View
                style={
                  styles.otpHeaderRow
                }
              >
                <View
                  style={
                    styles.otpIconCircle
                  }
                >
                  <Text
                    style={
                      styles.otpIcon
                    }
                  >
                    #
                  </Text>
                </View>

                <View
                  style={
                    styles.otpHeaderText
                  }
                >
                  <Text
                    style={
                      styles.otpTitle
                    }
                  >
                    Your start code
                  </Text>

                  <Text
                    style={
                      styles.otpSubtext
                    }
                  >
                    Share this code only when
                    your Help arrives.
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.otpValue
                }
              >
                {otp.otp}
              </Text>

              <Text
                style={
                  styles.otpHint
                }
              >
                The Help must enter this code
                to start your booked time.
              </Text>
            </View>
          ) : null}

          {/* JOB TIMER */}

          {status ===
          "in_progress" ? (
            <View
              style={
                styles.timerCard
              }
            >
              <Text
                style={
                  styles.timerLabel
                }
              >
                BOOKED TIME
              </Text>

              <Text
                style={
                  styles.timerValue
                }
              >
                {formatDuration(
                  remainingSeconds,
                )}
              </Text>

              <View
                style={
                  styles.progressTrack
                }
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(
                        progress * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={
                  styles.timerSubtext
                }
              >
                {remainingSeconds >
                0
                  ? `${formatDuration(
                      elapsedSeconds,
                    )} used of ${formatDuration(
                      bookedSeconds,
                    )}`
                  : "Booked time has finished. The Help can now complete the job."}
              </Text>
            </View>
          ) : null}

          {/* BOOKING DETAILS */}

          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Booking details
            </Text>

            <View
              style={
                styles.detailsCard
              }
            >
              <DetailRow
                label="Service"
                value={
                  booking.categories
                    ?.join(", ") ||
                  "HomeHelp service"
                }
              />

              <DetailRow
                label="Duration"
                value={
                  booking.duration
                    ? `${booking.duration} hour${
                        booking.duration ===
                        1
                          ? ""
                          : "s"
                      }`
                    : "—"
                }
              />

              <DetailRow
                label="Scheduled"
                value={formatDateTime(
                  booking.scheduledDateTime,
                )}
              />

              <DetailRow
                label="Total"
                value={
                  typeof booking.totalPrice ===
                  "number"
                    ? `₹${booking.totalPrice}`
                    : "—"
                }
              />

              <DetailRow
                label="Service address"
                value={
                  booking
                    .customerAddress
                    ?.formatted ||
                  "—"
                }
                last
              />

              {booking
                .customerAddress
                ?.landmark ? (
                <DetailRow
                  label="Landmark"
                  value={
                    booking
                      .customerAddress
                      .landmark
                  }
                  last
                />
              ) : null}
            </View>
          </View>

          {/* STATUS INFO */}

          {status ===
          "confirmed" ? (
            <View
              style={
                styles.infoCard
              }
            >
              <Text
                style={
                  styles.infoTitle
                }
              >
                What happens next?
              </Text>

              <Text
                style={
                  styles.infoText
                }
              >
                Your Help will arrive at the
                scheduled time. Show the start
                code when they arrive. Once the
                code is verified, your booked
                hours start running.
              </Text>
            </View>
          ) : null}

          {status ===
          "in_progress" ? (
            <View
              style={
                styles.infoCard
              }
            >
              <Text
                style={
                  styles.infoTitle
                }
              >
                Job is in progress
              </Text>

              <Text
                style={
                  styles.infoText
                }
              >
                Your timer started when the Help
                verified your start code.
                Completion is confirmed by the
                Help after the work is finished.
              </Text>
            </View>
          ) : null}

          {status ===
          "completed" ? (
            <View
              style={
                styles.successInfoCard
              }
            >
              <Text
                style={
                  styles.successTitle
                }
              >
                ✓ Job completed
              </Text>

              <Text
                style={
                  styles.successText
                }
              >
                Completed{" "}
                {completedDate
                  ? `on ${completedDate.toLocaleString(
                      "en-IN",
                    )}`
                  : ""}
              </Text>
            </View>
          ) : null}

          {/* CANCEL */}

          {canCancel ? (
            <View
              style={
                styles.cancelSection
              }
            >
              <Text
                style={
                  styles.cancelHint
                }
              >
                {hoursUntilBooking !==
                null
                  ? `${hoursUntilBooking.toFixed(
                      1,
                    )} hours until your booking`
                  : ""}
              </Text>

              <Pressable
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setShowCancelSheet(
                    true,
                  )
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel booking
                </Text>
              </Pressable>
            </View>
          ) : [
              "pending",
              "assigned",
              "confirmed",
            ].includes(status) &&
            scheduledAt ? (
            <View
              style={
                styles.lockedCancelCard
              }
            >
              <Text
                style={
                  styles.lockedCancelTitle
                }
              >
                Cancellation unavailable
              </Text>

              <Text
                style={
                  styles.lockedCancelText
                }
              >
                Cancellation is available only
                more than 1 hour before the
                scheduled start time.
              </Text>
            </View>
          ) : null}

          {error ? (
            <View
              style={
                styles.errorCard
              }
            >
              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* CANCELLATION SHEET */}

      <Modal
        visible={
          showCancelSheet
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowCancelSheet(
            false,
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.cancelSheet
            }
          >
            <View
              style={
                styles.sheetHandle
              }
            />

            <Text
              style={
                styles.sheetTitle
              }
            >
              Why are you cancelling?
            </Text>

            <Text
              style={
                styles.sheetSubtitle
              }
            >
              Please select a reason so we
              can improve HomeHelp.
            </Text>

            {CANCEL_REASONS.map(
              (reason) => {
                const selected =
                  selectedReason ===
                  reason;

                return (
                  <Pressable
                    key={reason}
                    style={[
                      styles.reasonOption,
                      selected &&
                        styles.reasonSelected,
                    ]}
                    onPress={() =>
                      setSelectedReason(
                        reason,
                      )
                    }
                  >
                    <View
                      style={[
                        styles.radio,
                        selected &&
                          styles.radioSelected,
                      ]}
                    >
                      {selected ? (
                        <View
                          style={
                            styles.radioDot
                          }
                        />
                      ) : null}
                    </View>

                    <Text
                      style={
                        styles.reasonText
                      }
                    >
                      {reason}
                    </Text>
                  </Pressable>
                );
              },
            )}

            <Pressable
              disabled={
                !selectedReason ||
                isCancelling
              }
              style={[
                styles.confirmCancelButton,
                (!selectedReason ||
                  isCancelling) &&
                  styles.disabledButton,
              ]}
              onPress={
                handleCancel
              }
            >
              {isCancelling ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.confirmCancelText
                  }
                >
                  Confirm cancellation
                </Text>
              )}
            </Pressable>

            <Pressable
              style={
                styles.keepButton
              }
              onPress={() =>
                setShowCancelSheet(
                  false,
                )
              }
              disabled={
                isCancelling
              }
            >
              <Text
                style={
                  styles.keepButtonText
                }
              >
                Keep booking
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StatusStep({
  label,
  active,
  complete,
  last,
}: {
  label: string;
  active: boolean;
  complete: boolean;
  last: boolean;
}) {
  return (
    <View
      style={
        styles.stepWrapper
      }
    >
      <View
        style={
          styles.stepLeft
        }
      >
        <View
          style={[
            styles.stepCircle,
            active &&
              styles.stepCircleActive,
          ]}
        >
          {complete ? (
            <Text
              style={
                styles.stepCheck
              }
            >
              ✓
            </Text>
          ) : (
            <View
              style={[
                styles.stepInner,
                active &&
                  styles.stepInnerActive,
              ]}
            />
          )}
        </View>

        {!last ? (
          <View
            style={[
              styles.stepLine,
              complete &&
                styles.stepLineActive,
            ]}
          />
        ) : null}
      </View>

      <Text
        style={[
          styles.stepLabel,
          active &&
            styles.stepLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function DetailRow({
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
      <View
        style={
          styles.detailRow
        }
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.detailValue
          }
        >
          {value}
        </Text>
      </View>

      {!last ? (
        <View
          style={
            styles.detailDivider
          }
        />
      ) : null}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F7F8F6",
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },

    centerScreen: {
      flex: 1,
      backgroundColor:
        "#F7F8F6",
      alignItems: "center",
      justifyContent:
        "center",
      padding: 24,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: "#747A75",
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 20,
    },

    headerText: {
      flex: 1,
    },

    eyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: "#1F7A4C",
    },

    headerTitle: {
      marginTop: 5,
      fontSize: 27,
      fontWeight: "800",
      color: "#111411",
    },

    livePill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor:
        "#EAF5EE",
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        "#1F7A4C",
      marginRight: 6,
    },

    liveText: {
      fontSize: 9,
      fontWeight: "900",
      color: "#1F7A4C",
    },

    statusCard: {
      padding: 20,
      borderRadius: 22,
      backgroundColor:
        "#172018",
    },

    statusEyebrow: {
      fontSize: 9,
      letterSpacing: 1.3,
      fontWeight: "800",
      color: "#AEB9AF",
    },

    statusTitle: {
      marginTop: 8,
      fontSize: 24,
      lineHeight: 31,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    statusSubtext: {
      marginTop: 9,
      fontSize: 12,
      lineHeight: 19,
      color: "#C5CEC6",
    },

    searchingIndicator: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "center",
    },

    searchingText: {
      marginLeft: 9,
      fontSize: 11,
      fontWeight: "700",
      color: "#D2D9D3",
    },

    stepperCard: {
      marginTop: 15,
      padding: 16,
      borderRadius: 19,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E1E6E2",
    },

    stepWrapper: {
      minHeight: 39,
      flexDirection: "row",
    },

    stepLeft: {
      width: 26,
      alignItems: "center",
    },

    stepCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor:
        "#E5E9E6",
      alignItems: "center",
      justifyContent:
        "center",
    },

    stepCircleActive: {
      backgroundColor:
        "#1F7A4C",
    },

    stepInner: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        "#AAB1AB",
    },

    stepInnerActive: {
      backgroundColor:
        "#FFFFFF",
    },

    stepCheck: {
      fontSize: 11,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    stepLine: {
      flex: 1,
      width: 2,
      marginVertical: 2,
      backgroundColor:
        "#E2E6E3",
    },

    stepLineActive: {
      backgroundColor:
        "#1F7A4C",
    },

    stepLabel: {
      marginLeft: 10,
      paddingTop: 1,
      fontSize: 11,
      fontWeight: "600",
      color: "#8A908B",
    },

    stepLabelActive: {
      color: "#1D251F",
      fontWeight: "800",
    },

    section: {
      marginTop: 22,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#171917",
      marginBottom: 10,
    },

    maidCard: {
      padding: 14,
      borderRadius: 19,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E1E6E2",
      flexDirection: "row",
      alignItems: "center",
    },

    maidImage: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        "#E7ECE8",
    },

    maidInitial: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        "#DCEFE3",
      alignItems: "center",
      justifyContent:
        "center",
    },

    maidInitialText: {
      fontSize: 20,
      fontWeight: "900",
      color: "#1F7A4C",
    },

    maidInfo: {
      flex: 1,
      marginLeft: 11,
    },

    maidNameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },

    maidName: {
      fontSize: 15,
      fontWeight: "800",
      color: "#171917",
    },

    verifiedBadge: {
      marginLeft: 7,
      marginTop: 2,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor:
        "#EAF5EE",
    },

    verifiedBadgeText: {
      fontSize: 8,
      fontWeight: "900",
      color: "#1F7A4C",
    },

    maidArea: {
      marginTop: 4,
      fontSize: 10,
      color: "#747A75",
    },

    travelText: {
      marginTop: 5,
      fontSize: 10,
      fontWeight: "700",
      color: "#1F7A4C",
    },

    callButton: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor:
        "#EEF6F1",
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 8,
    },

    callIcon: {
      fontSize: 17,
      color: "#1F7A4C",
    },

    callText: {
      marginTop: 2,
      fontSize: 8,
      fontWeight: "800",
      color: "#1F7A4C",
    },

    otpCard: {
      marginTop: 18,
      padding: 18,
      borderRadius: 20,
      backgroundColor:
        "#EEF7F1",
      borderWidth: 1,
      borderColor:
        "#C9E0D1",
      alignItems: "center",
    },

    otpHeaderRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
    },

    otpIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "#D7EBDD",
      alignItems: "center",
      justifyContent:
        "center",
    },

    otpIcon: {
      fontSize: 19,
      fontWeight: "900",
      color: "#1F7A4C",
    },

    otpHeaderText: {
      flex: 1,
      marginLeft: 10,
    },

    otpTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#162018",
    },

    otpSubtext: {
      marginTop: 2,
      fontSize: 10,
      lineHeight: 15,
      color: "#657068",
    },

    otpValue: {
      marginTop: 15,
      fontSize: 33,
      letterSpacing: 8,
      fontWeight: "900",
      color: "#172018",
    },

    otpHint: {
      marginTop: 8,
      fontSize: 10,
      lineHeight: 15,
      textAlign: "center",
      color: "#687269",
    },

    timerCard: {
      marginTop: 18,
      padding: 20,
      borderRadius: 20,
      backgroundColor:
        "#172018",
      alignItems: "center",
    },

    timerLabel: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.4,
      color: "#AEB9AF",
    },

    timerValue: {
      marginTop: 8,
      fontSize: 38,
      letterSpacing: 2,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    progressTrack: {
      width: "100%",
      height: 7,
      marginTop: 14,
      borderRadius: 4,
      backgroundColor:
        "#3A453D",
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor:
        "#70C493",
    },

    timerSubtext: {
      marginTop: 9,
      fontSize: 10,
      color: "#C3CCC4",
    },

    detailsCard: {
      paddingHorizontal: 15,
      borderRadius: 18,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E2E7E3",
    },

    detailRow: {
      minHeight: 57,
      flexDirection: "row",
      alignItems: "center",
    },

    detailLabel: {
      width: 105,
      fontSize: 11,
      color: "#818781",
    },

    detailValue: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      textAlign: "right",
      fontWeight: "700",
      color: "#252A26",
    },

    detailDivider: {
      height: 1,
      backgroundColor:
        "#ECEFEC",
    },

    infoCard: {
      marginTop: 18,
      padding: 15,
      borderRadius: 17,
      backgroundColor:
        "#FFF9EB",
      borderWidth: 1,
      borderColor:
        "#F1E1B5",
    },

    infoTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: "#6D5312",
    },

    infoText: {
      marginTop: 5,
      fontSize: 11,
      lineHeight: 17,
      color: "#7A6734",
    },

    successInfoCard: {
      marginTop: 18,
      padding: 15,
      borderRadius: 17,
      backgroundColor:
        "#EAF5EE",
      borderWidth: 1,
      borderColor:
        "#C9E0D1",
    },

    successTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: "#1F7A4C",
    },

    successText: {
      marginTop: 4,
      fontSize: 11,
      color: "#667168",
    },

    cancelSection: {
      marginTop: 22,
      alignItems: "center",
    },

    cancelHint: {
      fontSize: 10,
      color: "#858B86",
      marginBottom: 8,
    },

    cancelButton: {
      height: 46,
      paddingHorizontal: 25,
      borderRadius: 14,
      backgroundColor:
        "#FFF3F1",
      borderWidth: 1,
      borderColor:
        "#F2D6D1",
      alignItems: "center",
      justifyContent:
        "center",
    },

    cancelButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#B42318",
    },

    lockedCancelCard: {
      marginTop: 20,
      padding: 14,
      borderRadius: 15,
      backgroundColor:
        "#F0F1F0",
      borderWidth: 1,
      borderColor:
        "#E2E5E2",
    },

    lockedCancelTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: "#666C67",
    },

    lockedCancelText: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      color: "#858A86",
    },

    errorCard: {
      marginTop: 18,
      padding: 12,
      borderRadius: 13,
      backgroundColor:
        "#FFF2F0",
    },

    errorText: {
      fontSize: 11,
      lineHeight: 16,
      color: "#B42318",
    },

    specialCard: {
      padding: 22,
      borderRadius: 21,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E2E7E3",
      alignItems: "center",
    },

    specialIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      textAlign: "center",
      textAlignVertical:
        "center",
      backgroundColor:
        "#FFF1ED",
      color: "#B42318",
      fontSize: 23,
      fontWeight: "900",
    },

    specialTitle: {
      marginTop: 12,
      fontSize: 17,
      fontWeight: "800",
      color: "#191D1A",
      textAlign: "center",
    },

    specialText: {
      marginTop: 6,
      maxWidth: 290,
      fontSize: 12,
      lineHeight: 18,
      color: "#767D77",
      textAlign: "center",
    },

    primaryButton: {
      marginTop: 18,
      minWidth: 150,
      height: 46,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor:
        "#1F7A4C",
      alignItems: "center",
      justifyContent:
        "center",
    },

    primaryButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.42)",
      justifyContent:
        "flex-end",
    },

    cancelSheet: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 26,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      backgroundColor:
        "#FFFFFF",
    },

    sheetHandle: {
      alignSelf: "center",
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        "#D9DED9",
    },

    sheetTitle: {
      marginTop: 17,
      fontSize: 19,
      fontWeight: "800",
      color: "#161A17",
    },

    sheetSubtitle: {
      marginTop: 5,
      marginBottom: 15,
      fontSize: 11,
      lineHeight: 17,
      color: "#7C837D",
    },

    reasonOption: {
      minHeight: 46,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        "#E5E9E5",
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },

    reasonSelected: {
      borderColor:
        "#8EC4A4",
      backgroundColor:
        "#F0F8F3",
    },

    radio: {
      width: 19,
      height: 19,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor:
        "#A4ACA5",
      alignItems: "center",
      justifyContent:
        "center",
    },

    radioSelected: {
      borderColor:
        "#1F7A4C",
    },

    radioDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        "#1F7A4C",
    },

    reasonText: {
      marginLeft: 10,
      fontSize: 12,
      fontWeight: "600",
      color: "#343A35",
    },

    confirmCancelButton: {
      marginTop: 8,
      height: 50,
      borderRadius: 15,
      backgroundColor:
        "#B42318",
      alignItems: "center",
      justifyContent:
        "center",
    },

    confirmCancelText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    disabledButton: {
      opacity: 0.5,
    },

    keepButton: {
      marginTop: 8,
      height: 44,
      alignItems: "center",
      justifyContent:
        "center",
    },

    keepButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#4B534D",
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#171B18",
      textAlign: "center",
    },
  });