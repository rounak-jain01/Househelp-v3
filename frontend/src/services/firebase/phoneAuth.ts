import {
  getAuth,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from '@react-native-firebase/auth';

let confirmationResult: ConfirmationResult | null = null;

export async function sendOtp(
  phoneNumber: string,
): Promise<void> {
  const auth = getAuth();

  confirmationResult = await signInWithPhoneNumber(
    auth,
    phoneNumber,
  );
}

export async function resendOtp(
  phoneNumber: string,
): Promise<void> {
  const auth = getAuth();

  // Create a fresh verification session.
  // The latest confirmation result replaces the old one.
  confirmationResult = await signInWithPhoneNumber(
    auth,
    phoneNumber,
  );
}

export async function verifyOtp(
  otp: string,
) {
  if (!confirmationResult) {
    throw new Error(
      'OTP session has expired. Please request a new OTP.',
    );
  }

  const result = await confirmationResult.confirm(otp);

  confirmationResult = null;

  return result.user;
}

export function clearOtpSession(): void {
  confirmationResult = null;
}