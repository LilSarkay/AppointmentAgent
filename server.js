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
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

app.use('/api/appointments', appointmentRoutes);

app.get('/', (req, res) => {
  res.send('Appointment Scheduler API is running!');
});
