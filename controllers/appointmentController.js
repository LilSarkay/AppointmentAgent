const axios = require('axios');
const { createGoogleEvent } = require('../utils/googleCalendar');

const BASE_URL = 'https://inventorymanagement.fly.dev';

exports.CheckAvailability = async (req, res) => {
  const { service, date_range } = req.body;
  const response = await axios.post(`${BASE_URL}/check`, { service, date_range });
  res.json(response.data);
};

exports.BookSlot = async (req, res) => {
  const { user_info, selected_slot } = req.body;
  const booking = await axios.post(`${BASE_URL}/book`, { user_info, selected_slot });

  const eventLink = await createGoogleEvent(
    `${user_info.name} Appointment`,
    selected_slot.start,
    selected_slot.end,
    user_info.email
  );

  res.json({
    status: 'success',
    booking_id: booking.data.id,
    google_event: eventLink,
  });
};

exports.RescheduleSlot = async (req, res) => {
  const { booking_id, new_slot } = req.body;
  const response = await axios.put(`${BASE_URL}/reschedule/${booking_id}`, { new_slot });
  res.json(response.data);
};

exports.CancelSlot = async (req, res) => {
  const { booking_id } = req.body;
  const response = await axios.delete(`${BASE_URL}/cancel/${booking_id}`);

  res.json({
    status: 'success',
    message: 'Booking cancelled',
    google_event: 'Event was deleted or should be deleted manually if stored',
  });
};
