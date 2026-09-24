import { storageService } from '../services/storageService';
import { UserActivityLog, ActivityActionCategory, UserRole } from '../types';

interface RecordActivityOptions {
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  userEmail?: string;
  actionCategory: ActivityActionCategory;
  actionTitle: string;
  actionDescription: string;
  targetEntity?: string;
  clientId?: string;
  clientName?: string;
  blockCode?: string;
  customCoordinates?: {
    lat: number;
    lng: number;
    accuracy?: number;
    locationName?: string;
  };
}

/**
 * Helper to record user activity with real GPS hardware query or smart estate location fallback
 */
export async function recordUserActivity(options: RecordActivityOptions): Promise<UserActivityLog> {
  let lat = -0.51234;
  let lng = 101.45678;
  let accuracy = 3.5;
  let locationName = options.userRole === 'director' ? 'Kantor Direksi Pekanbaru (Riau)' : 'Estate Operasional Siak (Riau)';

  if (options.blockCode) {
    locationName = `Blok ${options.blockCode} (Riau)`;
  }

  // 1. If explicit coordinates provided (e.g. from camera GPS watermark)
  if (options.customCoordinates) {
    lat = options.customCoordinates.lat;
    lng = options.customCoordinates.lng;
    if (options.customCoordinates.accuracy) accuracy = options.customCoordinates.accuracy;
    if (options.customCoordinates.locationName) locationName = options.customCoordinates.locationName;
  } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    // 2. Try to query real browser GPS with a quick timeout (1.5s)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 1500,
          maximumAge: 60000,
        });
      });
      lat = Number(pos.coords.latitude.toFixed(5));
      lng = Number(pos.coords.longitude.toFixed(5));
      accuracy = Number((pos.coords.accuracy || 4.0).toFixed(1));
      locationName = `${options.blockCode ? `Blok ${options.blockCode}, ` : ''}Geotag GPS Akurat (±${accuracy}m)`;
    } catch {
      // If GPS permission denied / timeout / offline, use role & client fallback
      if (options.userRole === 'director') {
        lat = 0.50707;
        lng = 101.44778;
        locationName = 'Kantor Direksi Pekanbaru (Riau)';
      } else if (options.clientName?.includes('PT. B')) {
        lat = 0.12345;
        lng = 102.12345;
        locationName = 'Estate Pelalawan (Riau)';
      } else if (options.clientName?.includes('PT. C')) {
        lat = 0.33451;
        lng = 101.02143;
        locationName = 'Estate Kampar (Riau)';
      } else {
        lat = -0.51234;
        lng = 101.45678;
        locationName = 'Estate Siak (Riau)';
      }
    }
  }

  return storageService.logUserActivity({
    userId: options.userId,
    userName: options.userName,
    userRole: options.userRole,
    userEmail: options.userEmail,
    actionCategory: options.actionCategory,
    actionTitle: options.actionTitle,
    actionDescription: options.actionDescription,
    targetEntity: options.targetEntity,
    clientId: options.clientId,
    clientName: options.clientName,
    blockCode: options.blockCode,
    gpsTag: {
      lat,
      lng,
      accuracy,
      locationName,
      mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
    },
  });
}
