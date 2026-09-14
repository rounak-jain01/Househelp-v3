import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import {
  saveCustomerProfile,
  type CustomerGender,
} from '../../services/firebase/userService';

type AddressState = {
  formatted: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
};

const GENDERS: {
  label: string;
  value: CustomerGender;
}[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const ASSETS = {
  logo: require('../../../assets/CustomerUi/logo.png'),
  backArrow: require('../../../assets/CustomerUi/back-arrow.png'),
  avatar: require('../../../assets/CustomerProfileUi/profile-avatar.png'),
  cameraBadge: require('../../../assets/CustomerProfileUi/camera-badge.png'),
  user: require('../../../assets/CustomerProfileUi/user-icon.png'),
  location: require('../../../assets/CustomerProfileUi/location-icon.png'),
  rightArrow: require('../../../assets/CustomerProfileUi/right-arrow.png'),
} satisfies Record<string, ImageSourcePropType>;

export default function CustomerProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [name, setName] = useState('');
  const [gender, setGender] = useState<CustomerGender | null>(null);

  const [address, setAddress] = useState<AddressState>({
    formatted: '',
    landmark: '',
    latitude: null,
    longitude: null,
  });

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isSmall = height < 760;
  const horizontalPadding = Math.max(20, Math.min(26, width * 0.062));

  useEffect(() => {
    let mounted = true;

    async function loadCurrentLocation() {
      try {
        setIsGettingLocation(true);

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (!mounted) return;
        if (permission.status !== 'granted') return;

        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        if (!mounted) return;

        const { latitude, longitude } = currentLocation.coords;

        setAddress((current) => ({
          ...current,
          latitude,
          longitude,
          formatted: current.formatted,
        }));
      } catch (locationError) {
        console.error(
          '[CustomerProfileSetup] Location failed:',
          locationError,
        );
      } finally {
        if (mounted) setIsGettingLocation(false);
      }
    }

    loadCurrentLocation();

    return () => {
      mounted = false;
    };
  }, []);

  const choosePhoto = async () => {
    setError('');

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('Please allow photo access to choose a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setError('');
      setIsGettingLocation(true);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setError(
          'Location permission is required to use your current location.',
        );
        return;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      const { latitude, longitude } = currentLocation.coords;

      let formattedAddress = 'Enter Your Complete Address';

      try {
        const results = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (results.length > 0) {
          const result = results[0];

          formattedAddress = [
            result.name,
            result.street,
            result.district,
            result.city,
            result.region,
          ]
            .filter(Boolean)
            .join(', ');
        }
      } catch (geocodeError) {
        console.error(
          '[CustomerProfileSetup] Reverse geocode failed:',
          geocodeError,
        );
      }

      setAddress((current) => ({
        ...current,
        formatted: formattedAddress,
        latitude,
        longitude,
      }));
    } catch (locationError) {
      console.error(
        '[CustomerProfileSetup] Location failed:',
        locationError,
      );

      setError(
        'Unable to get your current location. Please enter your address manually.',
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSave = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!gender) {
      setError('Please select your gender.');
      return;
    }

    if (!address.formatted.trim()) {
      setError('Please add your home address.');
      return;
    }

    try {
      setIsSaving(true);

      await saveCustomerProfile({
        name: name.trim(),
        gender,
        address: address.formatted.trim(),
        landmark: address.landmark.trim(),
        latitude: address.latitude,
        longitude: address.longitude,
        photoUri,
      });

      router.replace('/customer');
    } catch (saveError) {
      console.error(
        '[CustomerProfileSetup] Save failed:',
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save your profile. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
      >
        {/* FIXED HEADER */}
        <View
          style={[
            styles.fixedHeader,
            {
              paddingTop: Math.max(8, insets.top),
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            disabled={isSaving}
            hitSlop={10}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Image
              source={ASSETS.backArrow}
              style={styles.backArrow}
              resizeMode="contain"
            />
          </Pressable>

          <Image
            source={ASSETS.logo}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="HomeHelp logo"
          />

          <View style={styles.headerSpacer} />
        </View>

        {/* SCROLLABLE BODY ONLY */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          style={styles.bodyScroll}
          contentContainerStyle={[
            styles.bodyContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(18, insets.bottom + 18),
            },
          ]}
        >
          {/* HERO */}
          <View style={[styles.hero, isSmall && styles.heroSmall]}>
            <View style={styles.heroText}>
              <Text style={[styles.title, isSmall && styles.titleSmall]}>
                Complete{'\n'}your Profile
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  isSmall && styles.subtitleSmall,
                ]}
              >
                Help us know you better for{'\n'}
                a personalized Experience.
              </Text>
            </View>

            <Pressable
              onPress={choosePhoto}
              disabled={isSaving}
              style={[
                styles.avatarWrap,
                isSmall && styles.avatarWrapSmall,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Choose profile photo"
            >
              <Image
                source={photoUri ? { uri: photoUri } : ASSETS.avatar}
                style={styles.avatar}
                resizeMode="cover"
              />

              <View style={styles.cameraBadgeWrap}>
                <Image
                  source={ASSETS.cameraBadge}
                  style={styles.cameraBadge}
                  resizeMode="contain"
                />
              </View>
            </Pressable>
          </View>

          {/* FULL NAME */}
          <Text style={styles.label}>Full name</Text>

          <View style={styles.inputRow}>
            <Image
              source={ASSETS.user}
              style={styles.inputIcon}
              resizeMode="contain"
            />

            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError('');
              }}
              placeholder="Enter your full name"
              placeholderTextColor="#9B9F9C"
              style={styles.textInput}
              editable={!isSaving}
              returnKeyType="next"
            />
          </View>

          {/* GENDER */}
          <Text style={styles.label}>Gender</Text>

          <View style={styles.genderGrid}>
            {GENDERS.map((item) => {
              const selected = gender === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setGender(item.value);
                    setError('');
                  }}
                  disabled={isSaving}
                  style={[
                    styles.genderChip,
                    selected && styles.genderChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderText,
                      selected && styles.genderTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* HOME ADDRESS */}
          <Text style={styles.label}>Home address</Text>

          <Pressable
            style={styles.locationCard}
            onPress={useCurrentLocation}
            disabled={isSaving || isGettingLocation}
            accessibilityRole="button"
            accessibilityLabel="Use current location"
          >
            <Image
              source={ASSETS.location}
              resizeMode="contain"
              style={styles.locationIcon}
            />

            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>
                Use current location
              </Text>

              <Text style={styles.locationSubtitle}>
                {isGettingLocation
                  ? 'Getting your location...'
                  : address.formatted
                    ? address.formatted
                    : 'Tap to use your current location'}
              </Text>
            </View>

            {isGettingLocation ? (
              <ActivityIndicator size="small" color="#174B3D" />
            ) : (
              <Image
                source={ASSETS.rightArrow}
                resizeMode="contain"
                style={styles.smallArrow}
              />
            )}
          </Pressable>

          <Text style={styles.orText}>OR ENTER MANUALLY</Text>

          <TextInput
            value={address.formatted}
            onChangeText={(value) => {
              setAddress((current) => ({
                ...current,
                formatted: value,
              }));
              setError('');
            }}
            placeholder="Enter your complete address"
            placeholderTextColor="#9B9F9C"
            style={[styles.textInputBox, styles.addressInput]}
            multiline
            textAlignVertical="top"
            editable={!isSaving}
          />

          {/* LANDMARK */}
          <Text style={styles.label}>Landmark</Text>

          <TextInput
            value={address.landmark}
            onChangeText={(value) => {
              setAddress((current) => ({
                ...current,
                landmark: value,
              }));
              setError('');
            }}
            placeholder="Nearby landmark (optional)"
            placeholderTextColor="#9B9F9C"
            style={styles.textInputBox}
            editable={!isSaving}
            returnKeyType="done"
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* SAVE */}
          <Pressable
            style={[
              styles.continueButton,
              isSaving && styles.continueButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Continue and save profile"
          >
            {isSaving ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text
                  style={[
                    styles.continueText,
                    styles.loadingButtonText,
                  ]}
                >
                  Saving profile...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.continueText}>Continue</Text>
                <Image
                  source={ASSETS.rightArrow}
                  resizeMode="contain"
                  style={styles.buttonArrow}
                />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  fixedHeader: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  backButton: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backArrow: {
    width: 26,
    height: 26,
  },

  logo: {
    width: 136,
    height: 48,
    marginLeft: 4,
  },

  headerSpacer: {
    flex: 1,
  },

  bodyScroll: {
    flex: 1,
  },

  bodyContent: {
    flexGrow: 1,
  },
  hero: {
    height: 252,
    position: 'relative',
    overflow: 'visible',
    marginTop: 2,
  },
  heroSmall: {
    height: 220,
  },
  heroText: {
    position: 'absolute',
    left: 0,
    top: 34,
    zIndex: 5,
    maxWidth: '72%',
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.4,
    fontWeight: '800',
    color: '#102A25',
  },
  titleSmall: {
    fontSize: 30,
    lineHeight: 33,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15.5,
    lineHeight: 21,
    color: '#52635E',
  },
  subtitleSmall: {
    marginTop: 9,
    fontSize: 13.5,
    lineHeight: 18,
  },
  avatarWrap: {
    position: 'absolute',
    right: -20,
    top: 12,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#EEF5EF',
  },
  avatarWrapSmall: {
    width: 138,
    height: 138,
    borderRadius: 69,
    top: 8,
    right: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  cameraBadgeWrap: {
    position: 'absolute',
    right: 8,
    bottom: 2,
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  cameraBadge: {
    width: '100%',
    height: '100%',
  },
  label: {
    marginTop: 13,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#20302A',
  },
  inputRow: {
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E5E1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIcon: {
    width: 25,
    height: 25,
    marginRight: 11,
  },
  textInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontSize: 15,
    color: '#111111',
  },
  textInputBox: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#111111',
  },
  addressInput: {
    minHeight: 82,
    paddingTop: 13,
    paddingBottom: 13,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5E1',
  },
  genderChipSelected: {
    backgroundColor: '#E6F3EA',
    borderColor: '#174B3D',
  },
  genderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555B56',
  },
  genderTextSelected: {
    color: '#174B3D',
  },
  locationCard: {
    minHeight: 70,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5E1',
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 42,
    height: 42,
    marginRight: 11,
  },
  locationInfo: {
    flex: 1,
    marginRight: 9,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  locationSubtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#777777',
  },
  smallArrow: {
    width: 19,
    height: 19,
  },
  orText: {
    marginTop: 12,
    marginBottom: 1,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#949994',
  },
  errorBox: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFF4F2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#B42318',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#B42318',
  },
  continueButton: {
    height: 56,
    marginTop: 17,
    borderRadius: 29,
    backgroundColor: '#174B3D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
  },
  continueButtonDisabled: {
    backgroundColor: '#9BA59E',
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  loadingButtonText: {
    marginLeft: 8,
  },
  buttonArrow: {
    width: 27,
    height: 21,
  },
});
