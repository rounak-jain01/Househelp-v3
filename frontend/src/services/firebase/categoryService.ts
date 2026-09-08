import {
  collection,
  getDocs,
  getFirestore,
} from '@react-native-firebase/firestore';

export type ServiceCategory = {
  id: string;
  name: string;
  ratePerHour: number;
  isActive: boolean;
};

export async function getActiveCategories(): Promise<
  ServiceCategory[]
> {
  const firestore = getFirestore();

  const snapshot = await getDocs(
    collection(firestore, 'categories'),
  );

  const categories = snapshot.docs
    .map((categoryDocument) => {
      const data = categoryDocument.data();

      return {
        id: categoryDocument.id,
        name: String(data.name ?? ''),
        ratePerHour: Number(data.ratePerHour ?? 0),
        isActive: data.isActive === true,
      };
    })
    .filter(
      (category) =>
        category.isActive &&
        category.name.length > 0 &&
        Number.isFinite(category.ratePerHour) &&
        category.ratePerHour > 0,
    );

  return categories;
}