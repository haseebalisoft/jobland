import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

app.post('/api/send-welcome', async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email, // sends to the email used for login
        subject: 'Welcome to Jobland – Your Interview Journey Starts Here',
        text: `Hi ${name},\n\nWelcome to Jobland.\nYou’ve successfully logged in.\n\nJobland helps you manage interviews, explore job opportunities, and stay connected with recruiters.\n\nNext steps:\n- View interview schedule\n- Explore matched jobs\n- Check recruiter messages\n- Track application progress\n\n— Team Jobland`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Welcome email sent successfully.' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send welcome email.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
