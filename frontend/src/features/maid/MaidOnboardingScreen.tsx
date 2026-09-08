import React, {
  useEffect,
  useState,
} from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import {
  getMaidCategories,
  type MaidServiceCategory,
} from '../../services/firebase/maidService';

function getServiceIcon(name: string): string {
  switch (name.toLowerCase()) {
    case 'cleaning':
      return '🧹';
    case 'cooking':
      return '🍳';
    case 'laundry':
      return '🧺';
    case 'dishwashing':
      return '🍽️';
    default:
      return '✨';
  }
}

type OnboardingStep = 1 | 2 | 3 | 4;

export default function MaidOnboardingScreen() {
  const insets = useSafeAreaInsets();

  const [step, setStep] =
    useState<OnboardingStep>(1);

  // Step 1
  const [name, setName] =
    useState('');
  const [gender, setGender] =
    useState('');
  const [dateOfBirth, setDateOfBirth] =
    useState('');
  const [alternatePhoneNumber, setAlternatePhoneNumber] =
    useState('');
  const [emergencyContactName, setEmergencyContactName] =
    useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] =
    useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] =
    useState('');

  // Existing onboarding data
  const [serviceArea, setServiceArea] =
    useState('');

  const [categories, setCategories] =
    useState<MaidServiceCategory[]>([]);

  const [selectedCategories, setSelectedCategories] =
    useState<string[]>([]);

  const [profilePhotoUri, setProfilePhotoUri] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        setIsLoading(true);
        setError('');

        const result =
          await getMaidCategories();

        if (!mounted) {
          return;
        }

        setCategories(result);
      } catch (loadError) {
        console.error(
          '[MaidOnboarding] Category load failed:',
          loadError,
        );

        if (!mounted) {
          return;
        }

        setError(
          'Unable to load services. Please try again.',
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadCategories();

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
        'Photo permission is required to choose a profile photo.',
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
      setProfilePhotoUri(
        result.assets[0].uri,
      );
    }
  };

  const toggleCategory = (
    categoryId: string,
  ) => {
    setError('');

    setSelectedCategories(
      (current) =>
        current.includes(categoryId)
          ? current.filter(
              (id) => id !== categoryId,
            )
          : [...current, categoryId],
    );
  };

  const validateStepOne = (): boolean => {
    if (!name.trim()) {
      setError(
        'Please enter your full name.',
      );
      return false;
    }

    if (!gender) {
      setError(
        'Please select your gender.',
      );
      return false;
    }

    if (!dateOfBirth.trim()) {
      setError(
        'Please enter your date of birth.',
      );
      return false;
    }

    if (
      alternatePhoneNumber.replace(
        /\D/g,
        '',
      ).length !== 10
    ) {
      setError(
        'Please enter a valid 10-digit alternative number.',
      );
      return false;
    }

    if (!emergencyContactName.trim()) {
      setError(
        'Please enter an emergency contact name.',
      );
      return false;
    }

    if (
      emergencyContactNumber.replace(
        /\D/g,
        '',
      ).length !== 10
    ) {
      setError(
        'Please enter a valid 10-digit emergency contact number.',
      );
      return false;
    }

    if (!emergencyContactRelation) {
      setError(
        'Please select the relationship with the emergency contact.',
      );
      return false;
    }

    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStepOne()) {
        return;
      }

      setStep(2);
      setError('');
      return;
    }

    if (step === 2) {
      if (selectedCategories.length === 0) {
        setError(
          'Please select at least one service.',
        );
        return;
      }

      setStep(3);
      setError('');
      return;
    }

    if (step === 3) {
      if (!serviceArea.trim()) {
        setError(
          'Please enter your service area.',
        );
        return;
      }

      setStep(4);
      setError('');
      return;
    }

    // Step 4 will be connected to document
    // upload and final Firestore save next.
    setError(
      'Document upload and final submission will be completed in the next step.',
    );
  };

  const handleBack = () => {
    setError('');

    if (step === 1) {
      return;
    }

    setStep(
      (current) =>
        (current - 1) as OnboardingStep,
    );
  };

  const renderProgress = () => {
    return (
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map(
          (item) => {
            const active =
              item <= step;

            return (
              <View
                key={item}
                style={[
                  styles.progressSegment,
                  active &&
                    styles.progressSegmentActive,
                ]}
              />
            );
          },
        )}
      </View>
    );
  };

  const renderStepOne = () => {
    return (
      <>
        <Text style={styles.sectionTitle}>
          Personal details
        </Text>

        <Text style={styles.sectionSubtitle}>
          Tell us a little about yourself.
        </Text>

        <Text style={styles.label}>
          Full name *
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
          autoCapitalize="words"
        />

        <Text style={styles.label}>
          Gender *
        </Text>

        <View style={styles.optionRow}>
          {['Female', 'Male', 'Other'].map(
            (option) => {
              const selected =
                gender === option;

              return (
                <Pressable
                  key={option}
                  style={[
                    styles.optionButton,
                    selected &&
                      styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    setGender(option);
                    setError('');
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <Text style={styles.label}>
          Date of birth *
        </Text>

        <TextInput
          value={dateOfBirth}
          onChangeText={(value) => {
            setDateOfBirth(value);
            setError('');
          }}
          placeholder="DD/MM/YYYY"
          placeholderTextColor="#9B9F9C"
          style={styles.input}
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.label}>
          Alternative mobile number *
        </Text>

        <TextInput
          value={alternatePhoneNumber}
          onChangeText={(value) => {
            setAlternatePhoneNumber(
              value.replace(/\D/g, ''),
            );
            setError('');
          }}
          placeholder="10-digit mobile number"
          placeholderTextColor="#9B9F9C"
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <Text style={styles.fieldHint}>
          This number should be different from
          your primary login number.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.subsectionTitle}>
          Emergency contact
        </Text>

        <Text style={styles.subsectionSubtitle}>
          Someone we can contact in case of an
          emergency.
        </Text>

        <Text style={styles.label}>
          Contact name *
        </Text>

        <TextInput
          value={emergencyContactName}
          onChangeText={(value) => {
            setEmergencyContactName(
              value,
            );
            setError('');
          }}
          placeholder="Enter contact name"
          placeholderTextColor="#9B9F9C"
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>
          Contact number *
        </Text>

        <TextInput
          value={emergencyContactNumber}
          onChangeText={(value) => {
            setEmergencyContactNumber(
              value.replace(/\D/g, ''),
            );
            setError('');
          }}
          placeholder="10-digit mobile number"
          placeholderTextColor="#9B9F9C"
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <Text style={styles.label}>
          Relationship *
        </Text>

        <View style={styles.optionWrap}>
          {[
            'Spouse',
            'Parent',
            'Sibling',
            'Relative',
            'Friend',
            'Other',
          ].map((option) => {
            const selected =
              emergencyContactRelation ===
              option;

            return (
              <Pressable
                key={option}
                style={[
                  styles.relationButton,
                  selected &&
                    styles.optionButtonSelected,
                ]}
                onPress={() => {
                  setEmergencyContactRelation(
                    option,
                  );
                  setError('');
                }}
              >
                <Text
                  style={[
                    styles.relationText,
                    selected &&
                      styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </>
    );
  };

  const renderStepTwo = () => {
    return (
      <>
        <Text style={styles.sectionTitle}>
          Services & experience
        </Text>

        <Text style={styles.sectionSubtitle}>
          Choose the services you provide to
          customers.
        </Text>

        {isLoading ? (
          <View
            style={styles.loadingCard}
          >
            <ActivityIndicator
              color="#1F7A4C"
            />

            <Text style={styles.loadingText}>
              Loading services...
            </Text>
          </View>
        ) : (
          <View style={styles.serviceList}>
            {categories.map(
              (category) => {
                const selected =
                  selectedCategories.includes(
                    category.id,
                  );

                return (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.serviceCard,
                      selected &&
                        styles.serviceCardSelected,
                    ]}
                    onPress={() =>
                      toggleCategory(
                        category.id,
                      )
                    }
                  >
                    <View
                      style={[
                        styles.serviceIconCircle,
                        selected &&
                          styles.serviceIconCircleSelected,
                      ]}
                    >
                      <Text
                        style={
                          styles.serviceIcon
                        }
                      >
                        {getServiceIcon(
                          category.name,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.serviceInfo
                      }
                    >
                      <Text
                        style={[
                          styles.serviceName,
                          selected &&
                            styles.greenText,
                        ]}
                      >
                        {category.name}
                      </Text>

                      <Text
                        style={
                          styles.serviceRate
                        }
                      >
                        ₹
                        {
                          category.ratePerHour
                        }
                        /hr
                      </Text>
                    </View>

                    {selected && (
                      <View
                        style={
                          styles.checkBadge
                        }
                      >
                        <Text
                          style={
                            styles.checkText
                          }
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              },
            )}
          </View>
        )}
      </>
    );
  };

  const renderStepThree = () => {
    return (
      <>
        <Text style={styles.sectionTitle}>
          Working area
        </Text>

        <Text style={styles.sectionSubtitle}>
          Tell us where you usually provide
          your services.
        </Text>

        <Text style={styles.label}>
          Service area *
        </Text>

        <TextInput
          value={serviceArea}
          onChangeText={(value) => {
            setServiceArea(value);
            setError('');
          }}
          placeholder="e.g. Vijay Nagar, Indore"
          placeholderTextColor="#9B9F9C"
          style={styles.input}
        />

        <Text style={styles.fieldHint}>
          You can provide services only within
          your selected working area during the
          initial pilot.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>
            📍
          </Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Working location
            </Text>

            <Text style={styles.infoText}>
              Your exact service location and
              availability details will be
              completed in the next step.
            </Text>
          </View>
        </View>
      </>
    );
  };

  const renderStepFour = () => {
    return (
      <>
        <Text style={styles.sectionTitle}>
          Profile & documents
        </Text>

        <Text style={styles.sectionSubtitle}>
          Your photo and identity document will
          be required before your profile can be
          submitted.
        </Text>

        <Pressable
          style={styles.photoSection}
          onPress={choosePhoto}
        >
          {profilePhotoUri ? (
            <Image
              source={{
                uri: profilePhotoUri,
              }}
              style={styles.profilePhoto}
            />
          ) : (
            <View
              style={
                styles.photoPlaceholder
              }
            >
              <Text
                style={
                  styles.photoIcon
                }
              >
                +
              </Text>
            </View>
          )}

          <View style={styles.photoTextContainer}>
            <Text style={styles.photoTitle}>
              Profile photo *
            </Text>

            <Text style={styles.photoSubtitle}>
              {profilePhotoUri
                ? 'Tap to change photo'
                : 'Required'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.documentCard}>
          <View style={styles.documentIconCircle}>
            <Text style={styles.documentIcon}>
              ID
            </Text>
          </View>

          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle}>
              Identity document *
            </Text>

            <Text style={styles.documentSubtitle}>
              Aadhaar, voter ID, driving licence
              or another valid ID.
            </Text>
          </View>

          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>
              Required
            </Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:
              insets.top + 24,
            paddingBottom:
              insets.bottom + 30,
          },
        ]}
      >
        <Text style={styles.eyebrow}>
          HOMEHELP • HELP ONBOARDING
        </Text>

        <Text style={styles.title}>
          Set up your profile
        </Text>

        <Text style={styles.subtitle}>
          We need a few details before you can
          start receiving service requests.
        </Text>

        {renderProgress()}

        <View style={styles.stepIndicatorRow}>
          <Text style={styles.stepIndicator}>
            Step {step} of 4
          </Text>

          <Text style={styles.requiredText}>
            * Required
          </Text>
        </View>

        {step === 1 && renderStepOne()}
        {step === 2 && renderStepTwo()}
        {step === 3 && renderStepThree()}
        {step === 4 && renderStepFour()}

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

        <View style={styles.bottomActions}>
          {step > 1 ? (
            <Pressable
              style={styles.backButton}
              onPress={handleBack}
            >
              <Text style={styles.backText}>
                ← Back
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[
              styles.continueButton,
              step === 1 &&
                styles.singleActionButton,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.continueText}>
              {step === 4
                ? 'Review profile'
                : 'Continue'}
            </Text>

            <Text style={styles.arrow}>
              →
            </Text>
          </Pressable>
        </View>
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
    letterSpacing: 1.4,
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

  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 22,
  },

  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#DFE4E0',
  },

  progressSegmentActive: {
    backgroundColor: '#1F7A4C',
  },

  stepIndicatorRow: {
    marginTop: 9,
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stepIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6F756F',
  },

  requiredText: {
    fontSize: 11,
    color: '#8A8F8B',
  },

  sectionTitle: {
    marginTop: 25,
    fontSize: 21,
    fontWeight: '800',
    color: '#111111',
  },

  sectionSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#777C78',
  },

  subsectionTitle: {
    marginTop: 22,
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },

  subsectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#7B807C',
  },

  label: {
    marginTop: 19,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#222222',
  },

  input: {
    height: 53,
    borderRadius: 15,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6E2',
    fontSize: 14,
    color: '#111111',
  },

  optionRow: {
    flexDirection: 'row',
    gap: 9,
  },

  optionButton: {
    flex: 1,
    minHeight: 47,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E6E2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionButtonSelected: {
    backgroundColor: '#EAF5EE',
    borderColor: '#1F7A4C',
  },

  optionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F554F',
  },

  optionTextSelected: {
    color: '#1F7A4C',
  },

  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  relationButton: {
    paddingHorizontal: 15,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E2E6E2',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },

  relationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F554F',
  },

  fieldHint: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 16,
    color: '#858A86',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E8E5',
    marginTop: 26,
  },

  loadingCard: {
    marginTop: 20,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    borderWidth: 1,
    borderColor: '#E7EAE7',
  },

  loadingText: {
    fontSize: 13,
    color: '#777777',
  },

  serviceList: {
    marginTop: 20,
    gap: 10,
  },

  serviceCard: {
    minHeight: 70,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8E5',
    flexDirection: 'row',
    alignItems: 'center',
  },

  serviceCardSelected: {
    backgroundColor: '#F0F8F3',
    borderColor: '#1F7A4C',
  },

  serviceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F2F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  serviceIconCircleSelected: {
    backgroundColor: '#DCEFE3',
  },

  serviceIcon: {
    fontSize: 22,
  },

  serviceInfo: {
    flex: 1,
  },

  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },

  serviceRate: {
    marginTop: 3,
    fontSize: 11,
    color: '#777777',
  },

  greenText: {
    color: '#1F7A4C',
  },

  checkBadge: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#1F7A4C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  infoCard: {
    marginTop: 24,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#EEF6F1',
    borderWidth: 1,
    borderColor: '#D8E9DE',
    flexDirection: 'row',
  },

  infoIcon: {
    fontSize: 20,
    marginRight: 11,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  infoText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: '#657168',
  },

  photoSection: {
    marginTop: 22,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EAE7',
  },

  profilePhoto: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 14,
  },

  photoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EAF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  photoIcon: {
    fontSize: 30,
    color: '#1F7A4C',
    fontWeight: '300',
  },

  photoTextContainer: {
    flex: 1,
  },

  photoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },

  photoSubtitle: {
    marginTop: 5,
    fontSize: 12,
    color: '#777777',
  },

  documentCard: {
    marginTop: 12,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAE7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  documentIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF2EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  documentIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1F7A4C',
  },

  documentInfo: {
    flex: 1,
  },

  documentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
  },

  documentSubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#7A807B',
  },

  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFF5E8',
  },

  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A05A00',
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

  bottomActions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },

  backButton: {
    width: 92,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE4E0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F554F',
  },

  continueButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1F7A4C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  singleActionButton: {
    flex: 1,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  arrow: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '600',
  },
});