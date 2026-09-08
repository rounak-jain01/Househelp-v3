import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import BottomSheetMessage from '../../components/BottomSheetMessage';
import {
  resendOtp,
  verifyOtp,
} from '../../services/firebase/phoneAuth';

const RESEND_DELAY = 30;

type OtpParams = {
  phone?: string;
  role?: 'user' | 'maid';
};

type MessageSheet = {
  visible: boolean;
  title: string;
  message: string;
};

export default function OtpVerificationScreen() {
  const router = useRouter();

  const { phone, role } = useLocalSearchParams<OtpParams>();

  const inputRef = useRef<TextInput>(null);

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] =
    useState(RESEND_DELAY);

  const [messageSheet, setMessageSheet] =
    useState<MessageSheet>({
      visible: false,
      title: '',
      message: '',
    });

  const showMessage = (
    title: string,
    message: string,
  ) => {
    setMessageSheet({
      visible: true,
      title,
      message,
    });
  };

  const closeMessage = () => {
    setMessageSheet((current) => ({
      ...current,
      visible: false,
    }));
  };

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((current) =>
        current > 0 ? current - 1 : 0,
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 350);

    return () => clearTimeout(focusTimer);
  }, []);

  const handleOtpChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');

    setOtp(digitsOnly.slice(0, 6));
  };

  const handleVerify = async () => {
  if (otp.length !== 6) {
    showMessage(
      'Enter the complete OTP',
      'Please enter the 6-digit verification code sent to your phone.',
    );
    return;
  }

  Keyboard.dismiss();

  try {
    setIsVerifying(true);

    const user = await verifyOtp(otp);

    console.log(
      '[OTP] Firebase user:',
      user.uid,
    );

    router.replace({
      pathname: '/auth/permissions',
      params: {
        role: role ?? 'user',
      },
    });
  } catch (error: any) {
    console.error(
      '[OTP] Verification failed:',
      error,
    );

    const errorCode = error?.code;

    if (
      errorCode ===
      'auth/invalid-verification-code'
    ) {
      showMessage(
        'Incorrect OTP',
        'The code you entered is incorrect. Please check the SMS and try again.',
      );
      return;
    }

    if (
      errorCode ===
      'auth/code-expired'
    ) {
      showMessage(
        'OTP expired',
        'This verification code has expired. Please request a new OTP.',
      );
      return;
    }

    if (
      errorCode ===
      'auth/session-expired'
    ) {
      showMessage(
        'Verification expired',
        'Your OTP session has expired. Please request a new code.',
      );
      return;
    }

    showMessage(
      'Verification failed',
      'We could not verify your OTP. Please try again.',
    );
  } finally {
    setIsVerifying(false);
  }
};

  const handleResend = async () => {
    if (
      !phone ||
      resendCountdown > 0 ||
      isResending ||
      isVerifying
    ) {
      return;
    }

    try {
      setIsResending(true);

      await resendOtp(phone);

      setOtp('');
      setResendCountdown(RESEND_DELAY);

      showMessage(
        'New OTP sent',
        `We've sent a new verification code to ${phone}.`,
      );
    } catch (error: any) {
      console.error(
        'OTP resend failed:',
        error,
      );

      const errorCode = error?.code;

      if (
        errorCode ===
        'auth/too-many-requests'
      ) {
        showMessage(
          'Too many attempts',
          'Too many OTP requests were made. Please wait a little before trying again.',
        );
        return;
      }

      if (
        errorCode ===
        'auth/quota-exceeded'
      ) {
        showMessage(
          'OTP limit reached',
          'The verification SMS limit has been reached temporarily. Please try again later.',
        );
        return;
      }

      showMessage(
        'Could not resend OTP',
        'We were unable to send a new verification code. Please try again.',
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeNumber = () => {
    router.replace({
      pathname: '/auth/phone',
      params: {
        role: role ?? 'user',
      },
    });
  };

  const formattedPhone = phone || '';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pressable
          onPress={handleChangeNumber}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            VERIFY YOUR NUMBER
          </Text>

          <Text style={styles.title}>
            Enter the OTP
          </Text>

          <Text style={styles.subtitle}>
            We sent a 6-digit verification code to
          </Text>

          <Text style={styles.phone}>
            {formattedPhone}
          </Text>

          <Pressable
            onPress={handleChangeNumber}
            style={({ pressed }) => [
              styles.changeButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.changeText}>
              Change number
            </Text>
          </Pressable>
        </View>

        <View style={styles.otpSection}>
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={styles.otpRow}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = otp[index];
              const isActive =
                index === otp.length &&
                otp.length < 6;

              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    digit && styles.otpBoxFilled,
                    isActive && styles.otpBoxActive,
                  ]}
                >
                  <Text style={styles.otpDigit}>
                    {digit || ''}
                  </Text>
                </View>
              );
            })}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            style={styles.hiddenInput}
          />

          <View style={styles.resendContainer}>
            {resendCountdown > 0 ? (
              <Text style={styles.resendTimer}>
                Resend OTP in{' '}
                <Text style={styles.resendTimerStrong}>
                  {resendCountdown}s
                </Text>
              </Text>
            ) : (
              <Pressable
                onPress={handleResend}
                disabled={isResending}
                style={({ pressed }) => [
                  styles.resendButton,
                  pressed && styles.pressed,
                ]}
              >
                {isResending ? (
                  <ActivityIndicator
                    size="small"
                    color="#171C18"
                  />
                ) : (
                  <Text style={styles.resendText}>
                    Resend OTP
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleVerify}
          disabled={
            isVerifying ||
            isResending ||
            otp.length !== 6
          }
          style={({ pressed }) => [
            styles.verifyButton,
            otp.length !== 6 &&
              styles.verifyButtonDisabled,
            pressed &&
              otp.length === 6 &&
              styles.pressed,
          ]}
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyText}>
              Verify OTP
            </Text>
          )}
        </Pressable>
      </View>

      <BottomSheetMessage
        visible={messageSheet.visible}
        title={messageSheet.title}
        message={messageSheet.message}
        onClose={closeMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAF9',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E8E5',
  },

  backIcon: {
    marginTop: -3,
    fontSize: 30,
    lineHeight: 30,
    color: '#1A1E1A',
  },

  header: {
    marginTop: 42,
  },

  eyebrow: {
    marginBottom: 10,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6B756D',
  },

  title: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '700',
    color: '#121512',
    letterSpacing: -0.7,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    color: '#747A75',
  },

  phone: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '700',
    color: '#1D251F',
  },

  changeButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
  },

  changeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4D5A50',
    textDecorationLine: 'underline',
  },

  otpSection: {
    marginTop: 42,
  },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDE2DD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  otpBoxFilled: {
    borderColor: '#1A221B',
    backgroundColor: '#FFFFFF',
  },

  otpBoxActive: {
    borderColor: '#1A221B',
    borderWidth: 2,
  },

  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#151815',
  },

  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },

  resendContainer: {
    minHeight: 44,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resendTimer: {
    fontSize: 13,
    color: '#818781',
  },

  resendTimerStrong: {
    fontWeight: '700',
    color: '#434B44',
  },

  resendButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resendText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171C18',
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#F9FAF9',
  },

  verifyButton: {
    height: 55,
    borderRadius: 17,
    backgroundColor: '#151A16',
    alignItems: 'center',
    justifyContent: 'center',
  },

  verifyButtonDisabled: {
    backgroundColor: '#B9BEB9',
  },

  verifyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  pressed: {
    opacity: 0.82,
  },
});