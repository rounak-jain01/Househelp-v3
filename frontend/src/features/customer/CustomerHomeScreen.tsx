import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
    icon: require("../../../assets/CustomerUi/CustomerHome/cleaning.png"),
  },
  {
    id: "cooking",
    title: "Cooking",
    subtitle: "Fresh meals at home",
    tone: "sand",
    icon: require("../../../assets/CustomerUi/CustomerHome/cooking.png"),
  },
  {
    id: "laundry",
    title: "Laundry",
    subtitle: "Wash & fold assistance",
    tone: "sage",
    icon: require("../../../assets/CustomerUi/CustomerHome/laundry.png"),
  },
  {
    id: "dishwashing",
    title: "Dishwashing",
    subtitle: "Keep your kitchen tidy",
    tone: "sand",
    icon: require("../../../assets/CustomerUi/CustomerHome/dishwashing.png"),
  },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 100,
          },
        ]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image
              source={require("../../../assets/CustomerUi/CustomerHome/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

          </View>


        </View>

        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.greeting}>{greeting}</Text>

            <Text style={styles.userName}>
              {firstName}
              <Text style={styles.wave}> 👋</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              A tidy home makes{"\n"}
              a brighter you.
            </Text>
          </View>

          <Image
            source={require("../../../assets/CustomerUi/CustomerHome/HomeImage.png")}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* HOME LOCATION */}
        <Pressable
          onPress={() => router.push("/customer/profile")}
          style={({ pressed }) => [
            styles.locationCard,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Home location"
        >
          <View style={styles.locationIconBox}>
            <Image
              source={require("../../../assets/CustomerUi/CustomerHome/location.png")}
              style={styles.locationIcon}
              resizeMode="contain"
            />
          </View>

          <View style={styles.locationContent}>
            <Text style={styles.locationTitle}>Home</Text>

            <Text numberOfLines={1} style={styles.locationText}>
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

          <View style={styles.arrowCircle}>
            <Text style={styles.arrow}>›</Text>
          </View>
        </Pressable>

        {/* QUICK SERVICES */}
        <View style={styles.servicesRow}>
          {services.map((service, index) => (
            <Pressable
              key={service.id}
              onPress={() => router.push("/customer/book")}
              style={({ pressed }) => [
                styles.serviceItem,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Book ${service.title}`}
            >
              <View
                style={[
                  styles.serviceIconBox,
                  index === 0 && styles.serviceIconActive,
                ]}
              >
                <Image
                source={service.icon}
                style={styles.serviceImage}
                resizeMode="contain"
              />
              </View>

              <Text
                numberOfLines={1}
                style={styles.serviceTitle}
              >
                {service.title}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* PRIMARY BOOKING BANNER */}
        <Pressable
          onPress={() => router.push("/customer/book")}
          style={({ pressed }) => [
            styles.promoCard,
            pressed && styles.promoPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Book a home service"
        >
          <Image
            source={require("../../../assets/CustomerUi/CustomerHome/better.png")}
            style={styles.promoFullImage}
            resizeMode="cover"
          />
        </Pressable>


        {/* HOME SERVICES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Home Services</Text>

            <Text style={styles.serviceCount}>04</Text>
          </View>

          <View style={styles.servicesGrid}>
            {services.map((service, index) => (
              <Pressable
                key={service.id}
                onPress={() => router.push("/customer/book")}
                style={({ pressed }) => [
                  styles.detailCard,
                  index % 2 === 0
                    ? styles.detailCardLight
                    : styles.detailCardCream,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Book ${service.title}`}
              >
                <Image
                  source={service.icon}
                  style={styles.detailImage}
                  resizeMode="contain"
                />

                <Text style={styles.detailTitle}>
                  {service.title}
                </Text>

                <Text style={styles.detailSubtitle}>
                  {service.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    paddingHorizontal: 20,
  },

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
    width: 100,
    height: 50,
    marginRight: 8,
  },

  hero: {
    height: 236,
    marginTop: 18,
    borderRadius: 28,
    backgroundColor: "#F3F7F2",
    overflow: "hidden",
    position: "relative",
  },

  heroText: {
    zIndex: 2,
    width: "58%",
    paddingTop: 29,
    paddingLeft: 20,
    paddingRight: 0,
  },

  greeting: {
    fontSize: 20,
    lineHeight: 27,
    color: "#536879",
    fontWeight: "500",
  },

  userName: {
    marginTop: 2,
    fontSize: 35,
    lineHeight: 48,
    fontWeight: "800",
    letterSpacing: -1.6,
    color: "#102536",
  },

  wave: {
    fontSize: 30,
  },

  heroSubtitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 25,
    color: "#526879",
    fontWeight: "500",
  },

  heroImage: {
    position: "absolute",
    right: -100,
    bottom: 0,
    width: 295,
    height: 205,
  },

  locationCard: {
    minHeight: 84,
    marginTop: 16,
    paddingHorizontal: 13,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8ECE9",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#102536",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  locationIconBox: {
    width: 49,
    height: 49,
    borderRadius: 17,
    backgroundColor: "#E7F0E7",
    alignItems: "center",
    justifyContent: "center",
  },

  locationIcon: {
    width: 27,
    height: 27,
  },

  locationContent: {
    flex: 1,
    marginLeft: 12,
  },

  locationTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102536",
  },

  locationText: {
    marginTop: 3,
    fontSize: 14.5,
    color: "#536879",
    fontWeight: "500",
  },

  locationLandmark: {
    marginTop: 2,
    fontSize: 11,
    color: "#87939B",
  },

  arrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F7F8F7",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  arrow: {
    fontSize: 29,
    lineHeight: 31,
    color: "#102536",
  },

  servicesRow: {
    marginTop: 21,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  serviceItem: {
    width: "23%",
    alignItems: "center",
  },

  serviceIconBox: {
    width: 73,
    height: 73,
    borderRadius: 21,
    backgroundColor: "#F8F9F8",
    borderWidth: 1,
    borderColor: "#ECEFED",
    alignItems: "center",
    justifyContent: "center",
  },

  serviceIconActive: {
    backgroundColor: "#FFF7ED",
  },

  serviceImage: {
    width: 45,
    height: 45,
  },

  serviceTitle: {
    marginTop: 8,
    fontSize: 12.5,
    color: "#102536",
    fontWeight: "600",
    textAlign: "center",
  },

  promoCard: {
    height: 176,
    marginTop: 25,
    borderRadius: 27,
    overflow: "hidden",
    backgroundColor: "#EAF2EA",
    flexDirection: "row",
  },
  promoFullImage: {
    width: "100%",
    height: "100%",
  },

  promoPressed: {
    opacity: 0.9,
  },

  section: {
    marginTop: 29,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#102536",
    letterSpacing: -0.7,
  },

  viewAll: {
    fontSize: 14.5,
    color: "#536879",
    fontWeight: "600",
  },

  serviceCount: {
    fontSize: 13.5,
    color: "#83919B",
    fontWeight: "700",
  },

  emptyBookingCard: {
    minHeight: 94,
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor: "#FAFBFA",
    borderWidth: 1,
    borderColor: "#E7ECE8",
    flexDirection: "row",
    alignItems: "center",
  },

  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E4F0E3",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    fontSize: 20,
    fontWeight: "800",
    color: "#16865B",
  },

  emptyContent: {
    flex: 1,
    marginLeft: 12,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102536",
  },

  emptyText: {
    marginTop: 4,
    paddingRight: 6,
    fontSize: 11,
    lineHeight: 16,
    color: "#73818C",
  },

  emptyArrow: {
    fontSize: 28,
    color: "#102536",
  },

  liveBookingCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#F1F8F1",
    borderWidth: 1,
    borderColor: "#DCE9DC",
  },

  liveCardDecor: {
    display: "none",
  },

  liveBookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  liveBookingInfo: {
    flex: 1,
    paddingRight: 10,
  },

  liveBookingEyebrow: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#7C8B82",
  },

  liveBookingTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
    color: "#102536",
  },

  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#DDEDDD",
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
    backgroundColor: "#159A68",
  },

  statusPillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#16865B",
  },

  liveDivider: {
    height: 1,
    marginVertical: 12,
    backgroundColor: "#DDE7DD",
  },

  liveMeta: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  metaLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#8A9690",
  },

  metaValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "800",
    color: "#102536",
  },

  liveArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCEADC",
    alignItems: "center",
    justifyContent: "center",
  },

  liveArrow: {
    fontSize: 20,
    color: "#102536",
  },

  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  detailCard: {
    width: "48%",
    minHeight: 132,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },

  detailCardLight: {
    backgroundColor: "#F0F6EF",
    borderColor: "#DFE9DE",
  },

  detailCardCream: {
    backgroundColor: "#FBF5EA",
    borderColor: "#EEE3D2",
  },

  detailImage: {
    width: 42,
    height: 42,
  },

  detailTitle: {
    marginTop: 11,
    fontSize: 16,
    fontWeight: "800",
    color: "#102536",
  },

  detailSubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    color: "#71808A",
  },

  pressed: {
    opacity: 0.72,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  loadingMark: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#123C3D",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingRoof: {
    position: "absolute",
    width: 18,
    height: 18,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
    top: 9,
  },

  loadingHouse: {
    width: 18,
    height: 14,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: "#FFFFFF",
    marginTop: 10,
  },
});
