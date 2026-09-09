import { useLocalSearchParams } from "expo-router";
import MaidActiveBookingScreen from "../../../src/features/maid/MaidActiveBookingScreen";


export default function MaidBookingRoute() {
  const { bookingId } =
    useLocalSearchParams<{
      bookingId?: string | string[];
    }>();

  const normalizedBookingId = Array.isArray(bookingId)
    ? bookingId[0]
    : bookingId;

  if (!normalizedBookingId) {
    return null;
  }

  return (
    <MaidActiveBookingScreen
      bookingId={normalizedBookingId}
    />
  );
}