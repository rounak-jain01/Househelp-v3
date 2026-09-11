import {
  initializeApp,
} from 'firebase-admin/app';

initializeApp();

export {
  createBooking,
} from './bookingCreationService';

export {
  dispatchBookingRequests,
  handleMaidBookingResponse,
  expireBookingRequests,
} from './assignmentService';

export {
  handleBookingConfirmed,
  cancelCustomerBooking,
  startJobWithOtp,
  completeBooking,
} from './bookingLifecycleService';

export {
  requestExtraTime,
  respondToExtraTime,
} from './bookingLifecycleService';
