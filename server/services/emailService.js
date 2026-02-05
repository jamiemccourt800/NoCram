const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // For development, we'll use Ethereal (a fake SMTP service)
  // In production, replace with actual SMTP credentials (Gmail, SendGrid, etc.)
  
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development mode - use console logging instead of actual emails
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }
};

const sendReminderEmail = async (to, subject, assignment) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@nocram.app',
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0d6efd; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .assignment { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0d6efd; }
            .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 NoCram Reminder</h1>
            </div>
            <div class="content">
              <h2>Upcoming Deadline Alert</h2>
              <div class="assignment">
                <h3>${assignment.title}</h3>
                <p><strong>Module:</strong> ${assignment.module_name}</p>
                <p><strong>Due Date:</strong> ${new Date(assignment.due_date).toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                ${assignment.description ? `<p><strong>Description:</strong> ${assignment.description}</p>` : ''}
                <p><strong>Priority:</strong> ${assignment.priority}</p>
              </div>
              <p>Don't forget to complete this assignment on time!</p>
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" class="button">View Dashboard</a>
            </div>
            <div class="footer">
              <p>You're receiving this email because you have email reminders enabled in NoCram.</p>
              <p>To change your notification preferences, visit your account settings.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email Preview (Development Mode):');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Assignment:', assignment.title);
      console.log('Message ID:', info.messageId);
    } else {
      console.log('✅ Email sent:', info.messageId);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendReminderEmail,
};
