import { Injectable, signal } from '@angular/core';
import { Alert } from '../models';

export interface ShareOptions {
  platform: 'whatsapp' | 'telegram' | 'maps' | 'waze';
  alert: Alert;
}

@Injectable({
  providedIn: 'root'
})
export class ExternalCommunicationService {
  // Signals
  isSharing = signal(false);
  lastShared = signal<ShareOptions | null>(null);

  // Telegram Bot Configuration (optional)
  private readonly TELEGRAM_BOT_TOKEN = ''; // TODO: Add your bot token
  private readonly TELEGRAM_CHAT_ID = ''; // TODO: Add your chat/group ID

  /**
   * Open Google Maps with route to incident
   */
  openGoogleMaps(alert: Alert, fromLat?: number, fromLng?: number) {
    if (!alert.latitude || !alert.longitude) {
      console.warn('Alert has no coordinates');
      return;
    }

    let url: string;

    if (fromLat && fromLng) {
      // Route from current location to incident
      url = `https://www.google.com/maps/dir/${fromLat},${fromLng}/${alert.latitude},${alert.longitude}`;
    } else {
      // Just show incident location
      url = `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`;
    }

    window.open(url, '_blank');
    
    this.lastShared.set({ platform: 'maps', alert });
  }

  /**
   * Open Waze with route to incident
   */
  openWaze(alert: Alert) {
    if (!alert.latitude || !alert.longitude) {
      console.warn('Alert has no coordinates');
      return;
    }

    const url = `https://waze.com/ul?ll=${alert.latitude},${alert.longitude}&navigate=yes`;
    window.open(url, '_blank');
    
    this.lastShared.set({ platform: 'waze', alert });
  }

  /**
   * Share incident via WhatsApp
   */
  shareViaWhatsApp(alert: Alert, phoneNumber?: string) {
    const message = this.formatWhatsAppMessage(alert);
    const encodedMessage = encodeURIComponent(message);

    let url: string;
    if (phoneNumber) {
      // Send to specific number
      url = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    } else {
      // Open WhatsApp with message (user selects recipient)
      url = `https://wa.me/?text=${encodedMessage}`;
    }

    window.open(url, '_blank');
    
    this.lastShared.set({ platform: 'whatsapp', alert });
  }

  /**
   * Format WhatsApp message
   */
  private formatWhatsAppMessage(alert: Alert): string {
    const lines: string[] = [
      '🚨 *REPORTE ZARX*',
      '',
      `*Tipo:* ${alert.type}`,
      `*Prioridad:* ${alert.priority}`,
      ''
    ];

    if (alert.description) {
      lines.push(`*Descripción:* ${alert.description}`);
      lines.push('');
    }

    if (alert.address) {
      lines.push(`📍 *Ubicación:* ${alert.address}`);
    } else if (alert.latitude && alert.longitude) {
      lines.push(`📍 *Coordenadas:* ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`);
    }

    if (alert.latitude && alert.longitude) {
      lines.push('');
      lines.push(`🗺️ *Ver en Mapa:* https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`);
    }

    if (alert.evidence_url) {
      lines.push('');
      lines.push(`📸 *Evidencia:* ${alert.evidence_url}`);
    }

    if (alert.created_at) {
      const date = new Date(alert.created_at);
      lines.push('');
      lines.push(`🕐 *Hora:* ${date.toLocaleString('es-AR')}`);
    }

    lines.push('');
    lines.push('_Enviado desde ZARX Security System_');

    return lines.join('\n');
  }

  /**
   * Send notification to Telegram group
   */
  async sendTelegramNotification(alert: Alert): Promise<boolean> {
    if (!this.TELEGRAM_BOT_TOKEN || !this.TELEGRAM_CHAT_ID) {
      console.warn('Telegram not configured');
      return false;
    }

    this.isSharing.set(true);

    try {
      const message = this.formatTelegramMessage(alert);

      const response = await fetch(
        `https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: this.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: false
          })
        }
      );

      if (!response.ok) {
        throw new Error('Telegram API error');
      }

      // Send photo if available
      if (alert.evidence_url) {
        await this.sendTelegramPhoto(alert.evidence_url, alert.type);
      }

      this.lastShared.set({ platform: 'telegram', alert });
      return true;

    } catch (error) {
      console.error('Telegram send error:', error);
      return false;
    } finally {
      this.isSharing.set(false);
    }
  }

  /**
   * Format Telegram message
   */
  private formatTelegramMessage(alert: Alert): string {
    const lines: string[] = [
      '🚨 <b>NUEVA ALERTA ZARX</b>',
      '',
      `<b>Tipo:</b> ${alert.type}`,
      `<b>Prioridad:</b> ${alert.priority}`,
      ''
    ];

    if (alert.description) {
      lines.push(`<b>Descripción:</b> ${alert.description}`);
      lines.push('');
    }

    if (alert.address) {
      lines.push(`📍 <b>Ubicación:</b> ${alert.address}`);
    } else if (alert.latitude && alert.longitude) {
      lines.push(`📍 <b>Coordenadas:</b> ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`);
    }

    if (alert.latitude && alert.longitude) {
      lines.push('');
      lines.push(`🗺️ <a href="https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}">Ver en Google Maps</a>`);
    }

    if (alert.created_at) {
      const date = new Date(alert.created_at);
      lines.push('');
      lines.push(`🕐 <b>Hora:</b> ${date.toLocaleString('es-AR')}`);
    }

    return lines.join('\n');
  }

  /**
   * Send photo to Telegram
   */
  private async sendTelegramPhoto(photoUrl: string, caption: string): Promise<void> {
    try {
      await fetch(
        `https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: this.TELEGRAM_CHAT_ID,
            photo: photoUrl,
            caption: `📸 Evidencia: ${caption}`
          })
        }
      );
    } catch (error) {
      console.error('Telegram photo send error:', error);
    }
  }

  /**
   * Copy coordinates to clipboard
   */
  async copyCoordinates(alert: Alert): Promise<boolean> {
    if (!alert.latitude || !alert.longitude) {
      return false;
    }

    const text = `${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Clipboard error:', error);
      return false;
    }
  }

  /**
   * Generate shareable link
   */
  generateShareableLink(alert: Alert): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/track/${alert.id}`;
  }
}
