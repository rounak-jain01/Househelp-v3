import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import type {
  ServiceCategory,
} from "../../services/firebase/categoryService";

import type {
  CustomerProfile,
} from "../../services/firebase/customerService";

type ServiceSelectionStepProps = {
  services: ServiceCategory[];
  selectedServices: string[];
  isLoading: boolean;
  error: string;
  disabled?: boolean;
  onToggleService: (
    serviceId: string,
  ) => void;
};

type StepperProps = {
  currentStep: 1 | 2 | 3;
};

type ScheduleStepProps = {
  selectedDate: Date | null;
  selectedTime: string | null;
  duration: number | null;
  onSelectDate: (
    date: Date,
  ) => void;
  onSelectTime: (
    time: string,
  ) => void;
  onSelectDuration: (
    duration: number,
  ) => void;
};

type ReviewBookingStepProps = {
  services: ServiceCategory[];
  selectedServices: string[];
  selectedDate: Date | null;
  selectedTime: string | null;
  duration: number | null;
  profile: CustomerProfile | null;
  onEditServices: () => void;
  onEditSchedule: () => void;
  onEditDuration: () => void;
  onEditAddress: () => void;
};

const DURATIONS = [
  1,
  2,
  3,
  4,
];

const TIME_SLOTS = [
  "9:00 AM",
  "11:00 AM",
  "1:00 PM",
  "3:00 PM",
  "5:00 PM",
  "7:00 PM",
];

function getServiceIcon(
  name: string,
) {
  switch (
    name.trim().toLowerCase()
  ) {
    case "cleaning":
      return require(
        "../../../assets/CustomerUi/CustomerBookings/cleaning.png",
      );

    case "cooking":
      return require(
        "../../../assets/CustomerUi/CustomerBookings/cooking.png",
      );

    case "laundry":
      return require(
        "../../../assets/CustomerUi/CustomerBookings/laundry.png",
      );

    case "dishwashing":
      return require(
        "../../../assets/CustomerUi/CustomerBookings/dishwashing.png",
      );

    default:
      return require(
        "../../../assets/CustomerUi/CustomerBookings/home-service.png",
      );
  }
}

function formatDayName(
  date: Date,
) {
  return date.toLocaleDateString(
    "en-IN",
    {
      weekday: "short",
    },
  );
}

function formatDayNumber(
  date: Date,
) {
  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
    },
  );
}

function formatMonth(
  date: Date,
) {
  return date.toLocaleDateString(
    "en-IN",
    {
      month: "short",
    },
  );
}

function getDateOptions(
  now: Date = new Date(),
) {
  return Array.from(
    {
      length: 5,
    },
    (_, index) => {
      const date =
        new Date(now);

      date.setHours(
        0,
        0,
        0,
        0,
      );

      date.setDate(
        now.getDate() +
          index,
      );

      return date;
    },
  );
}

function parseTimeSlot(
  time: string,
  date: Date,
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

function isTimeSlotAllowed(
  date: Date,
  time: string,
  now: Date = new Date(),
) {
  const minimumBookingTime =
    new Date(
      now.getTime() +
        2 * 60 * 60 * 1000,
    );

  const selectedDateTime =
    parseTimeSlot(
      time,
      date,
    );

  return (
    selectedDateTime.getTime() >=
    minimumBookingTime.getTime()
  );
}

function isSameCalendarDate(
  a: Date,
  b: Date,
) {
  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );
}

function formatSelectedTime(
  date: Date,
) {
  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

/* =========================================================
   STEPPER
========================================================= */

export function BookingStepper({
  currentStep,
}: StepperProps) {
  return (
    <View
      style={
        styles.stepperContainer
      }
    >
      <View
        style={
          styles.stepperRow
        }
      >
        <StepItem
          number={1}
          label="Services"
          completed={
            currentStep > 1
          }
          active={
            currentStep === 1
          }
        />

        <View
          style={[
            styles.connector,
            currentStep > 1 &&
              styles.connectorActive,
          ]}
        />

        <StepItem
          number={2}
          label="Schedule"
          completed={
            currentStep > 2
          }
          active={
            currentStep === 2
          }
        />

        <View
          style={[
            styles.connector,
            currentStep > 2 &&
              styles.connectorActive,
          ]}
        />

        <StepItem
          number={3}
          label="Confirmed"
          completed={false}
          active={
            currentStep === 3
          }
        />
      </View>
    </View>
  );
}

function StepItem({
  number,
  label,
  completed,
  active,
}: {
  number: number;
  label: string;
  completed: boolean;
  active: boolean;
}) {
  return (
    <View
      style={styles.stepItem}
    >
      <View
        style={[
          styles.stepCircle,
          completed &&
            styles.stepCircleCompleted,
          active &&
            styles.stepCircleActive,
        ]}
      >
        <Text
          style={[
            styles.stepCircleText,
            completed &&
              styles.stepCircleTextCompleted,
            active &&
              styles.stepCircleTextActive,
          ]}
        >
          {completed
            ? "✓"
            : number}
        </Text>
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

/* =========================================================
   STEP 1 — SERVICES
========================================================= */

export function ServiceSelectionStep({
  services,
  selectedServices,
  isLoading,
  error,
  disabled = false,
  onToggleService,
}: ServiceSelectionStepProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={
        false
      }
      contentContainerStyle={
        styles.scrollContent
      }
    >
      <View
        style={
          styles.sectionHeader
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Select your services
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          Choose one or more services
          you need
        </Text>
      </View>

      {isLoading ? (
        <View
          style={
            styles.stateCard
          }
        >
          <ActivityIndicator
            size="small"
            color="#123F3C"
          />

          <Text
            style={
              styles.stateText
            }
          >
            Loading services...
          </Text>
        </View>
      ) : error ? (
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
            Services unavailable
          </Text>

          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        </View>
      ) : services.length ===
        0 ? (
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
            No services available
          </Text>

          <Text
            style={
              styles.errorText
            }
          >
            Please try again later.
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.serviceGrid
          }
        >
          {services.map(
            (service) => {
              const selected =
                selectedServices.includes(
                  service.id,
                );

              const icon =
                getServiceIcon(
                  service.name,
                );

              return (
                <Pressable
                  key={service.id}
                  disabled={
                    disabled
                  }
                  onPress={() =>
                    onToggleService(
                      service.id,
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.serviceCard,
                    selected &&
                      styles.serviceCardSelected,
                    pressed &&
                      !disabled &&
                      styles.serviceCardPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      selected &&
                        styles.iconContainerSelected,
                    ]}
                  >
                    <Image
                      source={icon}
                      style={
                        styles.serviceIcon
                      }
                      resizeMode="contain"
                    />
                  </View>

                  <Text
                    numberOfLines={
                      2
                    }
                    style={[
                      styles.serviceName,
                      selected &&
                        styles.serviceNameSelected,
                    ]}
                  >
                    {service.name}
                  </Text>

                  <Text
                    style={[
                      styles.servicePrice,
                      selected &&
                        styles.servicePriceSelected,
                    ]}
                  >
                    ₹
                    {
                      service.ratePerHour
                    }
                    /hr
                  </Text>

                  {selected ? (
                    <View
                      style={
                        styles.checkBadge
                      }
                    >
                      <Text
                        style={
                          styles.checkText
                        }
                      >
                        ✓
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            },
          )}
        </View>
      )}

      {selectedServices.length >
      0 ? (
        <View
          style={
            styles.selectionSummary
          }
        >
          <Text
            style={
              styles.selectionSummaryText
            }
          >
            {
              selectedServices.length
            }{" "}
            service
            {selectedServices.length >
            1
              ? "s"
              : ""}{" "}
            selected
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

/* =========================================================
   STEP 2 — SCHEDULE
========================================================= */

export function ScheduleStep({
  selectedDate,
  selectedTime,
  duration,
  onSelectDate,
  onSelectTime,
  onSelectDuration,
}: ScheduleStepProps) {
  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    () => new Date(),
  );

  const [
    showDatePicker,
    setShowDatePicker,
  ] = useState(false);

  const [
    showTimePicker,
    setShowTimePicker,
  ] = useState(false);

  useEffect(() => {
    const timer =
      setInterval(() => {
        setCurrentTime(
          new Date(),
        );
      }, 30 * 1000);

    return () =>
      clearInterval(timer);
  }, []);

  const dateOptions =
    getDateOptions(
      currentTime,
    );

  const visibleDateOptions =
    selectedDate &&
    !dateOptions.some(
      (date) =>
        date.toDateString() ===
        selectedDate.toDateString(),
    )
      ? [
          selectedDate,
          ...dateOptions,
        ].slice(0, 5)
      : dateOptions;

  const activeDate =
    selectedDate ??
    visibleDateOptions[0];

  const minimumBookingTime =
    new Date(
      currentTime.getTime() +
        2 * 60 * 60 * 1000,
    );

  const isToday =
    isSameCalendarDate(
      activeDate,
      currentTime,
    );

  const handleDatePicked = (
    _event: unknown,
    date?: Date,
  ) => {
    setShowDatePicker(false);

    if (!date) {
      return;
    }

    const pickedDate =
      new Date(date);

    pickedDate.setHours(
      0,
      0,
      0,
      0,
    );

    onSelectDate(
      pickedDate,
    );

    if (selectedTime) {
      const pickedDateTime =
        parseTimeSlot(
          selectedTime,
          pickedDate,
        );

      const minimum =
        new Date(
          Date.now() +
            2 * 60 * 60 * 1000,
        );

      if (
        pickedDateTime.getTime() <
        minimum.getTime()
      ) {
        onSelectTime("");
      }
    }
  };

  const handleTimePicked = (
    _event: unknown,
    date?: Date,
  ) => {
    setShowTimePicker(false);

    if (!date) {
      return;
    }

    const pickedDateTime =
      new Date(activeDate);

    pickedDateTime.setHours(
      date.getHours(),
      date.getMinutes(),
      0,
      0,
    );

    const minimum =
      new Date(
        Date.now() +
          2 * 60 * 60 * 1000,
      );

    if (
      pickedDateTime.getTime() <
      minimum.getTime()
    ) {
      Alert.alert(
        "Choose a later time",
        "Booking time must be at least 2 hours from now.",
      );

      return;
    }

    onSelectTime(
      formatSelectedTime(
        date,
      ),
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={
        false
      }
      contentContainerStyle={
        styles.scheduleScrollContent
      }
    >
      <View
        style={
          styles.scheduleCard
        }
      >
        <View
          style={
            styles.scheduleHeader
          }
        >
          <View
            style={
              styles.scheduleIconBox
            }
          >
            <Image
              source={require(
                "../../../assets/CustomerUi/CustomerBookings/clock.png",
              )}
              style={
                styles.scheduleHeaderIcon
              }
              resizeMode="contain"
            />
          </View>

          <View
            style={
              styles.scheduleHeaderText
            }
          >
            <View
              style={
                styles.scheduleTitleRow
              }
            >
              <Text
                style={
                  styles.scheduleTitle
                }
              >
                Select Date
              </Text>

              <Pressable
                onPress={() =>
                  setShowDatePicker(
                    true,
                  )
                }
                style={
                  styles.pickerButton
                }
              >
                <Text
                  style={
                    styles.pickerButtonText
                  }
                >
                  Calendar
                </Text>
              </Pressable>
            </View>

            <Text
              style={
                styles.scheduleSubtitle
              }
            >
              Choose a convenient date
            </Text>
          </View>
        </View>

        <View
          style={
            styles.dateRow
          }
        >
          {visibleDateOptions.map(
            (date) => {
              const selected =
                activeDate.toDateString() ===
                date.toDateString();

              return (
                <Pressable
                  key={`${date.toISOString()}-${date.toDateString()}`}
                  onPress={() =>
                    onSelectDate(
                      date,
                    )
                  }
                  style={[
                    styles.dateOption,
                    selected &&
                      styles.dateOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateWeekday,
                      selected &&
                        styles.dateSelectedText,
                    ]}
                  >
                    {formatDayName(
                      date,
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.dateNumber,
                      selected &&
                        styles.dateSelectedText,
                    ]}
                  >
                    {formatDayNumber(
                      date,
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.dateMonth,
                      selected &&
                        styles.dateSelectedText,
                    ]}
                  >
                    {formatMonth(
                      date,
                    )}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <Pressable
          onPress={() =>
            setShowDatePicker(
              true,
            )
          }
          style={
            styles.secondaryPickerButton
          }
        >
          <Image
            source={require(
              "../../../assets/CustomerUi/CustomerBookings/clock.png",
            )}
            style={
              styles.secondaryPickerIcon
            }
            resizeMode="contain"
          />

          <Text
            style={
              styles.secondaryPickerText
            }
          >
            Pick another date
          </Text>

          <Text
            style={
              styles.secondaryPickerArrow
            }
          >
            ›
          </Text>
        </Pressable>
      </View>

      <View
        style={
          styles.scheduleCard
        }
      >
        <View
          style={
            styles.scheduleHeader
          }
        >
          <View
            style={
              styles.scheduleIconBox
            }
          >
            <Image
              source={require(
                "../../../assets/CustomerUi/CustomerBookings/calendar.png",
              )}
              style={
                styles.scheduleHeaderIcon
              }
              resizeMode="contain"
            />
          </View>

          <View
            style={
              styles.scheduleHeaderText
            }
          >
            <View
              style={
                styles.scheduleTitleRow
              }
            >
              <Text
                style={
                  styles.scheduleTitle
                }
              >
                Select Time
              </Text>

              <Pressable
                onPress={() =>
                  setShowTimePicker(
                    true,
                  )
                }
                style={
                  styles.pickerButton
                }
              >
                <Text
                  style={
                    styles.pickerButtonText
                  }
                >
                  Time Picker
                </Text>
              </Pressable>
            </View>

            <Text
              style={
                styles.scheduleSubtitle
              }
            >
              Pick a time slot
            </Text>
          </View>
        </View>

        <View
          style={
            styles.timeGrid
          }
        >
          {TIME_SLOTS.map(
            (time) => {
              const allowed =
                !isToday ||
                isTimeSlotAllowed(
                  activeDate,
                  time,
                  currentTime,
                );

              const selected =
                selectedTime ===
                time;

              return (
                <Pressable
                  key={time}
                  disabled={
                    !allowed
                  }
                  onPress={() =>
                    onSelectTime(
                      time,
                    )
                  }
                  style={[
                    styles.timeOption,
                    selected &&
                      styles.timeOptionSelected,
                    !allowed &&
                      styles.timeOptionDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      selected &&
                        styles.timeOptionTextSelected,
                      !allowed &&
                        styles.timeOptionTextDisabled,
                    ]}
                  >
                    {time}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <Pressable
          onPress={() =>
            setShowTimePicker(
              true,
            )
          }
          style={
            styles.secondaryPickerButton
          }
        >
          <Image
            source={require(
              "../../../assets/CustomerUi/CustomerBookings/calendar.png",
            )}
            style={
              styles.secondaryPickerIcon
            }
            resizeMode="contain"
          />

          <Text
            style={
              styles.secondaryPickerText
            }
          >
            Pick another time
          </Text>

          <Text
            style={
              styles.secondaryPickerArrow
            }
          >
            ›
          </Text>
        </Pressable>
      </View>

      <View
        style={
          styles.scheduleCard
        }
      >
        <View
          style={
            styles.scheduleHeader
          }
        >
          <View
            style={
              styles.hourglassIconBox
            }
          >
            <Text
              style={
                styles.hourglassIcon
              }
            >
              ⌛
            </Text>
          </View>

          <View>
            <Text
              style={
                styles.scheduleTitle
              }
            >
              How long do you need
              help?
            </Text>

            <Text
              style={
                styles.scheduleSubtitle
              }
            >
              Select duration
            </Text>
          </View>
        </View>

        <View
          style={
            styles.durationGrid
          }
        >
          {DURATIONS.map(
            (item) => {
              const selected =
                duration === item;

              return (
                <Pressable
                  key={item}
                  onPress={() =>
                    onSelectDuration(
                      item,
                    )
                  }
                  style={[
                    styles.durationOption,
                    selected &&
                      styles.durationOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationOptionText,
                      selected &&
                        styles.durationOptionTextSelected,
                    ]}
                  >
                    {item}{" "}
                    {item === 1
                      ? "hr"
                      : "hrs"}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
      </View>

      <View
        style={
          styles.bookingInfoCard
        }
      >
        <View
          style={
            styles.bookingInfoIcon
          }
        >
          <Text
            style={
              styles.bookingInfoIconText
            }
          >
            💡
          </Text>
        </View>

        <View
          style={
            styles.bookingInfoContent
          }
        >
          <Text
            style={
              styles.bookingInfoTitle
            }
          >
            Booking info
          </Text>

          <Text
            style={
              styles.bookingInfoBullet
            }
          >
            • You can book up to 4
            hours at a time.
          </Text>

          <Text
            style={
              styles.bookingInfoBullet
            }
          >
            • Minimum booking time
            is 2 hours from now.
          </Text>

          <Text
            style={
              styles.bookingInfoBullet
            }
          >
            • Total price will be
            shown on the next step.
          </Text>
        </View>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={
            activeDate
          }
          mode="date"
          display="default"
          minimumDate={
            new Date()
          }
          onChange={
            handleDatePicked
          }
        />
      ) : null}

      {showTimePicker ? (
        <DateTimePicker
          value={
            selectedTime
              ? parseTimeSlot(
                  selectedTime,
                  activeDate,
                )
              : minimumBookingTime
          }
          mode="time"
          display="default"
          onChange={
            handleTimePicked
          }
        />
      ) : null}
    </ScrollView>
  );
}

/* =========================================================
   STEP 3 — REVIEW
========================================================= */

export function ReviewBookingStep({
  services,
  selectedServices,
  selectedDate,
  selectedTime,
  duration,
  profile,
  onEditServices,
  onEditSchedule,
  onEditDuration,
  onEditAddress,
}: ReviewBookingStepProps) {
  const selectedServiceObjects =
    services.filter(
      (service) =>
        selectedServices.includes(
          service.id,
        ),
    );

  const hourlyTotal =
    selectedServiceObjects.reduce(
      (total, service) =>
        total +
        service.ratePerHour,
      0,
    );

  const totalAmount =
    duration
      ? hourlyTotal * duration
      : 0;

  const formattedDate =
    selectedDate
      ? selectedDate.toLocaleDateString(
          "en-IN",
          {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
          },
        )
      : "Date not selected";

  const formattedAddress =
    profile?.address?.formatted?.trim() ||
    "";

  const landmark =
    profile?.address?.landmark?.trim() ||
    "";

  return (
    <ScrollView
      showsVerticalScrollIndicator={
        false
      }
      contentContainerStyle={
        styles.reviewScrollContent
      }
    >
      {/* SERVICES */}

      <View
        style={
          styles.reviewCard
        }
      >
        <ReviewCardHeader
          title="Services"
          onEdit={
            onEditServices
          }
        />

        {selectedServiceObjects.map(
          (service) => (
            <View
              key={service.id}
              style={
                styles.reviewServiceRow
              }
            >
              <View
                style={
                  styles.reviewServiceIconBox
                }
              >
                <Image
                  source={
                    getServiceIcon(
                      service.name,
                    )
                  }
                  style={
                    styles.reviewServiceIcon
                  }
                  resizeMode="contain"
                />
              </View>

              <View
                style={
                  styles.reviewServiceCopy
                }
              >
                <Text
                  style={
                    styles.reviewServiceName
                  }
                >
                  {service.name}
                </Text>

                <Text
                  style={
                    styles.reviewServiceRate
                  }
                >
                  ₹
                  {
                    service.ratePerHour
                  }
                  /hr
                </Text>
              </View>
            </View>
          ),
        )}
      </View>

      {/* DATE & TIME */}

      <View
        style={
          styles.reviewCard
        }
      >
        <ReviewCardHeader
          title="Date & Time"
          onEdit={
            onEditSchedule
          }
        />

        <View
          style={
            styles.reviewInfoRow
          }
        >
          <View
            style={
              styles.reviewSmallIconBox
            }
          >
            <Image
              source={require(
                "../../../assets/CustomerUi/CustomerBookings/calendar.png",
              )}
              style={
                styles.reviewSmallIcon
              }
              resizeMode="contain"
            />
          </View>

          <Text
            style={
              styles.reviewValueText
            }
          >
            {formattedDate}
          </Text>
        </View>

        <View
          style={
            styles.reviewInfoRow
          }
        >
          <View
            style={
              styles.reviewSmallIconBox
            }
          >
            <Image
              source={require(
                "../../../assets/CustomerUi/CustomerBookings/calendar.png",
              )}
              style={
                styles.reviewSmallIcon
              }
              resizeMode="contain"
            />
          </View>

          <Text
            style={
              styles.reviewValueText
            }
          >
            {selectedTime ||
              "Time not selected"}
          </Text>
        </View>
      </View>

      {/* DURATION */}

      <View
        style={
          styles.reviewCard
        }
      >
        <ReviewCardHeader
          title="Duration"
          onEdit={
            onEditDuration
          }
        />

        <View
          style={
            styles.reviewInfoRow
          }
        >
          <View
            style={
              styles.reviewHourglassBox
            }
          >
            <Image
              source={require(
                "../../../assets/CustomerUi/CustomerBookings/hourglass.png",
              )}
              style={
                styles.reviewHourglassImage
              }
              resizeMode="contain"
            />
          </View>

          <Text
            style={
              styles.reviewValueText
            }
          >
            {duration
              ? `${duration} ${
                  duration === 1
                    ? "hour"
                    : "hours"
                }`
              : "Duration not selected"}
          </Text>
        </View>
      </View>

      {/* ADDRESS */}

      <View
        style={
          styles.reviewCard
        }
      >
        <ReviewCardHeader
          title="Home Address"
          onEdit={
            onEditAddress
          }
        />

        <View
          style={
            styles.reviewAddressRow
          }
        >
          <View
            style={
              styles.reviewSmallIconBox
            }
          >
            <Image
              source={require(
                "../../../assets/CustomerUi/CustomerBookings/location.png",
              )}
              style={
                styles.reviewSmallIcon
              }
              resizeMode="contain"
            />
          </View>

          <View
            style={
              styles.reviewAddressCopy
            }
          >
            <Text
              numberOfLines={3}
              style={
                styles.reviewAddressText
              }
            >
              {formattedAddress ||
                "No service address added"}
            </Text>

            {landmark ? (
              <Text
                style={
                  styles.reviewLandmark
                }
              >
                Landmark: {landmark}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* TOTAL */}

      <View
        style={
          styles.totalCard
        }
      >
        <View
          style={
            styles.totalCopy
          }
        >
          <Text
            style={
              styles.totalTitle
            }
          >
            Total Amount
          </Text>

          <Text
            style={
              styles.totalAmount
            }
          >
            ₹
            {totalAmount}
          </Text>

          <Text
            style={
              styles.totalBreakdown
            }
          >
            ₹
            {hourlyTotal}
            /hr × {duration ?? 0}{" "}
            {duration === 1
              ? "hr"
              : "hrs"}
          </Text>
        </View>

        <View
          style={
            styles.totalGraphicBox
          }
        >
          <Image
            source={require(
              "../../../assets/CustomerUi/CustomerBookings/wallet.png",
            )}
            style={
              styles.walletImage
            }
            resizeMode="contain"
          />
        </View>
      </View>

      {/* TRUST */}

      <View
        style={
          styles.trustCard
        }
      >
        <View
          style={
            styles.trustIconBox
          }
        >
          <Image
            source={require(
              "../../../assets/CustomerUi/CustomerBookings/shield-check.png",
            )}
            style={
              styles.trustIcon
            }
            resizeMode="contain"
          />
        </View>

        <View
          style={
            styles.trustCopy
          }
        >
          <Text
            style={
              styles.trustTitle
            }
          >
            Safe & Trusted
          </Text>

          <Text
            style={
              styles.trustText
            }
          >
            Verified helps, secure
            payments and a cleaner,
            happier home.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ReviewCardHeader({
  title,
  onEdit,
}: {
  title: string;
  onEdit: () => void;
}) {
  return (
    <View
      style={
        styles.reviewHeader
      }
    >
      <Text
        style={
          styles.reviewTitle
        }
      >
        {title}
      </Text>

      <Pressable
        onPress={onEdit}
        style={
          styles.editButton
        }
        hitSlop={8}
      >
        <Image
          source={require(
            "../../../assets/CustomerUi/CustomerBookings/edit.png",
          )}
          style={
            styles.editIcon
          }
          resizeMode="contain"
        />

        <Text
          style={
            styles.editText
          }
        >
          Edit
        </Text>
      </Pressable>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* ---------- STEPPER ---------- */

  stepperContainer: {
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 16,
  },

  stepperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  stepItem: {
    width: 72,
    alignItems: "center",
  },

  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDE5E1",
  },

  stepCircleActive: {
    backgroundColor: "#123F3C",
  },

  stepCircleCompleted: {
    backgroundColor: "#123F3C",
  },

  stepCircleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6F7D78",
  },

  stepCircleTextActive: {
    color: "#FFFFFF",
  },

  stepCircleTextCompleted: {
    color: "#FFFFFF",
  },

  stepLabel: {
    marginTop: 6,
    fontSize: 11,
    color: "#87928E",
    textAlign: "center",
    fontWeight: "500",
  },

  stepLabelActive: {
    color: "#102F2D",
    fontWeight: "800",
  },

  connector: {
    flex: 1,
    height: 2,
    marginTop: 16,
    backgroundColor: "#DCE4E0",
  },

  connectorActive: {
    backgroundColor: "#4AA78E",
  },

  /* ---------- STEP 1 ---------- */

  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 150,
  },

  sectionHeader: {
    marginTop: 6,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
    color: "#102536",
    letterSpacing: -0.5,
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#718078",
  },

  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },

  serviceCard: {
    width: "48%",
    minHeight: 156,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3E8E5",
    backgroundColor: "#FCFCFA",
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  serviceCardSelected: {
    borderColor: "#1C9D73",
    backgroundColor: "#F1F9F5",
  },

  serviceCardPressed: {
    opacity: 0.75,
  },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#F1F4EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  iconContainerSelected: {
    backgroundColor: "#E0F0E8",
  },

  serviceIcon: {
    width: 56,
    height: 56,
  },

  fallbackIcon: {
    fontSize: 30,
    fontWeight: "800",
    color: "#286358",
  },

  serviceName: {
    minHeight: 36,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#102536",
    textAlign: "center",
  },

  serviceNameSelected: {
    color: "#0E4B41",
  },

  servicePrice: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#7C8782",
  },

  servicePriceSelected: {
    color: "#287360",
  },

  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#123F3C",
    alignItems: "center",
    justifyContent: "center",
  },

  checkText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  stateCard: {
    minHeight: 140,
    borderRadius: 20,
    backgroundColor: "#F7F9F7",
    borderWidth: 1,
    borderColor: "#E3E9E5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    columnGap: 10,
  },

  stateText: {
    fontSize: 12,
    color: "#77837D",
  },

  errorCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FBF1EC",
    borderWidth: 1,
    borderColor: "#EBD9D0",
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#704D42",
  },

  errorText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    color: "#8B675A",
  },

  selectionSummary: {
    marginTop: 18,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EAF4EF",
  },

  selectionSummaryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#276B5D",
  },

  /* ---------- STEP 2 ---------- */

  scheduleScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 155,
  },

  scheduleCard: {
    marginBottom: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    backgroundColor: "#FFFFFF",
  },

  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  scheduleIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E8F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  scheduleHeaderIcon: {
    width: 30,
    height: 30,
  },

  scheduleHeaderText: {
    flex: 1,
  },

  scheduleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  scheduleTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: "#102F3D",
  },

  scheduleSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#61727F",
  },

  pickerButton: {
    marginLeft: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#EAF4EF",
  },

  pickerButtonText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#276B5D",
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  dateOption: {
    flex: 1,
    minHeight: 104,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  dateOptionSelected: {
    backgroundColor: "#123F3C",
    borderColor: "#123F3C",
  },

  dateWeekday: {
    fontSize: 13,
    fontWeight: "600",
    color: "#526876",
  },

  dateNumber: {
    marginTop: 5,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "800",
    color: "#102F3D",
  },

  dateMonth: {
    marginTop: 2,
    fontSize: 12,
    color: "#627580",
  },

  dateSelectedText: {
    color: "#FFFFFF",
  },

  secondaryPickerButton: {
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DCE6E1",
    backgroundColor: "#FAFCFB",
    flexDirection: "row",
    alignItems: "center",
  },

  secondaryPickerIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },

  secondaryPickerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#276B5D",
  },

  secondaryPickerArrow: {
    fontSize: 22,
    lineHeight: 22,
    color: "#276B5D",
  },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },

  timeOption: {
    width: "31.5%",
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E8E7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  timeOptionSelected: {
    backgroundColor: "#123F3C",
    borderColor: "#123F3C",
  },

  timeOptionDisabled: {
    backgroundColor: "#F4F5F4",
    borderColor: "#ECEFED",
  },

  timeOptionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#526876",
  },

  timeOptionTextSelected: {
    color: "#FFFFFF",
  },

  timeOptionTextDisabled: {
    color: "#B3BAB7",
  },

  hourglassIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F4EEE5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  hourglassIcon: {
    fontSize: 29,
  },

  durationGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  durationOption: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E8E7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  durationOptionSelected: {
    backgroundColor: "#123F3C",
    borderColor: "#123F3C",
  },

  durationOptionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#526876",
  },

  durationOptionTextSelected: {
    color: "#FFFFFF",
  },

  bookingInfoCard: {
    marginBottom: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 22,
    backgroundColor: "#EEF7F1",
    flexDirection: "row",
  },

  bookingInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DCEEE2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  bookingInfoIconText: {
    fontSize: 24,
  },

  bookingInfoContent: {
    flex: 1,
  },

  bookingInfoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#123F3C",
    marginBottom: 8,
  },

  bookingInfoBullet: {
    marginBottom: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#46645F",
  },

  /* ---------- STEP 3 ---------- */

  reviewScrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 155,
  },

  reviewCard: {
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 19,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6EBE8",
    backgroundColor: "#FFFFFF",
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  reviewTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#102F3D",
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  editIcon: {
    width: 19,
    height: 19,
    marginRight: 5,
  },

  editText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#145746",
  },

  reviewServiceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  reviewServiceIconBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: "#EEF5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  reviewServiceIcon: {
    width: 60,
    height: 60,
  },

  reviewServiceCopy: {
    flex: 1,
  },

  reviewServiceName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102F3D",
  },

  reviewServiceRate: {
    marginTop: 4,
    fontSize: 17,
    color: "#496275",
  },

  reviewInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  reviewSmallIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#EEF5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  reviewSmallIcon: {
    width: 28,
    height: 28,
  },

  reviewValueText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    color: "#4D6578",
  },

  reviewHourglassBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#EEF5EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  reviewHourglassImage: {
    width: 28,
    height: 28,
  },

  reviewAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  reviewAddressCopy: {
    flex: 1,
  },

  reviewAddressText: {
    fontSize: 16,
    lineHeight: 23,
    color: "#425B6E",
  },

  reviewLandmark: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "#657582",
  },

  totalCard: {
    marginBottom: 12,
    minHeight: 166,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 21,
    backgroundColor: "#EDF7F0",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  totalCopy: {
    flex: 1,
  },

  totalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#123F3C",
  },

  totalAmount: {
    marginTop: 5,
    fontSize: 39,
    lineHeight: 45,
    fontWeight: "900",
    color: "#0E3935",
  },

  totalBreakdown: {
    marginTop: 5,
    fontSize: 15,
    color: "#496579",
  },

  totalGraphicBox: {
    width: 145,
    height: 126,
    borderRadius: 62,
    backgroundColor: "#DDECE2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  walletImage: {
    width: 122,
    height: 108,
  },

  trustCard: {
    marginBottom: 10,
    minHeight: 112,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 21,
    backgroundColor: "#EEF7F1",
    flexDirection: "row",
    alignItems: "center",
  },

  trustIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D9EFE0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  trustIcon: {
    width: 55,
    height: 55,
  },

  trustCopy: {
    flex: 1,
  },

  trustTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#123F3C",
  },

  trustText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "#46645F",
  },

  /* ---------- FALLBACK ---------- */

  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  placeholderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102536",
    textAlign: "center",
  },

  placeholderSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#77837D",
    textAlign: "center",
  },
});
