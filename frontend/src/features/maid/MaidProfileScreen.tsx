import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getAuth, signOut } from '@react-native-firebase/auth';
import {
  doc,
  getFirestore,
  onSnapshot,
} from '@react-native-firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getMaidCategories,
  type MaidServiceCategory,
} from '../../services/firebase/maidService';
import { useMaidLanguage } from './MaidLanguageContext';

type MaidProfile = {
  maidId?: string;
  name?: string;
  phoneNumber?: string;
  alternatePhoneNumber?: string | null;
  gender?: string;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  idDocumentUrl?: string | null;
  idDocumentName?: string | null;
  serviceCategories?: string[];
  serviceArea?: string;
  verificationStatus?: string;
  emergencyContact?: {
    name?: string;
    phoneNumber?: string;
    relationship?: string;
  };
};

export default function MaidProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = getAuth().currentUser;
  const { language } = useMaidLanguage();

  const [profile, setProfile] = useState<MaidProfile | null>(null);
  const [categories, setCategories] = useState<MaidServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState('');

  const tr = (en: string, hi: string) =>
    language === 'en' ? en : hi;

  useEffect(() => {
    if (!user) {
      router.replace('/auth/welcome');
      return;
    }

    const firestore = getFirestore();

    const unsubscribe = onSnapshot(
      doc(firestore, 'maids', user.uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setProfile(snapshot.data() as MaidProfile);
        setError('');
        setIsLoading(false);
      },
      (listenerError) => {
        console.error(
          '[MaidProfile] Profile listener failed:',
          listenerError,
        );
        setError(
          tr(
            'Unable to load your profile.',
            'आपकी प्रोफ़ाइल लोड नहीं हो सकी।',
          ),
        );
        setIsLoading(false);
      },
    );

    let mounted = true;

    getMaidCategories()
      .then((result) => {
        if (mounted) setCategories(result);
      })
      .catch((categoryError) => {
        console.error(
          '[MaidProfile] Category load failed:',
          categoryError,
        );
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.uid, language]);

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const serviceNames = useMemo(
    () =>
      (profile?.serviceCategories ?? []).map(
        (id) => serviceNameById.get(id) ?? id,
      ),
    [profile?.serviceCategories, serviceNameById],
  );

  const handleSignOut = async () => {
    try {
      setError('');
      setIsSigningOut(true);
      await signOut(getAuth());
      router.replace('/auth/welcome');
    } catch (signOutError) {
      console.error(
        '[MaidProfile] Sign out failed:',
        signOutError,
      );
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : tr(
              'Unable to sign out. Please try again.',
              'साइन आउट नहीं हो सका। फिर से कोशिश करें।',
            ),
      );
      setIsSigningOut(false);
    }
  };

  const openDocument = async () => {
    if (!profile?.idDocumentUrl) return;

    try {
      if (await Linking.canOpenURL(profile.idDocumentUrl)) {
        await Linking.openURL(profile.idDocumentUrl);
      } else {
        setError(
          tr(
            'Unable to open the uploaded document.',
            'अपलोड किया गया दस्तावेज़ नहीं खुल सका।',
          ),
        );
      }
    } catch (openError) {
      console.error(
        '[MaidProfile] Document open failed:',
        openError,
      );
      setError(
        tr(
          'Unable to open the uploaded document.',
          'अपलोड किया गया दस्तावेज़ नहीं खुल सका।',
        ),
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1F7A4C" />
        <Text style={styles.loadingText}>
          {tr('Loading profile...', 'प्रोफ़ाइल लोड हो रही है...')}
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.emptyTitle}>
          {tr('Profile not found', 'प्रोफ़ाइल नहीं मिली')}
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/maid/onboarding')}
        >
          <Text style={styles.primaryButtonText}>
            {tr('Complete profile', 'प्रोफ़ाइल पूरी करें')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const name = profile.name?.trim() || 'Help';
  const phone = profile.phoneNumber?.trim() || tr('Not available', 'उपलब्ध नहीं');
  const alternatePhone =
    profile.alternatePhoneNumber?.trim() || tr('Not provided', 'नहीं दिया गया');
  const gender = profile.gender?.trim() || tr('Not provided', 'नहीं दिया गया');
  const dob = profile.dateOfBirth?.trim() || tr('Not provided', 'नहीं दिया गया');
  const serviceArea = profile.serviceArea?.trim() || tr('Not provided', 'नहीं दिया गया');
  const emergencyName =
    profile.emergencyContact?.name?.trim() || tr('Not provided', 'नहीं दिया गया');
  const emergencyNumber =
    profile.emergencyContact?.phoneNumber?.trim() || tr('Not provided', 'नहीं दिया गया');
  const emergencyRelation =
    profile.emergencyContact?.relationship?.trim() || tr('Not provided', 'नहीं दिया गया');
  const verified =
    profile.verificationStatus?.toLowerCase() === 'verified';

  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'H';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isSigningOut}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            {tr('Profile', 'प्रोफ़ाइल')}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.profileHero}>
          {profile.photoUrl ? (
            <Image
              source={{ uri: profile.photoUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileInitial}>
              <Text style={styles.profileInitialText}>
                {initials}
              </Text>
            </View>
          )}

          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{name}</Text>
            <View
              style={[
                styles.badge,
                verified
                  ? styles.badgeVerified
                  : styles.badgePending,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  verified
                    ? styles.badgeTextVerified
                    : styles.badgeTextPending,
                ]}
              >
                {verified
                  ? tr('Verified', 'वेरिफ़ाइड')
                  : tr('Pending', 'पेंडिंग')}
              </Text>
            </View>
          </View>

          <Text style={styles.profilePhone}>{phone}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>
          {tr('Personal details', 'व्यक्तिगत जानकारी')}
        </Text>
        <View style={styles.card}>
          <DetailRow icon="👤" label={tr('Full name', 'पूरा नाम')} value={name} />
          <Separator />
          <DetailRow icon="📱" label={tr('Phone number', 'फोन नंबर')} value={phone} />
          <Separator />
          <DetailRow icon="↕" label={tr('Alternative number', 'वैकल्पिक नंबर')} value={alternatePhone} />
          <Separator />
          <DetailRow icon="◉" label={tr('Gender', 'लिंग')} value={gender} />
          <Separator />
          <DetailRow icon="🎂" label={tr('Date of birth', 'जन्म तिथि')} value={dob} />
        </View>

        <Text style={styles.sectionTitle}>
          {tr('Emergency contact', 'आपातकालीन संपर्क')}
        </Text>
        <View style={styles.card}>
          <DetailRow icon="🛡" label={tr('Name', 'नाम')} value={emergencyName} />
          <Separator />
          <DetailRow icon="📞" label={tr('Phone number', 'फोन नंबर')} value={emergencyNumber} />
          <Separator />
          <DetailRow icon="♡" label={tr('Relationship', 'रिश्ता')} value={emergencyRelation} />
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {tr('Your services', 'आपकी सेवाएं')}
          </Text>
          <Text style={styles.countText}>{serviceNames.length}</Text>
        </View>

        <View style={styles.card}>
          {serviceNames.length ? (
            <View style={styles.tagsRow}>
              {serviceNames.map((serviceName, index) => (
                <View
                  key={`${serviceName}-${index}`}
                  style={styles.serviceTag}
                >
                  <Text style={styles.serviceTagText}>
                    {serviceName}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedText}>
              {tr('No services selected.', 'कोई सेवा नहीं चुनी गई।')}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          {tr('Working area', 'काम का क्षेत्र')}
        </Text>
        <View style={styles.addressCard}>
          <View style={styles.addressIconCircle}>
            <Text style={styles.addressIcon}>⌖</Text>
          </View>
          <View style={styles.addressContent}>
            <Text style={styles.addressText}>{serviceArea}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {tr('Identity document', 'पहचान दस्तावेज़')}
        </Text>
        <Pressable
          style={styles.documentCard}
          onPress={openDocument}
          disabled={!profile.idDocumentUrl}
        >
          <View style={styles.documentIconCircle}>
            <Text style={styles.documentIcon}>ID</Text>
          </View>
          <View style={styles.documentContent}>
            <Text style={styles.documentTitle}>
              {profile.idDocumentName ||
                tr('Identity document', 'पहचान दस्तावेज़')}
            </Text>
            <Text style={styles.documentSubtitle}>
              {profile.idDocumentUrl
                ? tr(
                    'Uploaded securely',
                    'सुरक्षित रूप से अपलोड किया गया है',
                  )
                : tr(
                    'No document uploaded',
                    'कोई दस्तावेज़ अपलोड नहीं है',
                  )}
            </Text>
          </View>
          {profile.idDocumentUrl ? (
            <Text style={styles.documentArrow}>›</Text>
          ) : null}
        </Pressable>

        <View style={styles.accountCard}>
          <View style={styles.accountIconCircle}>
            <Text style={styles.accountIcon}>✓</Text>
          </View>
          <View style={styles.accountContent}>
            <Text style={styles.accountTitle}>
              HomeHelp
            </Text>
            <Text style={styles.accountSubtitle}>
              {verified
                ? tr('Your profile is active', 'आपकी प्रोफ़ाइल सक्रिय है')
                : tr('Your profile is under review', 'आपकी प्रोफ़ाइल समीक्षा में है')}
            </Text>
          </View>
        </View>

        <Pressable
          style={[
            styles.signOutButton,
            isSigningOut && styles.signOutButtonDisabled,
          ]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color="#B42318" />
          ) : (
            <Text style={styles.signOutIcon}>↪</Text>
          )}
          <Text style={styles.signOutText}>
            {isSigningOut
              ? tr('Signing out...', 'साइन आउट हो रहा है...')
              : tr('Sign Out', 'साइन आउट')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Text>{icon}</Text>
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8F6' },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#777777' },
  content: { paddingHorizontal: 20 },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 34, lineHeight: 34, color: '#111111', marginTop: -3 },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#111111' },
  headerSpacer: { width: 42 },
  profileHero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  profileImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E9EEE9' },
  profileInitial: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#DCEFE3', alignItems: 'center', justifyContent: 'center',
  },
  profileInitialText: { fontSize: 36, fontWeight: '800', color: '#1F7A4C' },
  nameRow: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { fontSize: 24, fontWeight: '800', color: '#111111' },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeVerified: { backgroundColor: '#EAF5EE' },
  badgePending: { backgroundColor: '#FFF4DF' },
  badgeText: { fontSize: 10, fontWeight: '900' },
  badgeTextVerified: { color: '#1F7A4C' },
  badgeTextPending: { color: '#A05A00' },
  profilePhone: { marginTop: 5, fontSize: 14, color: '#777777' },
  errorBox: {
    marginTop: 14, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#FFF4F2', flexDirection: 'row', alignItems: 'center',
  },
  errorIcon: { fontSize: 16, color: '#B42318', marginRight: 8 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#B42318' },
  sectionTitle: { marginTop: 24, marginBottom: 11, fontSize: 18, fontWeight: '800', color: '#111111' },
  sectionHeaderRow: {
    marginTop: 24, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  countText: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: '#EAF5EE', color: '#1F7A4C', fontSize: 11, fontWeight: '900', overflow: 'hidden',
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E7EAE7', paddingHorizontal: 15,
  },
  detailRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center' },
  detailIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#EFF5F1', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#858B87' },
  detailValue: { marginTop: 4, fontSize: 15, fontWeight: '600', color: '#222222' },
  separator: { height: 1, backgroundColor: '#ECEFEC' },
  tagsRow: { paddingVertical: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceTag: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: '#EEF6F1' },
  serviceTagText: { fontSize: 12, fontWeight: '700', color: '#1F7A4C' },
  mutedText: { paddingVertical: 16, fontSize: 13, color: '#808680' },
  addressCard: {
    padding: 15, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EAE7', flexDirection: 'row', alignItems: 'center',
  },
  addressIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF6F1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  addressIcon: { fontSize: 24, color: '#1F7A4C' },
  addressContent: { flex: 1 },
  addressText: { fontSize: 14, lineHeight: 20, color: '#333333' },
  documentCard: {
    minHeight: 78, padding: 14, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EAE7', flexDirection: 'row', alignItems: 'center',
  },
  documentIconCircle: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EEF2EF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  documentIcon: { fontSize: 12, fontWeight: '900', color: '#1F7A4C' },
  documentContent: { flex: 1 },
  documentTitle: { fontSize: 13, fontWeight: '800', color: '#222222' },
  documentSubtitle: { marginTop: 5, fontSize: 11, color: '#7B817C' },
  documentArrow: { fontSize: 28, color: '#7B817C', marginLeft: 7 },
  accountCard: {
    marginTop: 19, minHeight: 74, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EAE7', flexDirection: 'row', alignItems: 'center',
  },
  accountIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DCEFE3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  accountIcon: { fontSize: 19, fontWeight: '800', color: '#1F7A4C' },
  accountContent: { flex: 1 },
  accountTitle: { fontSize: 15, fontWeight: '700', color: '#222222' },
  accountSubtitle: { marginTop: 4, fontSize: 12, color: '#858B87' },
  signOutButton: {
    marginTop: 19, minHeight: 48, borderRadius: 14, backgroundColor: '#FFF3F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  signOutButtonDisabled: { opacity: 0.7 },
  signOutIcon: { fontSize: 19, color: '#B42318' },
  signOutText: { fontSize: 14, fontWeight: '800', color: '#B42318' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111111', marginBottom: 16 },
  primaryButton: { minWidth: 190, height: 50, borderRadius: 14, backgroundColor: '#1F7A4C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
