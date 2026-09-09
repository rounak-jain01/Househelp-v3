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
  gender: string;
  dateOfBirth?: string | null;
  alternatePhoneNumber?: string | null;
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyContactRelation: string;
  serviceCategories: string[];
  serviceArea: string;
  profilePhotoUri: string;
  idDocumentUri: string;
  idDocumentName: string;
  idDocumentType?: string | null;
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

function getFileExtension(uri: string, fallback = 'jpg'): string {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.split('.').pop()?.toLowerCase();

  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) {
    return extension;
  }

  return fallback;
}

async function uploadFile(
  storagePath: string,
  localUri: string,
): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, storagePath);

  await putFile(storageRef, localUri);

  return getDownloadURL(storageRef);
}

async function uploadMaidProfilePhoto(
  maidId: string,
  photoUri: string,
): Promise<string> {
  const extension = getFileExtension(photoUri, 'jpg');

  return uploadFile(
    `maids/${maidId}/profile.${extension}`,
    photoUri,
  );
}

async function uploadMaidIdDocument(
  maidId: string,
  documentUri: string,
  originalName: string,
): Promise<string> {
  const extension =
    getFileExtension(
      originalName || documentUri,
      'pdf',
    );

  return uploadFile(
    `maids/${maidId}/documents/id-proof-${Date.now()}.${extension}`,
    documentUri,
  );
}

export async function getMaidCategories(): Promise<
  MaidServiceCategory[]
> {
  const firestore = getFirestore();
  const categoriesRef = collection(firestore, 'categories');
  const snapshot = await getDocs(categoriesRef);

  return snapshot.docs
    .map((categoryDocument) => {
      const data = categoryDocument.data();

      return {
        id: categoryDocument.id,
        name: String(data.name ?? ''),
        ratePerHour: Number(data.ratePerHour ?? 0),
      };
    })
    .filter(
      (category) =>
        category.name.trim().length > 0 &&
        Number.isFinite(category.ratePerHour) &&
        category.ratePerHour > 0,
    );
}

export async function saveMaidProfile(
  params: SaveMaidProfileParams,
) {
  const user = getCurrentUser();

  const name = params.name.trim();
  const serviceArea = params.serviceArea.trim();
  const alternatePhoneNumber =
    params.alternatePhoneNumber?.replace(/\D/g, '') ?? '';
  const emergencyContactNumber =
    params.emergencyContactNumber.replace(/\D/g, '');

  if (!name) {
    throw new Error('Please enter your name.');
  }

  if (!params.gender) {
    throw new Error('Please select your gender.');
  }

  if (
    !params.emergencyContactName.trim() ||
    emergencyContactNumber.length !== 10 ||
    !params.emergencyContactRelation
  ) {
    throw new Error(
      'Please complete the emergency contact details.',
    );
  }

  if (
    alternatePhoneNumber &&
    alternatePhoneNumber.length !== 10
  ) {
    throw new Error(
      'Please enter a valid 10-digit alternative number.',
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

  if (!params.profilePhotoUri) {
    throw new Error(
      'Please upload your profile photo.',
    );
  }

  if (!params.idDocumentUri) {
    throw new Error(
      'Please upload your identity document.',
    );
  }

  const [photoUrl, idDocumentUrl] = await Promise.all([
    uploadMaidProfilePhoto(
      user.uid,
      params.profilePhotoUri,
    ),
    uploadMaidIdDocument(
      user.uid,
      params.idDocumentUri,
      params.idDocumentName,
    ),
  ]);

  const firestore = getFirestore();
  const maidRef = doc(firestore, 'maids', user.uid);

  await setDoc(
    maidRef,
    {
      maidId: user.uid,
      role: 'maid',
      name,
      phoneNumber: user.phoneNumber ?? '',
      alternatePhoneNumber: alternatePhoneNumber || null,
      gender: params.gender,
      dateOfBirth: params.dateOfBirth?.trim() || null,

      emergencyContact: {
        name: params.emergencyContactName.trim(),
        phoneNumber: emergencyContactNumber,
        relationship: params.emergencyContactRelation,
      },

      photoUrl,
      idDocumentUrl,
      idDocumentName: params.idDocumentName,
      idDocumentType: params.idDocumentType ?? null,

      serviceCategories: params.serviceCategories,
      serviceArea,

      verificationStatus: 'verified',

      isAvailableNow: false,
      availabilitySlots: [],
      availabilityOverride: null,
      lastAssignedAt: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  console.log(
    '[MaidService] Profile saved:',
    user.uid,
  );

  return {
    maidId: user.uid,
    photoUrl,
    idDocumentUrl,
  };
}
