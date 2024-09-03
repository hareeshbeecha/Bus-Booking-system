// server.js
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const BusBooking = require("./models/BusBooking");
const Booking = require("./models/Booking");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const stripe = require("stripe")(
  "sk_test_51N2Z2dSA6f1HGrBbMIIlHhyckM5yX2PjxSvZsPPw5rKTrB7hGhGqp5m0kQgg1GDbvuaORa6CKw4P91tBew5GPEUm002ZT9xRPK"
);

app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/BusReservationSystem", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

// Define API endpoint to fetch bus bookings
app.get("/bus-bookings", async (req, res) => {
  try {
    const { from, to, date } = req.query;
    let query = { from, to };
    if (date) {
      query.date = date;
      const bookings = await BusBooking.find(query);
      console.log("Bus bookings fetched successfully:");
      res.json(bookings);
    } else {
      res.status(400).json({ error: "Date is required" });
    }
  } catch (error) {
    console.error("Error fetching bus bookings:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Route to add a new bus booking
app.post("/bus-bookings/add-booking", async (req, res) => {
  try {
    const { from, to, date } = req.body;

    // Create a new bus booking
    const busBooking = new BusBooking({ from, to, date });
    const savedBusBooking = await busBooking.save();

    // Create a new booking
    const bookingId = uuidv4(); // Generate booking ID
    const booking = new Booking({
      bookingId,
      busBookingId: savedBusBooking._id, // Save the bus booking ID
      seats: req.body.selectedSeats,
      // Add any other fields you need for the booking
    });
    const savedBooking = await booking.save();

    console.log("Booking created successfully:", savedBooking);
    res.json(savedBooking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/bus-bookings/book-seats", async (req, res) => {
  try {
    const { from, to, date, selectedSeats } = req.body;

    // Find the booking by from, to, and date
    const booking = await BusBooking.findOne({ from, to, date });
    // Check if the booking exists
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if the selected seats are available
    const availableSeats = booking.seats.filter((seat) => !seat.booked);
    const invalidSeats = selectedSeats.filter(
      (seat) =>
        !availableSeats.some((availableSeat) => availableSeat.number === seat)
    );

    if (invalidSeats.length > 0) {
      return res
        .status(400)
        .json({ error: "One or more selected seats are not available" });
    }

    // Update the booking with the selected seats marked as booked
    selectedSeats.forEach((seat) => {
      const index = booking.seats.findIndex((s) => s.number === seat);
      booking.seats[index].booked = true;
    });

    // Save the updated booking
    const result = await booking.updateOne({ seats: booking.seats });

    console.log("Seats booked successfully:");
    res.json(result);
  } catch (error) {
    console.error("Error booking seats:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  const { seats, bookingId } = req.body;
  const quantity = seats.length;
  console.log(req.body);
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // price_data: {
        //   currency: "inr",
        //   product_data: {
        //     name: "Bus Ticket",
        //   },
        //   unit_amount: 7500,
        // },
        price: "price_1P4oWXSA6f1HGrBb9qG9y1Y2",
        quantity: quantity,
      },
    ],
    mode: "payment",
    success_url: "http://localhost:3000/success",
    cancel_url: "http://localhost:3000/cancel",
    metadata: {
      bookingId: bookingId, // Pass booking ID as metadata
      to_station: req.body.to_station,
      from_station: req.body.from_station,
      date: req.body.date,
      seats: seats.join(","),
      user_name: req.body.user_name,
    },
  });
  res.json({ url: session.url, id: session.id });
});

// Success URL route
app.get("/success", async (req, res) => {
  const { session_id } = req.query;
  const session = await stripe.checkout.sessions.retrieve(session_id);
  const bookingId = session.metadata.bookingId;

  // Update booking status based on payment status
  if (session.payment_status === "paid") {
    // Payment successful
    // Update booking status to 'paid' in database

    const newBooking = new Booking({
      bookingId: bookingId,
      from_station: session.metadata.from_station,
      to_station: session.metadata.to_station,
      date: session.metadata.date,
      seats: session.metadata.seats.split(","),
      user_name: session.metadata.user_name,
    });

    //add the booking details to the database

    res.send(session.metadata);
  } else {
    // Payment failed or canceled
    // Update booking status to 'canceled' in database
    res.send("Payment failed or canceled");
  }

  // Redirect user or display appropriate message
});

// Cancel URL route
app.get("/cancel", (req, res) => {
  // Handle canceled payment
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
