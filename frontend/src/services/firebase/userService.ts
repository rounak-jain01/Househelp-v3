import { getAuth } from '@react-native-firebase/auth';
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref,
} from '@react-native-firebase/storage';

export type CustomerGender =
  | 'male'
  | 'female'
  | 'other'
  | 'prefer_not_to_say';

export type SaveCustomerProfileParams = {
  name: string;
  gender: CustomerGender;
  address: string;
  landmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  photoUri?: string | null;
};

function getImageExtension(uri: string): string {
  const cleanUri = uri.split('?')[0];

  const extension = cleanUri
    .split('.')
    .pop()
    ?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return extension;

    default:
      return 'jpg';
  }
}

async function uploadProfilePhoto(
  userId: string,
  photoUri: string,
): Promise<string> {
  const storage = getStorage();

  const extension = getImageExtension(photoUri);

  const storagePath = `users/${userId}/profile.${extension}`;

  const storageRef = ref(
    storage,
    storagePath,
  );

  await putFile(
    storageRef,
    photoUri,
  );

  return getDownloadURL(storageRef);
}

export async function saveCustomerProfile({
  name,
  gender,
  address,
  landmark,
  latitude,
  longitude,
  photoUri,
}: SaveCustomerProfileParams) {
  const auth = getAuth();
  const firestore = getFirestore();

  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'No authenticated user found.',
    );
  }

  const userId = user.uid;

  let photoUrl: string | null = null;

  // Upload profile photo only when the user selected one.
  if (photoUri) {
    photoUrl = await uploadProfilePhoto(
      userId,
      photoUri,
    );
  }

  const userRef = doc(
    firestore,
    'users',
    userId,
  );

  const profileData = {
  userId,
  phoneNumber: user.phoneNumber ?? '',
  name: name.trim(),
  gender,
  role: 'customer' as const,
  photoUrl,
  address: {
    formatted: address.trim(),
    landmark: landmark?.trim() || '',
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  },
  createdAt: serverTimestamp(),
};

console.log('[Firestore] Profile data prepared');
console.log('[Firestore] Auth UID:', userId);
console.log('[Firestore] Before setDoc...');
console.log('[Firestore] Path: users/' + userId);

await setDoc(
  userRef,
  profileData,
);

console.log('[Firestore] After setDoc...');

  return {
    userId,
    photoUrl,
  };
}

export async function deleteProfilePhoto(): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'No authenticated user found.',
    );
  }

  const storage = getStorage();

  const userId = user.uid;

  const extensions = [
    'jpg',
    'jpeg',
    'png',
    'webp',
  ];

  for (const extension of extensions) {
    const storageRef = ref(
      storage,
      `users/${userId}/profile.${extension}`,
    );

    try {
      await deleteObject(storageRef);
    } catch (error: any) {
      // A missing alternate extension is expected.
      if (
        error?.code !==
        'storage/object-not-found'
      ) {
        throw error;
      }
    }
  }
}