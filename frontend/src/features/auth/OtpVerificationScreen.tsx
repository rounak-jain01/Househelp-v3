import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheetMessage from '../../components/BottomSheetMessage';
import { resendOtp, verifyOtp } from '../../services/firebase/phoneAuth';

const RESEND_DELAY = 30;
const OTP_LENGTH = 6;

type OtpRole = 'user' | 'maid';

type OtpParams = {
  phone?: string;
  role?: OtpRole;
};

type MessageSheet = {
  visible: boolean;
  title: string;
  message: string;
};

// Keep these filenames aligned with the assets already used in your CustomerUi folder.
const ASSETS = {
  logo: require('../../../assets/CustomerUi/logo.png'),
  backArrow: require('../../../assets/CustomerUi/back-arrow.png'),
  otp: require('../../../assets/CustomerUi/otp.png'),
  pencil: require('../../../assets/CustomerUi/pencil.png'),
  buttonArrow: require('../../../assets/CustomerUi/right-arrow.png'),
  privacy: require('../../../assets/CustomerUi/privacy.png'),
  // bottomArt: require('../../../assets/CustomerUi/bottom-art.png'),
} satisfies Record<string, ImageSourcePropType>;

export default function OtpVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const { phone, role } = useLocalSearchParams<OtpParams>();
  const inputRef = useRef<TextInput>(null);

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(RESEND_DELAY);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [otpSelection, setOtpSelection] = useState(0);
  const [messageSheet, setMessageSheet] = useState<MessageSheet>({
    visible: false,
    title: '',
    message: '',
  });

  const isCompact = height < 760;
  const horizontalPadding = Math.max(22, Math.min(30, width * 0.065));

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 450);
    return () => clearTimeout(timer);
  }, []);

  const showMessage = (title: string, message: string) => {
    setMessageSheet({ visible: true, title, message });
  };

  const closeMessage = () => {
    setMessageSheet((current) => ({ ...current, visible: false }));
  };

  const handleOtpChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(cleaned);
    setOtpSelection(cleaned.length);
  };

  const handleOtpBoxPress = (index: number) => {
    if (isVerifying || isResending) return;
    const position = Math.min(index, otp.length);
    setOtpSelection(position);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleChangeNumber = () => {
    Keyboard.dismiss();
    router.replace({
      pathname: '/auth/phone',
      params: { role: role ?? 'user' },
    });
  };

  const handleVerify = async () => {
    if (isVerifying || isResending) return;

    if (otp.length !== OTP_LENGTH) {
      showMessage(
        'Enter the complete OTP',
        'Please enter the 6-digit verification code sent to your phone.',
      );
      inputRef.current?.focus();
      return;
    }

    Keyboard.dismiss();

    try {
      setIsVerifying(true);
      const user = await verifyOtp(otp);
      console.log('[OTP] Firebase user:', user.uid);

      router.replace({
        pathname: '/auth/permissions',
        params: { role: role ?? 'user' },
      });
    } catch (error: any) {
      console.error('[OTP] Verification failed:', error);
      const errorCode = error?.code;

      if (
        errorCode === 'auth/invalid-verification-code' ||
        errorCode === 'auth/code-expired' ||
        errorCode === 'auth/session-expired'
      ) {
        setOtp('');
        inputRef.current?.focus();
      }

      if (errorCode === 'auth/invalid-verification-code') {
        showMessage('Incorrect OTP', 'The code you entered is incorrect. Please check the SMS and try again.');
        return;
      }
      if (errorCode === 'auth/code-expired') {
        showMessage('OTP expired', 'This verification code has expired. Please request a new OTP.');
        return;
      }
      if (errorCode === 'auth/session-expired') {
        showMessage('Verification expired', 'Your OTP session has expired. Please request a new code.');
        return;
      }
      if (errorCode === 'auth/invalid-verification-id') {
        showMessage('Verification session expired', 'Please request a new OTP and try again.');
        return;
      }

      showMessage('Verification failed', 'We could not verify your OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!phone || resendCountdown > 0 || isResending || isVerifying) return;

    try {
      setIsResending(true);
      Keyboard.dismiss();
      await resendOtp(phone);
      setOtp('');
      setResendCountdown(RESEND_DELAY);
      showMessage('New OTP sent', `We've sent a new verification code to ${phone}.`);
      setTimeout(() => inputRef.current?.focus(), 350);
    } catch (error: any) {
      console.error('[OTP] Resend failed:', error);
      const errorCode = error?.code;

      if (errorCode === 'auth/too-many-requests') {
        showMessage('Too many attempts', 'Too many OTP requests were made. Please wait a little before trying again.');
        return;
      }
      if (errorCode === 'auth/quota-exceeded') {
        showMessage('OTP limit reached', 'The verification SMS limit has been reached temporarily. Please try again later.');
        return;
      }
      showMessage('Could not resend OTP', 'We were unable to send a new verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formattedPhone = phone || '';
  const canVerify = otp.length === OTP_LENGTH && !isVerifying && !isResending;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : Math.max(8, insets.top)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: keyboardVisible ? 18 : 0,
              }}
              scrollEnabled={keyboardVisible}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.screen,
                  {
                    paddingHorizontal: horizontalPadding,
                    paddingTop: isCompact ? 8 : 12,
                  },
                ]}
              >
                {/* top row: back arrow + logo at the exact same level */}
                <View style={styles.topRow}>
                  <Pressable
                    onPress={handleChangeNumber}
                    disabled={isVerifying || isResending}
                    hitSlop={10}
                    style={styles.backPressable}
                    accessibilityRole="button"
                    accessibilityLabel="Go back and change phone number"
                  >
                    <Image source={ASSETS.backArrow} style={styles.backArrow} resizeMode="contain" />
                  </Pressable>

                  <Image source={ASSETS.logo} style={styles.logo} resizeMode="contain" />
                  <View style={styles.topSpacer} />
                </View>

                <View style={styles.hero}>
                  <View style={styles.heroText}>
                    <Text style={styles.title}>Verify{`\n`}Your Number</Text>
                    <Text style={styles.subtitle}>
                      We have sent a 6-digit code to
                    </Text>
                    <View style={styles.phoneRow}>
                      <Text style={styles.phone}>{formattedPhone}</Text>
                      <Pressable
                        onPress={handleChangeNumber}
                        disabled={isVerifying || isResending}
                        hitSlop={10}
                        style={styles.editButton}
                        accessibilityRole="button"
                        accessibilityLabel="Edit phone number"
                      >
                        <Image source={ASSETS.pencil} style={styles.pencilIcon} resizeMode="contain" />
                      </Pressable>
                    </View>
                  </View>

                  <Image
                    source={ASSETS.otp}
                    resizeMode="contain"
                    style={[
                      styles.heroImage,
                      isCompact && styles.heroImageCompact,
                    ]}
                    accessibilityLabel="OTP verification illustration"
                  />
                </View>

                <View style={styles.otpArea}>
                  <View style={styles.otpRow} accessibilityLabel="Enter verification code">
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                      const digit = otp[index];
                      const active = index === Math.min(otpSelection, OTP_LENGTH - 1) && !digit;
                      return (
                        <Pressable
                          key={index}
                          onPress={() => handleOtpBoxPress(index)}
                          disabled={isVerifying || isResending}
                          style={({ pressed }) => [
                            styles.otpBox,
                            digit && styles.otpBoxFilled,
                            active && styles.otpBoxActive,
                            pressed && styles.otpBoxPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`OTP digit ${index + 1}`}
                        >
                          <Text style={styles.otpDigit}>{digit || ''}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <TextInput
                    ref={inputRef}
                    value={otp}
                    selection={{ start: Math.min(otpSelection, otp.length), end: Math.min(otpSelection, otp.length) }}
                    onChangeText={handleOtpChange}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    maxLength={OTP_LENGTH}
                    editable={!isVerifying && !isResending}
                    returnKeyType="done"
                    onSubmitEditing={canVerify ? handleVerify : undefined}
                    style={styles.hiddenInput}
                    caretHidden
                    contextMenuHidden
                    autoCorrect={false}
                    autoCapitalize="none"
                    accessibilityLabel="OTP verification code"
                  />

                  <View style={styles.resendRow}>
                    {resendCountdown > 0 ? (
                      <Text style={styles.resendText}>
                        Didn’t receive the code?{' '}
                        <Text style={styles.resendStrong}>Resend in 00:{String(resendCountdown).padStart(2, '0')}</Text>
                      </Text>
                    ) : (
                      <Pressable onPress={handleResend} disabled={isResending || isVerifying}>
                        {isResending ? (
                          <View style={styles.inlineLoading}>
                            <ActivityIndicator size="small" color="#174B3D" />
                            <Text style={styles.resendStrong}> Sending...</Text>
                          </View>
                        ) : (
                          <Text style={styles.resendStrong}>Resend OTP</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>

                <View style={styles.bottomArea}>
                  <Pressable
                    onPress={handleVerify}
                    disabled={!canVerify}
                    style={({ pressed }) => [
                      styles.verifyButton,
                      !canVerify && styles.verifyButtonDisabled,
                      pressed && canVerify && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Verify and continue"
                  >
                    {isVerifying ? (
                      <View style={styles.buttonContent}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.verifyText}>Verifying...</Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.verifyText}>Verify &amp; Continue</Text>
                        <Image source={ASSETS.buttonArrow} style={styles.buttonArrow} resizeMode="contain" />
                      </View>
                    )}
                  </Pressable>

                  <View style={styles.privacyCard}>
                    <Image source={ASSETS.privacy} style={styles.privacyIcon} resizeMode="contain" />
                    <View style={styles.privacyTextWrap}>
                      <Text style={styles.privacyTitle}>Your privacy matters</Text>
                      <Text style={styles.privacyBody}>We never share your information{`\n`}with anyone.</Text>
                    </View>
                  </View>
                </View>

                {!keyboardVisible && (
                  <View pointerEvents="none" style={styles.bottomArtWrap}>
                    <View style={styles.bottomArtShape} />
                    <View style={styles.bottomArtTextWrap}>
                      <Text style={styles.bottomArtTitle}>Better Homes</Text>
                      <Text style={styles.bottomArtSubtitle}>Brighter Days</Text>
                      <View style={styles.bottomArtLine} />
                    </View>
                  </View>
                )}

              </View>
            </ScrollView>

            <BottomSheetMessage
              visible={messageSheet.visible}
              title={messageSheet.title}
              message={messageSheet.message}
              onClose={closeMessage}
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    minHeight: '100%',
    paddingBottom: 10,
  },
  topRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backPressable: {
    width: 34,
    height: 34,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backArrow: {
    width: 25,
    height: 25,
  },
  logo: {
    width: 112,
    height: 46,
    marginLeft: 6,
    marginTop: 1,
  },
  topSpacer: {
    flex: 1,
  },
  hero: {
    position: 'relative',
    minHeight: 290,
    justifyContent: 'flex-start',
  },
  heroText: {
    zIndex: 3,
    paddingTop: 52,
    paddingRight: '28%',
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.4,
    color: '#102A25',
  },
  subtitle: {
    marginTop: 15,
    fontSize: 16,
    lineHeight: 23,
    color: '#52635E',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  phone: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    color: '#102A25',
  },
  editButton: {
    width: 28,
    height: 28,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 18,
    color: '#102A25',
    transform: [{ rotate: '-45deg' }],
  },
  heroImage: {
    position: 'absolute',
    top: -12,
    right: -80,
    width: '66%',
    height: 310,
    zIndex: 1,
  },
  heroImageCompact: {
    height: 276,
    width: '63%',
  },
  otpArea: {
    zIndex: 5,
    marginTop: -8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 63,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE2DD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFirst: {
    borderColor: '#174B3D',
    borderWidth: 2,
  },
  otpBoxFilled: {
    borderColor: '#174B3D',
  },
  otpBoxActive: {
    borderColor: '#174B3D',
    borderWidth: 2,
  },
  otpDigit: {
    fontSize: 23,
    fontWeight: '700',
    color: '#102A25',
  },
  hiddenInput: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendRow: {
    marginTop: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#52635E',
  },
  resendStrong: {
    color: '#174B3D',
    fontWeight: '800',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomArea: {
    marginTop: 28,
  },
  verifyButton: {
    height: 58,
    borderRadius: 30,
    backgroundColor: '#174B3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#DDE3DE',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  verifyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonArrow: {
    width: 28,
    height: 22,
  },
  privacyCard: {
    marginTop: 20,
    minHeight: 104,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E3E8E3',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  privacyIcon: {
    width: 58,
    height: 58,
    marginRight: 17,
  },
  privacyTextWrap: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A25',
  },
  privacyBody: {
    marginTop: 5,
    fontSize: 15,
    lineHeight: 20,
    color: '#52635E',
  },
  pencilIcon: {
    width: 18,
    height: 18,
  },
  otpBoxPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  bottomArtWrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 205,
    height: 135,
    overflow: 'hidden',
  },
  bottomArtShape: {
    position: 'absolute',
    right: -35,
    bottom: -58,
    width: 260,
    height: 175,
    borderTopLeftRadius: 170,
    backgroundColor: '#EEF4EE',
    transform: [{ rotate: '-10deg' }],
  },
  bottomArtTextWrap: {
    position: 'absolute',
    right: 8,
    bottom: 14,
    width: 148,
    alignItems: 'center',
  },
  bottomArtTitle: {
    fontSize: 19,
    lineHeight: 22,
    fontFamily: Platform.select({ ios: 'Georgia-Italic', android: 'serif' }),
    fontStyle: 'italic',
    color: '#193E34',
    transform: [{ rotate: '-7deg' }],
  },
  bottomArtSubtitle: {
    marginTop: 2,
    fontSize: 19,
    lineHeight: 22,
    fontFamily: Platform.select({ ios: 'Georgia-Italic', android: 'serif' }),
    fontStyle: 'italic',
    color: '#193E34',
    transform: [{ rotate: '-7deg' }],
  },
  bottomArtLine: {
    width: 34,
    height: 2,
    backgroundColor: '#193E34',
    marginTop: 10,
    alignSelf: 'flex-end',
    marginRight: 18,
    transform: [{ rotate: '1deg' }],
  },
  pressed: {
    opacity: 0.82,
  },
});
