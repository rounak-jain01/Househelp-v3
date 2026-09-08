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
import {
  router,
} from 'expo-router';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import {
  getMaidCategories,
  saveMaidProfile,
  type MaidServiceCategory,
} from '../../services/firebase/maidService';

function getServiceIcon(
  name: string,
): string {
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

export default function MaidOnboardingScreen() {
  const insets =
    useSafeAreaInsets();

  const [name, setName] =
    useState('');

  const [serviceArea, setServiceArea] =
    useState('');

  const [categories, setCategories] =
    useState<MaidServiceCategory[]>(
      [],
    );

  const [selectedCategories,
    setSelectedCategories] =
    useState<string[]>([]);

  const [profilePhotoUri,
    setProfilePhotoUri] =
    useState<string | null>(
      null,
    );

  const [isLoading,
    setIsLoading] =
    useState(true);

  const [isSaving,
    setIsSaving] =
    useState(false);

  const [error,
    setError] =
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

  const toggleCategory = (
    categoryId: string,
  ) => {
    setError('');

    setSelectedCategories(
      (current) =>
        current.includes(categoryId)
          ? current.filter(
              (id) =>
                id !== categoryId,
            )
          : [
              ...current,
              categoryId,
            ],
    );
  };

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
      await ImagePicker.launchImageLibraryAsync(
        {
          mediaTypes: [
            'images',
          ],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        },
      );

    if (
      !result.canceled &&
      result.assets.length > 0
    ) {
      setProfilePhotoUri(
        result.assets[0].uri,
      );
    }
  };

  const handleContinue =
    async () => {
      setError('');

      if (!name.trim()) {
        setError(
          'Please enter your name.',
        );
        return;
      }

      if (
        selectedCategories.length ===
        0
      ) {
        setError(
          'Please select at least one service.',
        );
        return;
      }

      if (!serviceArea.trim()) {
        setError(
          'Please enter your service area.',
        );
        return;
      }

      try {
        setIsSaving(true);

        await saveMaidProfile({
          name,
          serviceCategories:
            selectedCategories,
          serviceArea,
          profilePhotoUri,
        });

        router.replace(
          '/maid',
        );
      } catch (saveError) {
        console.error(
          '[MaidOnboarding] Save failed:',
          saveError,
        );

        setError(
          saveError instanceof
            Error
            ? saveError.message
            : 'Unable to save your profile.',
        );
      } finally {
        setIsSaving(false);
      }
    };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
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
          WELCOME TO HOMEHELP
        </Text>

        <Text style={styles.title}>
          Let’s set up your profile
        </Text>

        <Text style={styles.subtitle}>
          Add a few details so customers
          know what kind of Help you
          provide.
        </Text>

        <Pressable
          style={styles.photoSection}
          onPress={choosePhoto}
          disabled={isSaving}
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

          <View>
            <Text
              style={
                styles.photoTitle
              }
            >
              Profile photo
            </Text>

            <Text
              style={
                styles.photoSubtitle
              }
            >
              {profilePhotoUri
                ? 'Tap to change photo'
                : 'Optional'}
            </Text>
          </View>
        </Pressable>

        <Text style={styles.label}>
          Your name
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
          Services you provide
        </Text>

        {isLoading ? (
          <View
            style={
              styles.loadingCard
            }
          >
            <ActivityIndicator
              color="#1F7A4C"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading services...
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.serviceList
            }
          >
            {categories.map(
              (category) => {
                const selected =
                  selectedCategories.includes(
                    category.id,
                  );

                return (
                  <Pressable
                    key={
                      category.id
                    }
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
                    disabled={isSaving}
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
                        {
                          category.name
                        }
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

        <Text style={styles.label}>
          Service area
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
          editable={!isSaving}
        />

        <Text style={styles.fieldHint}>
          Enter the area where you usually
          provide services.
        </Text>

        {error ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorIcon
              }
            >
              ⚠
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.continueButton,
            isSaving &&
              styles.disabledButton,
          ]}
          onPress={
            handleContinue
          }
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
                  {
                    marginLeft: 9,
                  },
                ]}
              >
                Saving profile...
              </Text>
            </>
          ) : (
            <>
              <Text
                style={
                  styles.continueText
                }
              >
                Continue
              </Text>

              <Text
                style={
                  styles.arrow
                }
              >
                →
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F7F8F6',
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

    photoSection: {
      marginTop: 25,
      padding: 15,
      borderRadius: 18,
      backgroundColor:
        '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        '#E7EAE7',
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
      backgroundColor:
        '#EAF3ED',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },

    photoIcon: {
      fontSize: 30,
      color: '#1F7A4C',
      fontWeight: '300',
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

    label: {
      marginTop: 22,
      marginBottom: 9,
      fontSize: 14,
      fontWeight: '700',
      color: '#222222',
    },

    input: {
      height: 53,
      borderRadius: 15,
      paddingHorizontal: 15,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E2E6E2',
      fontSize: 14,
      color: '#111111',
    },

    loadingCard: {
      height: 70,
      borderRadius: 16,
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 9,
      borderWidth: 1,
      borderColor:
        '#E7EAE7',
    },

    loadingText: {
      fontSize: 13,
      color: '#777777',
    },

    serviceList: {
      gap: 10,
    },

    serviceCard: {
      minHeight: 70,
      paddingHorizontal: 13,
      borderRadius: 16,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E5E8E5',
      flexDirection: 'row',
      alignItems: 'center',
    },

    serviceCardSelected: {
      backgroundColor:
        '#F0F8F3',
      borderColor:
        '#1F7A4C',
    },

    serviceIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor:
        '#F0F2F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    serviceIconCircleSelected: {
      backgroundColor:
        '#DCEFE3',
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
      backgroundColor:
        '#1F7A4C',
      alignItems: 'center',
      justifyContent: 'center',
    },

    checkText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

    fieldHint: {
      marginTop: 7,
      fontSize: 11,
      color: '#858A86',
    },

    errorBox: {
      marginTop: 18,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor:
        '#FFF4F2',
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
      backgroundColor:
        '#1F7A4C',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    disabledButton: {
      backgroundColor:
        '#AAB3AD',
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