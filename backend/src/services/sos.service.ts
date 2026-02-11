import SOSEvent from '../models/SOSEvent';
import Booking from '../models/Booking';
import User from '../models/User';
import { emailService } from './email.service';
import { notificationService } from './notification.service';
import { generateUserId } from '../utils/helpers';
import logger from '../utils/logger';

// Dev mode: send SOS emails to this address
// In production, replace with police/emergency API
const SOS_EMAIL_TARGET = 'n210438@rguktn.ac.in';

interface SOSTriggerData {
  userId: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  bookingId?: string;
}

class SOSService {
  /**
   * Trigger an SOS emergency alert
   */
  async triggerSOS(data: SOSTriggerData): Promise<{
    sosId: string;
    emailSent: boolean;
    message: string;
  }> {
    try {
      // 1. Fetch user profile
      const user = await User.findOne({ userId: data.userId });
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Fetch booking details ONLY if bookingId is explicitly provided (user is in a trip)
      let booking = null;
      if (data.bookingId) {
        booking = await Booking.findOne({ bookingId: data.bookingId });
      }

      // 3. Get driver location from tracking if booking exists
      let driverLocation = null;
      if (booking?.driver?.userId) {
        try {
          const TripLocation = (await import('../models/TripLocation')).default;
          const latestLoc = await TripLocation.findOne({
            bookingId: booking.bookingId,
          }).sort({ timestamp: -1 });
          if (latestLoc) {
            const loc = (latestLoc as any).location || latestLoc;
            driverLocation = { lat: loc.lat, lng: loc.lng };
          }
        } catch {
          // TripLocation may not have data, skip
        }
      }

      // 4. Build HTML email
      const htmlEmail = this.buildSOSEmail({
        passenger: {
          name: user.name || 'Unknown',
          phone: user.phone || 'N/A',
          userId: user.userId,
        },
        passengerLocation: data.location,
        booking: booking
          ? {
              bookingId: booking.bookingId,
              bookingNumber: booking.bookingNumber,
              status: booking.status,
              serviceType: booking.serviceType,
              tripStartedAt: booking.tripStartedAt,
              route: booking.route,
              driver: booking.driver,
              vehicle: booking.vehicle,
              amount: booking.totalAmount,
            }
          : null,
        driverLocation,
        timestamp: new Date(),
      });

      // 5. Send email
      const emailResult = await emailService.sendEmail({
        to: SOS_EMAIL_TARGET,
        subject: `🚨 EMERGENCY SOS ALERT - ${user.name || user.userId} needs help!`,
        html: htmlEmail,
      });

      // 6. Save SOS event
      const sosId = generateUserId('SOS');
      await SOSEvent.create({
        sosId,
        userId: data.userId,
        bookingId: booking?.bookingId,
        passengerLocation: data.location,
        driverLocation,
        status: 'triggered',
        notifiedEmails: [SOS_EMAIL_TARGET],
      });

      // 7. Create in-app notification for the user
      await notificationService.createNotification({
        userId: data.userId,
        type: 'sos_alert',
        title: 'SOS Alert Sent',
        message: 'Your emergency alert has been sent successfully. Help is on the way.',
        data: { sosId, bookingId: booking?.bookingId },
      });

      // 8. If there's a driver, notify them too
      if (booking?.driver?.userId) {
        await notificationService.createNotification({
          userId: booking.driver.userId,
          type: 'sos_alert',
          title: 'Passenger Emergency',
          message: `Passenger ${user.name || ''} has triggered an SOS alert during your trip.`,
          data: { sosId, bookingId: booking.bookingId },
        });
      }

      logger.info(`SOS alert triggered: ${sosId} by user: ${data.userId}`);

      return {
        sosId,
        emailSent: emailResult.success,
        message: emailResult.success
          ? 'SOS alert sent successfully. Emergency contacts have been notified.'
          : 'SOS alert recorded but email delivery failed. Please call emergency services directly.',
      };
    } catch (error: any) {
      logger.error('Error triggering SOS:', error);
      throw error;
    }
  }

  /**
   * Get SOS history for a user
   */
  async getHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ events: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const total = await SOSEvent.countDocuments({ userId });
    const events = await SOSEvent.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      events: events.map((e) => e.toJSON()),
      total,
      page,
      limit,
    };
  }

  /**
   * Build rich HTML email for SOS alert
   */
  private buildSOSEmail(data: {
    passenger: { name: string; phone: string; userId: string };
    passengerLocation: { lat: number; lng: number; address?: string };
    booking: any;
    driverLocation: { lat: number; lng: number } | null;
    timestamp: Date;
  }): string {
    const { passenger, passengerLocation, booking, driverLocation, timestamp } = data;

    const passengerMapLink = `https://www.google.com/maps?q=${passengerLocation.lat},${passengerLocation.lng}`;
    const driverMapLink = driverLocation
      ? `https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`
      : null;

    const formatTime = (date: Date | string | undefined) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };

    // Build booking section
    let bookingSection = '';
    if (booking) {
      bookingSection = `
        <!-- Driver Details -->
        <div style="background: #FFF3E0; border: 1px solid #FF9800; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #E65100; margin: 0 0 15px 0; font-size: 16px;">🚗 Driver & Vehicle Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555; width: 140px;">Driver Name:</td>
              <td style="padding: 6px 12px; color: #333; font-size: 16px; font-weight: bold;">${booking.driver?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Driver Phone:</td>
              <td style="padding: 6px 12px; color: #333; font-size: 16px; font-weight: bold;">${booking.driver?.phone || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Driver ID:</td>
              <td style="padding: 6px 12px; color: #333;">${booking.driver?.userId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Vehicle Type:</td>
              <td style="padding: 6px 12px; color: #333;">${booking.vehicle?.type?.toUpperCase() || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Vehicle Brand:</td>
              <td style="padding: 6px 12px; color: #333;">${booking.vehicle?.brand || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">License Plate:</td>
              <td style="padding: 6px 12px; color: #D32F2F; font-size: 18px; font-weight: bold; letter-spacing: 2px;">${booking.vehicle?.number || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <!-- Route Details -->
        <div style="background: #E8F5E9; border: 1px solid #4CAF50; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #2E7D32; margin: 0 0 15px 0; font-size: 16px;">📍 Route Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555; width: 140px;">Pickup:</td>
              <td style="padding: 6px 12px; color: #333;">${booking.route?.from?.address || 'N/A'}
                ${booking.route?.from?.lat ? `<br/><a href="https://www.google.com/maps?q=${booking.route.from.lat},${booking.route.from.lng}" style="color: #1976D2; font-size: 12px;">View on Map →</a>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Drop:</td>
              <td style="padding: 6px 12px; color: #333;">${booking.route?.to?.address || 'N/A'}
                ${booking.route?.to?.lat ? `<br/><a href="https://www.google.com/maps?q=${booking.route.to.lat},${booking.route.to.lng}" style="color: #1976D2; font-size: 12px;">View on Map →</a>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Distance:</td>
              <td style="padding: 6px 12px; color: #333;">${booking.route?.distance ? booking.route.distance + ' km' : 'N/A'}</td>
            </tr>
          </table>
        </div>

        <!-- Booking Details -->
        <div style="background: #E3F2FD; border: 1px solid #2196F3; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #1565C0; margin: 0 0 15px 0; font-size: 16px;">📋 Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555; width: 140px;">Booking #:</td>
              <td style="padding: 6px 12px; color: #333; font-weight: bold;">${booking.bookingNumber || booking.bookingId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Status:</td>
              <td style="padding: 6px 12px; color: #333; text-transform: uppercase;">${booking.status || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Service Type:</td>
              <td style="padding: 6px 12px; color: #333; text-transform: uppercase;">${booking.serviceType || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Trip Started:</td>
              <td style="padding: 6px 12px; color: #333;">${formatTime(booking.tripStartedAt)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; font-weight: bold; color: #555;">Fare Amount:</td>
              <td style="padding: 6px 12px; color: #333;">₹${booking.amount || 0}</td>
            </tr>
          </table>
        </div>

        ${driverMapLink ? `
        <!-- Driver Location -->
        <div style="background: #FCE4EC; border: 1px solid #E91E63; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #AD1457; margin: 0 0 10px 0; font-size: 16px;">📡 Driver's Last Known Location</h3>
          <p style="margin: 0;">
            Coordinates: ${driverLocation!.lat.toFixed(6)}, ${driverLocation!.lng.toFixed(6)}<br/>
            <a href="${driverMapLink}" style="color: #1976D2; font-weight: bold; font-size: 14px;">📍 View Driver Location on Google Maps →</a>
          </p>
        </div>
        ` : ''}
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SOS Emergency Alert - FORLOK</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 0; background: #F5F5F5;">
          <!-- RED EMERGENCY HEADER -->
          <div style="background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%); padding: 30px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 32px; letter-spacing: 3px;">🚨 EMERGENCY SOS ALERT 🚨</h1>
            <p style="color: #FFCDD2; margin: 10px 0 0; font-size: 14px;">
              Triggered at ${formatTime(timestamp)} IST
            </p>
          </div>

          <div style="background: #FFFFFF; padding: 30px; border: 1px solid #E0E0E0;">
            <!-- Passenger Details -->
            <div style="background: #FFEBEE; border: 2px solid #D32F2F; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="color: #D32F2F; margin: 0 0 15px 0; font-size: 16px;">👤 Passenger in Distress</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 12px; font-weight: bold; color: #555; width: 140px;">Name:</td>
                  <td style="padding: 6px 12px; color: #333; font-size: 18px; font-weight: bold;">${passenger.name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-weight: bold; color: #555;">Phone:</td>
                  <td style="padding: 6px 12px; color: #333; font-size: 18px; font-weight: bold;">${passenger.phone}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-weight: bold; color: #555;">User ID:</td>
                  <td style="padding: 6px 12px; color: #333;">${passenger.userId}</td>
                </tr>
              </table>
            </div>

            <!-- CURRENT LOCATION - Most Important -->
            <div style="background: #D32F2F; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
              <h3 style="color: #FFFFFF; margin: 0 0 10px 0; font-size: 18px;">📍 PASSENGER'S CURRENT LOCATION</h3>
              <p style="color: #FFCDD2; margin: 0 0 5px; font-size: 13px;">
                Lat: ${passengerLocation.lat.toFixed(6)}, Lng: ${passengerLocation.lng.toFixed(6)}
              </p>
              ${passengerLocation.address ? `<p style="color: #FFFFFF; margin: 0 0 10px; font-size: 14px;">${passengerLocation.address}</p>` : ''}
              <a href="${passengerMapLink}" style="display: inline-block; background: #FFFFFF; color: #D32F2F; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
                🗺️ OPEN IN GOOGLE MAPS
              </a>
            </div>

            ${bookingSection}

            ${!booking ? `
            <!-- No Active Trip -->
            <div style="background: #FFF3E0; border: 1px solid #FF9800; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="color: #E65100; margin: 0 0 10px 0; font-size: 16px;">ℹ️ No Active Trip</h3>
              <p style="margin: 0; color: #555;">The passenger triggered SOS without an active booking. Only their current location is available.</p>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #757575; font-size: 12px; background: #EEEEEE;">
            <p style="margin: 0 0 5px;">This is an automated SOS alert from the <strong>FORLOK</strong> ride-sharing app.</p>
            <p style="margin: 0 0 5px;">Please respond to this emergency immediately.</p>
            <p style="margin: 0; color: #999;">&copy; ${new Date().getFullYear()} FORLOK. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }
}

export const sosService = new SOSService();
export default sosService;
