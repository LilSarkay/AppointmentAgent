const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const appointmentRoutes = require('./routes/appointmentRoutes');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

// Routes
app.use('/api/appointments', appointmentRoutes);

// Root route for Railway to stop throwing 404
app.get('/', (req, res) => {
  res.send('Appointment Scheduler API is running!');
});

// Start the server (this is what Railway looks for)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
