/**
 * Notifications Routes
 * Handles device registration, preferences, and notification history
 */

import express, { Response } from 'express';
import { PrismaClient, Platform, NotificationType } from '@prisma/client';
import { PushNotificationService } from '../services/pushNotificationService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /notifications/register-device
 * Register a device for push notifications
 */
router.post('/register-device', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const { token, platform, deviceName, appVersion } = req.body;

    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Token and platform are required',
      });
    }

    // Validate platform
    const validPlatforms: Platform[] = ['IOS', 'ANDROID'];
    const normalizedPlatform = platform.toUpperCase() as Platform;

    if (!validPlatforms.includes(normalizedPlatform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be IOS or ANDROID',
      });
    }

    const success = await PushNotificationService.registerDevice(
      userId,
      token,
      normalizedPlatform,
      deviceName,
      appVersion
    );

    if (success) {
      console.log(`✅ Device registered for user ${userId}`);
      return res.json({
        success: true,
        message: 'Device registered successfully',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to register device',
      });
    }
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /notifications/unregister-device
 * Unregister a device from push notifications
 */
router.post('/unregister-device', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const success = await PushNotificationService.unregisterDevice(token);

    return res.json({
      success,
      message: success ? 'Device unregistered successfully' : 'Device not found',
    });
  } catch (error) {
    console.error('Error unregistering device:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const preferences = await PushNotificationService.getPreferences(userId);

    return res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PUT /notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const updates = req.body;

    // Validate time formats
    const timeFields = [
      'quiet_hours_start',
      'quiet_hours_end',
      'breakfast_reminder_time',
      'lunch_reminder_time',
      'dinner_reminder_time',
      'snack_reminder_time',
    ];

    for (const field of timeFields) {
      if (updates[field] && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(updates[field])) {
        return res.status(400).json({
          success: false,
          error: `Invalid time format for ${field}. Use HH:MM format`,
        });
      }
    }

    // Validate water reminder interval
    if (updates.water_reminder_interval !== undefined) {
      const interval = Number(updates.water_reminder_interval);
      if (isNaN(interval) || interval < 30 || interval > 480) {
        return res.status(400).json({
          success: false,
          error: 'Water reminder interval must be between 30 and 480 minutes',
        });
      }
      updates.water_reminder_interval = interval;
    }

    const preferences = await PushNotificationService.updatePreferences(userId, updates);

    return res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /notifications/history
 * Get user's notification history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const { limit = '50', offset = '0', type, unreadOnly } = req.query;

    const history = await PushNotificationService.getHistory(userId, {
      limit: Math.min(Number(limit), 100),
      offset: Number(offset),
      type: type as NotificationType | undefined,
      unreadOnly: unreadOnly === 'true',
    });

    return res.json({
      success: true,
      history,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: history.length === Number(limit),
      },
    });
  } catch (error) {
    console.error('Error getting history:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const count = await PushNotificationService.getUnreadCount(userId);

    return res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /notifications/:id/read
 * Mark a notification as read
 */
router.post('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = await PushNotificationService.markAsRead(id);

    return res.json({
      success,
      message: success ? 'Notification marked as read' : 'Notification not found',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const count = await PushNotificationService.markAllAsRead(userId);

    return res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count,
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /notifications/devices
 * Get user's registered devices
 */
router.get('/devices', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;

    const devices = await prisma.deviceToken.findMany({
      where: {
        user_id: userId,
        is_active: true,
      },
      select: {
        id: true,
        platform: true,
        device_name: true,
        app_version: true,
        last_used_at: true,
        created_at: true,
      },
      orderBy: {
        last_used_at: 'desc',
      },
    });

    return res.json({
      success: true,
      devices,
    });
  } catch (error) {
    console.error('Error getting devices:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /notifications/devices/:id
 * Remove a registered device
 */
router.delete('/devices/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const { id } = req.params;

    // Verify the device belongs to the user
    const device = await prisma.deviceToken.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    await prisma.deviceToken.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Device removed successfully',
    });
  } catch (error) {
    console.error('Error removing device:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /notifications/test
 * Send a test notification (for debugging)
 */
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const { title, body } = req.body;

    const success = await PushNotificationService.sendToUser(
      userId,
      {
        title: title || '🔔 Test Notification',
        body: body || 'This is a test notification from Calo!',
        data: {
          test: 'true',
        },
      },
      'SYSTEM'
    );

    return res.json({
      success,
      message: success
        ? 'Test notification sent successfully'
        : 'Failed to send test notification. Check if you have registered devices.',
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
