import React, {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAuth } from '@react-native-firebase/auth';
import { router } from 'expo-router';

import {
  getMaidCategories,
  saveMaidProfile,
  type MaidServiceCategory,
} from '../../services/firebase/maidService';
import { useMaidLanguage } from './MaidLanguageContext';

type OnboardingStep = 1 | 2 | 3 | 4;

const copy = {
  en: {
    eyebrow: 'HOMEHELP • HELP ONBOARDING',
    title: 'Set up your profile',
    subtitle:
      'We need a few details before you can start receiving service requests.',
    step: 'Step',
    of: 'of',
    required: '* Required',
    optional: 'Optional',
    personal: 'Personal details',
    personalSub: 'Tell us a little about yourself.',
    fullName: 'Full name',
    fullNamePlaceholder: 'Enter your full name',
    gender: 'Gender',
    female: 'Female',
    male: 'Male',
    other: 'Other',
    dob: 'Date of birth',
    dobPlaceholder: 'Select your date of birth',
    altPhone: 'Alternative mobile number',
    altPhonePlaceholder: '10-digit mobile number',
    altPhoneHint:
      'Optional. This can be used as a secondary contact number.',
    emergency: 'Emergency contact',
    emergencySub:
      'Someone we can contact in case of an emergency.',
    contactName: 'Contact name',
    contactNamePlaceholder: 'Enter contact name',
    contactNumber: 'Contact number',
    contactNumberPlaceholder: '10-digit mobile number',
    relationship: 'Relationship',
    spouse: 'Spouse',
    parent: 'Parent',
    sibling: 'Sibling',
    relative: 'Relative',
    friend: 'Friend',
    services: 'Services & experience',
    servicesSub:
      'Choose the services you provide to customers.',
    loadingServices: 'Loading services...',
    workingArea: 'Working area',
    workingAreaSub:
      'Tell us where you usually provide your services.',
    serviceArea: 'Service area',
    serviceAreaPlaceholder: 'e.g. Vijay Nagar, Indore',
    serviceAreaHint:
      'You can provide services within your selected working area during the initial pilot.',
    locationTitle: 'Working location',
    locationText:
      'Your exact service location and availability details will be completed later.',
    profileDocuments: 'Profile & documents',
    profileDocumentsSub:
      'A profile photo and identity document are required before submission.',
    profilePhoto: 'Profile photo',
    tapChange: 'Tap to change photo',
    choosePhoto: 'Choose photo',
    idDocument: 'Identity document',
    idDocumentSub:
      'Upload Aadhaar, voter ID, driving licence or another valid ID.',
    chooseDocument: 'Choose document',
    changeDocument: 'Change document',
    documentReady: 'Document selected',
    maxFile: 'PDF or image',
    review: 'Review profile',
    continue: 'Continue',
    back: 'Back',
    save: 'Submit profile',
    saving: 'Submitting profile...',
    photoRequired: 'Please upload your profile photo.',
    documentRequired: 'Please upload your identity document.',
    datePickerDone: 'Done',
    noServices: 'No active services are available right now.',
    errorServices:
      'Unable to load services. Please try again.',
    nameError: 'Please enter your full name.',
    genderError: 'Please select your gender.',
    emergencyNameError:
      'Please enter your emergency contact name.',
    emergencyNumberError:
      'Please enter a valid 10-digit emergency contact number.',
    emergencyRelationError:
      'Please select the relationship with your emergency contact.',
    alternateError:
      'Please enter a valid 10-digit alternative number.',
    serviceError:
      'Please select at least one service.',
    areaError: 'Please enter your service area.',
    success: 'Your Help profile has been created successfully.',
    languageEnglish: 'English',
    languageHindi: 'हिन्दी',
  },
  hi: {
    eyebrow: 'HOMEHELP • HELP ONBOARDING',
    title: 'अपनी प्रोफ़ाइल बनाएं',
    subtitle:
      'सेवा अनुरोध प्राप्त करने से पहले हमें आपकी कुछ जानकारी चाहिए।',
    step: 'चरण',
    of: 'का',
    required: '* जरूरी',
    optional: 'वैकल्पिक',
    personal: 'व्यक्तिगत जानकारी',
    personalSub: 'अपने बारे में कुछ जानकारी दें।',
    fullName: 'पूरा नाम',
    fullNamePlaceholder: 'अपना पूरा नाम लिखें',
    gender: 'लिंग',
    female: 'महिला',
    male: 'पुरुष',
    other: 'अन्य',
    dob: 'जन्म तिथि',
    dobPlaceholder: 'जन्म तिथि चुनें',
    altPhone: 'वैकल्पिक मोबाइल नंबर',
    altPhonePlaceholder: '10 अंकों का मोबाइल नंबर',
    altPhoneHint:
      'वैकल्पिक। इसे दूसरे संपर्क नंबर के रूप में उपयोग किया जा सकता है।',
    emergency: 'आपातकालीन संपर्क',
    emergencySub:
      'आपात स्थिति में हम इस व्यक्ति से संपर्क कर सकें।',
    contactName: 'संपर्क व्यक्ति का नाम',
    contactNamePlaceholder: 'संपर्क व्यक्ति का नाम लिखें',
    contactNumber: 'संपर्क नंबर',
    contactNumberPlaceholder: '10 अंकों का मोबाइल नंबर',
    relationship: 'रिश्ता',
    spouse: 'पति/पत्नी',
    parent: 'माता/पिता',
    sibling: 'भाई/बहन',
    relative: 'रिश्तेदार',
    friend: 'मित्र',
    services: 'सेवाएं और अनुभव',
    servicesSub:
      'वे सेवाएं चुनें जो आप ग्राहकों को देती हैं।',
    loadingServices: 'सेवाएं लोड हो रही हैं...',
    workingArea: 'काम करने का क्षेत्र',
    workingAreaSub:
      'बताएं कि आप आमतौर पर कहां सेवाएं देती हैं।',
    serviceArea: 'सेवा क्षेत्र',
    serviceAreaPlaceholder: 'जैसे विजयनगर, इंदौर',
    serviceAreaHint:
      'शुरुआती पायलट में आप चुने हुए सेवा क्षेत्र के अंदर काम करेंगी।',
    locationTitle: 'काम करने की जगह',
    locationText:
      'आपकी सटीक लोकेशन और उपलब्धता की जानकारी बाद में पूरी की जाएगी।',
    profileDocuments: 'फोटो और दस्तावेज़',
    profileDocumentsSub:
      'सबमिट करने से पहले प्रोफ़ाइल फोटो और पहचान दस्तावेज़ जरूरी हैं।',
    profilePhoto: 'प्रोफ़ाइल फोटो',
    tapChange: 'फोटो बदलने के लिए टैप करें',
    choosePhoto: 'फोटो चुनें',
    idDocument: 'पहचान दस्तावेज़',
    idDocumentSub:
      'आधार, वोटर आईडी, ड्राइविंग लाइसेंस या कोई मान्य पहचान पत्र अपलोड करें।',
    chooseDocument: 'दस्तावेज़ चुनें',
    changeDocument: 'दस्तावेज़ बदलें',
    documentReady: 'दस्तावेज़ चुना गया',
    maxFile: 'PDF या इमेज',
    review: 'प्रोफ़ाइल देखें',
    continue: 'आगे बढ़ें',
    back: 'वापस',
    save: 'प्रोफ़ाइल सबमिट करें',
    saving: 'प्रोफ़ाइल सबमिट हो रही है...',
    photoRequired: 'कृपया अपनी प्रोफ़ाइल फोटो अपलोड करें।',
    documentRequired: 'कृपया अपना पहचान दस्तावेज़ अपलोड करें।',
    datePickerDone: 'हो गया',
    noServices: 'अभी कोई सक्रिय सेवा उपलब्ध नहीं है।',
    errorServices:
      'सेवाएं लोड नहीं हो सकीं। कृपया फिर से कोशिश करें।',
    nameError: 'कृपया अपना पूरा नाम लिखें।',
    genderError: 'कृपया अपना लिंग चुनें।',
    emergencyNameError:
      'कृपया आपातकालीन संपर्क का नाम लिखें।',
    emergencyNumberError:
      'कृपया सही 10 अंकों का आपातकालीन नंबर लिखें।',
    emergencyRelationError:
      'कृपया आपातकालीन संपर्क का रिश्ता चुनें।',
    alternateError:
      'कृपया सही 10 अंकों का वैकल्पिक नंबर लिखें।',
    serviceError:
      'कृपया कम से कम एक सेवा चुनें।',
    areaError: 'कृपया अपना सेवा क्षेत्र लिखें।',
    success: 'आपकी Help प्रोफ़ाइल सफलतापूर्वक बन गई है।',
    languageEnglish: 'English',
    languageHindi: 'हिन्दी',
  },
} as const;

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

export default function MaidOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const user = getAuth().currentUser;

  const { language, setLanguage } = useMaidLanguage();
  const [step, setStep] =
    useState<OnboardingStep>(1);

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] =
    useState('');
  const [dobDate, setDobDate] =
    useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [alternatePhoneNumber, setAlternatePhoneNumber] =
    useState('');

  const [emergencyContactName, setEmergencyContactName] =
    useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] =
    useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] =
    useState('');

  const [serviceArea, setServiceArea] =
    useState('');

  const [categories, setCategories] =
    useState<MaidServiceCategory[]>([]);
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>([]);

  const [profilePhotoUri, setProfilePhotoUri] =
    useState<string | null>(null);
  const [idDocumentUri, setIdDocumentUri] =
    useState<string | null>(null);
  const [idDocumentName, setIdDocumentName] =
    useState('');
  const [idDocumentType, setIdDocumentType] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] =
    useState('');

  const t = copy[language];

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        setIsLoading(true);
        setError('');

        const result =
          await getMaidCategories();

        if (!mounted) return;

        setCategories(result);
      } catch (loadError) {
        console.error(
          '[MaidOnboarding] Category load failed:',
          loadError,
        );

        if (mounted) {
          setError(t.errorServices);
        }
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

  const selectDate = (
    _: unknown,
    selectedDate?: Date,
  ) => {
    setShowDatePicker(false);

    if (!selectedDate) return;

    setDobDate(selectedDate);

    const day = String(
      selectedDate.getDate(),
    ).padStart(2, '0');

    const month = String(
      selectedDate.getMonth() + 1,
    ).padStart(2, '0');

    const year =
      selectedDate.getFullYear();

    setDateOfBirth(
      `${day}/${month}/${year}`,
    );

    setError('');
  };

  const choosePhoto = async () => {
    setError('');

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(t.photoRequired);
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

  const chooseDocument = async () => {
    setError('');

    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'image/*',
          ],
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset) {
        setError(t.documentRequired);
        return;
      }

      setIdDocumentUri(asset.uri);
      setIdDocumentName(
        asset.name || 'identity-document',
      );
      setIdDocumentType(
        asset.mimeType || '',
      );
    } catch (pickerError) {
      console.error(
        '[MaidOnboarding] Document picker failed:',
        pickerError,
      );

      setError(t.documentRequired);
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
      setError(t.nameError);
      return false;
    }

    if (!gender) {
      setError(t.genderError);
      return false;
    }

    if (!emergencyContactName.trim()) {
      setError(t.emergencyNameError);
      return false;
    }

    if (
      emergencyContactNumber.replace(
        /\D/g,
        '',
      ).length !== 10
    ) {
      setError(t.emergencyNumberError);
      return false;
    }

    if (!emergencyContactRelation) {
      setError(t.emergencyRelationError);
      return false;
    }

    const alt =
      alternatePhoneNumber.replace(
        /\D/g,
        '',
      );

    if (alt && alt.length !== 10) {
      setError(t.alternateError);
      return false;
    }

    setError('');
    return true;
  };

  const handleNext = async () => {
    setError('');

    if (step === 1) {
      if (!validateStepOne()) return;

      setStep(2);
      return;
    }

    if (step === 2) {
      if (selectedCategories.length === 0) {
        setError(t.serviceError);
        return;
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      if (!serviceArea.trim()) {
        setError(t.areaError);
        return;
      }

      setStep(4);
      return;
    }

    if (!profilePhotoUri) {
      setError(t.photoRequired);
      return;
    }

    if (!idDocumentUri) {
      setError(t.documentRequired);
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      await saveMaidProfile({
        name,
        gender,
        dateOfBirth:
          dateOfBirth || null,
        alternatePhoneNumber:
          alternatePhoneNumber || null,
        emergencyContactName,
        emergencyContactNumber,
        emergencyContactRelation,
        serviceCategories:
          selectedCategories,
        serviceArea,
        profilePhotoUri,
        idDocumentUri,
        idDocumentName,
        idDocumentType:
          idDocumentType || null,
      });

      console.log(
        '[MaidOnboarding] Profile submission successful:',
        user?.uid,
      );

      router.replace('/maid');
    } catch (saveError) {
      console.error(
        '[MaidOnboarding] Save failed:',
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save your profile.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (showDatePicker) {
      setShowDatePicker(false);
      return;
    }

    setError('');

    if (step === 1) return;

    setStep(
      (current) =>
        (current - 1) as OnboardingStep,
    );
  };

  const formatDocumentName = () => {
    if (!idDocumentName) {
      return t.chooseDocument;
    }

    if (idDocumentName.length <= 28) {
      return idDocumentName;
    }

    return `${idDocumentName.slice(
      0,
      24,
    )}...`;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? insets.top
            : 0
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop:
                insets.top + 18,
              paddingBottom:
                insets.bottom + 36,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>
                {t.eyebrow}
              </Text>

              <Text style={styles.title}>
                {t.title}
              </Text>

              <Text style={styles.subtitle}>
                {t.subtitle}
              </Text>
            </View>

            <View style={styles.languageToggle}>
              <Pressable
                style={[
                  styles.languageOption,
                  language === 'en' &&
                    styles.languageActive,
                ]}
                onPress={() =>
                  setLanguage('en')
                }
              >
                <Text
                  style={[
                    styles.languageText,
                    language === 'en' &&
                      styles.languageTextActive,
                  ]}
                >
                  EN
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.languageOption,
                  language === 'hi' &&
                    styles.languageActive,
                ]}
                onPress={() =>
                  setLanguage('hi')
                }
              >
                <Text
                  style={[
                    styles.languageText,
                    language === 'hi' &&
                      styles.languageTextActive,
                  ]}
                >
                  HI
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.progressContainer}>
            {[1, 2, 3, 4].map(
              (item) => (
                <View
                  key={item}
                  style={[
                    styles.progressSegment,
                    item <= step &&
                      styles.progressSegmentActive,
                  ]}
                />
              ),
            )}
          </View>

          <View style={styles.stepIndicatorRow}>
            <Text style={styles.stepIndicator}>
              {t.step} {step} {t.of} 4
            </Text>

            <Text style={styles.requiredText}>
              {t.required}
            </Text>
          </View>

          {step === 1 && (
            <>
              <Text style={styles.sectionTitle}>
                {t.personal}
              </Text>

              <Text style={styles.sectionSubtitle}>
                {t.personalSub}
              </Text>

              <Text style={styles.label}>
                {t.fullName} *
              </Text>

              <TextInput
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setError('');
                }}
                placeholder={
                  t.fullNamePlaceholder
                }
                placeholderTextColor="#9B9F9C"
                style={styles.input}
                autoCapitalize="words"
              />

              <Text style={styles.label}>
                {t.gender} *
              </Text>

              <View style={styles.optionRow}>
                {[
                  ['Female', t.female],
                  ['Male', t.male],
                  ['Other', t.other],
                ].map(([value, label]) => {
                  const selected =
                    gender === value;

                  return (
                    <Pressable
                      key={value}
                      style={[
                        styles.optionButton,
                        selected &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => {
                        setGender(value);
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
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>
                {t.dob}{' '}
                <Text style={styles.optionalLabel}>
                  ({t.optional})
                </Text>
              </Text>

              <Pressable
                style={styles.inputButton}
                onPress={() => {
                  setShowDatePicker(true);
                  setError('');
                }}
              >
                <Text
                  style={[
                    styles.inputButtonText,
                    !dateOfBirth &&
                      styles.placeholderText,
                  ]}
                >
                  {dateOfBirth ||
                    t.dobPlaceholder}
                </Text>
              </Pressable>

              {showDatePicker && (
                <View style={styles.datePickerCard}>
                  <DateTimePicker
                    value={
                      dobDate ??
                      new Date(
                        1990,
                        0,
                        1,
                      )
                    }
                    mode="date"
                    display={
                      Platform.OS === 'ios'
                        ? 'spinner'
                        : 'calendar'
                    }
                    maximumDate={
                      new Date()
                    }
                    onChange={selectDate}
                  />

                  {Platform.OS === 'ios' && (
                    <Pressable
                      style={
                        styles.dateDoneButton
                      }
                      onPress={() =>
                        setShowDatePicker(
                          false,
                        )
                      }
                    >
                      <Text
                        style={
                          styles.dateDoneText
                        }
                      >
                        {t.datePickerDone}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              <Text style={styles.label}>
                {t.altPhone}{' '}
                <Text style={styles.optionalLabel}>
                  ({t.optional})
                </Text>
              </Text>

              <TextInput
                value={
                  alternatePhoneNumber
                }
                onChangeText={(value) => {
                  setAlternatePhoneNumber(
                    value.replace(
                      /\D/g,
                      '',
                    ),
                  );
                  setError('');
                }}
                placeholder={
                  t.altPhonePlaceholder
                }
                placeholderTextColor="#9B9F9C"
                style={styles.input}
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={styles.fieldHint}>
                {t.altPhoneHint}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.subsectionTitle}>
                {t.emergency}
              </Text>

              <Text style={styles.subsectionSubtitle}>
                {t.emergencySub}
              </Text>

              <Text style={styles.label}>
                {t.contactName} *
              </Text>

              <TextInput
                value={
                  emergencyContactName
                }
                onChangeText={(value) => {
                  setEmergencyContactName(
                    value,
                  );
                  setError('');
                }}
                placeholder={
                  t.contactNamePlaceholder
                }
                placeholderTextColor="#9B9F9C"
                style={styles.input}
                autoCapitalize="words"
              />

              <Text style={styles.label}>
                {t.contactNumber} *
              </Text>

              <TextInput
                value={
                  emergencyContactNumber
                }
                onChangeText={(value) => {
                  setEmergencyContactNumber(
                    value.replace(
                      /\D/g,
                      '',
                    ),
                  );
                  setError('');
                }}
                placeholder={
                  t.contactNumberPlaceholder
                }
                placeholderTextColor="#9B9F9C"
                style={styles.input}
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={styles.label}>
                {t.relationship} *
              </Text>

              <View style={styles.optionWrap}>
                {[
                  ['Spouse', t.spouse],
                  ['Parent', t.parent],
                  ['Sibling', t.sibling],
                  ['Relative', t.relative],
                  ['Friend', t.friend],
                  ['Other', t.other],
                ].map(
                  ([value, label]) => {
                    const selected =
                      emergencyContactRelation ===
                      value;

                    return (
                      <Pressable
                        key={value}
                        style={[
                          styles.relationButton,
                          selected &&
                            styles.optionButtonSelected,
                        ]}
                        onPress={() => {
                          setEmergencyContactRelation(
                            value,
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
                          {label}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.sectionTitle}>
                {t.services}
              </Text>

              <Text style={styles.sectionSubtitle}>
                {t.servicesSub}
              </Text>

              {isLoading ? (
                <View
                  style={styles.loadingCard}
                >
                  <ActivityIndicator
                    color="#1F7A4C"
                  />

                  <Text
                    style={
                      styles.loadingText
                    }
                  >
                    {t.loadingServices}
                  </Text>
                </View>
              ) : categories.length === 0 ? (
                <View
                  style={
                    styles.emptyCard
                  }
                >
                  <Text
                    style={
                      styles.emptyCardText
                    }
                  >
                    {t.noServices}
                  </Text>
                </View>
              ) : (
                <View
                  style={styles.serviceList}
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
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.sectionTitle}>
                {t.workingArea}
              </Text>

              <Text style={styles.sectionSubtitle}>
                {t.workingAreaSub}
              </Text>

              <Text style={styles.label}>
                {t.serviceArea} *
              </Text>

              <TextInput
                value={serviceArea}
                onChangeText={(value) => {
                  setServiceArea(value);
                  setError('');
                }}
                placeholder={
                  t.serviceAreaPlaceholder
                }
                placeholderTextColor="#9B9F9C"
                style={styles.input}
              />

              <Text style={styles.fieldHint}>
                {t.serviceAreaHint}
              </Text>

              <View style={styles.infoCard}>
                <Text style={styles.infoIcon}>
                  📍
                </Text>

                <View
                  style={styles.infoContent}
                >
                  <Text
                    style={styles.infoTitle}
                  >
                    {t.locationTitle}
                  </Text>

                  <Text
                    style={styles.infoText}
                  >
                    {t.locationText}
                  </Text>
                </View>
              </View>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.sectionTitle}>
                {t.profileDocuments}
              </Text>

              <Text style={styles.sectionSubtitle}>
                {t.profileDocumentsSub}
              </Text>

              <Text style={styles.label}>
                {t.profilePhoto} *
              </Text>

              <Pressable
                style={[
                  styles.photoSection,
                  profilePhotoUri &&
                    styles.photoSectionSelected,
                ]}
                onPress={choosePhoto}
                disabled={isSaving}
              >
                {profilePhotoUri ? (
                  <Image
                    source={{
                      uri: profilePhotoUri,
                    }}
                    style={
                      styles.profilePhoto
                    }
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

                <View
                  style={
                    styles.photoTextContainer
                  }
                >
                  <Text
                    style={
                      styles.photoTitle
                    }
                  >
                    {t.profilePhoto}
                  </Text>

                  <Text
                    style={
                      styles.photoSubtitle
                    }
                  >
                    {profilePhotoUri
                      ? t.tapChange
                      : t.choosePhoto}
                  </Text>
                </View>
              </Pressable>

              <Text style={styles.label}>
                {t.idDocument} *
              </Text>

              <Pressable
                style={[
                  styles.documentCard,
                  idDocumentUri &&
                    styles.documentCardSelected,
                ]}
                onPress={chooseDocument}
                disabled={isSaving}
              >
                <View
                  style={
                    styles.documentIconCircle
                  }
                >
                  <Text
                    style={
                      styles.documentIcon
                    }
                  >
                    ID
                  </Text>
                </View>

                <View
                  style={
                    styles.documentInfo
                  }
                >
                  <Text
                    style={
                      styles.documentTitle
                    }
                  >
                    {idDocumentUri
                      ? formatDocumentName()
                      : t.idDocument}
                  </Text>

                  <Text
                    style={
                      styles.documentSubtitle
                    }
                  >
                    {idDocumentUri
                      ? `${t.documentReady} • ${t.changeDocument}`
                      : t.idDocumentSub}
                  </Text>
                </View>

                <View
                  style={[
                    styles.documentBadge,
                    idDocumentUri &&
                      styles.documentBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.documentBadgeText,
                      idDocumentUri &&
                        styles.documentBadgeTextSelected,
                    ]}
                  >
                    {idDocumentUri
                      ? '✓'
                      : t.maxFile}
                  </Text>
                </View>
              </Pressable>

              <View
                style={styles.securityNote}
              >
                <Text
                  style={styles.securityIcon}
                >
                  🔒
                </Text>

                <Text
                  style={styles.securityText}
                >
                  {language === 'en'
                    ? 'Your document is uploaded securely and used for onboarding and verification.'
                    : 'आपका दस्तावेज़ सुरक्षित रूप से अपलोड किया जाएगा और ऑनबोर्डिंग व वेरिफिकेशन के लिए उपयोग होगा।'}
                </Text>
              </View>
            </>
          )}

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
                disabled={isSaving}
              >
                <Text
                  style={styles.backText}
                >
                  ← {t.back}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.continueButton,
                step === 1 &&
                  styles.singleActionButton,
                isSaving &&
                  styles.disabledButton,
              ]}
              onPress={handleNext}
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
                    {t.saving}
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={
                      styles.continueText
                    }
                  >
                    {step === 4
                    ? t.save
                    : t.continue}
                  </Text>

                  <Text
                    style={styles.arrow}
                  >
                    →
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },

  keyboardContainer: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  headerCopy: {
    flex: 1,
    paddingRight: 10,
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.25,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  title: {
    marginTop: 8,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    color: '#111111',
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: '#737873',
  },

  languageToggle: {
    marginTop: 2,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6E2',
  },

  languageOption: {
    minWidth: 35,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  languageActive: {
    backgroundColor: '#1F7A4C',
  },

  languageText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#717771',
  },

  languageTextActive: {
    color: '#FFFFFF',
  },

  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
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
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginTop: 23,
    fontSize: 20,
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
    marginTop: 20,
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
    marginTop: 18,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#222222',
  },

  optionalLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#858A86',
  },

  input: {
    height: 52,
    borderRadius: 15,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6E2',
    fontSize: 14,
    color: '#111111',
  },

  inputButton: {
    minHeight: 52,
    borderRadius: 15,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6E2',
    justifyContent: 'center',
  },

  inputButtonText: {
    fontSize: 14,
    color: '#111111',
  },

  placeholderText: {
    color: '#9B9F9C',
  },

  datePickerCard: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E6E2',
    overflow: 'hidden',
  },

  dateDoneButton: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9ECE9',
  },

  dateDoneText: {
    color: '#1F7A4C',
    fontWeight: '800',
    fontSize: 13,
  },

  optionRow: {
    flexDirection: 'row',
    gap: 9,
  },

  optionButton: {
    flex: 1,
    minHeight: 46,
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
    marginTop: 25,
  },

  loadingCard: {
    marginTop: 20,
    minHeight: 70,
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

  emptyCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAE7',
  },

  emptyCardText: {
    fontSize: 13,
    color: '#6E756F',
    textAlign: 'center',
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
    marginTop: 2,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EAE7',
  },

  photoSectionSelected: {
    backgroundColor: '#F5FAF7',
    borderColor: '#BFDAC9',
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
    marginTop: 2,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAE7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  documentCardSelected: {
    backgroundColor: '#F5FAF7',
    borderColor: '#BFDAC9',
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

  documentBadge: {
    maxWidth: 82,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFF5E8',
  },

  documentBadgeSelected: {
    backgroundColor: '#EAF5EE',
  },

  documentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A05A00',
  },

  documentBadgeTextSelected: {
    color: '#1F7A4C',
  },

  securityNote: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: '#F2F5F3',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  securityIcon: {
    fontSize: 15,
    marginRight: 8,
  },

  securityText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#68706A',
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

  disabledButton: {
    backgroundColor: '#AAB3AD',
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  arrow: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '600',
  },
});
