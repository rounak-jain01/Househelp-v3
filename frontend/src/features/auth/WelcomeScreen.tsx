import React from "react";
import {
  Image,
  ImageSourcePropType,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

type UserRole = "user" | "maid";

/*
 * Asset folder:
 * frontend/assets/CustomerUi/
 *
 * Screen:
 * frontend/src/features/auth/WelcomeScreen.tsx
 *
 * Relative asset path from this screen:
 * ../../../assets/CustomerUi/
 */
const ASSETS = {
  welcome: require("../../../assets/CustomerUi/HomeImage.png"),
  customer: require("../../../assets/CustomerUi/Customer.png"),
  help: require("../../../assets/CustomerUi/maid.png"),
  logo: require("../../../assets/CustomerUi/logo.png"),
  backArrow: require("../../../assets/CustomerUi/back-arrow.png"),
  rightArrow: require("../../../assets/CustomerUi/right-arrow.png"),
  buttonArrow: require("../../../assets/CustomerUi/button-arrow.png"),
} satisfies {
  welcome: ImageSourcePropType;
  customer: ImageSourcePropType;
  help: ImageSourcePropType;
  logo: ImageSourcePropType;
  backArrow: ImageSourcePropType;
  rightArrow: ImageSourcePropType;
  buttonArrow: ImageSourcePropType;
};

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const [page, setPage] = React.useState<0 | 1>(0);

  const isSmall = height < 700 || width < 350;
  const horizontalPadding = Math.max(20, Math.min(28, width * 0.06));

  const goToRoleSelection = () => setPage(1);
  const goBack = () => setPage(0);

  const continueToAuth = (role: UserRole) => {
    router.push({
      pathname: "/auth/phone",
      params: { role },
    });
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.screen}>
        {page === 0 ? (
          <WelcomePage
            isSmall={isSmall}
            horizontalPadding={horizontalPadding}
            onContinue={goToRoleSelection}
          />
        ) : (
          <RoleSelectionPage
            isSmall={isSmall}
            onBack={goBack}
            onContinue={continueToAuth}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function WelcomePage({
  isSmall,
  horizontalPadding,
  onContinue,
}: {
  isSmall: boolean;
  horizontalPadding: number;
  onContinue: () => void;
}) {
  return (
    <View
      style={[
        styles.page,
        isSmall && styles.pageSmall,
        { paddingHorizontal: horizontalPadding },
      ]}
    >
      <View style={styles.topBar}>
        <Brand />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Skip to role selection"
          hitSlop={10}
        >
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.welcomeCopy,
          isSmall && styles.welcomeCopySmall,
        ]}
      >
        <Text style={styles.welcomeTitle}>
          A happier home{"\n"}starts here.
        </Text>

        <Text style={styles.welcomeSubtitle}>
          Trusted home services{"\n"}for a cleaner, easier{"\n"}and brighter everyday life.
        </Text>
      </View>

      <View
        style={[
          styles.welcomeImageWrap,
          { marginHorizontal: -horizontalPadding + 8 },
        ]}
      >
        <Image
          source={ASSETS.welcome}
          style={styles.welcomeImage}
          resizeMode="cover"
          accessibilityLabel="A welcoming home interior"
        />
      </View>

      <View style={styles.welcomeBottom}>
        <PrimaryButton label="Get Started" onPress={onContinue} />
      </View>
    </View>
  );
}

function RoleSelectionPage({
  isSmall,
  onBack,
  onContinue,
}: {
  isSmall: boolean;
  onBack: () => void;
  onContinue: (role: UserRole) => void;
}) {
  const { width, height } = useWindowDimensions();
  const horizontalPadding = Math.max(20, Math.min(28, width * 0.06));
  const cardWidth = width - horizontalPadding * 2;
  const naturalCardHeight = cardWidth * 0.61;
  const availableForCards = Math.max(360, height - 290);
  const heightFromSpace = (availableForCards - 16) / 2;
  const cardHeight = Math.max(175, Math.min(250, naturalCardHeight, heightFromSpace));

  return (
    <View style={[styles.page, { paddingHorizontal: horizontalPadding }]}>
      <View style={styles.roleHeader}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Image
            source={ASSETS.backArrow}
            style={styles.backArrowImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </TouchableOpacity>

        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.roleIntro, isSmall && styles.roleIntroSmall]}>
        <Text style={styles.roleTitle}>
          How would you{"\n"}like to continue?
        </Text>

        <Text style={styles.roleSubtitle}>
          Choose your path to get started.
        </Text>
      </View>

      <View style={[styles.roleCards, isSmall && styles.roleCardsSmall]}>
        <RoleCard
          title="Customer"
          description={"Book trusted\nhelp for your home"}
          image={ASSETS.customer}
          backgroundColor="#EEF6EF"
          cardHeight={cardHeight}
          onArrowPress={() => onContinue("user")}
        />

        <RoleCard
          title="Help"
          description={"Provide home\nservices and earn"}
          image={ASSETS.help}
          backgroundColor="#FFF4E7"
          cardHeight={cardHeight}
          onArrowPress={() => onContinue("maid")}
        />
      </View>

      <Text style={[styles.roleFooter, isSmall && styles.roleFooterSmall]}>
        Same homes. A brighter tomorrow.
      </Text>
    </View>
  );
}

function RoleCard({
  title,
  description,
  image,
  backgroundColor,
  cardHeight,
  onArrowPress,
}: {
  title: string;
  description: string;
  image: ImageSourcePropType;
  backgroundColor: string;
  cardHeight: number;
  onArrowPress: () => void;
}) {
  return (
    <View
      style={[
        styles.roleCard,
        {
          height: cardHeight,
          backgroundColor,
        },
      ]}
    >
      <Image
        source={image}
        style={styles.roleImage}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <View
        style={[
          styles.roleImageFade,
          { backgroundColor: backgroundColor },
        ]}
      />

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onArrowPress}
        style={styles.roleArrowButton}
        accessibilityRole="button"
        accessibilityLabel={`Continue as ${title}`}
        hitSlop={6}
      >
        <Image
          source={ASSETS.rightArrow}
          style={styles.rightArrowImage}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </TouchableOpacity>

      <View style={styles.roleCardInfo}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </View>
  );
}

function Brand() {
  return (
    <View style={styles.brandRow}>
      <Image
        source={ASSETS.logo}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="HomeHelp logo"
      />

    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.primaryButton}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>

      <Image
        source={ASSETS.buttonArrow}
        style={styles.primaryArrowImage}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  page: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  pageSmall: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 100,
    height: 35,
    marginRight: 9,
  },


  skip: {
    fontSize: 15,
    fontWeight: "500",
    color: "#52635E",
  },

  welcomeCopy: {
    marginTop: 42,
  },

  welcomeCopySmall: {
    marginTop: 24,
  },

  welcomeTitle: {
    fontSize: 37,
    lineHeight: 41,
    letterSpacing: -1.8,
    fontWeight: "800",
    color: "#102A25",
  },

  welcomeSubtitle: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 24,
    color: "#52635E",
  },

  welcomeImageWrap: {
    flex: 1,
    marginTop: 16,
    marginBottom: 4,
    overflow: "hidden",
    borderTopLeftRadius: 150,
    borderTopRightRadius: 150,
  },

  welcomeImage: {
    width: "100%",
    height: "100%",
  },

  welcomeBottom: {
    paddingTop: 8,
  },

  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 12,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D4DAD6",
  },

  activeDot: {
    width: 26,
    backgroundColor: "#174B3D",
  },

  primaryButton: {
    height: 58,
    borderRadius: 30,
    backgroundColor: "#174B3D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  primaryArrowImage: {
    width: 24,
    height: 24,
  },

  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  backArrowImage: {
    width: 30,
    height: 30,
  },

  headerSpacer: {
    width: 40,
  },

  roleIntro: {
    marginTop: 24,
  },

  roleIntroSmall: {
    marginTop: 14,
  },

  roleTitle: {
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -1.6,
    fontWeight: "800",
    color: "#102A25",
  },

  roleSubtitle: {
    marginTop: 9,
    fontSize: 16,
    lineHeight: 22,
    color: "#52635E",
  },

  roleCards: {
    gap: 14,
    marginTop: 18,
  },

  roleCardsSmall: {
    marginTop: 12,
  },

  roleCard: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E5EAE5",
    position: "relative",
  },

  roleImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "70%",
    width: "100%",
  },

  roleImageFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "43%",
    opacity: 0.93,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  roleArrowButton: {
    position: "absolute",
    top: 0,
    right: 14,
    width: 54,
    height: 54,
    marginTop: 78,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },

  rightArrowImage: {
    width: 54,
    height: 54,
  },

  roleCardInfo: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },

  cardTitle: {
    fontSize: 25,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#102A25",
  },

  cardDescription: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 19,
    color: "#52635E",
  },

  roleFooter: {
    marginTop: "auto",
    paddingTop: 12,
    paddingBottom: 2,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
    color: "#52635E",
  },

  roleFooterSmall: {
    paddingTop: 12,
    fontSize: 15,
  },
});
