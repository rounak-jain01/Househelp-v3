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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

      await signOut(getAuth());

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:
              insets.top + 12,
            paddingBottom:
              insets.bottom + 105,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isSigningOut}
          >
            <Text style={styles.backIcon}>
              ‹
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Profile
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Hero */}
        <View style={styles.profileHero}>
          {photoUrl ? (
            <Image
              source={{
                uri: photoUrl,
              }}
              style={styles.profileImage}
            />
          ) : (
            <View
              style={
                styles.profileInitial
              }
            >
              <Text
                style={
                  styles.profileInitialText
                }
              >
                {getInitial()}
              </Text>
            </View>
          )}

          <Text style={styles.profileName}>
            {name}
          </Text>

          <Text style={styles.profilePhone}>
            {phone}
          </Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>
              ⚠
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Personal Details */}
        <Text style={styles.sectionTitle}>
          Personal details
        </Text>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text>👤</Text>
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Full name
              </Text>

              <Text style={styles.detailValue}>
                {name}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text>📱</Text>
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Phone number
              </Text>

              <Text style={styles.detailValue}>
                {phone}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Text>◉</Text>
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>
                Gender
              </Text>

              <Text style={styles.detailValue}>
                {gender}
              </Text>
            </View>
          </View>
        </View>

        {/* Address */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Home address
          </Text>

          <Pressable
            onPress={() =>
              router.push(
                '/auth/profile',
              )
            }
            disabled={isSigningOut}
          >
            <Text style={styles.editText}>
              Edit
            </Text>
          </Pressable>
        </View>

        <View style={styles.addressCard}>
          <View style={styles.addressIconCircle}>
            <Text style={styles.addressIcon}>
              ⌖
            </Text>
          </View>

          <View style={styles.addressContent}>
            {address ? (
              <>
                <Text style={styles.addressText}>
                  {address}
                </Text>

                {landmark ? (
                  <Text style={styles.landmarkText}>
                    Landmark: {landmark}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text
                style={
                  styles.addressMissing
                }
              >
                No address added yet.
              </Text>
            )}
          </View>
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>
          Account
        </Text>

        <View style={styles.accountCard}>
          <View style={styles.accountIconCircle}>
            <Text
              style={
                styles.accountIcon
              }
            >
              ✓
            </Text>
          </View>

          <View style={styles.accountContent}>
            <Text style={styles.accountTitle}>
              HomeHelp account
            </Text>

            <Text style={styles.accountSubtitle}>
              Your account is active
            </Text>
          </View>
        </View>

        {/* Logout Error */}
        {logoutError ? (
          <View
            style={
              styles.logoutErrorBox
            }
          >
            <Text
              style={
                styles.logoutErrorIcon
              }
            >
              ⚠
            </Text>

            <Text
              style={
                styles.logoutErrorText
              }
            >
              {logoutError}
            </Text>
          </View>
        ) : null}

        {/* Sign Out */}
        <Pressable
          style={[
            styles.signOutButton,
            isSigningOut &&
              styles.signOutButtonDisabled,
          ]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator
              size="small"
              color="#B42318"
            />
          ) : (
            <Text style={styles.signOutIcon}>
              ↪
            </Text>
          )}

          <Text style={styles.signOutText}>
            {isSigningOut
              ? 'Signing out...'
              : 'Sign Out'}
          </Text>
        </Pressable>

        <Text style={styles.versionText}>
          HomeHelp
        </Text>
      </ScrollView>

      <View
        style={[
          styles.bottomNav,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <Pressable
          style={styles.navItem}
          onPress={() => router.replace('/customer')}
        >
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={styles.navLabel}>Home</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.replace('/customer/bookings')}
        >
          <Text style={styles.navIcon}>▣</Text>
          <Text style={styles.navLabel}>Bookings</Text>
        </Pressable>

        <Pressable style={styles.navItem}>
          <View style={styles.navProfileImageWrap}>
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.navProfileImage}
              />
            ) : (
              <Text style={styles.navProfileInitials}>
                {getInitial()}
              </Text>
            )}
          </View>
          <Text numberOfLines={1} style={styles.navProfileName}>
            {name.split(/\s+/)[0] || 'Profile'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#777777',
  },

  content: {
    paddingHorizontal: 20,
  },

  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 34,
    lineHeight: 34,
    color: '#111111',
    marginTop: -3,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111111',
  },

  headerSpacer: {
    width: 42,
  },

  profileHero: {
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 12,
  },

  profileImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#E9EEE9',
  },

  profileInitial: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#DCEFE3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInitialText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  profileName: {
    marginTop: 13,
    fontSize: 23,
    fontWeight: '800',
    color: '#111111',
  },

  profilePhone: {
    marginTop: 4,
    fontSize: 13,
    color: '#777777',
  },

  sectionTitle: {
    marginTop: 23,
    marginBottom: 11,
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },

  sectionHeaderRow: {
  marginTop: 23,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

  editText: {
  fontSize: 12,
  fontWeight: '700',
  color: '#1F7A4C',
},

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7EAE7',
    paddingHorizontal: 15,
  },

  detailRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 11,
    color: '#858B87',
  },

  detailValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },

  separator: {
    height: 1,
    backgroundColor: '#ECEFEC',
  },

  addressCard: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAE7',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  addressIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  addressIcon: {
    fontSize: 23,
    color: '#1F7A4C',
  },

  addressContent: {
    flex: 1,
    paddingTop: 1,
  },

  addressText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#333333',
  },

  landmarkText: {
    marginTop: 6,
    fontSize: 11,
    color: '#858B87',
  },

  addressMissing: {
    fontSize: 12,
    color: '#A86400',
    lineHeight: 18,
  },

  accountCard: {
    minHeight: 70,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAE7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCEFE3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  accountIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  accountContent: {
    flex: 1,
  },

  accountTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },

  accountSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#858B87',
  },

  errorBox: {
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF4F2',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorIcon: {
    marginRight: 8,
    fontSize: 15,
    color: '#B42318',
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#B42318',
  },

  logoutErrorBox: {
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF4F2',
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoutErrorIcon: {
    marginRight: 8,
    fontSize: 15,
    color: '#B42318',
  },

  logoutErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#B42318',
  },

  signOutButton: {
    height: 52,
    marginTop: 18,
    borderRadius: 15,
    backgroundColor: '#FFF4F2',
    borderWidth: 1,
    borderColor: '#F1D7D3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  signOutButtonDisabled: {
    opacity: 0.65,
  },

  signOutIcon: {
    marginRight: 8,
    fontSize: 19,
    color: '#B42318',
  },

  signOutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B42318',
  },


  bottomNav: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 9,
    minHeight: 80,
    paddingTop: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6E2',
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  navItem: {
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIcon: {
    fontSize: 19,
    color: '#858A86',
  },

  navLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
    color: '#858A86',
  },

  navProfileImageWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#E7EEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navProfileImage: {
    width: '100%',
    height: '100%',
  },

  navProfileInitials: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A211B',
  },

  navProfileName: {
    marginTop: 3,
    maxWidth: 58,
    fontSize: 9,
    fontWeight: '700',
    color: '#1F7A4C',
    textAlign: 'center',
  },

  versionText: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 10,
    color: '#A0A5A1',
  },
});