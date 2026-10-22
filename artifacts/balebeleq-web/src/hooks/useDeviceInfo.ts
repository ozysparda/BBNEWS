import { useEffect, useState } from 'react';

export interface DeviceInfo {
  deviceName: string;
  deviceType: string;
  operatingSystem: string;
  browser: string;
  browserVersion: string;
  screenResolution: string;
  timezone: string;
  localTime: string;
  language: string;
  userAgent: string;
}

export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceName: 'Unknown',
    deviceType: 'desktop',
    operatingSystem: 'Unknown',
    browser: 'Unknown',
    browserVersion: 'Unknown',
    screenResolution: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: new Date().toISOString(),
    language: navigator.language,
    userAgent: navigator.userAgent,
  });

  useEffect(() => {
    const getDeviceInfo = () => {
      const ua = navigator.userAgent;
      let osName = 'Unknown';
      let browserName = 'Unknown';
      let browserVersion = 'Unknown';
      let deviceType = 'desktop';

      // Detect OS
      if (ua.indexOf('Win') > -1) osName = 'Windows';
      else if (ua.indexOf('Mac') > -1) osName = 'macOS';
      else if (ua.indexOf('Linux') > -1) osName = 'Linux';
      else if (ua.indexOf('Android') > -1) {
        osName = 'Android';
        deviceType = 'mobile';
      } else if (ua.indexOf('like Mac') > -1) {
        osName = 'iOS';
        deviceType = 'mobile';
      }

      // Detect Browser
      if (ua.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        browserVersion = ua.substring(ua.indexOf('Firefox') + 8, ua.indexOf('Firefox') + 13);
      } else if (ua.indexOf('Chrome') > -1 && ua.indexOf('Chromium') === -1) {
        browserName = 'Chrome';
        browserVersion = ua.substring(ua.indexOf('Chrome') + 7, ua.indexOf('Chrome') + 12);
      } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
        browserName = 'Safari';
        browserVersion = ua.substring(ua.indexOf('Version/') + 8, ua.indexOf('Version/') + 13);
      } else if (ua.indexOf('Trident') > -1) {
        browserName = 'IE';
        browserVersion = ua.substring(ua.indexOf('rv:') + 3, ua.indexOf('rv:') + 8);
      } else if (ua.indexOf('Edge') > -1) {
        browserName = 'Edge';
        browserVersion = ua.substring(ua.indexOf('Edge') + 5, ua.indexOf('Edge') + 10);
      }

      const newDeviceInfo: DeviceInfo = {
        deviceName: `${osName} ${deviceType}`,
        deviceType,
        operatingSystem: osName,
        browser: browserName,
        browserVersion,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localTime: new Date().toISOString(),
        language: navigator.language,
        userAgent: ua,
      };

      setDeviceInfo(newDeviceInfo);
    };

    getDeviceInfo();
  }, []);

  return deviceInfo;
}

export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unknown';

  ctx.textBaseline = 'top';
  ctx.font = '14px "Arial"';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('Browser Fingerprint', 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText('Browser Fingerprint', 4, 17);

  return canvas.toDataURL();
}

export function getLocationCoordinates(): Promise<{ latitude: number; longitude: number; address?: string }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error) => {
        reject(error);
      }
    );
  });
}
