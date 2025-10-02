/**
 * Sending utilities for Slack and SendGrid
 */

import sgMail from '@sendgrid/mail';
import axios from 'axios';
import { SlackMessage } from './message';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send Slack notification with retries
 */
export async function sendSlackNotification(
  message: SlackMessage,
  retries = 3
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not configured');
    return false;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.post(webhookUrl, message, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        return true;
      }
    } catch (error: any) {
      console.error(
        `Slack notification attempt ${attempt + 1} failed:`,
        error.message
      );

      if (attempt === retries - 1) {
        console.error('Slack notification failed after retries. Payload:', JSON.stringify(message, null, 2));
        return false;
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return false;
}

/**
 * Send simple text message to Slack
 */
export async function sendSlackText(text: string): Promise<boolean> {
  return sendSlackNotification({
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text,
        },
      },
    ],
  });
}

/**
 * Send email via SendGrid with retries
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  retries = 3
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not configured');
    return false;
  }

  const fromName = process.env.SEND_FROM_NAME || 'Dealops';
  const fromEmail = process.env.SEND_FROM_EMAIL || 'outbound@dealops.example';

  const msg = {
    to,
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'), // Simple HTML conversion
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await sgMail.send(msg);
      console.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      console.error(
        `SendGrid attempt ${attempt + 1} failed:`,
        error.response?.body || error.message
      );

      if (attempt === retries - 1) {
        console.error('Email send failed after retries');
        return false;
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return false;
}

/**
 * Send test email (useful for debugging)
 * Uses a placeholder recipient
 */
export async function sendTestEmail(
  subject: string,
  body: string
): Promise<boolean> {
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  console.log(`Sending test email to ${testEmail}`);
  return sendEmail(testEmail, subject, body);
}

