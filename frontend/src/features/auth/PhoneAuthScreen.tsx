import { useState } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendOtp } from "../../services/firebase/phoneAuth";

// import { sendOtp } from "../../src/services/firebase/phoneAuth";

export default function PhoneAuthScreen() {
  const insets = useSafeAreaInsets();

  const { role } =
    useLocalSearchParams<{
      role?: "user" | "maid";
    }>();

  const isHelp = role === "maid";

  const screenContent = isHelp
    ? {
        title: "Let's get you started",
        subtitle:
          "Enter your mobile number to connect with Homehelp and start providing services.",
      }
    : {
        title: "Let's get you started",
        subtitle:
          "Enter your mobile number to book trusted help for your home.",
      };

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const isValidPhone =
    phoneNumber.length === 10;

  const getFirebaseErrorMessage = (
    firebaseError: unknown,
  ): string => {
    const errorCode =
      typeof firebaseError === "object" &&
      firebaseError !== null &&
      "code" in firebaseError
        ? String(
            (
              firebaseError as {
                code?: unknown;
              }
            ).code ?? "",
          )
        : "";

    switch (errorCode) {
      case "auth/invalid-phone-number":
        return "Please enter a valid 10-digit mobile number.";

      case "auth/too-many-requests":
        return "Too many attempts. Please wait a while and try again.";

      case "auth/quota-exceeded":
        return "OTP service limit reached. Please try again later.";

      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";

      case "auth/app-not-authorized":
        return "This app is not authorized for phone verification.";

      case "auth/operation-not-allowed":
        return "Phone authentication is currently unavailable.";

      case "auth/user-disabled":
        return "This account has been disabled.";

      default:
        return "Unable to send OTP. Please try again.";
    }
  };

  const handlePhoneChange = (
    value: string,
  ) => {
    const cleanedValue = value
      .replace(/[^0-9]/g, "")
      .slice(0, 10);

    setPhoneNumber(cleanedValue);

    if (error) {
      setError("");
    }
  };

  const handleContinue = async () => {
    if (isLoading) {
      return;
    }

    const cleanPhone =
      phoneNumber.trim();

    if (!cleanPhone) {
      setError(
        "Please enter your mobile number.",
      );
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      setError(
        "Please enter a valid 10-digit mobile number.",
      );
      return;
    }

    if (!role) {
      setError(
        "Unable to identify your account type. Please go back and select your role again.",
      );
      return;
    }

    try {
      setError("");
      setIsLoading(true);

      const formattedPhone =
        `+91${cleanPhone}`;

      await sendOtp(formattedPhone);

      router.push({
        pathname: "/auth/otp",
        params: {
          phone: formattedPhone,
          role,
        },
      });
    } catch (sendError) {
      console.error(
        "[PhoneAuth] OTP send failed:",
        sendError,
      );

      setError(
        getFirebaseErrorMessage(
          sendError,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(
            insets.bottom,
            16,
          ),
        },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F7F7F5"
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <View style={styles.container}>
          {/* HEADER */}

          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={10}
              disabled={isLoading}
            >
              <Text style={styles.backIcon}>
                ‹
              </Text>
            </Pressable>

            <Text style={styles.headerTitle}>
              Phone number
            </Text>

            <View
              style={styles.headerSpacer}
            />
          </View>

          {/* MAIN CONTENT */}

          <View style={styles.content}>
            <View
              style={styles.iconContainer}
            >
              <Text
                style={styles.phoneIcon}
              >
                ⌕
              </Text>
            </View>

            <Text style={styles.title}>
              {screenContent.title}
            </Text>

            <Text style={styles.subtitle}>
              {screenContent.subtitle}
            </Text>

            {/* PHONE INPUT */}

            <View
              style={styles.inputSection}
            >
              <Text
                style={styles.inputLabel}
              >
                MOBILE NUMBER
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  phoneNumber.length > 0 &&
                    styles.inputFocused,
                  error &&
                    styles.inputError,
                ]}
              >
                <Text
                  style={styles.countryCode}
                >
                  +91
                </Text>

                <View
                  style={styles.divider}
                />

                <TextInput
                  value={phoneNumber}
                  onChangeText={
                    handlePhoneChange
                  }
                  placeholder="Enter mobile number"
                  placeholderTextColor="#A1A3A0"
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="done"
                  style={styles.input}
                  onSubmitEditing={
                    handleContinue
                  }
                  editable={!isLoading}
                />
              </View>

              {/* ERROR */}

              {error ? (
                <View
                  style={styles.errorContainer}
                >
                  <View
                    style={styles.errorIcon}
                  >
                    <Text
                      style={
                        styles.errorIconText
                      }
                    >
                      !
                    </Text>
                  </View>

                  <Text
                    style={styles.errorText}
                  >
                    {error}
                  </Text>
                </View>
              ) : (
                <Text
                  style={styles.helperText}
                >
                  By continuing, you agree to
                  receive an OTP on this number.
                </Text>
              )}
            </View>

            {/* BOTTOM BUTTON */}

            <View
              style={styles.bottomSection}
            >
              <Pressable
                disabled={
                  !isValidPhone ||
                  isLoading
                }
                onPress={
                  handleContinue
                }
                style={({
                  pressed,
                }) => [
                  styles.continueButton,
                  (!isValidPhone ||
                    isLoading) &&
                    styles.disabledButton,
                  pressed &&
                    isValidPhone &&
                    !isLoading &&
                    styles.pressedButton,
                ]}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.loadingButtonText
                      }
                    >
                      Sending OTP...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.continueText,
                        !isValidPhone &&
                          styles.disabledText,
                      ]}
                    >
                      Continue
                    </Text>

                    <Text
                      style={[
                        styles.arrow,
                        !isValidPhone &&
                          styles.disabledText,
                      ]}
                    >
                      →
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F7F5",
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },

  /* HEADER */

  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E7E7E3",
  },

  backIcon: {
    fontSize: 30,
    lineHeight: 32,
    color: "#202320",
    marginTop: -3,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#353735",
  },

  headerSpacer: {
    width: 42,
  },

  /* CONTENT */

  content: {
    flex: 1,
    paddingTop: 58,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#E5ECE6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  phoneIcon: {
    fontSize: 29,
    color: "#536257",
    transform: [
      {
        rotate: "-20deg",
      },
    ],
  },

  title: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#202320",
  },

  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: "#777A76",
  },

  /* INPUT */

  inputSection: {
    marginTop: 40,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    color: "#8A8D89",
    marginBottom: 10,
  },

  inputContainer: {
    height: 60,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#DFE0DC",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  inputFocused: {
    borderColor: "#617064",
  },

  inputError: {
    borderColor: "#D45448",
    backgroundColor: "#FFFDFC",
  },

  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#303330",
  },

  divider: {
    width: 1,
    height: 25,
    backgroundColor: "#E2E2DE",
    marginHorizontal: 13,
  },

  input: {
    flex: 1,
    height: "100%",
    fontSize: 17,
    color: "#202320",
    padding: 0,
    letterSpacing: 0.4,
  },

  helperText: {
    marginTop: 11,
    marginBottom: 11,
    fontSize: 11,
    lineHeight: 17,
    color: "#9A9C98",
  },

  /* ERROR */

  errorContainer: {
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF1EF",
    borderWidth: 1,
    borderColor: "#F0D0CB",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  errorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#C63C31",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 1,
  },

  errorIconText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  errorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: "#B42318",
  },

  /* BOTTOM */

  bottomSection: {
    marginTop: "auto",
    paddingTop: 24,
  },

  continueButton: {
    height: 56,
    borderRadius: 17,
    backgroundColor: "#202320",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    backgroundColor: "#DDDED9",
  },

  pressedButton: {
    opacity: 0.82,
  },

  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  loadingButtonText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  disabledText: {
    color: "#9C9E99",
  },

  arrow: {
    fontSize: 21,
    marginLeft: 10,
    marginTop: -2,
    color: "#FFFFFF",
  },
});