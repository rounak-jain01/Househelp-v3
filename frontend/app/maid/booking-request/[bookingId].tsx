import React from 'react';
import {
  useLocalSearchParams,
} from 'expo-router';

import MaidBookingRequestScreen from '../../../src/features/maid/MaidBookingRequestScreen';

export default function MaidBookingRequestRoute() {
  const {
    bookingId,
  } =
    useLocalSearchParams<{
      bookingId?: string;
    }>();

  if (!bookingId) {
    return null;
  }

  return (
    <MaidBookingRequestScreen
      bookingId={bookingId}
    />
  );
}