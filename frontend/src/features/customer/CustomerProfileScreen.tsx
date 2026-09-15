import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  getAuth,
  signOut,
} from '@react-native-firebase/auth';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { removeFcmToken } from '../../services/notifications/notificationService';

import {
  subscribeToCustomerProfile,
  type CustomerProfile,
} from '../../services/firebase/customerService';

export default function CustomerProfileScreen() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [error, setError] =
    useState('');

  const [logoutError, setLogoutError] =
    useState('');

  useEffect(() => {
    const unsubscribe =
      subscribeToCustomerProfile(
        (customerProfile) => {
          setProfile(customerProfile);
          setIsLoading(false);
          setError('');
        },
        (listenerError) => {
          console.error(
            '[CustomerProfile] Profile listener failed:',
            listenerError,
          );

          setIsLoading(false);

          setError(
            listenerError.message ||
              'Unable to load your profile.',
          );
        },
      );

    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    try {
      setLogoutError('');
      setIsSigningOut(true);

      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        try {
          const token = await getToken(getMessaging());

          if (token) {
            await removeFcmToken(
              currentUser.uid,
              token,
              'customer',
            );
          }
        } catch (tokenError) {
          console.warn(
            '[CustomerProfile] FCM token cleanup skipped:',
            tokenError,
          );
        }
      }

      await signOut(auth);

      router.replace('/auth/welcome');
    } catch (signOutError) {
      console.error(
        '[CustomerProfile] Sign out failed:',
        signOutError,
      );

      setLogoutError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Unable to sign out. Please try again.',
      );

      setIsSigningOut(false);
    }
  };

  const name =
    profile?.name?.trim() || 'Customer';

  const phone =
    profile?.phoneNumber?.trim() ||
    'Phone number not available';

  const gender =
    profile?.gender?.trim() ||
    'Not provided';

  const address =
    profile?.address?.formatted?.trim() ||
    '';

  const landmark =
    profile?.address?.landmark?.trim() ||
    '';

  const photoUrl =
    profile?.photoUrl?.trim() || '';

  const getInitial = () => {
    const firstCharacter =
      name.charAt(0).toUpperCase();

    return firstCharacter || 'C';
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingScreen,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color="#1F7A4C"
        />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 5 }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isSigningOut}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Profile</Text>

        <Pressable
          style={styles.headerEditButton}
          onPress={() => router.push("/auth/profile")}
          disabled={isSigningOut}
        >
          <Text style={styles.headerEditIcon}>✎</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 78,
            paddingBottom: insets.bottom + 104,
          },
        ]}
      >
        <View style={styles.profileHero}>
          <View style={styles.heroBlobOne} />
          <View style={styles.heroBlobTwo} />

          <View style={styles.heroCopy}>
            <Text style={styles.helloText}>Hello,</Text>
            <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
            <Text style={styles.heroPhone}>{phone}</Text>

            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>A happier home starts with you</Text>
              <Text style={styles.heroTagIcon}>⌂</Text>
            </View>
          </View>

          <View style={styles.avatarArea}>
            <View style={styles.avatarGlow} />
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileInitial}>
                <Text style={styles.profileInitialText}>{getInitial()}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraIcon}>⌾</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <ProfileSectionHeader
          icon={require("../../../assets/CustomerProfileUi/user-icon.png")}
          title="Personal details"
          onEdit={() => router.push("/auth/profile")}
          disabled={isSigningOut}
        />

        <View style={styles.detailsCard}>
          <ProfileDetailRow
            icon={require("../../../assets/CustomerProfileUi/user-icon.png")}
            label="Full name"
            value={name}
          />
          <View style={styles.separator} />
          <ProfileDetailRow
            icon={require("../../../assets/CustomerProfileUi/phone-icon.png")}
            label="Phone number"
            value={phone}
          />
          <View style={styles.separator} />
          <ProfileDetailRow
            icon={require("../../../assets/CustomerProfileUi/user-icon.png")}
            label="Gender"
            value={gender}
          />
        </View>

        <ProfileSectionHeader
          icon={require("../../../assets/CustomerProfileUi/location-icon.png")}
          title="Home address"
          onEdit={() => router.push("/auth/profile")}
          disabled={isSigningOut}
        />

        <View style={styles.addressCard}>
          <View style={styles.detailImageBox}>
            <Image
              source={require("../../../assets/CustomerProfileUi/location-icon.png")}
              style={styles.detailImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.addressContent}>
            {address ? (
              <>
                <Text style={styles.addressText}>{address}</Text>
                {landmark ? (
                  <Text style={styles.landmarkText}>Landmark · {landmark}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.addressMissing}>No address added yet.</Text>
            )}
          </View>
        </View>

        <View style={styles.accountSection}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionHeadingIcon}>
              <Image
                source={require("../../../assets/CustomerProfileUi/account-shield.png")}
                style={styles.sectionHeadingImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.detailImageBox}>
            <Image
              source={require("../../../assets/CustomerProfileUi/account-shield.png")}
              style={styles.detailImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.accountContent}>
            <Text style={styles.accountTitle}>HomeHelp account</Text>
            <Text style={styles.accountSubtitle}>Your account is active</Text>
          </View>

          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        {logoutError ? (
          <View style={styles.logoutErrorBox}>
            <Text style={styles.logoutErrorIcon}>!</Text>
            <Text style={styles.logoutErrorText}>{logoutError}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.signOutButton, isSigningOut && styles.signOutButtonDisabled]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color="#C62828" />
          ) : (
            <>
              <Text style={styles.signOutIcon}>↪</Text>
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ProfileSectionHeader({
  icon,
  title,
  onEdit,
  disabled,
}: {
  icon: number;
  title: string;
  onEdit: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingRow}>
        <View style={styles.sectionHeadingIcon}>
          <Image source={icon} style={styles.sectionHeadingImage} resizeMode="contain" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <Pressable onPress={onEdit} disabled={disabled} style={styles.editPill}>
        <Text style={styles.editPillIcon}>✎</Text>
        <Text style={styles.editPillText}>Edit</Text>
      </Pressable>
    </View>
  );
}

function ProfileDetailRow({
  icon,
  label,
  value,
}: {
  icon: number;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailImageBox}>
        <Image source={icon} style={styles.detailImage} resizeMode="contain" />
      </View>

      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFCF9",
  },

  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    minHeight: 70,
    paddingHorizontal: 22,
    paddingBottom: 7,
    backgroundColor: "#FBFCF9",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1ED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EBE7",
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: 34,
    lineHeight: 35,
    color: "#103A3A",
    marginTop: -3,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#103A3A",
  },

  headerEditButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E9F3EC",
    alignItems: "center",
    justifyContent: "center",
  },

  headerEditIcon: {
    fontSize: 23,
    color: "#103A3A",
  },

  content: {
    paddingHorizontal: 20,
  },

  profileHero: {
    minHeight: 235,
    borderRadius: 30,
    backgroundColor: "#EEF6EF",
    overflow: "hidden",
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },

  heroCopy: {
    width: "59%",
    paddingLeft: 20,
    zIndex: 2,
  },

  helloText: {
    fontSize: 18,
    color: "#5C7478",
    fontWeight: "500",
  },

  heroName: {
    marginTop: 3,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "800",
    color: "#103A3A",
    letterSpacing: -0.8,
  },

  heroPhone: {
    marginTop: 5,
    fontSize: 14,
    color: "#64767C",
  },

  heroTag: {
    marginTop: 17,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: "#E3F0E5",
    borderWidth: 1,
    borderColor: "#D2E3D5",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },

  heroTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2B654F",
  },

  heroTagIcon: {
    marginLeft: 8,
    fontSize: 15,
    color: "#103A3A",
  },

  avatarArea: {
    position: "absolute",
    right: -5,
    bottom: -2,
    width: 194,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#DFECE0",
  },

  profileImage: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 6,
    borderColor: "#FFFFFF",
    backgroundColor: "#DFE9E0",
  },

  profileInitial: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 6,
    borderColor: "#FFFFFF",
    backgroundColor: "#DDEEE2",
    alignItems: "center",
    justifyContent: "center",
  },

  profileInitialText: {
    fontSize: 46,
    fontWeight: "800",
    color: "#1F7A4C",
  },

  cameraBadge: {
    position: "absolute",
    right: 17,
    bottom: 29,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#123F3C",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  cameraIcon: {
    fontSize: 22,
    color: "#FFFFFF",
  },

  heroBlobOne: {
    position: "absolute",
    left: -55,
    bottom: -48,
    width: 145,
    height: 145,
    borderRadius: 73,
    backgroundColor: "#E1ECE0",
  },

  heroBlobTwo: {
    position: "absolute",
    right: -45,
    top: -40,
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: "#DAE8DB",
  },

  errorBox: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFF4F2",
    borderWidth: 1,
    borderColor: "#F0D8D4",
    flexDirection: "row",
    alignItems: "center",
  },

  errorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
    backgroundColor: "#B42318",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
  },

  errorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: "#B42318",
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionHeadingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E7F2E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  sectionHeadingImage: {
    width: 22,
    height: 22,
  },

  sectionTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
    color: "#103A3A",
  },

  editPill: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    backgroundColor: "#EAF4EE",
    borderWidth: 1,
    borderColor: "#D6E5D9",
    flexDirection: "row",
    alignItems: "center",
  },

  editPillIcon: {
    fontSize: 16,
    color: "#123F3C",
    marginRight: 6,
  },

  editPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#123F3C",
  },

  detailsCard: {
    paddingHorizontal: 14,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAE5",
  },

  detailRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
  },

  detailImageBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#EAF4EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  detailImage: {
    width: 25,
    height: 25,
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 11,
    color: "#718087",
    fontWeight: "500",
  },

  detailValue: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
    color: "#123034",
    fontWeight: "700",
  },

  separator: {
    height: 1,
    backgroundColor: "#EDF0ED",
  },

  addressCard: {
    minHeight: 90,
    padding: 13,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAE5",
    flexDirection: "row",
    alignItems: "center",
  },

  addressContent: {
    flex: 1,
    paddingRight: 3,
  },

  addressText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#364C54",
    fontWeight: "600",
  },

  landmarkText: {
    marginTop: 4,
    fontSize: 10.5,
    color: "#7A888D",
  },

  addressMissing: {
    fontSize: 12,
    lineHeight: 18,
    color: "#A86400",
  },

  accountSection: {
    marginTop: 26,
    marginBottom: 11,
  },

  accountCard: {
    minHeight: 82,
    paddingHorizontal: 13,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAE5",
    flexDirection: "row",
    alignItems: "center",
  },

  accountContent: {
    flex: 1,
  },

  accountTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#123034",
  },

  accountSubtitle: {
    marginTop: 4,
    fontSize: 11.5,
    color: "#7A888D",
  },

  activePill: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E7F5EB",
    flexDirection: "row",
    alignItems: "center",
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#11A36A",
    marginRight: 6,
  },

  activeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#16865B",
  },

  logoutErrorBox: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: "#FFF4F2",
    borderWidth: 1,
    borderColor: "#F0D8D4",
    flexDirection: "row",
    alignItems: "center",
  },

  logoutErrorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
    backgroundColor: "#B42318",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
  },

  logoutErrorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: "#B42318",
  },

  signOutButton: {
    height: 56,
    marginTop: 18,
    borderRadius: 19,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#F2D2D2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  signOutButtonDisabled: {
    opacity: 0.65,
  },

  signOutIcon: {
    marginRight: 8,
    fontSize: 21,
    color: "#C62828",
  },

  signOutText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#C62828",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#FBFCF9",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#777777",
  },
});
