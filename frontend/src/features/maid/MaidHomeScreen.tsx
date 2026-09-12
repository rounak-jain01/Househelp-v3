import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  where,
  updateDoc,
} from '@react-native-firebase/firestore';

import {
  getAuth,
  signOut,
} from '@react-native-firebase/auth';

import {
  getEffectiveAvailability,
  type AvailabilityOverride,
  type AvailabilitySlot,
} from '../../services/firebase/availabilityService';

import {
  subscribeToPendingMaidBookingRequestIds,
} from '../../services/firebase/maidBookingRequestService';

import {
  startMaidLocationTracking,
} from '../../services/location/maidLocationService';

import { useMaidLanguage } from './MaidLanguageContext';

type Language = 'en' | 'hi';

type MaidProfile = {
  maidId?: string;
  name?: string;
  phoneNumber?: string;
  photoUrl?: string | null;
  serviceCategories?: string[];
  serviceArea?: string;
  verificationStatus?: string;
  isAvailableNow?: boolean;
  availabilitySlots?: AvailabilitySlot[];
  availabilityOverride?: AvailabilityOverride | null;
};

type ActiveBooking = {
  id: string;
  customerName?: string;
  serviceArea?: string;
  duration?: number;
  categories?: string[];
  totalPrice?: number;
  status?: string;
};

type Category = {
  id: string;
  name: string;
};

const copy = {
  en: {
    greeting: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',

    availableNow: 'Available Now',
    availableSub:
      'You are ready to receive booking requests.',
    unavailableSub:
      'You are currently not receiving new booking requests.',
    autoSub:
      'This follows your scheduled availability.',

    verified: 'Verified',
    pending: 'Pending',

    activeBooking: 'Active booking',
    noActiveBooking: 'No active booking',
    noActiveBookingSub:
      'New booking requests will appear here when you are available.',

    customer: 'Customer',
    location: 'Location',
    duration: 'Duration',
    earning: 'Your earning',
    viewBooking: 'View booking',

    upcoming: 'Upcoming availability',
    upcomingSub:
      'Plan the days and time slots when you want to work.',
    setAvailability: 'Set availability',

    services: 'Your services',
    area: 'Working area',

    profile: 'Profile',
    home: 'Home',
    bookings: 'Bookings',
    history: 'Job History',

    loading: 'Loading your HomeHelp...',
    availabilityUpdating: 'Updating...',
    availabilityManual:
      'Manual control is active.',

    nextSlot: 'Next scheduled slot',
    noUpcoming:
      'No upcoming slots. Add your availability.',
    resetManual: 'Use schedule',
  },

  hi: {
    greeting: 'सुप्रभात',
    greetingAfternoon: 'नमस्कार',
    greetingEvening: 'शुभ संध्या',

    availableNow: 'अभी उपलब्ध',
    availableSub:
      'आप बुकिंग अनुरोध प्राप्त करने के लिए तैयार हैं।',
    unavailableSub:
      'अभी आपको नए बुकिंग अनुरोध नहीं मिलेंगे।',
    autoSub:
      'यह आपकी तय की गई उपलब्धता के अनुसार चलता है।',

    verified: 'वेरिफ़ाइड',
    pending: 'पेंडिंग',

    activeBooking: 'चल रही बुकिंग',
    noActiveBooking: 'अभी कोई एक्टिव बुकिंग नहीं है',
    noActiveBookingSub:
      'आप उपलब्ध होंगी तो नए बुकिंग अनुरोध यहां दिखेंगे।',

    customer: 'ग्राहक',
    location: 'जगह',
    duration: 'समय',
    earning: 'आपकी कमाई',
    viewBooking: 'बुकिंग देखें',

    upcoming: 'आने वाली उपलब्धता',
    upcomingSub:
      'जिन दिनों और समय पर काम करना है, उन्हें पहले से सेट करें।',
    setAvailability: 'उपलब्धता सेट करें',

    services: 'आपकी सेवाएं',
    area: 'काम का क्षेत्र',

    profile: 'प्रोफ़ाइल',
    home: 'होम',
    bookings: 'बुकिंग्स',
    history: 'काम का इतिहास',

    loading: 'HomeHelp लोड हो रहा है...',
    availabilityUpdating: 'अपडेट हो रहा है...',
    availabilityManual:
      'मैनुअल कंट्रोल चालू है।',

    nextSlot: 'अगला तय समय',
    noUpcoming:
      'अभी कोई अगला स्लॉट नहीं है। उपलब्धता जोड़ें।',
    resetManual: 'शेड्यूल इस्तेमाल करें',
  },
} as const;

function getTimeGreeting(language: Language): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return copy[language].greeting;
  }

  if (hour < 17) {
    return copy[language].greetingAfternoon;
  }

  return copy[language].greetingEvening;
}

function getInitials(name?: string): string {
  const value = name?.trim() ?? '';

  if (!value) {
    return 'H';
  }

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getStatusLabel(
  status: string | undefined,
  language: Language,
): string {
  switch (status) {
    case 'assigned':
      return language === 'en'
        ? 'Assigned'
        : 'असाइन';

    case 'confirmed':
      return language === 'en'
        ? 'Confirmed'
        : 'कन्फर्म';

    case 'in_progress':
      return language === 'en'
        ? 'In progress'
        : 'काम जारी';

    case 'completed':
      return language === 'en'
        ? 'Completed'
        : 'पूरा';

    default:
      return language === 'en'
        ? 'Pending'
        : 'पेंडिंग';
  }
}

export default function MaidHomeScreen() {
  const insets = useSafeAreaInsets();

  const auth = getAuth();
  const [user, setUser] = useState(() => auth.currentUser);

  const {
    language,
    setLanguage,
  } = useMaidLanguage();

  const [profile, setProfile] =
    useState<MaidProfile | null>(null);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [activeBooking, setActiveBooking] =
    useState<ActiveBooking | null>(null);

  const [now, setNow] =
    useState(() => new Date());

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isUpdatingAvailability,
    setIsUpdatingAvailability,
  ] = useState(false);

  const [error, setError] =
    useState('');

  const openedRequestIdRef =
    useRef<string | null>(null);

  const t = copy[language];

  /**
   * Realtime maid profile.
   */

  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((nextUser) => {
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setActiveBooking(null);
      setIsLoading(false);
      setError('');
    }
  });

  return unsubscribe;
}, [auth]);


  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const db = getFirestore();

    const unsubscribe = onSnapshot(
      doc(db, 'maids', user.uid),
      (snapshot) => {
        if (!snapshot.exists) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        setProfile({
          maidId: user.uid,
          ...(data as Omit<MaidProfile, 'maidId'>),
        });

        setIsLoading(false);
      },
      (profileError) => {
        console.error(
          '[MaidHome] Profile listener failed:',
          profileError,
        );

        setError(
          language === 'en'
            ? 'Could not load your profile.'
            : 'आपकी प्रोफ़ाइल लोड नहीं हो सकी।',
        );

        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid, language]);

  /**
   * Load categories.
   */
  useEffect(() => {
  if (!user?.uid) {
    setCategories([]);
    return;
  }

  let cancelled = false;

  const loadCategories = async () => {
    try {
      const db = getFirestore();

      const snapshot = await getDocs(
        collection(db, 'categories'),
      );

      if (cancelled) {
        return;
      }

      const loadedCategories: Category[] =
        snapshot.docs.map((categoryDoc) => {
          const data = categoryDoc.data();

          return {
            id: categoryDoc.id,
            name:
              typeof data.name === 'string'
                ? data.name
                : categoryDoc.id,
          };
        });

      setCategories(loadedCategories);
    } catch (categoryError) {
      if (cancelled) {
        return;
      }

      console.error(
        '[MaidHome] Categories load failed:',
        categoryError,
      );
    }
  };

  loadCategories();

  return () => {
    cancelled = true;
  };
}, [user?.uid]);

  /**
   * Re-evaluate availability every minute.
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  /**
   * Effective availability.
   */
  const available = profile
    ? getEffectiveAvailability(
        profile.availabilitySlots ?? [],
        profile.availabilityOverride ?? null,
        now,
      )
    : false;

  /**
   * Start location tracking ONLY while the maid is available.
   *
   * Available ON:
   *   start tracking
   *
   * Available OFF:
   *   cleanup tracking
   */
  useEffect(() => {
    if (!user?.uid || !available) {
      return;
    }

    let unsubscribe:
      | (() => void)
      | undefined;

    let cancelled = false;

    const startTracking = async () => {
      try {
        const stopTracking =
          await startMaidLocationTracking(
            user.uid,
            undefined,
            (locationError: Error) => {
              console.error(
                '[MaidHome] Location tracking failed:',
                locationError,
              );
            },
          );

        if (cancelled) {
          stopTracking?.();
        } else {
          unsubscribe = stopTracking;
        }
      } catch (locationError) {
        console.error(
          '[MaidHome] Could not start location tracking:',
          locationError,
        );
      }
    };

    startTracking();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.uid, available]);

  /**
   * Listen for the maid's active booking.
   *
   * Active statuses:
   *   assigned
   *   confirmed
   *   in_progress
   */
  useEffect(() => {
    if (!user?.uid) {
      setActiveBooking(null);
      return;
    }

    const db = getFirestore();

    const activeStatuses = [
      'assigned',
      'confirmed',
      'in_progress',
    ];

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('maidId', '==', user.uid),
      where('status', 'in', activeStatuses),
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setActiveBooking(null);
          return;
        }

        const bookingDoc = snapshot.docs[0];
        const data = bookingDoc.data();

        setActiveBooking({
          id: bookingDoc.id,
          customerName:
            typeof data.customerName === 'string'
              ? data.customerName
              : undefined,
          serviceArea:
            typeof data.customerAddress === 'string'
              ? data.customerAddress
              : typeof data.serviceArea === 'string'
                ? data.serviceArea
                : undefined,
          duration:
            typeof data.duration === 'number'
              ? data.duration
              : undefined,
          categories:
            Array.isArray(data.categories)
              ? data.categories
              : undefined,
          totalPrice:
            typeof data.totalPrice === 'number'
              ? data.totalPrice
              : undefined,
          status:
            typeof data.status === 'string'
              ? data.status
              : undefined,
        });
      },
      (bookingError) => {
        console.error(
          '[MaidHome] Active booking listener failed:',
          bookingError,
        );
      },
    );

    return unsubscribe;
  }, [user?.uid]);

  /**
   * Listen for pending booking requests.
   *
   * Backend creates:
   *
   * bookings/{bookingId}/maidRequests/{maidId}
   *
   * As soon as a pending request exists,
   * open the request screen.
   */
  useEffect(() => {
    if (!user?.uid || !available) {
      return;
    }

    const unsubscribe =
      subscribeToPendingMaidBookingRequestIds(
        user.uid,
        (bookingId) => {
          if (!bookingId) {
            return;
          }

          /**
           * Do not reopen the same request repeatedly.
           */
          if (
            openedRequestIdRef.current ===
            bookingId
          ) {
            return;
          }

          openedRequestIdRef.current =
            bookingId;

          router.push(
            `/maid/booking-request/${bookingId}`,
          );
        },
        (listenerError) => {
          console.error(
            '[MaidHome] Booking request listener failed:',
            listenerError,
          );
        },
      );

    return unsubscribe;
  }, [user?.uid, available]);

  /**
   * Resolve service/category names.
   */
  const serviceNames = useMemo(() => {
    const lookup =
      new Map<string, string>();

    categories.forEach((category) => {
      lookup.set(
        category.id,
        category.name,
      );
    });

    return (
      profile?.serviceCategories ?? []
    ).map(
      (serviceId) =>
        lookup.get(serviceId) ??
        serviceId,
    );
  }, [
    categories,
    profile?.serviceCategories,
  ]);

  const manualOverride =
    profile?.availabilityOverride
      ?.mode ?? null;

  /**
   * Find next scheduled availability slot.
   */
  const nextSlot = profile
    ? [
        ...(profile.availabilitySlots ?? []),
      ]
        .sort((a, b) =>
          `${a.date} ${a.startTime}`.localeCompare(
            `${b.date} ${b.startTime}`,
          ),
        )
        .find((slot) => {
          const currentDateKey =
            `${now.getFullYear()}-${String(
              now.getMonth() + 1,
            ).padStart(2, '0')}-${String(
              now.getDate(),
            ).padStart(2, '0')}`;

          const currentTimeKey =
            `${String(
              now.getHours(),
            ).padStart(2, '0')}:${String(
              now.getMinutes(),
            ).padStart(2, '0')}`;

          return (
            `${slot.date} ${slot.endTime}` >=
            `${currentDateKey} ${currentTimeKey}`
          );
        }) ?? null
    : null;

  /**
   * Manual ON/OFF.
   */
  const handleAvailabilityToggle =
    async () => {
      if (
        !user ||
        !profile ||
        isUpdatingAvailability
      ) {
        return;
      }

      try {
        setError('');
        setIsUpdatingAvailability(true);

        const targetMode:
          | 'on'
          | 'off' =
          available
            ? 'off'
            : 'on';

        const expiresAt =
          new Date(now);

        expiresAt.setHours(
          23,
          59,
          59,
          999,
        );

        await updateDoc(
          doc(
            getFirestore(),
            'maids',
            user.uid,
          ),
          {
            availabilityOverride: {
              mode: targetMode,
              expiresAt,
              updatedAt: new Date(),
            },

            isAvailableNow:
              targetMode === 'on',

            updatedAt: new Date(),
          },
        );
      } catch (updateError) {
        console.error(
          '[MaidHome] Availability update failed:',
          updateError,
        );

        setError(
          language === 'en'
            ? 'Could not update availability. Please try again.'
            : 'उपलब्धता अपडेट नहीं हो सकी। फिर से कोशिश करें।',
        );
      } finally {
        setIsUpdatingAvailability(
          false,
        );
      }
    };

  /**
   * Return to scheduled availability.
   */
  const useSchedule = async () => {
    if (!user) {
      return;
    }

    try {
      setError('');
      setIsUpdatingAvailability(true);

      const effective =
        getEffectiveAvailability(
          profile?.availabilitySlots ?? [],
          null,
          now,
        );

      await updateDoc(
        doc(
          getFirestore(),
          'maids',
          user.uid,
        ),
        {
          availabilityOverride: null,
          isAvailableNow: effective,
          updatedAt: new Date(),
        },
      );
    } catch (resetError) {
      console.error(
        '[MaidHome] Schedule reset failed:',
        resetError,
      );

      setError(
        language === 'en'
          ? 'Could not restore scheduled availability.'
          : 'शेड्यूल वाली उपलब्धता वापस नहीं आ सकी।',
      );
    } finally {
      setIsUpdatingAvailability(
        false,
      );
    }
  };

  /**
   * Sign out.
   */
  const handleSignOut = async () => {
    try {
      await signOut(auth);

      router.replace(
        '/auth/welcome',
      );
    } catch (signOutError) {
      console.error(
        '[MaidHome] Sign out failed:',
        signOutError,
      );

      setError(
        language === 'en'
          ? 'Unable to sign out right now.'
          : 'अभी साइन आउट नहीं हो सका।',
      );
    }
  };

  if (isLoading) {
    return (
      <View
        style={styles.loadingScreen}
      >
        <ActivityIndicator
          size="large"
          color="#1F7A4C"
        />

        <Text
          style={styles.loadingText}
        >
          {t.loading}
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={styles.loadingScreen}
      >
        <Text
          style={styles.missingTitle}
        >
          {language === 'en'
            ? 'Profile not found'
            : 'प्रोफ़ाइल नहीं मिली'}
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.replace(
              '/maid/onboarding',
            )
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            {language === 'en'
              ? 'Complete profile'
              : 'प्रोफ़ाइल पूरी करें'}
          </Text>
        </Pressable>
      </View>
    );
  }

  const verificationVerified =
    profile.verificationStatus?.toLowerCase() ===
    'verified';

  return (
    <View
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:
              insets.top + 16,

            paddingBottom:
              insets.bottom + 106,
          },
        ]}
      >
        {/* HEADER */}

        <View
          style={styles.headerRow}
        >
          <View
            style={styles.headerText}
          >
            <Text
              style={styles.eyebrow}
            >
              HOMEHELP • HELP
            </Text>

            <Text
              style={styles.greeting}
            >
              {getTimeGreeting(
                language,
              )}
              ,{' '}
              {profile.name?.split(
                ' ',
              )[0] ?? 'there'}
            </Text>

            <View
              style={
                styles.verificationRow
              }
            >
              <View
                style={[
                  styles.verificationDot,
                  verificationVerified
                    ? styles.verificationDotVerified
                    : styles.verificationDotPending,
                ]}
              />

              <Text
                style={
                  styles.verificationText
                }
              >
                {verificationVerified
                  ? t.verified
                  : t.pending}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.headerActions
            }
          >
            <View
              style={
                styles.languageToggle
              }
            >
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
        </View>

        {/* AVAILABILITY */}

        <View
          style={[
            styles.availabilityCard,
            available &&
              styles.availabilityCardActive,
          ]}
        >
          <View
            style={
              styles.availabilityContent
            }
          >
            <View
              style={
                styles.availabilityTitleRow
              }
            >
              <Text
                style={
                  styles.availabilityTitle
                }
              >
                {t.availableNow}
              </Text>

              <View
                style={[
                  styles.availabilityBadge,
                  available &&
                    styles.availabilityBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.availabilityBadgeText,
                    available &&
                      styles.availabilityBadgeTextActive,
                  ]}
                >
                  {available
                    ? 'ON'
                    : 'OFF'}
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.availabilitySub
              }
            >
              {available
                ? t.availableSub
                : t.unavailableSub}
            </Text>

            {!available &&
            !manualOverride &&
            nextSlot ? (
              <Text
                style={
                  styles.nextSlotText
                }
              >
                {t.nextSlot}: {nextSlot.date}{' '}
                {nextSlot.startTime}–
                {nextSlot.endTime}
              </Text>
            ) : null}

            {manualOverride ? (
              <Pressable
                style={
                  styles.scheduleLink
                }
                onPress={useSchedule}
                disabled={
                  isUpdatingAvailability
                }
              >
                <Text
                  style={
                    styles.scheduleLinkText
                  }
                >
                  {t.resetManual}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={
              handleAvailabilityToggle
            }
            disabled={
              isUpdatingAvailability
            }
            style={[
              styles.switchTrack,
              available &&
                styles.switchTrackActive,
            ]}
          >
            {isUpdatingAvailability ? (
              <ActivityIndicator
                size="small"
                color={
                  available
                    ? '#FFFFFF'
                    : '#1F7A4C'
                }
              />
            ) : (
              <View
                style={[
                  styles.switchThumb,
                  available &&
                    styles.switchThumbActive,
                ]}
              />
            )}
          </Pressable>
        </View>

        {/* UPCOMING AVAILABILITY */}

        <View
          style={
            styles.scheduleAction
          }
        >
          <View
            style={
              styles.scheduleActionText
            }
          >
            <Text
              style={
                styles.scheduleActionTitle
              }
            >
              {t.upcoming}
            </Text>

            <Text
              style={
                styles.scheduleActionSub
              }
            >
              {t.upcomingSub}
            </Text>
          </View>

          <Pressable
            style={
              styles.setAvailabilityButton
            }
            onPress={() =>
              router.push(
                '/maid/availability',
              )
            }
          >
            <Text
              style={
                styles.setAvailabilityText
              }
            >
              {t.setAvailability}
            </Text>

            <Text
              style={
                styles.setAvailabilityArrow
              }
            >
              →
            </Text>
          </Pressable>
        </View>

        {/* ACTIVE BOOKING */}

        {activeBooking ? (
          <View
            style={
              styles.sectionBlock
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {t.activeBooking}
              </Text>

              <View
                style={
                  styles.activePill
                }
              >
                <Text
                  style={
                    styles.activePillText
                  }
                >
                  {getStatusLabel(
                    activeBooking.status,
                    language,
                  )}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.bookingCard
              }
            >
              <View
                style={
                  styles.bookingTopRow
                }
              >
                <View
                  style={
                    styles.customerAvatar
                  }
                >
                  <Text
                    style={
                      styles.customerAvatarText
                    }
                  >
                    {getInitials(
                      activeBooking.customerName,
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.bookingCustomerInfo
                  }
                >
                  <Text
                    style={
                      styles.customerName
                    }
                  >
                    {activeBooking.customerName ||
                      t.customer}
                  </Text>

                  <Text
                    style={
                      styles.bookingLocation
                    }
                    numberOfLines={2}
                  >
                    {activeBooking.serviceArea ||
                      t.location}
                  </Text>
                </View>

                {typeof activeBooking.totalPrice ===
                'number' ? (
                  <View
                    style={
                      styles.earningBlock
                    }
                  >
                    <Text
                      style={
                        styles.earningLabel
                      }
                    >
                      {t.earning}
                    </Text>

                    <Text
                      style={
                        styles.earningValue
                      }
                    >
                      ₹
                      {
                        activeBooking.totalPrice
                      }
                    </Text>
                  </View>
                ) : null}
              </View>

              <View
                style={
                  styles.bookingDivider
                }
              />

              <View
                style={
                  styles.bookingMetaRow
                }
              >
                <View
                  style={styles.metaItem}
                >
                  <Text
                    style={
                      styles.metaIcon
                    }
                  >
                    ◷
                  </Text>

                  <Text
                    style={
                      styles.metaText
                    }
                  >
                    {activeBooking.duration
                      ? `${activeBooking.duration} hr`
                      : '—'}
                  </Text>
                </View>

                <View
                  style={styles.metaItem}
                >
                  <Text
                    style={
                      styles.metaIcon
                    }
                  >
                    •
                  </Text>

                  <Text
                    style={
                      styles.metaText
                    }
                    numberOfLines={2}
                  >
                    {activeBooking.categories?.length
                      ? activeBooking.categories.join(
                          ', ',
                        )
                      : '—'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={
                  styles.secondaryButton
                }
                onPress={() =>
                  router.push(
                    `/maid/booking/${activeBooking.id}`,
                  )
                }
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  {t.viewBooking}
                </Text>

                <Text
                  style={
                    styles.secondaryButtonArrow
                  }
                >
                  →
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View
            style={
              styles.sectionBlock
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              {t.activeBooking}
            </Text>

            <View
              style={
                styles.emptyCard
              }
            >
              <View
                style={
                  styles.emptyIconCircle
                }
              >
                <Text
                  style={
                    styles.emptyIcon
                  }
                >
                  ✓
                </Text>
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {t.noActiveBooking}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {t.noActiveBookingSub}
              </Text>
            </View>
          </View>
        )}

        {/* SERVICES */}

        <View
          style={
            styles.sectionBlock
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {t.services}
          </Text>

          <View
            style={styles.tagsRow}
          >
            {serviceNames.length ? (
              serviceNames.map(
                (serviceName) => (
                  <View
                    key={serviceName}
                    style={
                      styles.serviceTag
                    }
                  >
                    <Text
                      style={
                        styles.serviceTagText
                      }
                    >
                      {serviceName}
                    </Text>
                  </View>
                ),
              )
            ) : (
              <Text
                style={
                  styles.sectionSubText
                }
              >
                {language === 'en'
                  ? 'No services selected'
                  : 'कोई सेवा नहीं चुनी गई'}
              </Text>
            )}
          </View>

          <View
            style={
              styles.areaCard
            }
          >
            <Text
              style={
                styles.areaIcon
              }
            >
              ⌖
            </Text>

            <View
              style={
                styles.areaTextBlock
              }
            >
              <Text
                style={
                  styles.areaTitle
                }
              >
                {t.area}
              </Text>

              <Text
                style={
                  styles.areaValue
                }
              >
                {profile.serviceArea ||
                  '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* ERROR */}

        {error ? (
          <View
            style={styles.errorBox}
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
      </ScrollView>

      {/* BOTTOM NAV */}

      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom:
              Math.max(
                insets.bottom,
                10,
              ),
          },
        ]}
      >
        <Pressable
          style={styles.navItem}
        >
          <Text
            style={[
              styles.navIcon,
              styles.navIconActive,
            ]}
          >
            ⌂
          </Text>

          <Text
            style={[
              styles.navLabel,
              styles.navLabelActive,
            ]}
          >
            {t.home}
          </Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() =>
            router.push(
              '/maid/bookings',
            )
          }
        >
          <Text
            style={styles.navIcon}
          >
            ▣
          </Text>

          <Text
            style={styles.navLabel}
          >
            {t.bookings}
          </Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() =>
            router.push(
              '/maid/history',
            )
          }
        >
          <Text
            style={styles.navIcon}
          >
            ◷
          </Text>

          <Text
            style={styles.navLabel}
          >
            {t.history}
          </Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() =>
            router.push(
              '/maid/profile',
            )
          }
        >
          <View style={styles.navProfileImageWrap}>
            {profile.photoUrl ? (
              <Image
                source={{ uri: profile.photoUrl }}
                style={styles.navProfileImage}
              />
            ) : (
              <Text style={styles.navProfileInitials}>
                {getInitials(profile.name)}
              </Text>
            )}
          </View>

          <Text
            numberOfLines={1}
            style={styles.navProfileName}
          >
            {profile.name?.trim()?.split(/\s+/)[0] || t.profile}
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

  content: {
    paddingHorizontal: 20,
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F6',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#737873',
  },

  missingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 16,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  headerActions: {
    alignItems: 'flex-end',
  },

  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  greeting: {
    marginTop: 7,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '800',
    color: '#111111',
  },

  verificationRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  verificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  verificationDotVerified: {
    backgroundColor: '#1F7A4C',
  },

  verificationDotPending: {
    backgroundColor: '#B7791F',
  },

  verificationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666C67',
  },

  languageToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6E2',
  },

  languageOption: {
    minWidth: 35,
    height: 29,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  languageActive: {
    backgroundColor: '#1F7A4C',
  },

  languageText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#717771',
  },

  languageTextActive: {
    color: '#FFFFFF',
  },


  availabilityCard: {
    marginTop: 20,
    padding: 17,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E7E3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  availabilityCardActive: {
    backgroundColor: '#F0F8F3',
    borderColor: '#BFDAC9',
  },

  availabilityContent: {
    flex: 1,
    paddingRight: 12,
  },

  availabilityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  availabilityTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
  },

  availabilityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: '#F0F2F0',
  },

  availabilityBadgeActive: {
    backgroundColor: '#DCEFE3',
  },

  availabilityBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6F756F',
  },

  availabilityBadgeTextActive: {
    color: '#1F7A4C',
  },

  availabilitySub: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#717771',
  },

  nextSlotText: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 15,
    color: '#1F7A4C',
    fontWeight: '700',
  },

  scheduleLink: {
    alignSelf: 'flex-start',
    marginTop: 7,
  },

  scheduleLinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  switchTrack: {
    width: 54,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#D8DEDA',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  switchTrackActive: {
    backgroundColor: '#1F7A4C',
  },

  switchThumb: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  switchThumbActive: {
    transform: [
      {
        translateX: 23,
      },
    ],
  },

  scheduleAction: {
    marginTop: 14,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E4',
    flexDirection: 'row',
    alignItems: 'center',
  },

  scheduleActionText: {
    flex: 1,
    paddingRight: 10,
  },

  scheduleActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
  },

  scheduleActionSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#7A807B',
  },

  setAvailabilityButton: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EAF5EE',
    flexDirection: 'row',
    alignItems: 'center',
  },

  setAvailabilityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  setAvailabilityArrow: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  sectionBlock: {
    marginTop: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
  },

  sectionSubText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7A807B',
  },

  activePill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: '#EAF5EE',
  },

  activePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1F7A4C',
  },

  bookingCard: {
    marginTop: 11,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E4',
  },

  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  customerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  customerAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  bookingCustomerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
  },

  bookingLocation: {
    marginTop: 3,
    fontSize: 11,
    color: '#777D78',
  },

  earningBlock: {
    alignItems: 'flex-end',
  },

  earningLabel: {
    fontSize: 9,
    color: '#858A86',
  },

  earningValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '900',
    color: '#1F7A4C',
  },

  bookingDivider: {
    height: 1,
    backgroundColor: '#ECEFEC',
    marginVertical: 13,
  },

  bookingMetaRow: {
    flexDirection: 'row',
    gap: 17,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },

  metaIcon: {
    fontSize: 13,
    color: '#1F7A4C',
    fontWeight: '800',
  },

  metaText: {
    flex: 1,
    fontSize: 11,
    color: '#686E69',
  },

  secondaryButton: {
    marginTop: 14,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#F0F8F3',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F7A4C',
  },

  secondaryButtonArrow: {
    marginLeft: 7,
    fontSize: 17,
    fontWeight: '700',
    color: '#1F7A4C',
  },

  emptyCard: {
    marginTop: 11,
    padding: 22,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E4',
    alignItems: 'center',
  },

  emptyIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1F7A4C',
  },

  emptyTitle: {
    marginTop: 11,
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#7A807B',
    textAlign: 'center',
  },

  tagsRow: {
    marginTop: 11,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  serviceTag: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: '#EEF6F1',
  },

  serviceTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F7A4C',
  },

  areaCard: {
    marginTop: 11,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#EEF6F1',
    flexDirection: 'row',
    alignItems: 'center',
  },

  areaIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCEFE3',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    color: '#1F7A4C',
    marginRight: 11,
  },

  areaTextBlock: {
    flex: 1,
  },

  areaTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1F7A4C',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  areaValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: '#38413B',
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

  primaryButton: {
    minWidth: 180,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1F7A4C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
    color: '#1F7A4C',
  },

  navProfileName: {
    marginTop: 3,
    maxWidth: 58,
    fontSize: 9,
    fontWeight: '700',
    color: '#1F7A4C',
    textAlign: 'center',
  },

  bottomNav: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 9,
    paddingTop: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6E2',
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
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

  navIconActive: {
    color: '#1F7A4C',
  },

  navLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
    color: '#858A86',
  },

  navLabelActive: {
    color: '#1F7A4C',
  },
});