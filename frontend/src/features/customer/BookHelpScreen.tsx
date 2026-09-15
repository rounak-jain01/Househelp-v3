import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  subscribeToCustomerProfile,
  type CustomerProfile,
} from "../../services/firebase/customerService";

import {
  getActiveCategories,
  type ServiceCategory,
} from "../../services/firebase/categoryService";

import {
  createBooking,
} from "../../services/firebase/bookingService";

import {
  BookingStepper,
  ReviewBookingStep,
  ScheduleStep,
  ServiceSelectionStep,
} from "./BookingSteps";

type BookingStep = 1 | 2 | 3;

function combineDateAndTime(
  date: Date,
  time: string,
) {
  const [
    timePart,
    period,
  ] = time.split(" ");

  const [
    hourText,
    minuteText,
  ] = timePart.split(":");

  let hour =
    Number(hourText);

  const minute =
    Number(minuteText);

  if (
    period === "PM" &&
    hour !== 12
  ) {
    hour += 12;
  }

  if (
    period === "AM" &&
    hour === 12
  ) {
    hour = 0;
  }

  const result =
    new Date(date);

  result.setHours(
    hour,
    minute,
    0,
    0,
  );

  return result;
}

export default function BookHelpScreen() {
  const insets =
    useSafeAreaInsets();

  const [
    currentStep,
    setCurrentStep,
  ] = useState<BookingStep>(1);

  const [
    profile,
    setProfile,
  ] =
    useState<CustomerProfile | null>(
      null,
    );

  const [
    services,
    setServices,
  ] =
    useState<ServiceCategory[]>([]);

  const [
    isLoadingServices,
    setIsLoadingServices,
  ] = useState(true);

  const [
    serviceLoadError,
    setServiceLoadError,
  ] = useState("");

  const [
    selectedServices,
    setSelectedServices,
  ] = useState<string[]>([]);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState<Date | null>(null);

  const [
    selectedTime,
    setSelectedTime,
  ] = useState<string | null>(null);

  const [
    duration,
    setDuration,
  ] = useState<number | null>(null);

  const [
    bookingError,
    setBookingError,
  ] = useState("");

  const [
    isBooking,
    setIsBooking,
  ] = useState(false);

  useEffect(() => {
    const unsubscribe =
      subscribeToCustomerProfile(
        (customerProfile) => {
          setProfile(
            customerProfile,
          );
        },
        (error) => {
          console.error(
            "[BookHelp] Profile load failed:",
            error,
          );
        },
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadServices() {
      try {
        setIsLoadingServices(
          true,
        );
        setServiceLoadError("");

        const categories =
          await getActiveCategories();

        if (!mounted) {
          return;
        }

        setServices(
          categories,
        );
      } catch (error) {
        console.error(
          "[BookHelp] Category load failed:",
          error,
        );

        if (!mounted) {
          return;
        }

        setServiceLoadError(
          "Unable to load services. Please try again.",
        );
      } finally {
        if (mounted) {
          setIsLoadingServices(
            false,
          );
        }
      }
    }

    loadServices();

    return () => {
      mounted = false;
    };
  }, []);

  const formattedAddress =
    profile?.address?.formatted?.trim() ||
    "";

  const canReview =
    selectedServices.length > 0 &&
    selectedDate !== null &&
    selectedTime !== null &&
    duration !== null &&
    formattedAddress.length > 0;

  const totalPrice =
    useMemo(() => {
      if (!duration) {
        return 0;
      }

      return services
        .filter((service) =>
          selectedServices.includes(
            service.id,
          ),
        )
        .reduce(
          (total, service) =>
            total +
            service.ratePerHour *
              duration,
          0,
        );
    }, [
      duration,
      selectedServices,
      services,
    ]);

  const toggleService = (
    serviceId: string,
  ) => {
    setBookingError("");

    setSelectedServices(
      (current) => {
        if (
          current.includes(
            serviceId,
          )
        ) {
          return current.filter(
            (id) =>
              id !== serviceId,
          );
        }

        return [
          ...current,
          serviceId,
        ];
      },
    );
  };

  const handleSelectDate = (
    date: Date,
  ) => {
    setBookingError("");
    setSelectedDate(
      date,
    );

    if (
      selectedTime
    ) {
      const candidate =
        combineDateAndTime(
          date,
          selectedTime,
        );

      const minimum =
        new Date(
          Date.now() +
            2 * 60 * 60 * 1000,
        );

      if (
        candidate.getTime() <
        minimum.getTime()
      ) {
        setSelectedTime(
          null,
        );
      }
    }
  };

  const handleSelectTime = (
    time: string,
  ) => {
    setBookingError("");

    if (!time) {
      setSelectedTime(
        null,
      );
      return;
    }

    setSelectedTime(
      time,
    );
  };

  const handleSelectDuration = (
    value: number,
  ) => {
    setBookingError("");
    setDuration(
      value,
    );
  };

  const handleNext = () => {
    setBookingError("");

    if (
      currentStep === 1
    ) {
      if (
        selectedServices.length ===
        0
      ) {
        setBookingError(
          "Please select at least one service.",
        );
        return;
      }

      setCurrentStep(2);
      return;
    }

    if (
      currentStep === 2
    ) {
      if (!selectedDate) {
        setBookingError(
          "Please select a date.",
        );
        return;
      }

      if (!selectedTime) {
        setBookingError(
          "Please select a time.",
        );
        return;
      }

      if (!duration) {
        setBookingError(
          "Please select the duration.",
        );
        return;
      }

      setCurrentStep(3);
      return;
    }

    if (
      currentStep === 3
    ) {
      void handleCreateBooking();
    }
  };

  const handleCreateBooking =
    async () => {
      if (!selectedDate) {
        setBookingError(
          "Please select a date.",
        );
        return;
      }

      if (!selectedTime) {
        setBookingError(
          "Please select a time.",
        );
        return;
      }

      if (!duration) {
        setBookingError(
          "Please select the duration.",
        );
        return;
      }

      if (
        selectedServices.length ===
        0
      ) {
        setBookingError(
          "Please select at least one service.",
        );
        return;
      }

      if (!formattedAddress) {
        setBookingError(
          "Please add your service address first.",
        );
        return;
      }

      const scheduledDateTime =
        combineDateAndTime(
          selectedDate,
          selectedTime,
        );

      if (
        scheduledDateTime.getTime() <
        Date.now() +
          2 * 60 * 60 * 1000
      ) {
        setBookingError(
          "Please choose a time at least 2 hours from now.",
        );
        setCurrentStep(
          2,
        );
        return;
      }

      try {
        setBookingError("");
        setIsBooking(
          true,
        );

        const booking =
          await createBooking({
            categoryIds:
              selectedServices,
            duration,
            scheduledDateTime,
          });

        router.replace(
          `/customer/booking/${booking.bookingId}`,
        );
      } catch (error) {
        console.error(
          "[BookHelp] Booking creation failed:",
          error,
        );

        setBookingError(
          error instanceof Error
            ? error.message
            : "Unable to create your booking. Please try again.",
        );

        setIsBooking(
          false,
        );
      }
    };

  const handleBack = () => {
    if (isBooking) {
      return;
    }

    setBookingError("");

    if (
      currentStep === 1
    ) {
      router.back();
      return;
    }

    setCurrentStep(
      (currentStep -
        1) as BookingStep,
    );
  };

  const handleEditServices =
    () => {
      setBookingError("");
      setCurrentStep(1);
    };

  const handleEditSchedule =
    () => {
      setBookingError("");
      setCurrentStep(2);
    };

  const handleEditDuration =
    () => {
      setBookingError("");
      setCurrentStep(2);
    };

  const handleEditAddress =
    () => {
      if (isBooking) {
        return;
      }

      router.push(
        "/customer/profile",
      );
    };

  const buttonLabel =
    currentStep === 3
      ? "Confirm Booking"
      : "Continue";

  const buttonDisabled =
    isBooking ||
    (currentStep === 1 &&
      selectedServices.length ===
        0) ||
    (currentStep === 2 &&
      (!selectedDate ||
        !selectedTime ||
        !duration)) ||
    (currentStep === 3 &&
      !canReview);

  return (
    <View
      style={styles.container}
    >
      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 8,
          },
        ]}
      >
        <Pressable
          style={
            styles.backButton
          }
          onPress={
            handleBack
          }
          disabled={
            isBooking
          }
        >
          <Text
            style={
              styles.backIcon
            }
          >
            ‹
          </Text>
        </Pressable>

        <View
          style={
            styles.headerCopy
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            {currentStep === 3
              ? "Review Booking"
              : "Book Help"}
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            {currentStep === 1
              ? "Select the services you need"
              : currentStep === 2
              ? "Choose your schedule"
              : "Review and confirm your booking"}
          </Text>
        </View>
      </View>

      {/* STEPPER */}

      <BookingStepper
        currentStep={
          currentStep
        }
      />

      {/* CONTENT */}

      <View
        style={
          styles.content
        }
      >
        {currentStep ===
        1 ? (
          <ServiceSelectionStep
            services={services}
            selectedServices={
              selectedServices
            }
            isLoading={
              isLoadingServices
            }
            error={
              serviceLoadError
            }
            disabled={
              isBooking
            }
            onToggleService={
              toggleService
            }
          />
        ) : currentStep ===
          2 ? (
          <ScheduleStep
            selectedDate={
              selectedDate
            }
            selectedTime={
              selectedTime
            }
            duration={
              duration
            }
            onSelectDate={
              handleSelectDate
            }
            onSelectTime={
              handleSelectTime
            }
            onSelectDuration={
              handleSelectDuration
            }
          />
        ) : (
          <ReviewBookingStep
            services={
              services
            }
            selectedServices={
              selectedServices
            }
            selectedDate={
              selectedDate
            }
            selectedTime={
              selectedTime
            }
            duration={
              duration
            }
            profile={
              profile
            }
            onEditServices={
              handleEditServices
            }
            onEditSchedule={
              handleEditSchedule
            }
            onEditDuration={
              handleEditDuration
            }
            onEditAddress={
              handleEditAddress
            }
          />
        )}
      </View>

      {/* ERROR */}

      {bookingError ? (
        <View
          style={
            styles.errorBox
          }
        >
          <Text
            style={
              styles.errorIcon
            }
          >
            !
          </Text>

          <Text
            style={
              styles.errorText
            }
          >
            {bookingError}
          </Text>
        </View>
      ) : null}

      {/* CTA */}

      <View
        style={[
          styles.bottomAction,
          {
            paddingBottom:
              Math.max(
                insets.bottom +
                  10,
                18,
              ),
          },
        ]}
      >
        <Pressable
          disabled={
            buttonDisabled
          }
          onPress={
            handleNext
          }
          style={[
            styles.continueButton,
            buttonDisabled &&
              styles.continueButtonDisabled,
          ]}
        >
          {isBooking ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Text
                style={
                  styles.continueText
                }
              >
                {buttonLabel}
              </Text>

              <Text
                style={
                  styles.continueArrow
                }
              >
                →
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    flexDirection:
      "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 6,
  },

  backButton: {
    width: 38,
    height: 42,
    alignItems:
      "flex-start",
    justifyContent:
      "center",
  },

  backIcon: {
    fontSize: 36,
    lineHeight: 38,
    color: "#102536",
  },

  headerCopy: {
    flex: 1,
    marginLeft: 2,
  },

  headerTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
    color: "#102536",
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#718078",
  },

  content: {
    flex: 1,
  },

  errorBox: {
    position:
      "absolute",
    left: 22,
    right: 22,
    bottom: 166,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F8EDEA",
    borderWidth: 1,
    borderColor: "#E9D4CF",
    flexDirection:
      "row",
    alignItems:
      "center",
    zIndex: 10,
  },

  errorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
    textAlign: "center",
    textAlignVertical:
      "center",
    backgroundColor: "#A85D50",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  errorText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: "#8D5147",
  },

  bottomAction: {
    position:
      "absolute",
    left: 0,
    right: 0,
    bottom: 76,
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor:
      "rgba(255,255,255,0.98)",
    borderTopWidth: 1,
    borderTopColor:
      "#EEF0EF",
  },

  continueButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor:
      "#123F3C",
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  continueButtonDisabled: {
    backgroundColor:
      "#D7DEDB",
  },

  continueText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  continueArrow: {
    marginLeft: 12,
    fontSize: 23,
    lineHeight: 24,
    color: "#FFFFFF",
  },
});
