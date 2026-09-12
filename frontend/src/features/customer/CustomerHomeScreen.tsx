import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  subscribeToActiveBooking,
  subscribeToCustomerProfile,
  type CustomerBooking,
  type CustomerProfile,
} from "../../services/firebase/customerService";

import { getGreeting } from "../../utils/getGreeting";

const services = [
  {
    id: "cleaning",
    title: "Cleaning",
    subtitle: "Sweeping, mopping & more",
    tone: "sage",
  },
  {
    id: "cooking",
    title: "Cooking",
    subtitle: "Fresh meals at home",
    tone: "sand",
  },
  {
    id: "laundry",
    title: "Laundry",
    subtitle: "Wash & fold assistance",
    tone: "sage",
  },
  {
    id: "dishwashing",
    title: "Dishwashing",
    subtitle: "Keep your kitchen tidy",
    tone: "sand",
  },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const compact = height < 760;
  const side = Math.max(20, Math.min(28, width * 0.06));

  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [activeBooking, setActiveBooking] =
    useState<CustomerBooking | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] =
    useState(new Date());

  useEffect(() => {
    const unsubscribeProfile =
      subscribeToCustomerProfile(
        (customerProfile) => {
          setProfile(customerProfile);
          setIsLoading(false);
        },
        (error) => {
          console.error(
            "[CustomerHome] Profile error:",
            error,
          );
          setIsLoading(false);
        },
      );

    const unsubscribeBooking =
      subscribeToActiveBooking(
        (booking) => {
          setActiveBooking(booking);
        },
        (error) => {
          console.error(
            "[CustomerHome] Booking error:",
            error,
          );
        },
      );

    return () => {
      unsubscribeProfile();
      unsubscribeBooking();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingMark}>
          <View style={styles.loadingRoof} />
          <View style={styles.loadingHouse} />
        </View>

        <ActivityIndicator
          size="small"
          color="#5D7161"
          style={{ marginTop: 14 }}
        />
      </View>
    );
  }

  const firstName = profile?.name?.trim()
    ? profile.name.trim().split(/\s+/)[0]
    : "there";

  const greeting =
    getGreeting(currentTime);

  const locationText =
    profile?.address?.formatted?.trim() ||
    "Add your home address";

  return (
    <View style={styles.container}>
      {/* ===== DECORATIVE GEOMETRY ===== */}
      <View pointerEvents="none" style={styles.geometry}>
        <View style={styles.geoCircleLarge} />
        <View style={styles.geoCircleSmall} />
        <View style={styles.geoPill} />
        <View style={styles.geoDiamond} />
        <View style={styles.geoArc} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (compact ? 12 : 18),
            paddingHorizontal: side,
            paddingBottom: insets.bottom + 112,
          },
        ]}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <View style={styles.headerBrandRow}>
            <View style={styles.logo}>
              <View style={styles.logoRoof} />
              <View style={styles.logoHouse} />
            </View>

            <View>
              <Text style={styles.brand}>
                homehelp
              </Text>
              <Text style={styles.brandTag}>
                BETTER HOMES · BETTER LIVING
              </Text>
            </View>
          </View>

        </View>

        {/* ===== GREETING ===== */}
        <View
          style={[
            styles.hero,
            compact && styles.heroCompact,
          ]}
        >
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>
              {greeting.toUpperCase()}
            </Text>
            <View style={styles.eyebrowLine} />
          </View>

          <Text style={styles.heroTitle}>
            Good day,
            {"\n"}
            <Text style={styles.heroAccent}>
              {firstName}.
            </Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            What would make home feel a little
            {"\n"}
            easier today?
          </Text>

          <View style={styles.heroRule} />
        </View>

        {/* ===== HOME LOCATION ===== */}
        <Pressable
          onPress={() =>
            router.push("/customer/profile")
          }
          style={({ pressed }) => [
            styles.locationCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.locationIconBox}>
            <Text style={styles.locationIcon}>
              ⌖
            </Text>
          </View>

          <View style={styles.locationContent}>
            <Text style={styles.locationLabel}>
              HOME LOCATION
            </Text>

            <Text
              numberOfLines={1}
              style={styles.locationText}
            >
              {locationText}
            </Text>

            {profile?.address?.landmark ? (
              <Text
                numberOfLines={1}
                style={styles.locationLandmark}
              >
                {profile.address.landmark}
              </Text>
            ) : null}
          </View>

          <View style={styles.locationArrow}>
            <Text style={styles.locationArrowText}>
              →
            </Text>
          </View>
        </Pressable>

        {/* ===== PRIMARY BOOKING AREA ===== */}
        <Pressable
          onPress={() =>
            router.push("/customer/book")
          }
          style={({ pressed }) => [
            styles.bookingCard,
            pressed && styles.bookingCardPressed,
          ]}
        >
          <View style={styles.bookingDecorCircle} />
          <View style={styles.bookingDecorDiamond} />

          <View style={styles.bookingTop}>
            <View style={styles.bookingBadge}>
              <View style={styles.bookingBadgeDot} />
              <Text style={styles.bookingBadgeText}>
                HOMEHELP SERVICE
              </Text>
            </View>

            <Text style={styles.bookingIndex}>
              01
            </Text>
          </View>

          <Text style={styles.bookingTitle}>
            Need help
            {"\n"}
            at home?
          </Text>

          <Text style={styles.bookingDescription}>
            Book trusted help for cleaning,
            cooking, laundry and more.
          </Text>

          <View style={styles.bookingAction}>
            <Text style={styles.bookingActionText}>
              Book a Help
            </Text>

            <View style={styles.bookingActionCircle}>
              <Text style={styles.bookingActionArrow}>
                →
              </Text>
            </View>
          </View>
        </Pressable>

        {/* ===== LIVE BOOKING ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                YOUR HOME
              </Text>

              <Text style={styles.sectionTitle}>
                Live booking
              </Text>
            </View>

            {activeBooking ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>
                  LIVE
                </Text>
              </View>
            ) : null}
          </View>

          {activeBooking ? (
            <LiveBookingCard
              booking={activeBooking}
              onPress={() =>
                router.push(
                  `/customer/booking/${activeBooking.bookingId}`,
                )
              }
            />
          ) : (
            <View style={styles.emptyBookingCard}>
              <View style={styles.emptyIconBox}>
                <Text style={styles.emptyIcon}>
                  ✓
                </Text>
              </View>

              <View style={styles.emptyContent}>
                <Text style={styles.emptyTitle}>
                  Nothing active right now
                </Text>

                <Text style={styles.emptyText}>
                  Your live booking will appear here
                  once you book a Help.
                </Text>
              </View>

              <Text style={styles.emptyArrow}>
                →
              </Text>
            </View>
          )}
        </View>

        {/* ===== SERVICES ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                HOME SERVICES
              </Text>

              <Text style={styles.sectionTitle}>
                What do you need?
              </Text>
            </View>

            <Text style={styles.serviceCount}>
              04
            </Text>
          </View>

          <View style={styles.servicesGrid}>
            {services.map((service, index) => (
              <Pressable
                key={service.id}
                onPress={() =>
                  router.push("/customer/book")
                }
                style={({ pressed }) => [
                  styles.serviceCard,
                  service.tone === "sage"
                    ? styles.serviceSage
                    : styles.serviceSand,
                  pressed && styles.servicePressed,
                ]}
              >
                <View
                  style={[
                    styles.serviceIconBox,
                    service.tone === "sage"
                      ? styles.serviceIconSage
                      : styles.serviceIconSand,
                  ]}
                >
                  <ServiceGlyph
                    index={index}
                    tone={service.tone}
                  />
                </View>

                <Text style={styles.serviceNumber}>
                  0{index + 1}
                </Text>

                <Text style={styles.serviceTitle}>
                  {service.title}
                </Text>

                <Text style={styles.serviceSubtitle}>
                  {service.subtitle}
                </Text>

                <View
                  pointerEvents="none"
                  style={[
                    styles.serviceShape,
                    index % 2 === 0
                      ? styles.serviceShapeCircle
                      : styles.serviceShapeDiamond,
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ===== BOTTOM NAV ===== */}
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: Math.max(
              insets.bottom,
              10,
            ),
          },
        ]}
      >
        <BottomNavItem
          type="home"
          label="Home"
          active
          onPress={() =>
            router.replace("/customer")
          }
        />

        <BottomNavItem
          type="bookings"
          label="Bookings"
          onPress={() =>
            router.push("/customer/bookings")
          }
        />

        <BottomNavProfileItem
          name={profile?.name}
          photoUrl={profile?.photoUrl}
          onPress={() =>
            router.push("/customer/profile")
          }
        />
      </View>
    </View>
  );
}

function LiveBookingCard({
  booking,
  onPress,
}: {
  booking: CustomerBooking;
  onPress: () => void;
}) {
  const statusText =
    getBookingStatusText(booking.status);

  const categoryText =
    booking.categories?.length
      ? booking.categories
          .map(formatCategory)
          .join(" • ")
      : "Home service";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.liveBookingCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.liveCardDecor} />

      <View style={styles.liveBookingHeader}>
        <View style={styles.liveBookingInfo}>
          <Text style={styles.liveBookingEyebrow}>
            ACTIVE BOOKING
          </Text>

          <Text style={styles.liveBookingTitle}>
            {categoryText}
          </Text>
        </View>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>
            {statusText}
          </Text>
        </View>
      </View>

      <View style={styles.liveDivider} />

      <View style={styles.liveMeta}>
        <View>
          <Text style={styles.metaLabel}>
            DURATION
          </Text>

          <Text style={styles.metaValue}>
            {booking.duration} hr
            {booking.duration !== 1
              ? "s"
              : ""}
          </Text>
        </View>

        <View>
          <Text style={styles.metaLabel}>
            TOTAL
          </Text>

          <Text style={styles.metaValue}>
            ₹{booking.totalPrice}
          </Text>
        </View>

        <View style={styles.liveArrowCircle}>
          <Text style={styles.liveArrow}>
            →
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function ServiceGlyph({
  index,
  tone,
}: {
  index: number;
  tone: string;
}) {
  const stroke =
    tone === "sage" ? "#536554" : "#6B6252";

  if (index === 0) {
    return (
      <View style={styles.cleanGlyph}>
        <View
          style={[
            styles.glyphStem,
            { backgroundColor: stroke },
          ]}
        />
        <View
          style={[
            styles.glyphSpark,
            { borderColor: stroke },
          ]}
        />
      </View>
    );
  }

  if (index === 1) {
    return (
      <View
        style={[
          styles.circleGlyph,
          { borderColor: stroke },
        ]}
      >
        <View
          style={[
            styles.circleGlyphInner,
            { backgroundColor: stroke },
          ]}
        />
      </View>
    );
  }

  if (index === 2) {
    return (
      <View
        style={[
          styles.laundryGlyph,
          { borderColor: stroke },
        ]}
      >
        <View
          style={[
            styles.laundryLine,
            { backgroundColor: stroke },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.diamondGlyph,
        { borderColor: stroke },
      ]}
    />
  );
}

function getBookingStatusText(
  status: CustomerBooking["status"],
): string {
  switch (status) {
    case "pending":
      return "Finding Help";
    case "assigned":
      return "Help Assigned";
    case "confirmed":
      return "Confirmed";
    case "in_progress":
      return "In Progress";
    default:
      return "Active";
  }
}

function formatCategory(
  category: string,
): string {
  return category
    .replace(/[-_]/g, " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}

function getInitials(name?: string) {
  return (
    name
      ?.trim()
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function BottomNavItem({
  type,
  label,
  active = false,
  onPress,
}: {
  type: "home" | "bookings";
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.navIconWrap,
          active && styles.navIconWrapActive,
        ]}
      >
        {type === "home" ? (
          <View style={styles.navHomeIcon}>
            <View style={styles.navHomeRoof} />
            <View style={styles.navHomeBody} />
          </View>
        ) : (
          <View style={styles.navBookingIcon}>
            <View style={styles.navBookingLine} />
            <View style={styles.navBookingLineSmall} />
          </View>
        )}
      </View>

      <Text
        style={[
          styles.navLabel,
          active && styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BottomNavProfileItem({
  name,
  photoUrl,
  onPress,
}: {
  name?: string;
  photoUrl?: string | null;
  onPress: () => void;
}) {
  const displayName =
    name?.trim()?.split(/\s+/)[0] ||
    "Profile";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.navProfileWrap}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.navProfileImage}
          />
        ) : (
          <Text style={styles.navProfileInitials}>
            {getInitials(name)}
          </Text>
        )}
      </View>

      <Text
        numberOfLines={1}
        style={styles.navProfileName}
      >
        {displayName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F3",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F7F3",
  },

  loadingMark: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#202420",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingRoof: {
    position: "absolute",
    width: 18,
    height: 18,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: "#F8F7F3",
    transform: [{ rotate: "45deg" }],
    top: 9,
  },

  loadingHouse: {
    width: 18,
    height: 14,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: "#F8F7F3",
    marginTop: 10,
  },

  geometry: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  geoCircleLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -108,
    top: 95,
    backgroundColor: "#DDE5DC",
  },

  geoCircleSmall: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    left: -52,
    top: 390,
    backgroundColor: "#E8DFCE",
  },

  geoPill: {
    position: "absolute",
    width: 92,
    height: 27,
    borderRadius: 15,
    right: 35,
    top: 76,
    backgroundColor: "#C8D3C6",
    transform: [{ rotate: "-15deg" }],
  },

  geoDiamond: {
    position: "absolute",
    width: 86,
    height: 86,
    right: -25,
    top: 525,
    borderRadius: 20,
    backgroundColor: "#E4DDD0",
    transform: [{ rotate: "45deg" }],
  },

  geoArc: {
    position: "absolute",
    width: 160,
    height: 160,
    right: -74,
    bottom: 42,
    borderWidth: 27,
    borderColor: "#D7E0D5",
    borderRadius: 80,
  },

  content: {
    paddingBottom: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#202420",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  logoRoof: {
    position: "absolute",
    width: 17,
    height: 17,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: "#F8F7F3",
    transform: [{ rotate: "45deg" }],
    top: 10,
  },

  logoHouse: {
    width: 16,
    height: 13,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: "#F8F7F3",
    marginTop: 10,
  },

  brand: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#202420",
  },

  brandTag: {
    marginTop: 2,
    fontSize: 6.7,
    fontWeight: "800",
    letterSpacing: 1.25,
    color: "#7B837B",
  },

  hero: {
    marginTop: 63,
  },

  heroCompact: {
    marginTop: 40,
  },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.3,
    color: "#647267",
  },

  eyebrowLine: {
    flex: 1,
    height: 1,
    marginLeft: 11,
    backgroundColor: "#D8D9D2",
  },

  heroTitle: {
    marginTop: 14,
    fontSize: 41,
    lineHeight: 43,
    fontWeight: "900",
    letterSpacing: -1.9,
    color: "#202420",
  },

  heroAccent: {
    color: "#68766B",
    fontWeight: "500",
  },

  heroSubtitle: {
    marginTop: 15,
    fontSize: 13,
    lineHeight: 20,
    color: "#747B75",
  },

  heroRule: {
    width: 42,
    height: 2,
    marginTop: 19,
    backgroundColor: "#617365",
  },

  locationCard: {
    marginTop: 22,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D9DED7",
    borderRadius: 20,
    backgroundColor: "rgba(249,249,245,0.90)",
    flexDirection: "row",
    alignItems: "center",
  },

  locationIconBox: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: "#E0E8DE",
    alignItems: "center",
    justifyContent: "center",
  },

  locationIcon: {
    fontSize: 21,
    color: "#4E6253",
  },

  locationContent: {
    flex: 1,
    marginLeft: 11,
  },

  locationLabel: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.25,
    color: "#929892",
  },

  locationText: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#292E29",
  },

  locationLandmark: {
    marginTop: 2,
    fontSize: 10,
    color: "#8A908A",
  },

  locationArrow: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: "#F0EFE8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  locationArrowText: {
    fontSize: 17,
    color: "#59675B",
  },

  bookingCard: {
    position: "relative",
    minHeight: 208,
    marginTop: 17,
    padding: 19,
    borderRadius: 27,
    backgroundColor: "#31493C",
    overflow: "hidden",
  },

  bookingCardPressed: {
    opacity: 0.93,
  },

  bookingDecorCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -86,
    top: -65,
    backgroundColor: "#496151",
  },

  bookingDecorDiamond: {
    position: "absolute",
    width: 65,
    height: 65,
    right: 22,
    bottom: -27,
    borderRadius: 14,
    backgroundColor: "#435A4C",
    transform: [{ rotate: "45deg" }],
  },

  bookingTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  bookingBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: "#C9D9C9",
  },

  bookingBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#D4DDD4",
  },

  bookingIndex: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
    color: "#AFC0B2",
  },

  bookingTitle: {
    marginTop: 16,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#FFFFFF",
  },

  bookingDescription: {
    marginTop: 9,
    maxWidth: 290,
    fontSize: 11,
    lineHeight: 16,
    color: "#CBD5CD",
  },

  bookingAction: {
    alignSelf: "flex-start",
    marginTop: 17,
    minHeight: 43,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 22,
    backgroundColor: "#F4F2E9",
    flexDirection: "row",
    alignItems: "center",
  },

  bookingActionText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#263229",
  },

  bookingActionCircle: {
    width: 33,
    height: 33,
    marginLeft: 9,
    borderRadius: 17,
    backgroundColor: "#DCE5D9",
    alignItems: "center",
    justifyContent: "center",
  },

  bookingActionArrow: {
    fontSize: 16,
    color: "#435747",
  },

  section: {
    marginTop: 28,
  },

  sectionHeader: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  sectionEyebrow: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.75,
    color: "#929890",
  },

  sectionTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.45,
    color: "#252925",
  },

  serviceCount: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#9A9F99",
    marginBottom: 2,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#E3EADF",
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
    backgroundColor: "#52715B",
  },

  liveBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#58705C",
  },

  emptyBookingCard: {
    minHeight: 93,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DDE2DC",
    borderRadius: 20,
    backgroundColor: "rgba(248,248,243,0.92)",
    flexDirection: "row",
    alignItems: "center",
  },

  emptyIconBox: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: "#DFE8DC",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    fontSize: 17,
    fontWeight: "900",
    color: "#52705B",
  },

  emptyContent: {
    flex: 1,
    marginLeft: 11,
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2A302A",
  },

  emptyText: {
    marginTop: 4,
    paddingRight: 7,
    fontSize: 10.5,
    lineHeight: 15,
    color: "#858C85",
  },

  emptyArrow: {
    fontSize: 18,
    color: "#718074",
  },

  liveBookingCard: {
    position: "relative",
    padding: 15,
    borderWidth: 1,
    borderColor: "#D6E0D6",
    borderRadius: 21,
    backgroundColor: "#F0F5EF",
    overflow: "hidden",
  },

  liveCardDecor: {
    position: "absolute",
    width: 90,
    height: 90,
    right: -38,
    bottom: -35,
    borderRadius: 45,
    backgroundColor: "#DAE6D8",
  },

  liveBookingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  liveBookingInfo: {
    flex: 1,
    paddingRight: 10,
  },

  liveBookingEyebrow: {
    marginBottom: 4,
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#8C948D",
  },

  liveBookingTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: "#252B26",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#E0E9DE",
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
    backgroundColor: "#52705B",
  },

  statusPillText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#53705A",
  },

  liveDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "#DEE5DD",
  },

  liveMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  metaLabel: {
    marginBottom: 3,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#999F99",
  },

  metaValue: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#2C332C",
  },

  liveArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCE5D9",
    alignItems: "center",
    justifyContent: "center",
  },

  liveArrow: {
    fontSize: 17,
    color: "#526457",
  },

  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  serviceCard: {
    width: "48.2%",
    minHeight: 156,
    padding: 14,
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },

  serviceSage: {
    backgroundColor: "#EEF3ED",
    borderColor: "#D6DED4",
  },

  serviceSand: {
    backgroundColor: "#F7F3EA",
    borderColor: "#E4DDCF",
  },

  servicePressed: {
    opacity: 0.82,
  },

  serviceIconBox: {
    width: 41,
    height: 41,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  serviceIconSage: {
    backgroundColor: "#DCE7DA",
  },

  serviceIconSand: {
    backgroundColor: "#E9E0D3",
  },

  serviceNumber: {
    marginTop: 13,
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: "#929991",
  },

  serviceTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "900",
    color: "#272D27",
  },

  serviceSubtitle: {
    marginTop: 4,
    maxWidth: 125,
    fontSize: 10,
    lineHeight: 14,
    color: "#848B84",
  },

  serviceShape: {
    position: "absolute",
    right: -22,
    bottom: -22,
  },

  serviceShapeCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#D9E4D6",
  },

  serviceShapeDiamond: {
    width: 58,
    height: 58,
    borderRadius: 13,
    backgroundColor: "#E8DCCB",
    transform: [{ rotate: "45deg" }],
  },

  cleanGlyph: {
    width: 21,
    height: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  glyphStem: {
    position: "absolute",
    width: 3,
    height: 18,
    borderRadius: 2,
    transform: [{ rotate: "25deg" }],
    left: 8,
  },

  glyphSpark: {
    position: "absolute",
    width: 8,
    height: 8,
    borderWidth: 1.5,
    transform: [{ rotate: "45deg" }],
    right: 0,
    top: 2,
  },

  circleGlyph: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  circleGlyphInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  laundryGlyph: {
    width: 22,
    height: 18,
    borderWidth: 2,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  laundryLine: {
    width: 12,
    height: 2,
    borderRadius: 2,
  },

  diamondGlyph: {
    width: 15,
    height: 15,
    borderWidth: 2,
    transform: [{ rotate: "45deg" }],
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 78,
    paddingHorizontal: 36,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#E2E5DF",
    backgroundColor: "rgba(250,249,245,0.97)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  navItem: {
    minWidth: 62,
    alignItems: "center",
    justifyContent: "center",
  },

  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  navIconWrapActive: {
    backgroundColor: "#E1E9DE",
  },

  navHomeIcon: {
    width: 18,
    height: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  navHomeRoof: {
    position: "absolute",
    width: 12,
    height: 12,
    top: 1,
    borderLeftWidth: 1.7,
    borderTopWidth: 1.7,
    borderColor: "#556558",
    transform: [{ rotate: "45deg" }],
  },

  navHomeBody: {
    position: "absolute",
    bottom: 0,
    width: 12,
    height: 10,
    borderWidth: 1.7,
    borderTopWidth: 0,
    borderColor: "#556558",
  },

  navBookingIcon: {
    width: 18,
    height: 19,
    borderWidth: 1.7,
    borderColor: "#9DA39D",
    borderRadius: 4,
    alignItems: "center",
    paddingTop: 5,
  },

  navBookingLine: {
    width: 10,
    height: 1.5,
    backgroundColor: "#9DA39D",
  },

  navBookingLineSmall: {
    width: 7,
    height: 1.5,
    marginTop: 3,
    backgroundColor: "#9DA39D",
    alignSelf: "flex-start",
    marginLeft: 4,
  },

  navLabel: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: "700",
    color: "#9AA099",
  },

  navLabelActive: {
    color: "#546457",
    fontWeight: "900",
  },

  navProfileWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "#E6ECE3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D7DED4",
  },

  navProfileImage: {
    width: "100%",
    height: "100%",
  },

  navProfileInitials: {
    fontSize: 10,
    fontWeight: "900",
    color: "#4C6050",
  },

  navProfileName: {
    marginTop: 4,
    maxWidth: 62,
    fontSize: 8,
    fontWeight: "800",
    color: "#8A918A",
    textAlign: "center",
  },

  pressed: {
    opacity: 0.76,
  },
});
