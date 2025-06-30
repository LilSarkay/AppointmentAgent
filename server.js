const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const appointmentRoutes = require('./routes/appointmentRoutes');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  // Start server only after successful DB connection
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1); // Exit process if DB connection fails
});

// Routes
app.use('/api/appointments', appointmentRoutes);

// Root route for Railway
app.get('/', (req, res) => {
  res.send('Appointment Scheduler API is running!');
});
 