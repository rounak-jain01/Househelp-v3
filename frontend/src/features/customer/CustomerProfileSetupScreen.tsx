import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  {
    label: 'Prefer not to say',
    value: 'prefer_not_to_say',
  },
];

export default function CustomerProfileSetupScreen() {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [gender, setGender] =
    useState<CustomerGender | null>(null);

  const [address, setAddress] =
    useState<AddressState>({
      formatted: '',
      landmark: '',
      latitude: null,
      longitude: null,
    });

  const [photoUri, setPhotoUri] =
    useState<string | null>(null);

  const [isGettingLocation, setIsGettingLocation] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    let mounted = true;

    async function loadCurrentLocation() {
      try {
        setIsGettingLocation(true);

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (!mounted) return;

        if (permission.status !== 'granted') {
          return;
        }

        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.Balanced,
          });

        if (!mounted) return;

        const { latitude, longitude } =
          currentLocation.coords;

        setAddress((current) => ({
          ...current,
          latitude,
          longitude,
          formatted:
            current.formatted ||
            'Current location selected',
        }));
      } catch (locationError) {
        console.error(
          '[CustomerProfileSetup] Location failed:',
          locationError,
        );
      } finally {
        if (mounted) {
          setIsGettingLocation(false);
        }
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
      setError(
        'Please allow photo access to choose a profile photo.',
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

    if (
      !result.canceled &&
      result.assets.length > 0
    ) {
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
          accuracy:
            Location.Accuracy.Balanced,
        });

      const { latitude, longitude } =
        currentLocation.coords;

      let formattedAddress =
        'Current location selected';

      try {
        const results =
          await Location.reverseGeocodeAsync({
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: insets.bottom + 30,
          },
        ]}
      >
        <Text style={styles.eyebrow}>
          WELCOME TO HOMEHELP
        </Text>

        <Text style={styles.title}>
          Let’s complete your profile
        </Text>

        <Text style={styles.subtitle}>
          Add your details so we can make your
          HomeHelp experience smoother.
        </Text>

        <Pressable
          style={styles.photoCard}
          onPress={choosePhoto}
          disabled={isSaving}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlus}>+</Text>
            </View>
          )}

          <View style={styles.photoInfo}>
            <Text style={styles.photoTitle}>
              Profile photo
            </Text>

            <Text style={styles.photoSubtitle}>
              {photoUri
                ? 'Tap to change'
                : 'Optional'}
            </Text>
          </View>
        </Pressable>

        <Text style={styles.label}>
          Full name
        </Text>

        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError('');
          }}
          placeholder="Enter your full name"
          placeholderTextColor="#9B9F9C"
          style={styles.input}
          editable={!isSaving}
        />

        <Text style={styles.label}>
          Gender
        </Text>

        <View style={styles.genderGrid}>
          {GENDERS.map((item) => {
            const selected =
              gender === item.value;

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
                  selected &&
                    styles.genderChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.genderText,
                    selected &&
                      styles.genderTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>
          Home address
        </Text>

        <Pressable
          style={styles.locationCard}
          onPress={useCurrentLocation}
          disabled={
            isSaving ||
            isGettingLocation
          }
        >
          <View style={styles.locationIconCircle}>
            <Text style={styles.locationIcon}>
              ⌖
            </Text>
          </View>

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

          {isGettingLocation && (
            <ActivityIndicator
              size="small"
              color="#1F7A4C"
            />
          )}
        </Pressable>

        <Text style={styles.orText}>
          OR ENTER MANUALLY
        </Text>

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
          style={[
            styles.input,
            styles.addressInput,
          ]}
          multiline
          textAlignVertical="top"
          editable={!isSaving}
        />

        <Text style={styles.label}>
          Landmark
        </Text>

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
          style={styles.input}
          editable={!isSaving}
        />

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

        <Pressable
          style={[
            styles.continueButton,
            isSaving &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

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
              <Text style={styles.continueText}>
                Continue
              </Text>

              <Text style={styles.arrow}>
                →
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },

  content: {
    paddingHorizontal: 20,
  },

  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  title: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    color: '#111111',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#737873',
  },

  photoCard: {
    marginTop: 24,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAE7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  profilePhoto: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },

  photoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E3F0E7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoPlus: {
    fontSize: 30,
    color: '#1F7A4C',
    fontWeight: '300',
  },

  photoInfo: {
    marginLeft: 14,
  },

  photoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },

  photoSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#777777',
  },

  label: {
    marginTop: 21,
    marginBottom: 9,
    fontSize: 14,
    fontWeight: '700',
    color: '#202320',
  },

  input: {
    minHeight: 53,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#111111',
  },

  addressInput: {
    minHeight: 100,
    paddingTop: 14,
    paddingBottom: 14,
  },

  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  genderChip: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5E1',
  },

  genderChipSelected: {
    backgroundColor: '#E6F3EA',
    borderColor: '#1F7A4C',
  },

  genderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555B56',
  },

  genderTextSelected: {
    color: '#1F7A4C',
  },

  locationCard: {
    minHeight: 78,
    padding: 13,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5E1',
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationIcon: {
    fontSize: 23,
    color: '#1F7A4C',
  },

  locationInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },

  locationSubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#777777',
  },

  orText: {
    marginTop: 15,
    marginBottom: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#949994',
  },

  errorBox: {
    marginTop: 18,
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

  continueButton: {
    height: 54,
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: '#1F7A4C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: 9,
  },

  arrow: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '600',
  },
});