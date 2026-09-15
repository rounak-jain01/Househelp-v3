import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import type { EdgeInsets } from "react-native-safe-area-context";

import type {
  Booking,
  BookingStatus,
} from "./BookingWaitingTypes";

import cancelledIllustration from "../../../../assets/CustomerUi/booking-cancelled.png";
import noHelpIllustration from "../../../../assets/CustomerUi/booking-no-help-found.png";

/* ============================================================
   TYPES
   ============================================================ */

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

/* ============================================================
   COLORS
   ============================================================ */

const COLORS = {
  background: "#F7F4EC",
  card: "#FFFDF8",

  darkGreen: "#123F3E",
  green: "#08785D",

  text: "#142F32",
  muted: "#687777",

  border: "#DDE5DF",

  paleGreen: "#E7F3EC",
  paleGreenStrong: "#DCEDE3",

  yellow: "#E5A51A",
  paleYellow: "#FFF4D9",

  white: "#FFFFFF",

  red: "#E45D58",
};

/* ============================================================
   HELPERS
   ============================================================ */

function formatCategory(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
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

function formatDate(date: Date | null) {
  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function formatTime(date: Date | null) {
  if (!date) {
    return "—";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

/* ============================================================
   MAIN SCREEN
   ============================================================ */

export function BookingTerminalScreen({
  booking,
  status,
  insets,
  scheduledAt,
  error,
}: BookingScreenProps) {
  const isNoHelpFound =
    status === "no_maid_found";

  const categories =
    booking.categories ?? [];

  const serviceName =
    categories.length > 0
      ? categories
          .map(formatCategory)
          .join(" • ")
      : "Home Service";

  const duration =
    Number(booking.duration ?? 0);

  const totalPrice =
    Number(booking.totalPrice ?? 0);

  const cancellationReason =
    booking.cancellationReason ||
    "Cancelled by customer";

  /*
   * ----------------------------------------------------------
   * NO HELP FOUND SCREEN
   * ----------------------------------------------------------
   */

  if (isNoHelpFound) {
    return (
      <View style={styles.screen}>
        {/* ==================================================
            FIXED HEADER
            ================================================== */}

        <View
          style={[
            styles.header,
            {
              paddingTop:
                insets.top + 6,
            },
          ]}
        >
          <Pressable
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.backIcon}
            >
              ‹
            </Text>
          </Pressable>

          <View
            style={
              styles.headerTitleWrap
            }
          >
            <Text
              style={
                styles.headerSmall
              }
            >
              BOOKING
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              No Help Found
            </Text>
          </View>
        </View>

        {/* ==================================================
            SCROLLABLE CONTENT
            ================================================== */}

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.content,
            {
              /*
               * IMPORTANT:
               * Persistent bottom navigation ke upar
               * complete content visible rahega.
               */
              paddingBottom:
                Math.max(
                  insets.bottom,
                  18,
                ) + 105,
            },
          ]}
        >
          {/* =================================================
              ILLUSTRATION
              ================================================= */}

          <View
            style={
              styles.noHelpIllustrationContainer
            }
          >
            <Image
              source={
                noHelpIllustration
              }
              style={
                styles.noHelpIllustration
              }
              resizeMode="contain"
              accessibilityLabel="No help found"
            />
          </View>

          {/* =================================================
              TITLE
              ================================================= */}

          <View
            style={
              styles.titleSection
            }
          >
            <Text
              style={
                styles.title
              }
            >
              We couldn't find a Help
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              We couldn't find an
              available Help for your
              requested time slot.
            </Text>
          </View>

          {/* =================================================
              BOOKING SUMMARY
              ================================================= */}

          <View
            style={
              styles.summaryCard
            }
          >
            <SummaryRow
              icon="⌂"
              label="Service"
              value={serviceName}
              subValue="Standard Cleaning"
            />

            <SummaryRow
              icon="▣"
              label="Date"
              value={
                scheduledAt
                  ? formatDate(
                      scheduledAt,
                    )
                  : "Scheduled date unavailable"
              }
              subValue={
                scheduledAt
                  ? formatTime(
                      scheduledAt,
                    )
                  : undefined
              }
            />

            <SummaryRow
              icon="●"
              label="Location"
              value={getAddressText(
                booking.customerAddress,
              )}
            />

            <SummaryRow
              icon="◉"
              label="Amount"
              value={`₹${totalPrice.toLocaleString(
                "en-IN",
              )}`}
              subValue={
                duration > 0
                  ? `${duration} ${
                      duration === 1
                        ? "hour"
                        : "hours"
                    }`
                  : undefined
              }
              last
            />
          </View>

          {/* =================================================
              TRY DIFFERENT TIME SLOT
              ================================================= */}

          <View
            style={
              styles.suggestionCard
            }
          >
            <View
              style={
                styles.suggestionIcon
              }
            >
              <Text
                style={
                  styles.suggestionIconText
                }
              >
                ↻
              </Text>
            </View>

            <View
              style={
                styles.suggestionContent
              }
            >
              <Text
                style={
                  styles.suggestionTitle
                }
              >
                Try a different time slot
              </Text>

              <Text
                style={
                  styles.suggestionText
                }
              >
                You can try again with a
                different time or explore
                other services.
              </Text>
            </View>
          </View>

          {/* =================================================
              ERROR
              ================================================= */}

          {error ? (
            <View
              style={
                styles.errorCard
              }
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Something went wrong
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* =================================================
              TRY AGAIN
              ================================================= */}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Try Again"
            onPress={() => {
              router.replace(
                "/customer/book",
              );
            }}
          >
            <Text
              style={
                styles.primaryButtonIcon
              }
            >
              ↻
            </Text>

            <Text
              style={
                styles.primaryButtonText
              }
            >
              Try Again
            </Text>
          </Pressable>

          {/* =================================================
              GO TO HOME
              ================================================= */}

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed &&
                styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to Home"
            onPress={() => {
              router.replace(
                "/customer",
              );
            }}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Go to Home
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  /*
   * ----------------------------------------------------------
   * CANCELLED SCREEN
   * ----------------------------------------------------------
   *
   * Existing Screen 10 remains here.
   */

  return (
    <View style={styles.screen}>
      {/* ======================================================
          FIXED HEADER
          ====================================================== */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 6,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <View
          style={
            styles.headerTitleWrap
          }
        >
          <Text
            style={
              styles.headerSmall
            }
          >
            BOOKING
          </Text>

          <Text
            style={
              styles.headerTitle
            }
          >
            Cancelled
          </Text>
        </View>
      </View>

      {/* ======================================================
          SCROLLABLE CONTENT
          ====================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Math.max(
                insets.bottom,
                18,
              ) + 105,
          },
        ]}
      >
        {/* ==================================================
            CANCELLED ILLUSTRATION
            ================================================== */}

        <View
          style={
            styles.illustrationContainer
          }
        >
          <Image
            source={
              cancelledIllustration
            }
            style={
              styles.illustration
            }
            resizeMode="contain"
            accessibilityLabel="Booking cancelled"
          />
        </View>

        {/* ==================================================
            TITLE
            ================================================== */}

        <View
          style={
            styles.titleSection
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Booking cancelled
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Your booking has been
            cancelled.
          </Text>
        </View>

        {/* ==================================================
            BOOKING SUMMARY
            ================================================== */}

        <View
          style={
            styles.summaryCard
          }
        >
          <SummaryRow
            icon="⌂"
            label="Service"
            value={serviceName}
            subValue="Standard Cleaning"
          />

          <SummaryRow
            icon="▣"
            label="Date"
            value={
              scheduledAt
                ? formatDate(
                    scheduledAt,
                  )
                : "Scheduled date unavailable"
            }
            subValue={
              scheduledAt
                ? formatTime(
                    scheduledAt,
                  )
                : undefined
            }
          />

          <SummaryRow
            icon="●"
            label="Location"
            value={getAddressText(
              booking.customerAddress,
            )}
          />

          <SummaryRow
            icon="◉"
            label="Amount"
            value={`₹${totalPrice.toLocaleString(
              "en-IN",
            )}`}
            subValue={
              duration > 0
                ? `${duration} ${
                    duration === 1
                      ? "hour"
                      : "hours"
                  }`
                : undefined
            }
            last
          />

          <Text
            style={
              styles.refundText
            }
          >
            Refund will be processed
            (if applicable).
          </Text>
        </View>

        {/* ==================================================
            CANCELLATION REASON
            ================================================== */}

        <View
          style={
            styles.reasonCard
          }
        >
          <View
            style={
              styles.reasonIcon
            }
          >
            <Text
              style={
                styles.reasonIconText
              }
            >
              !
            </Text>
          </View>

          <View
            style={
              styles.reasonContent
            }
          >
            <Text
              style={
                styles.reasonLabel
              }
            >
              Reason
            </Text>

            <Text
              style={
                styles.reasonValue
              }
            >
              {cancellationReason}
            </Text>
          </View>
        </View>

        {/* ==================================================
            ERROR
            ================================================== */}

        {error ? (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Something went wrong
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* ==================================================
            BOOK AGAIN
            ================================================== */}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed &&
              styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Book Again"
          onPress={() => {
            router.replace(
              "/customer/book",
            );
          }}
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Book Again
          </Text>
        </Pressable>

        {/* ==================================================
            GO TO HOME
            ================================================== */}

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed &&
              styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
          onPress={() => {
            router.replace(
              "/customer",
            );
          }}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Go to Home
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/* ============================================================
   SUMMARY ROW
   ============================================================ */

function SummaryRow({
  icon,
  label,
  value,
  subValue,
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        !last &&
          styles.summaryRowBorder,
      ]}
    >
      <View
        style={
          styles.summaryIcon
        }
      >
        <Text
          style={
            styles.summaryIconText
          }
        >
          {icon}
        </Text>
      </View>

      <View
        style={
          styles.summaryContent
        }
      >
        <Text
          style={
            styles.summaryLabel
          }
        >
          {label}
        </Text>

        <Text
          numberOfLines={2}
          style={
            styles.summaryValue
          }
        >
          {value}
        </Text>

        {subValue ? (
          <Text
            style={
              styles.summarySubValue
            }
          >
            {subValue}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = {
  screen: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  /* ========================================================
     HEADER
     ======================================================== */

  header: {
    minHeight: 70,
    paddingHorizontal: 18,
    paddingBottom: 9,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor:
      COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor:
      "#E8E5DC",
    zIndex: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
    fontWeight: "900" as const,
    letterSpacing: 1.5,
    color: COLORS.muted,
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "900" as const,
    color: COLORS.darkGreen,
  },

  /* ========================================================
     CONTENT
     ======================================================== */

  content: {
    paddingHorizontal: 18,
    paddingTop: 7,
  },

  /* ========================================================
     ILLUSTRATION
     ======================================================== */

  illustrationContainer: {
    width: "100%" as const,
    height: 205,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  illustration: {
    width: "100%" as const,
    height: 205,
  },

  noHelpIllustrationContainer: {
    width: "100%" as const,
    height: 190,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  noHelpIllustration: {
    width: "100%" as const,
    height: 190,
  },

  /* ========================================================
     TITLE
     ======================================================== */

  titleSection: {
    alignItems: "center" as const,
    paddingHorizontal: 8,
    marginBottom: 14,
  },

  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900" as const,
    color: COLORS.darkGreen,
    textAlign: "center" as const,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
    textAlign: "center" as const,
  },

  /* ========================================================
     SUMMARY
     ======================================================== */

  summaryCard: {
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingTop: 3,
    paddingBottom: 10,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  summaryRow: {
    minHeight: 57,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },

  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor:
      "#E9EDE8",
  },

  summaryIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor:
      COLORS.paleGreen,
  },

  summaryIconText: {
    fontSize: 13,
    fontWeight: "900" as const,
    color: COLORS.green,
  },

  summaryContent: {
    flex: 1,
    marginLeft: 10,
  },

  summaryLabel: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: COLORS.muted,
  },

  summaryValue: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900" as const,
    color: COLORS.text,
  },

  summarySubValue: {
    marginTop: 1,
    fontSize: 9,
    lineHeight: 13,
    color: COLORS.muted,
  },

  refundText: {
    marginTop: 7,
    marginLeft: 41,
    fontSize: 9,
    lineHeight: 13,
    color: COLORS.muted,
  },

  /* ========================================================
     NO HELP SUGGESTION
     ======================================================== */

  suggestionCard: {
    marginTop: 9,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor:
      COLORS.paleGreen,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },

  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor:
      COLORS.green,
  },

  suggestionIconText: {
    fontSize: 19,
    fontWeight: "800" as const,
    color: COLORS.white,
  },

  suggestionContent: {
    flex: 1,
    marginLeft: 10,
  },

  suggestionTitle: {
    fontSize: 11,
    fontWeight: "900" as const,
    color: COLORS.darkGreen,
  },

  suggestionText: {
    marginTop: 3,
    fontSize: 9.5,
    lineHeight: 14,
    color: COLORS.muted,
  },

  /* ========================================================
     CANCELLED REASON
     ======================================================== */

  reasonCard: {
    marginTop: 9,
    minHeight: 61,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor:
      COLORS.paleYellow,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },

  reasonIcon: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor:
      COLORS.yellow,
  },

  reasonIconText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "900" as const,
  },

  reasonContent: {
    flex: 1,
    marginLeft: 9,
  },

  reasonLabel: {
    fontSize: 9,
    fontWeight: "900" as const,
    color: "#A36E05",
  },

  reasonValue: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700" as const,
    color: COLORS.text,
  },

  /* ========================================================
     ERROR
     ======================================================== */

  errorCard: {
    marginTop: 9,
    padding: 12,
    borderRadius: 14,
    backgroundColor:
      "#FFF0ED",
    borderWidth: 1,
    borderColor:
      "#F1D2CC",
  },

  errorTitle: {
    fontSize: 11,
    fontWeight: "900" as const,
    color: "#9A5148",
  },

  errorText: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    color: "#7D625D",
  },

  /* ========================================================
     BUTTONS
     ======================================================== */

  primaryButton: {
    height: 51,
    marginTop: 10,
    borderRadius: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor:
      COLORS.green,
  },

  primaryButtonIcon: {
    marginRight: 8,
    fontSize: 18,
    fontWeight: "800" as const,
    color: COLORS.white,
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: "900" as const,
    color: COLORS.white,
  },

  secondaryButton: {
    height: 49,
    marginTop: 7,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.green,
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "900" as const,
    color: COLORS.green,
  },

  pressed: {
    opacity: 0.78,
  },
};