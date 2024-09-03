// models/Booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
  },
  seats: {
    type: [Number],
    required: true,
  },
  // Add any other fields you need for the booking
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
