import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getFirestore,
} from '@react-native-firebase/firestore';
import { requestPostAuthPermissions } from '../../services/permissions/permissionService';

type AuthRole = 'user' | 'maid';

const ASSETS = {
  logo: require('../../../assets/CustomerUi/logo.png'),
  backArrow: require('../../../assets/CustomerUi/back-arrow.png'),
  permissionHero: require('../../../assets/CustomerUi/permission-hero.png'),
  shield: require('../../../assets/CustomerUi/shield.png'),
  location: require('../../../assets/CustomerUi/location.png'),
  notifications: require('../../../assets/CustomerUi/notifications.png'),
  buttonArrow: require('../../../assets/CustomerUi/right-arrow.png'),
} satisfies Record<string, ImageSourcePropType>;

export default function PostAuthPermissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { role } = useLocalSearchParams<{ role?: AuthRole }>();

  const [isLoading, setIsLoading] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isSmall = height < 760;
  const horizontalPadding = useMemo(
    () => Math.max(20, Math.min(26, width * 0.062)),
    [width],
  );

  const finishPostAuth = async (requestPermissions: boolean) => {
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      setErrorMessage(
        'Your session has expired. Please verify your phone number again.',
      );
      return;
    }

    if (requestPermissions) {
      // permissionService should request ONLY notification + location permissions.
      await requestPostAuthPermissions();
    }

    const uid = currentUser.uid;
    const db = getFirestore();

    const customerRef = doc(collection(db, 'users'), uid);
    const maidRef = doc(collection(db, 'maids'), uid);

    const [customerSnapshot, maidSnapshot] = await Promise.all([
      getDoc(customerRef),
      getDoc(maidRef),
    ]);

    if (customerSnapshot.exists()) {
      router.replace('/customer');
      return;
    }

    if (maidSnapshot.exists()) {
      router.replace('/maid');
      return;
    }

    if (role === 'maid') {
      router.replace('/maid/onboarding');
      return;
    }

    router.replace('/auth/profile');
  };

  const handleAllowAll = async () => {
    if (isLoading || isSkipping) return;

    try {
      setErrorMessage('');
      setIsLoading(true);
      await finishPostAuth(true);
    } catch (error) {
      console.error('[Permissions] Allow all failed:', error);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotNow = async () => {
    if (isLoading || isSkipping) return;

    try {
      setErrorMessage('');
      setIsSkipping(true);
      await finishPostAuth(false);
    } catch (error) {
      console.error('[Permissions] Skip failed:', error);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSkipping(false);
    }
  };

  const heroHeight = isSmall ? 192 : 224;
  const heroImageWidth = isSmall ? 210 : 240;
  const heroImageHeight = isSmall ? 205 : 235;
  const shieldSize = isSmall ? 50 : 58;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      <View style={styles.container}>
        <View
          style={[
            styles.screen,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: isSmall ? 6 : 10,
              paddingBottom: Math.max(8, insets.bottom),
            },
          ]}
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.back()}
              disabled={isLoading || isSkipping}
              hitSlop={10}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Image
                source={ASSETS.backArrow}
                resizeMode="contain"
                style={styles.backArrow}
              />
            </Pressable>

            <Image
              source={ASSETS.logo}
              resizeMode="contain"
              style={styles.logo}
              accessibilityLabel="HomeHelp logo"
            />

            <View style={styles.topSpacer} />
          </View>

          <View style={[styles.hero, { height: heroHeight }]}>
            <View style={styles.heroText}>
              <Text style={[styles.title, isSmall && styles.titleSmall]}>
                Allow{ '\n' }Permissions
              </Text>
              <Text style={[styles.subtitle, isSmall && styles.subtitleSmall]}>
                We need a few permissions{ '\n' }to give you a better experience.
              </Text>
            </View>

            <Image
              source={ASSETS.permissionHero}
              resizeMode="contain"
              style={[
                styles.heroImage,
                {
                  width: heroImageWidth,
                  height: heroImageHeight,
                  right: -20,
                  top: isSmall ? -10 : -18,
                },
              ]}
            />

            <View
              style={[
                styles.shieldBubble,
                {
                  width: shieldSize,
                  height: shieldSize,
                  borderRadius: shieldSize / 2,
                  right: Math.max(112, width * 0.28),
                  top: isSmall ? 46 : 56,
                },
              ]}
            >
              <Image
                source={ASSETS.shield}
                resizeMode="contain"
                style={styles.shield}
              />
            </View>
          </View>

          <View style={styles.cards}>
            <PermissionCard
              image={ASSETS.location}
              title="Location"
              description={'Helps us find trusted professionals\nnear you.'}
            />

            <PermissionCard
              image={ASSETS.notifications}
              title="Notifications"
              description={'Get updates about your bookings\nand service status.'}
            />
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.footerArea}>
            <Pressable
              onPress={handleAllowAll}
              disabled={isLoading || isSkipping}
              style={({ pressed }) => [
                styles.allowButton,
                pressed && styles.pressed,
                (isLoading || isSkipping) && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Allow all permissions"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.allowButtonText}>Allow All</Text>
                  <Image
                    source={ASSETS.buttonArrow}
                    resizeMode="contain"
                    style={styles.buttonArrow}
                  />
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={handleNotNow}
              disabled={isLoading || isSkipping}
              style={({ pressed }) => [
                styles.notNowButton,
                pressed && styles.pressed,
                (isLoading || isSkipping) && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Not now"
            >
              {isSkipping ? (
                <ActivityIndicator size="small" color="#174B3D" />
              ) : (
                <Text style={styles.notNowText}>Not Now</Text>
              )}
            </Pressable>

            <Text style={styles.footerText}>
              You can update permissions anytime in Settings.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PermissionCard({
  image,
  title,
  description,
}: {
  image: ImageSourcePropType;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.permissionCard}>
      <View style={styles.cardIconWrap}>
        <Image source={image} resizeMode="contain" style={styles.cardIcon} />
      </View>

      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screen: {
    flex: 1,
  },
  topRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 34,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backArrow: {
    width: 26,
    height: 26,
  },
  logo: {
    width: 132,
    height: 48,
    marginLeft: 4,
  },
  topSpacer: {
    flex: 1,
  },
  hero: {
    position: 'relative',
    width: '100%',
  },
  heroText: {
    position: 'absolute',
    left: 0,
    top: 42,
    zIndex: 5,
    maxWidth: '78%',
  },
  title: {
    fontSize: 34,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -1.2,
    color: '#102A25',
  },
  titleSmall: {
    fontSize: 31,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 13,
    fontSize: 16,
    lineHeight: 22,
    color: '#52635E',
  },
  subtitleSmall: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 19,
  },
  heroImage: {
    position: 'absolute',
    zIndex: 2,
  },
  shieldBubble: {
    position: 'absolute',
    zIndex: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7F1',
  },
  shield: {
    width: '78%',
    height: '78%',
  },
  cards: {
    gap: 9,
  },
  permissionCard: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E9E4',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  cardIconWrap: {
    width: 60,
    height: 58,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    width: 56,
    height: 56,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '800',
    color: '#102A25',
  },
  cardDescription: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 17,
    color: '#52635E',
  },
  chevron: {
    marginLeft: 7,
    fontSize: 29,
    lineHeight: 31,
    color: '#102A25',
    fontWeight: '300',
  },
  errorCard: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFF2F0',
    borderWidth: 1,
    borderColor: '#F3C9C3',
  },
  errorText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#B42318',
    fontWeight: '600',
  },
  footerArea: {
    marginTop: 'auto',
    paddingTop: 10,
    alignItems: 'center',
  },
  allowButton: {
    width: '100%',
    height: 58,
    borderRadius: 30,
    backgroundColor: '#174B3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonArrow: {
    width: 28,
    height: 22,
  },
  notNowButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#174B3D',
  },
  footerText: {
    marginTop: 1,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: '#708078',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
});
