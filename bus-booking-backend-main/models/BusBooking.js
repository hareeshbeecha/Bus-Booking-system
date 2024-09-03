const mongoose = require('mongoose');

const busBookingSchema = new mongoose.Schema({
  _id: {
    type: String, // Set type as String
    required: true // Make it required if necessary
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // Array to store all seat numbers
  seats: {
    type: [{
      number: {
        type: Number,
        required: true
      },
      booked: {
        type: Boolean,
        default: false
      }
    }],
    default: Array.from({ length: 36 }, (_, i) => ({ number: i + 1, booked: false })) // Assuming 36 seats
  }
  // You can add more fields as per your requirements
});

const BusBooking = mongoose.model('BusBooking', busBookingSchema);

module.exports = BusBooking;
