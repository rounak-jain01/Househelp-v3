import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UserRole = "user" | "maid";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [selectedRole, setSelectedRole] =
    useState<UserRole | null>(null);
  const [sliderWidth, setSliderWidth] = useState(0);

  const thumbX = useRef(new Animated.Value(0)).current;
  const startX = useRef(0);
  const selectedRoleRef = useRef<UserRole | null>(null);

  const isSmall = height < 780;
  const isNarrow = width < 390;
  const sliderThumbSize = isNarrow ? 48 : 54;
  const sliderPadding = 6;

  const sliderMax = Math.max(
    0,
    sliderWidth - sliderThumbSize - sliderPadding * 2,
  );

  const handleComplete = () => {
    const role = selectedRoleRef.current;

    if (!role) return;

    router.push({
      pathname: "/auth/phone",
      params: { role },
    });
  };

  const sliderResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          Boolean(selectedRoleRef.current),
        onMoveShouldSetPanResponder: () =>
          Boolean(selectedRoleRef.current),
        onPanResponderGrant: () => {
          thumbX.stopAnimation((value) => {
            startX.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          thumbX.setValue(
            clamp(
              startX.current + gestureState.dx,
              0,
              sliderMax,
            ),
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          const nextX = clamp(
            startX.current + gestureState.dx,
            0,
            sliderMax,
          );

          const threshold = sliderMax * 0.78;

          if (sliderMax > 0 && nextX >= threshold) {
            Animated.timing(thumbX, {
              toValue: sliderMax,
              duration: 120,
              useNativeDriver: false,
            }).start(handleComplete);
            return;
          }

          Animated.spring(thumbX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 110,
            friction: 10,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(thumbX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 110,
            friction: 10,
          }).start();
        },
      }),
    [handleComplete, sliderMax, thumbX],
  );

  const handleRoleChange = (role: UserRole) => {
    selectedRoleRef.current = role;
    setSelectedRole(role);

    Animated.spring(thumbX, {
      toValue: 0,
      useNativeDriver: false,
      tension: 110,
      friction: 10,
    }).start();
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F8F7F3"
      />

      {/* ===== BACKGROUND GEOMETRY ===== */}
      <View pointerEvents="none" style={styles.geometry}>
        {/* Large sage circle */}
        <View style={styles.geoCircleLarge} />

        {/* Soft cream circle */}
        <View style={styles.geoCircleSmall} />

        {/* Slanted upper pill */}
        <View style={styles.geoSlantedPill} />

        {/* Bottom-right angular shape */}
        <View style={styles.geoBottomShapeA} />
        <View style={styles.geoBottomShapeB} />

        {/* Tiny top-right rounded bar */}
        <View style={styles.geoTopRightBar} />
      </View>

      <View style={styles.container}>
        {/* ===== BRAND HEADER ===== */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <View style={styles.logoRoof} />
              <View style={styles.logoHouse} />
            </View>

            <View>
              <Text style={styles.brand}>homehelp</Text>
              <Text style={styles.brandTag}>
                BETTER HOMES · BETTER LIVING
              </Text>
            </View>
          </View>

          <View style={styles.utilityShape}>
            <View style={styles.utilityInner}>
              <View style={styles.utilityDot} />
            </View>
          </View>
        </View>

        {/* ===== HERO ===== */}
        <View
          style={[
            styles.hero,
            isSmall && styles.heroSmall,
          ]}
        >
          <Text style={styles.overline}>WELCOME</Text>

          <Text style={styles.heroTitle}>
            A calmer home,
            {"\n"}
            <Text style={styles.heroAccent}>starts here.</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Trusted home services, thoughtfully matched
            {"\n"}
            to make everyday living feel easier.
          </Text>

          <View style={styles.heroRule} />

          <Text style={styles.heroMeta}>
            SIMPLE · TRUSTED · ON DEMAND
          </Text>
        </View>

        {/* ===== ROLE SELECTOR ===== */}
        <View
          style={[
            styles.roleSection,
            isSmall && styles.roleSectionSmall,
          ]}
        >
          <Text style={styles.sectionEyebrow}>CHOOSE YOUR PATH</Text>

          <Text style={styles.sectionTitle}>
            How would you like to continue?
          </Text>

          <View style={styles.roleRow}>
            {/* CUSTOMER */}
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => handleRoleChange("user")}
              style={[
                styles.roleCard,
                styles.customerCard,
                selectedRole === "user" &&
                  styles.roleCardSelected,
              ]}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.roleIcon,
                    styles.customerIcon,
                    selectedRole === "user" &&
                      styles.iconSelectedBg,
                  ]}
                >
                  <View style={styles.homeIcon}>
                    <View style={styles.homeRoof} />
                    <View style={styles.homeBody} />
                  </View>
                </View>

                <Radio selected={selectedRole === "user"} />
              </View>

              <Text style={styles.cardNumber}>01</Text>

              <Text style={styles.roleTitle}>Customer</Text>

              <Text style={styles.roleDescription}>
                Book trusted help
                {"\n"}
                for your home
              </Text>

              <View
                pointerEvents="none"
                style={styles.customerShape}
              />
            </TouchableOpacity>

            {/* HELP */}
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => handleRoleChange("maid")}
              style={[
                styles.roleCard,
                styles.helpCard,
                selectedRole === "maid" &&
                  styles.roleCardSelected,
              ]}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.roleIcon,
                    styles.helpIcon,
                    selectedRole === "maid" &&
                      styles.helpIconSelected,
                  ]}
                >
                  <View style={styles.personIcon}>
                    <View style={styles.personHead} />
                    <View style={styles.personBody} />
                  </View>
                </View>

                <Radio selected={selectedRole === "maid"} />
              </View>

              <Text style={styles.cardNumber}>02</Text>

              <Text style={styles.roleTitle}>Help</Text>

              <Text style={styles.roleDescription}>
                Provide services
                {"\n"}
                and earn with flexibility
              </Text>

              <View
                pointerEvents="none"
                style={styles.helpShape}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== BOTTOM SLIDER CTA ===== */}
        <View style={styles.bottom}>
          <View style={styles.quoteRow}>
            <View style={styles.quoteLine} />

            <Text style={styles.quoteText}>
              A better way to care for your home.
            </Text>
          </View>

          <View
            style={[
              styles.sliderTrack,
              !selectedRole &&
                styles.sliderTrackDisabled,
            ]}
            onLayout={(event) => {
              setSliderWidth(
                event.nativeEvent.layout.width,
              );
            }}
            {...sliderResponder.panHandlers}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sliderProgress,
                {
                  width: thumbX.interpolate({
                    inputRange: [
                      0,
                      Math.max(sliderMax, 1),
                    ],
                    outputRange: [
                      sliderThumbSize + 10,
                      Math.max(
                        sliderWidth,
                        sliderThumbSize + 10,
                      ),
                    ],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            />

            <Text
              pointerEvents="none"
              style={[
                styles.sliderLabel,
                !selectedRole &&
                  styles.sliderLabelDisabled,
              ]}
            >
              {selectedRole
                ? "SLIDE TO CONTINUE"
                : "SELECT A ROLE TO CONTINUE"}
            </Text>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.sliderThumb,
                {
                  width: sliderThumbSize,
                  height: sliderThumbSize,
                  borderRadius:
                    sliderThumbSize / 2,
                  top: 6,
                  left: sliderPadding,
                  transform: [
                    { translateX: thumbX },
                  ],
                },
              ]}
            >
              <Text style={styles.sliderArrow}>
                →
              </Text>
            </Animated.View>
          </View>

          <Text style={styles.footer}>
            PEOPLE · HOMES · BETTER LIVING
          </Text>
        </View>
      </View>
    </View>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View
      style={[
        styles.radio,
        selected && styles.radioSelected,
      ]}
    >
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F7F3",
    overflow: "hidden",
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 6,
  },

  /* Background geometry */
  geometry: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  geoCircleLarge: {
    position: "absolute",
    width: 245,
    height: 245,
    borderRadius: 123,
    right: -118,
    top: 226,
    backgroundColor: "#DCE4DB",
  },

  geoCircleSmall: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    left: -40,
    top: 620,
    backgroundColor: "#E7DECD",
  },

  geoSlantedPill: {
    position: "absolute",
    width: 118,
    height: 30,
    borderRadius: 18,
    right: 18,
    top: 176,
    backgroundColor: "#C9D5C7",
    transform: [{ rotate: "-16deg" }],
  },

  geoBottomShapeA: {
    position: "absolute",
    width: 105,
    height: 105,
    right: -38,
    bottom: 10,
    borderRadius: 24,
    backgroundColor: "#D9E2D6",
    transform: [{ rotate: "45deg" }],
  },

  geoBottomShapeB: {
    position: "absolute",
    width: 66,
    height: 66,
    right: 22,
    bottom: -18,
    borderRadius: 16,
    backgroundColor: "#EDE5D8",
    transform: [{ rotate: "45deg" }],
  },

  geoTopRightBar: {
    position: "absolute",
    width: 70,
    height: 24,
    borderRadius: 14,
    right: 42,
    top: 68,
    backgroundColor: "#DCE3D9",
    transform: [{ rotate: "-14deg" }],
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#202420",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },

  logoRoof: {
    position: "absolute",
    width: 20,
    height: 20,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: "#F8F7F3",
    transform: [{ rotate: "45deg" }],
    top: 12,
  },

  logoHouse: {
    width: 19,
    height: 15,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: "#F8F7F3",
    marginTop: 11,
  },

  brand: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1.2,
    color: "#202420",
  },

  brandTag: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.35,
    color: "#7B837B",
  },

  utilityShape: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(196,201,194,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },

  utilityInner: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "rgba(137,145,136,0.68)",
    alignItems: "center",
    justifyContent: "center",
  },

  utilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F8F7F3",
  },

  /* Hero */
  hero: {
    marginTop: 66,
  },

  heroSmall: {
    marginTop: 40,
  },

  overline: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.9,
    color: "#596B5B",
  },

  heroTitle: {
    marginTop: 15,
    fontSize: 41,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -2.1,
    color: "#202420",
  },

  heroAccent: {
    color: "#69766C",
    fontWeight: "500",
  },

  heroSubtitle: {
    marginTop: 15,
    fontSize: 13,
    lineHeight: 20,
    color: "#737A74",
  },

  heroRule: {
    width: 44,
    height: 2,
    marginTop: 19,
    backgroundColor: "#617365",
  },

  heroMeta: {
    marginTop: 8,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.6,
    color: "#9A9F99",
  },

  /* Role selector */
  roleSection: {
    marginTop: 39,
  },

  roleSectionSmall: {
    marginTop: 27,
  },

  sectionEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.2,
    color: "#8A9089",
  },

  sectionTitle: {
    marginTop: 5,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#252925",
  },

  roleRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },

  roleCard: {
    flex: 1,
    minHeight: 180,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  customerCard: {
    backgroundColor: "#EFF4EF",
    borderColor: "#CFD8CE",
  },

  helpCard: {
    backgroundColor: "#F8F5ED",
    borderColor: "#DED9CC",
  },

  roleCardSelected: {
    borderColor: "#6F806F",
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  customerIcon: {
    backgroundColor: "#DCE7D9",
  },

  helpIcon: {
    backgroundColor: "#E9E0D2",
  },

  helpIconSelected: {
    backgroundColor: "#DFD4C3",
  },

  iconSelectedBg: {
    backgroundColor: "#CEDCCB",
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#B3B8B2",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  radioSelected: {
    borderColor: "#667969",
  },

  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#667969",
  },

  cardNumber: {
    marginTop: 18,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: "#929890",
  },

  roleTitle: {
    marginTop: 5,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: "#242824",
  },

  roleDescription: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 16,
    color: "#757C75",
  },

  customerShape: {
    position: "absolute",
    width: 92,
    height: 92,
    right: -35,
    bottom: -35,
    borderRadius: 48,
    backgroundColor: "#D5E1D2",
  },

  helpShape: {
    position: "absolute",
    width: 68,
    height: 68,
    right: -18,
    bottom: -20,
    borderRadius: 15,
    backgroundColor: "#E8DCCB",
    transform: [{ rotate: "45deg" }],
  },

  /* CSS-like icons */
  homeIcon: {
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
  },

  homeRoof: {
    position: "absolute",
    width: 19,
    height: 19,
    top: 1,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: "#506154",
    transform: [{ rotate: "45deg" }],
  },

  homeBody: {
    position: "absolute",
    bottom: 2,
    width: 19,
    height: 15,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: "#506154",
    backgroundColor: "transparent",
  },

  personIcon: {
    width: 30,
    height: 32,
    alignItems: "center",
  },

  personHead: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#6D5F4E",
  },

  personBody: {
    marginTop: 5,
    width: 25,
    height: 13,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: "#6D5F4E",
  },

  /* Bottom */
  bottom: {
    marginTop: "auto",
    paddingTop: 20,
  },

  quoteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  quoteLine: {
    width: 36,
    height: 2,
    backgroundColor: "#657468",
    marginRight: 9,
  },

  quoteText: {
    flex: 1,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.15,
    color: "#8D938D",
  },

  sliderTrack: {
    height: 64,
    borderRadius: 32,
    backgroundColor: "#385044",
    justifyContent: "center",
    overflow: "hidden",
  },

  sliderTrackDisabled: {
    backgroundColor: "#D7DAD4",
  },

  sliderProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32,
    backgroundColor: "#2D4238",
  },

  sliderLabel: {
    textAlign: "center",
    paddingHorizontal: 68,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#F7F5EC",
  },

  sliderLabelDisabled: {
    color: "#929790",
  },

  sliderThumb: {
    position: "absolute",
    backgroundColor: "#F7F5EC",
    alignItems: "center",
    justifyContent: "center",
  },

  sliderArrow: {
    fontSize: 24,
    fontWeight: "500",
    color: "#385044",
    marginTop: -2,
  },

  footer: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.85,
    color: "#A4A8A2",
  },

});
