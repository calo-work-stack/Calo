/**
 * Menu Expiration Service
 * Handles automatic deactivation of menus after their period ends
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MenuExpirationService {
  /**
   * Check and deactivate all expired menus
   * Should be called daily by cron job
   */
  static async deactivateExpiredMenus(): Promise<{
    deactivated: number;
    usersCleaned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deactivated = 0;
    let usersCleaned = 0;

    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      console.log(`📅 Checking for expired menus (end_date < ${now.toISOString()})`);

      // Find all active menus where end_date has passed
      const expiredMenus = await prisma.recommendedMenu.findMany({
        where: {
          is_active: true,
          end_date: {
            lt: now,
          },
        },
        select: {
          menu_id: true,
          user_id: true,
          title: true,
          end_date: true,
          days_count: true,
        },
      });

      if (expiredMenus.length === 0) {
        console.log('✅ No expired menus found');
        return { deactivated: 0, usersCleaned: 0, errors: [] };
      }

      console.log(`📋 Found ${expiredMenus.length} expired menus to deactivate`);

      // Process each expired menu
      for (const menu of expiredMenus) {
        try {
          // Deactivate the menu
          await prisma.recommendedMenu.update({
            where: { menu_id: menu.menu_id },
            data: { is_active: false },
          });

          console.log(`✅ Deactivated menu "${menu.title}" (ID: ${menu.menu_id}) for user ${menu.user_id}`);
          deactivated++;

          // Check if user still has this menu as active_menu_id and clear it
          const user = await prisma.user.findUnique({
            where: { user_id: menu.user_id },
            select: { active_menu_id: true },
          });

          if (user?.active_menu_id === menu.menu_id) {
            await prisma.user.update({
              where: { user_id: menu.user_id },
              data: { active_menu_id: null },
            });
            console.log(`🧹 Cleared active_menu_id for user ${menu.user_id}`);
            usersCleaned++;
          }
        } catch (menuError: any) {
          const errorMsg = `Failed to deactivate menu ${menu.menu_id}: ${menuError.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`📊 Menu expiration complete: ${deactivated} deactivated, ${usersCleaned} users cleaned`);

      return { deactivated, usersCleaned, errors };
    } catch (error: any) {
      console.error('❌ Error in deactivateExpiredMenus:', error);
      errors.push(`Fatal error: ${error.message}`);
      return { deactivated, usersCleaned, errors };
    }
  }

  /**
   * Check for menus that are about to expire (within 1 day)
   * Can be used to send reminder notifications
   */
  static async getExpiringMenus(): Promise<
    Array<{
      menu_id: string;
      user_id: string;
      title: string;
      end_date: Date;
      days_remaining: number;
    }>
  > {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const expiringMenus = await prisma.recommendedMenu.findMany({
      where: {
        is_active: true,
        end_date: {
          gte: now,
          lte: tomorrow,
        },
      },
      select: {
        menu_id: true,
        user_id: true,
        title: true,
        end_date: true,
      },
    });

    return expiringMenus.map((menu) => {
      const daysRemaining = Math.ceil(
        (menu.end_date!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        ...menu,
        end_date: menu.end_date!,
        days_remaining: daysRemaining,
      };
    });
  }

  /**
   * Fix menus that are marked active but have no end_date
   * Sets end_date based on start_date + days_count
   */
  static async fixMenusWithoutEndDate(): Promise<number> {
    let fixed = 0;

    const menusWithoutEndDate = await prisma.recommendedMenu.findMany({
      where: {
        is_active: true,
        end_date: null,
        start_date: { not: null },
      },
      select: {
        menu_id: true,
        start_date: true,
        days_count: true,
      },
    });

    for (const menu of menusWithoutEndDate) {
      if (menu.start_date) {
        const endDate = new Date(menu.start_date);
        endDate.setDate(endDate.getDate() + menu.days_count - 1);
        endDate.setHours(23, 59, 59, 999);

        await prisma.recommendedMenu.update({
          where: { menu_id: menu.menu_id },
          data: { end_date: endDate },
        });

        console.log(`🔧 Fixed end_date for menu ${menu.menu_id}: ${endDate.toISOString()}`);
        fixed++;
      }
    }

    return fixed;
  }

  /**
   * Get stats about active menus for monitoring
   */
  static async getMenuStats(): Promise<{
    totalActive: number;
    expiredButActive: number;
    expiringToday: number;
    expiringThisWeek: number;
  }> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const [totalActive, expiredButActive, expiringToday, expiringThisWeek] =
      await Promise.all([
        prisma.recommendedMenu.count({
          where: { is_active: true },
        }),
        prisma.recommendedMenu.count({
          where: {
            is_active: true,
            end_date: { lt: now },
          },
        }),
        prisma.recommendedMenu.count({
          where: {
            is_active: true,
            end_date: {
              gte: now,
              lte: endOfToday,
            },
          },
        }),
        prisma.recommendedMenu.count({
          where: {
            is_active: true,
            end_date: {
              gte: now,
              lte: endOfWeek,
            },
          },
        }),
      ]);

    return {
      totalActive,
      expiredButActive,
      expiringToday,
      expiringThisWeek,
    };
  }
}

export default MenuExpirationService;
