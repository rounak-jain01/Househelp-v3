import {
  initializeApp,
} from "firebase-admin/app";

initializeApp();

export {
  dispatchBookingRequests,
  handleMaidBookingResponse,
  expireBookingRequests,
} from "./assignmentService";

export {
  handleBookingConfirmed,
  cancelCustomerBooking,
  startJobWithOtp,
  completeBooking,
} from "./bookingLifecycleService";

export {
  requestExtraTime,
  respondToExtraTime,
} from "./bookingLifecycleService";