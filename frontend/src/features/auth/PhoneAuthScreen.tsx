import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendOtp } from "../../services/firebase/phoneAuth";

const ASSETS = {
  logo: require("../../../assets/CustomerUi/logo.png"),
  backArrow: require("../../../assets/CustomerUi/back-arrow.png"),
  buttonArrow: require("../../../assets/CustomerUi/button-arrow.png"),
  login: require("../../../assets/CustomerUi/login.png"),
  safe: require("../../../assets/CustomerUi/safe.png"),
  trusted: require("../../../assets/CustomerUi/trusted.png"),
  better: require("../../../assets/CustomerUi/better.png"),
} satisfies {
  logo: ImageSourcePropType;
  backArrow: ImageSourcePropType;
  buttonArrow: ImageSourcePropType;
  login: ImageSourcePropType;
  safe: ImageSourcePropType;
  trusted: ImageSourcePropType;
  better: ImageSourcePropType;
};

type Role = "user" | "maid";

type BenefitProps = {
  icon: ImageSourcePropType;
  title: string;
  text: string;
};

export default function PhoneAuthScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { role } = useLocalSearchParams<{ role?: Role }>();
  const isHelp = role === "maid";

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const horizontalPadding = Math.min(24, Math.max(16, width * 0.055));
  const safeTop = Math.max(insets.top, 8);
  const safeBottom = Math.max(insets.bottom, 8);
  const availableHeight = Math.max(520, height - safeTop - safeBottom);

  // The complete screen is designed around a single visual proportion.
  // These numbers scale with the device instead of using one fixed phone height.
  const scale = Math.min(1.08, Math.max(0.84, availableHeight / 760));
  const isCompact = availableHeight < 680;

  const dims = useMemo(
    () => ({
      logoW: 170 * scale,
      logoH: 54 * scale,
      arrow: 28 * scale,
      headerH: 60 * scale,
      heroH: 252 * scale,
      title: 35 * scale,
      subtitle: 15.5 * scale,
      inputH: 66 * scale,
      buttonH: 58 * scale,
      benefitIcon: 48 * scale,
      benefitTitle: 15.5 * scale,
      benefitText: 13 * scale,
    }),
    [scale],
  );

  const contentBottomSpacing = isCompact ? 5 : 12;

  const getFirebaseErrorMessage = (firebaseError: unknown): string => {
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

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value.replace(/[^0-9]/g, "").slice(0, 10));
    if (error) setError("");
  };

  const handleContinue = async () => {
    if (isLoading) return;

    const cleanPhone = phoneNumber.trim();

    if (!cleanPhone) {
      setError("Please enter your mobile number.");
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!role) {
      setError("Unable to identify your account type. Please go back and select your role again.");
      return;
    }

    try {
      setError("");
      setIsLoading(true);

      const formattedPhone = `+91${cleanPhone}`;
      await sendOtp(formattedPhone);

      router.push({
        pathname: "/auth/otp",
        params: { phone: formattedPhone, role },
      });
    } catch (sendError) {
      console.error("[PhoneAuth] OTP send failed:", sendError);
      setError(getFirebaseErrorMessage(sendError));
    } finally {
      setIsLoading(false);
    }
  };

  const benefits: BenefitProps[] = [
    {
      icon: ASSETS.safe,
      title: "Safe & Secure",
      text: "Your information is always protected.",
    },
    {
      icon: ASSETS.trusted,
      title: "Trusted by Many",
      text: "Thousands of happy homes.",
    },
    {
      icon: ASSETS.better,
      title: "Better Homes",
      text: "A brighter tomorrow.",
    },
  ];

  const body = (
    <View
      style={[
        styles.page,
        {
          paddingTop: safeTop,
          paddingBottom: safeBottom + contentBottomSpacing,
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <View style={[styles.header, { height: dims.headerH }]}>
        <Pressable
          onPress={() => router.back()}
          disabled={isLoading}
          hitSlop={10}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Image
            source={ASSETS.backArrow}
            style={{ width: dims.arrow, height: dims.arrow }}
            resizeMode="contain"
          />
        </Pressable>

        <Image
          source={ASSETS.logo}
          style={{ width: dims.logoW, height: dims.logoH }}
          resizeMode="contain"
          accessibilityLabel="Homehelp logo"
        />

        <View style={styles.headerRightSpace} />
      </View>

      {/* HERO: transparent artwork is layered behind the text, not over it. */}
      <View style={[styles.hero, { height: dims.heroH }]}>
        <View style={styles.heroBlob} />

        <Image
          source={ASSETS.login}
          style={[styles.heroImage, { width: `${76 * scale}%` }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

        <View style={styles.heroCopy} pointerEvents="none">
          <Text
            style={{
              ...styles.title,
              fontSize: dims.title,
              lineHeight: dims.title * 1.02,
            }}
          >
            Let’s get{"\n"}you started
          </Text>

          <Text
            style={{
              ...styles.subtitle,
              fontSize: dims.subtitle,
              lineHeight: dims.subtitle * 1.48,
            }}
          >
            Enter your mobile number{"\n"}to continue.
          </Text>
        </View>
      </View>

      <View style={styles.inputCard}>
        <View
          style={[
            styles.inputRow,
            {
              height: dims.inputH,
              borderRadius: 17 * scale,
            },
            phoneNumber.length > 0 && styles.inputFocused,
            error && styles.inputError,
          ]}
        >
          <View style={styles.countryBlock}>
            <Text style={{ fontSize: 20 * scale }}>🇮🇳</Text>
            <Text style={[styles.countryCode, { fontSize: 16 * scale }]}>+91</Text>
            <Text style={{ fontSize: 20 * scale, color: "#607069", marginLeft: 7, marginTop: -4 }}>⌄</Text>
          </View>

          <View style={styles.inputDivider} />

          <TextInput
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            placeholder="Enter mobile number"
            placeholderTextColor="#8E9A94"
            keyboardType="number-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            editable={!isLoading}
            style={[styles.input, { fontSize: 16 * scale }]}
          />
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.helperText}>
            By continuing, you agree to receive an OTP on this number.
          </Text>
        )}
      </View>

      <Pressable
        disabled={phoneNumber.length !== 10 || isLoading}
        onPress={handleContinue}
        style={({ pressed }) => [
          styles.continueButton,
          { height: dims.buttonH, borderRadius: dims.buttonH / 2 },
          (phoneNumber.length !== 10 || isLoading) && styles.disabledButton,
          pressed && phoneNumber.length === 10 && !isLoading && styles.pressedButton,
        ]}
      >
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.loadingText}>Sending OTP...</Text>
          </>
        ) : (
          <>
            <Text style={[styles.continueText, { fontSize: 17 * scale }, phoneNumber.length !== 10 && styles.disabledText]}>
              Continue
            </Text>
            <Image
              source={ASSETS.buttonArrow}
              style={{ width: 26 * scale, height: 26 * scale, opacity: phoneNumber.length !== 10 ? 0.38 : 1 }}
              resizeMode="contain"
            />
          </>
        )}
      </Pressable>

      <View
        style={[
          styles.benefits,
          { marginTop: 14 * scale, gap: isCompact ? 5 * scale : 8 * scale },
        ]}
      >
        {benefits.map((item) => (
          <Benefit key={item.title} {...item} scale={scale} />
        ))}
      </View>

      <View pointerEvents="none" style={styles.bottomWave} />
      <Text style={[styles.bottomText, { fontSize: 13 * scale }]}>Same homes. A brighter tomorrow.</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF7" />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ minHeight: Math.max(0, availableHeight) }}
          scrollEnabled={keyboardVisible}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Benefit({ icon, title, text, scale }: BenefitProps & { scale: number }) {
  return (
    <View style={styles.benefitRow}>
      <View
        style={[
          styles.benefitIcon,
          {
            width: 48 * scale,
            height: 48 * scale,
            borderRadius: 17 * scale,
            marginRight: 11 * scale,
          },
        ]}
      >
        <Image source={icon} style={{ width: 31 * scale, height: 31 * scale }} resizeMode="contain" />
      </View>
      <View style={styles.benefitCopy}>
        <Text style={[styles.benefitTitle, { fontSize: 15.5 * scale }]}>{title}</Text>
        <Text style={[styles.benefitText, { fontSize: 13 * scale, lineHeight: 17 * scale }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAFAF7",
  },
  keyboard: {
    flex: 1,
  },
  page: {
    flex: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerRightSpace: {
    width: 40,
  },
  hero: {
    position: "relative",
    marginHorizontal: -4,
    marginTop: 0,
    overflow: "visible",
  },
  heroBlob: {
    position: "absolute",
    right: -86,
    top: 8,
    width: 268,
    height: 268,
    borderRadius: 134,
    backgroundColor: "#EEF3EB",
  },
  heroImage: {
    position: "absolute",
    right: -110,
    top: -4,
    height: "108%",
    zIndex: 1,
  },
  heroCopy: {
    position: "absolute",
    left: 6,
    top: 73,
    zIndex: 5,
    width: "66%",
  },
  title: {
    fontWeight: "800",
    letterSpacing: -1.45,
    color: "#102A25",
  },
  subtitle: {
    marginTop: 13,
    color: "#52635E",
    fontWeight: "400",
  },
  inputCard: {
    marginTop: -4,
    paddingHorizontal: 3,
    zIndex: 10,
  },
  inputRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E6E1",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  inputFocused: {
    borderColor: "#174B3D",
  },
  inputError: {
    borderColor: "#D45448",
  },
  countryBlock: {
    minWidth: 136,
    flexDirection: "row",
    alignItems: "center",
  },
  countryCode: {
    marginLeft: 8,
    fontWeight: "700",
    color: "#21342D",
  },
  inputDivider: {
    width: 1,
    height: 31,
    marginRight: 14,
    backgroundColor: "#E3E7E3",
  },
  input: {
    flex: 1,
    height: "100%",
    padding: 0,
    color: "#1E302A",
  },
  helperText: {
    marginTop: 7,
    paddingHorizontal: 3,
    fontSize: 10.5,
    lineHeight: 14,
    color: "#8A9490",
  },
  errorText: {
    marginTop: 7,
    paddingHorizontal: 3,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "600",
    color: "#B42318",
  },
  continueButton: {
    marginTop: 12,
    backgroundColor: "#174B3D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    zIndex: 12,
  },
  disabledButton: {
    backgroundColor: "#DDE3DE",
  },
  pressedButton: {
    opacity: 0.84,
  },
  continueText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disabledText: {
    color: "#8E9992",
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  benefits: {
    zIndex: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  benefitIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EEE8",
  },
  benefitCopy: {
    flex: 1,
  },
  benefitTitle: {
    fontWeight: "800",
    color: "#102A25",
  },
  benefitText: {
    marginTop: 1,
    color: "#52635E",
  },
  bottomWave: {
    position: "absolute",
    left: -50,
    right: -50,
    bottom: -76,
    height: 140,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    backgroundColor: "#EFF4EC",
    transform: [{ rotate: "-7deg" }],
  },
  bottomText: {
    marginTop: "auto",
    paddingTop: 4,
    textAlign: "center",
    color: "#52635E",
    zIndex: 8,
  },
  scroll: {
    flex: 1,
  },
});
