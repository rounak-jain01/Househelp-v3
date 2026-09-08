import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  putFile,
  ref,
} from '@react-native-firebase/storage';

export type MaidServiceCategory = {
  id: string;
  name: string;
  ratePerHour: number;
};

export type SaveMaidProfileParams = {
  name: string;
  serviceCategories: string[];
  serviceArea: string;
  profilePhotoUri?: string | null;
};

function getCurrentUser() {
  const user = getAuth().currentUser;

  if (!user) {
    throw new Error(
      'Your session has expired. Please login again.',
    );
  }

  return user;
}

function getImageExtension(uri: string): string {
  const cleanUri = uri.split('?')[0];

  const extension = cleanUri
    .split('.')
    .pop()
    ?.toLowerCase();

  if (
    extension === 'jpg' ||
    extension === 'jpeg' ||
    extension === 'png' ||
    extension === 'webp'
  ) {
    return extension;
  }

  return 'jpg';
}

async function uploadMaidProfilePhoto(
  maidId: string,
  photoUri: string,
): Promise<string> {
  const storage = getStorage();

  const extension =
    getImageExtension(photoUri);

  const storagePath =
    `maids/${maidId}/profile.${extension}`;

  const storageRef = ref(
    storage,
    storagePath,
  );

  await putFile(
    storageRef,
    photoUri,
  );

  return getDownloadURL(
    storageRef,
  );
}

export async function getMaidCategories(): Promise<
  MaidServiceCategory[]
> {
  const firestore = getFirestore();

  const categoriesRef = collection(
    firestore,
    'categories',
  );

  const snapshot = await getDocs(
    categoriesRef,
  );

  return snapshot.docs
    .map((categoryDocument) => {
      const data = categoryDocument.data();

      return {
        id: categoryDocument.id,
        name: String(data.name ?? ''),
        ratePerHour: Number(
          data.ratePerHour ?? 0,
        ),
      };
    })
    .filter(
      (category) =>
        category.name.trim().length > 0 &&
        Number.isFinite(
          category.ratePerHour,
        ) &&
        category.ratePerHour > 0,
    );
}

export async function saveMaidProfile(
  params: SaveMaidProfileParams,
) {
  const user = getCurrentUser();

  const name = params.name.trim();
  const serviceArea =
    params.serviceArea.trim();

  if (!name) {
    throw new Error(
      'Please enter your name.',
    );
  }

  if (
    !params.serviceCategories ||
    params.serviceCategories.length === 0
  ) {
    throw new Error(
      'Please select at least one service.',
    );
  }

  if (!serviceArea) {
    throw new Error(
      'Please enter your service area.',
    );
  }

  let photoUrl: string | null = null;

  if (params.profilePhotoUri) {
    photoUrl =
      await uploadMaidProfilePhoto(
        user.uid,
        params.profilePhotoUri,
      );
  }

  const firestore = getFirestore();

  const maidRef = doc(
    firestore,
    'maids',
    user.uid,
  );

  await setDoc(maidRef, {
    maidId: user.uid,

    role: 'maid',

    name,

    phoneNumber:
      user.phoneNumber ?? '',

    photoUrl,

    serviceCategories:
      params.serviceCategories,

    serviceArea,

    // Temporary development setting.
    // Verification flow will be added later.
    verificationStatus:
      'verified',

    isAvailableNow: false,

    availabilitySlots: [],

    availabilityOverride: null,

    lastAssignedAt: null,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  });

  console.log(
    '[MaidService] Profile saved:',
    user.uid,
  );

  return {
    maidId: user.uid,
    photoUrl,
  };
}