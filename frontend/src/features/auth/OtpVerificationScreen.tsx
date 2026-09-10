import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import BottomSheetMessage from '../../components/BottomSheetMessage';

import {
  resendOtp,
  verifyOtp,
} from '../../services/firebase/phoneAuth';

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

export default function OtpVerificationScreen() {
  const router = useRouter();

  const {
    phone,
    role,
  } =
    useLocalSearchParams<OtpParams>();

  const inputRef =
    useRef<TextInput>(null);

  const [otp, setOtp] =
    useState('');

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [isResending, setIsResending] =
    useState(false);

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

  /*
   * Resend countdown.
   */
  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((current) =>
        current > 0
          ? current - 1
          : 0,
      );
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [resendCountdown]);

  /*
   * Automatically focus OTP input
   * shortly after screen appears.
   */
  useEffect(() => {
    const focusTimer =
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);

    return () =>
      clearTimeout(focusTimer);
  }, []);

  /*
   * Sanitize OTP.
   */
  const handleOtpChange = (
    value: string,
  ) => {
    const digitsOnly =
      value.replace(/\D/g, '');

    const nextOtp =
      digitsOnly.slice(
        0,
        OTP_LENGTH,
      );

    setOtp(nextOtp);
  };

  /*
   * Verify OTP.
   */
  const handleVerify = async () => {
    if (isVerifying || isResending) {
      return;
    }

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

      const user =
        await verifyOtp(otp);

      console.log(
        '[OTP] Firebase user:',
        user.uid,
      );

      /*
       * OTP verified successfully.
       *
       * Do NOT decide whether this is a new
       * or existing account here.
       *
       * PostAuthPermissionScreen will check
       * Firestore and route accordingly.
       */
      router.replace({
        pathname:
          '/auth/permissions',
        params: {
          role:
            role ?? 'user',
        },
      });
    } catch (error: any) {
      console.error(
        '[OTP] Verification failed:',
        error,
      );

      const errorCode =
        error?.code;

      /*
       * Clear the entered OTP for
       * verification errors so the user
       * can enter a fresh code.
       */
      if (
        errorCode ===
          'auth/invalid-verification-code' ||
        errorCode ===
          'auth/code-expired' ||
        errorCode ===
          'auth/session-expired'
      ) {
        setOtp('');
        inputRef.current?.focus();
      }

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

      if (
        errorCode ===
        'auth/invalid-verification-id'
      ) {
        showMessage(
          'Verification session expired',
          'Please request a new OTP and try again.',
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

  /*
   * Resend OTP.
   */
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
      Keyboard.dismiss();

      await resendOtp(phone);

      setOtp('');
      setResendCountdown(
        RESEND_DELAY,
      );

      showMessage(
        'New OTP sent',
        `We've sent a new verification code to ${phone}.`,
      );

      /*
       * Bring OTP input back into focus
       * after the resend message is shown.
       */
      setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
    } catch (error: any) {
      console.error(
        '[OTP] Resend failed:',
        error,
      );

      const errorCode =
        error?.code;

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

  /*
   * Change phone number.
   */
  const handleChangeNumber = () => {
    Keyboard.dismiss();

    router.replace({
      pathname: '/auth/phone',
      params: {
        role:
          role ?? 'user',
      },
    });
  };

  const formattedPhone =
    phone || '';

  const canVerify =
    otp.length === OTP_LENGTH &&
    !isVerifying &&
    !isResending;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      keyboardVerticalOffset={
        Platform.OS === 'ios'
          ? 0
          : 24
      }
    >
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        <View
          style={
            styles.container
          }
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios'
                ? 'interactive'
                : 'on-drag'
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            <View
              style={
                styles.content
              }
            >
              <Pressable
                onPress={
                  handleChangeNumber
                }
                disabled={
                  isVerifying ||
                  isResending
                }
                accessibilityRole="button"
                accessibilityLabel="Go back and change phone number"
                style={({
                  pressed,
                }) => [
                  styles.backButton,
                  pressed &&
                    styles.pressed,
                  (isVerifying ||
                    isResending) &&
                    styles.disabledControl,
                ]}
              >
                <Text
                  style={
                    styles.backIcon
                  }
                >
                  ‹
                </Text>
              </Pressable>

              <View
                style={
                  styles.header
                }
              >
                <Text
                  style={
                    styles.eyebrow
                  }
                >
                  VERIFY YOUR NUMBER
                </Text>

                <Text
                  style={
                    styles.title
                  }
                >
                  Enter the OTP
                </Text>

                <Text
                  style={
                    styles.subtitle
                  }
                >
                  We sent a 6-digit
                  verification code to
                </Text>

                <Text
                  style={
                    styles.phone
                  }
                >
                  {formattedPhone}
                </Text>

                <Pressable
                  onPress={
                    handleChangeNumber
                  }
                  disabled={
                    isVerifying ||
                    isResending
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Change phone number"
                  style={({
                    pressed,
                  }) => [
                    styles.changeButton,
                    pressed &&
                      styles.pressed,
                    (isVerifying ||
                      isResending) &&
                      styles.disabledControl,
                  ]}
                >
                  <Text
                    style={
                      styles.changeText
                    }
                  >
                    Change number
                  </Text>
                </Pressable>
              </View>

              <View
                style={
                  styles.otpSection
                }
              >
                <Pressable
                  onPress={() =>
                    inputRef.current?.focus()
                  }
                  disabled={
                    isVerifying ||
                    isResending
                  }
                  style={
                    styles.otpRow
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Enter verification code"
                >
                  {Array.from({
                    length:
                      OTP_LENGTH,
                  }).map(
                    (
                      _,
                      index,
                    ) => {
                      const digit =
                        otp[index];

                      const isActive =
                        index ===
                          otp.length &&
                        otp.length <
                          OTP_LENGTH;

                      return (
                        <View
                          key={
                            index
                          }
                          style={[
                            styles.otpBox,
                            digit &&
                              styles.otpBoxFilled,
                            isActive &&
                              styles.otpBoxActive,
                          ]}
                        >
                          <Text
                            style={
                              styles.otpDigit
                            }
                          >
                            {digit ||
                              ''}
                          </Text>
                        </View>
                      );
                    },
                  )}
                </Pressable>

                <TextInput
                  ref={inputRef}
                  value={otp}
                  onChangeText={
                    handleOtpChange
                  }
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={
                    OTP_LENGTH
                  }
                  editable={
                    !isVerifying &&
                    !isResending
                  }
                  returnKeyType="done"
                  onSubmitEditing={
                    canVerify
                      ? handleVerify
                      : undefined
                  }
                  style={
                    styles.hiddenInput
                  }
                  caretHidden
                  contextMenuHidden
                  autoCorrect={false}
                  autoCapitalize="none"
                  accessibilityLabel="OTP verification code"
                />

                <View
                  style={
                    styles.helpTextContainer
                  }
                >
                  <Text
                    style={
                      styles.helpText
                    }
                  >
                    Enter the 6-digit
                    code from the SMS.
                  </Text>
                </View>

                <View
                  style={
                    styles.resendContainer
                  }
                >
                  {resendCountdown >
                  0 ? (
                    <Text
                      style={
                        styles.resendTimer
                      }
                    >
                      Resend OTP in{' '}
                      <Text
                        style={
                          styles.resendTimerStrong
                        }
                      >
                        {
                          resendCountdown
                        }
                        s
                      </Text>
                    </Text>
                  ) : (
                    <Pressable
                      onPress={
                        handleResend
                      }
                      disabled={
                        isResending ||
                        isVerifying
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Resend OTP"
                      style={({
                        pressed,
                      }) => [
                        styles.resendButton,
                        pressed &&
                          styles.pressed,
                        (isResending ||
                          isVerifying) &&
                          styles.disabledControl,
                      ]}
                    >
                      {isResending ? (
                        <>
                          <ActivityIndicator
                            size="small"
                            color="#171C18"
                          />

                          <Text
                            style={
                              styles.resendLoadingText
                            }
                          >
                            Sending...
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={
                            styles.resendText
                          }
                        >
                          Resend OTP
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          <View
            style={
              styles.footer
            }
          >
            <Pressable
              onPress={
                handleVerify
              }
              disabled={!canVerify}
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  !canVerify,
                  busy:
                    isVerifying,
              }}
              accessibilityLabel="Verify OTP"
              style={({
                pressed,
              }) => [
                styles.verifyButton,
                !canVerify &&
                  styles.verifyButtonDisabled,
                pressed &&
                  canVerify &&
                  styles.pressed,
              ]}
            >
              {isVerifying ? (
                <View
                  style={
                    styles.buttonContent
                  }
                >
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text
                    style={
                      styles.verifyText
                    }
                  >
                    Verifying...
                  </Text>
                </View>
              ) : (
                <Text
                  style={
                    styles.verifyText
                  }
                >
                  Verify OTP
                </Text>
              )}
            </Pressable>

            <Text
              style={
                styles.securityText
              }
            >
              Your phone number is
              securely verified by
              HomeHelp.
            </Text>
          </View>

          <BottomSheetMessage
            visible={
              messageSheet.visible
            }
            title={
              messageSheet.title
            }
            message={
              messageSheet.message
            }
            onClose={
              closeMessage
            }
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles =
  StyleSheet.create({
    keyboardContainer: {
      flex: 1,
    },

    container: {
      flex: 1,
      backgroundColor:
        '#F9FAF9',
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 30,
      paddingBottom: 30,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor:
        '#E5E8E5',
    },

    backIcon: {
      marginTop: -3,
      fontSize: 30,
      lineHeight: 30,
      color: '#1A1E1A',
    },

    header: {
      marginTop: 38,
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
      alignSelf:
        'flex-start',
      marginTop: 9,
      minHeight: 36,
      justifyContent:
        'center',
    },

    changeText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4D5A50',
      textDecorationLine:
        'underline',
    },

    otpSection: {
      marginTop: 46,
    },

    otpRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
    },

    otpBox: {
      width: 48,
      height: 58,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        '#DDE2DD',
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    otpBoxFilled: {
      borderColor:
        '#1A221B',
      backgroundColor:
        '#FFFFFF',
    },

    otpBoxActive: {
      borderColor:
        '#1A221B',
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

    helpTextContainer: {
      marginTop: 16,
      alignItems: 'center',
    },

    helpText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#8A908B',
      textAlign: 'center',
    },

    resendContainer: {
      minHeight: 50,
      marginTop: 16,
      alignItems:
        'center',
      justifyContent:
        'center',
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
      minHeight: 44,
      paddingHorizontal: 18,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 8,
    },

    resendText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#171C18',
    },

    resendLoadingText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#171C18',
    },

    footer: {
      paddingHorizontal: 24,
      paddingTop: 10,
      paddingBottom: 24,
      backgroundColor:
        '#F9FAF9',
    },

    verifyButton: {
      minHeight: 55,
      borderRadius: 17,
      backgroundColor:
        '#151A16',
      alignItems: 'center',
      justifyContent: 'center',
    },

    verifyButtonDisabled: {
      backgroundColor:
        '#B9BEB9',
    },

    buttonContent: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 10,
    },

    verifyText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    securityText: {
      marginTop: 10,
      paddingHorizontal: 16,
      fontSize: 11,
      lineHeight: 16,
      color: '#929792',
      textAlign: 'center',
    },

    disabledControl: {
      opacity: 0.5,
    },

    pressed: {
      opacity: 0.82,
    },
  });