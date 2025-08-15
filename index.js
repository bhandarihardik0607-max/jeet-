// A simple Express server to be used as a serverless function.
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const app = express();
const router = express.Router();

// Middleware to parse JSON bodies and enable CORS
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// WhatsApp API configuration
const whatsappApiUrl = process.env.WHATSAPP_API_URL;
const whatsappApiToken = process.env.WHATSAPP_API_TOKEN;

// Helper function for a generic API response
const sendResponse = (res, success, message, data = null) => {
    res.status(success ? 200 : 400).json({ success, message, data });
};

// --- API Endpoints ---

// Endpoint to fetch all students
router.get('/students', async (req, res) => {
    try {
        const { data: students, error } = await supabase
            .from('students')
            .select('*');

        if (error) {
            console.error('Supabase fetch students error:', error);
            return sendResponse(res, false, 'Failed to fetch students.');
        }

        sendResponse(res, true, 'Students fetched successfully.', students);
    } catch (error) {
        console.error('API /students error:', error);
        sendResponse(res, false, 'Internal server error.');
    }
});

// Endpoint to add a new student
router.post('/student', async (req, res) => {
    const { name, roll, parentPhone, section, key, fees, performance } = req.body;
    try {
        const { data, error } = await supabase
            .from('students')
            .insert([{ name, roll, parent_phone: parentPhone, section, key, fees, performance }]);

        if (error) {
            console.error('Supabase add student error:', error);
            return sendResponse(res, false, 'Failed to add student.');
        }

        sendResponse(res, true, 'Student added successfully.', data);
    } catch (error) {
        console.error('API /student POST error:', error);
        sendResponse(res, false, 'Internal server error.');
    }
});

// Endpoint to update student details
router.put('/student/:roll', async (req, res) => {
    const { roll } = req.params;
    const { name, parentPhone, performance } = req.body;
    try {
        const { data, error } = await supabase
            .from('students')
            .update({ name, parent_phone: parentPhone, performance })
            .eq('roll', roll);

        if (error) {
            console.error('Supabase update student error:', error);
            return sendResponse(res, false, 'Failed to update student details.');
        }

        sendResponse(res, true, 'Student details updated successfully.', data);
    } catch (error) {
        console.error('API /student PUT error:', error);
        sendResponse(res, false, 'Internal server error.');
    }
});

// Endpoint to delete a student
router.delete('/student/:roll', async (req, res) => {
    const { roll } = req.params;
    try {
        const { data, error } = await supabase
            .from('students')
            .delete()
            .eq('roll', roll);

        if (error) {
            console.error('Supabase delete student error:', error);
            return sendResponse(res, false, 'Failed to delete student.');
        }

        sendResponse(res, true, 'Student deleted successfully.', data);
    } catch (error) {
        console.error('API /student DELETE error:', error);
        sendResponse(res, false, 'Internal server error.');
    }
});

// Endpoint to send a single WhatsApp message
router.post('/whatsapp/send', async (req, res) => {
    const { to, message } = req.body;
    try {
        const response = await axios.post(whatsappApiUrl, {
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: {
                body: message
            }
        }, {
            headers: {
                'Authorization': `Bearer ${whatsappApiToken}`,
                'Content-Type': 'application/json'
            }
        });

        sendResponse(res, true, 'WhatsApp message sent successfully.', response.data);
    } catch (error) {
        console.error('WhatsApp send error:', error.response ? error.response.data : error.message);
        sendResponse(res, false, 'Failed to send WhatsApp message.', error.response ? error.response.data : error.message);
    }
});

// Endpoint to send bulk WhatsApp messages
router.post('/whatsapp/bulk-send', async (req, res) => {
    const { numbers, message } = req.body;
    let successfulSends = 0;
    let failedSends = 0;

    for (const number of numbers) {
        try {
            await axios.post(whatsappApiUrl, {
                messaging_product: "whatsapp",
                to: number,
                type: "text",
                text: {
                    body: message
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${whatsappApiToken}`,
                    'Content-Type': 'application/json'
                }
            });
            successfulSends++;
        } catch (error) {
            console.error(`Failed to send message to ${number}:`, error.response ? error.response.data : error.message);
            failedSends++;
        }
    }

    sendResponse(res, true, `Bulk messages sent. Successful: ${successfulSends}, Failed: ${failedSends}.`);
});

app.use('/api', router);

// Export the app for use with serverless functions (e.g., Vercel)
module.exports = app;
