import { useState } from "react";
import { sendOtp } from '../../services/firebase/phoneAuth';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PhoneAuthScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role: "user" | "maid" }>();
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

  const [phoneNumber, setPhoneNumber] = useState("");

  const isValidPhone = phoneNumber.length === 10;

  const [isLoading, setIsLoading] = useState(false);  

  const handleContinue = async () => {
  if (!phoneNumber.trim()) {
    return;
  }

  try {
    setIsLoading(true);

    const formattedPhone = `+91${phoneNumber.trim()}`;

    await sendOtp(formattedPhone);

    router.push({
      pathname: '/auth/otp',
      params: {
        phone: formattedPhone,
        role,
      },
    });
  } catch (error) {
    console.error('OTP send failed:', error);
    // Abhi UI error handling next step mein polish karenge.
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
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F5" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={10}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>

            <Text style={styles.headerTitle}>Phone number</Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Text style={styles.phoneIcon}>⌕</Text>
            </View>

            <Text style={styles.title}>{screenContent.title}</Text>

            <Text style={styles.subtitle}>{screenContent.subtitle}</Text>

            {/* Phone Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>MOBILE NUMBER</Text>

              <View
                style={[
                  styles.inputContainer,
                  phoneNumber.length > 0 && styles.inputFocused,
                ]}
              >
                <Text style={styles.countryCode}>+91</Text>

                <View style={styles.divider} />

                <TextInput
                  value={phoneNumber}
                  onChangeText={(value) =>
                    setPhoneNumber(value.replace(/[^0-9]/g, "").slice(0, 10))
                  }
                  placeholder="Enter mobile number"
                  placeholderTextColor="#A1A3A0"
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="done"
                  style={styles.input}
                  onSubmitEditing={handleContinue}
                />
              </View>

              <Text style={styles.helperText}>
                By continuing, you agree to receive an OTP on this number.
              </Text>
            </View>
            {/* Continue */}
<Pressable
  disabled={!isValidPhone}
  onPress={handleContinue}
  style={({ pressed }) => [
    styles.continueButton,
    !isValidPhone && styles.disabledButton,
    pressed && isValidPhone && styles.pressedButton,
  ]}
>
  <Text
    style={[
      styles.continueText,
      !isValidPhone && styles.disabledText,
    ]}
  >
    Continue
  </Text>

  <Text
    style={[
      styles.arrow,
      !isValidPhone && styles.disabledText,
    ]}
  >
    →
  </Text>
</Pressable>
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

  /* Header */

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

  /* Content */

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
    transform: [{ rotate: "-20deg" }],
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

  /* Input */

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

  /* Bottom */

  bottomSection: {
    paddingTop: 16,
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
