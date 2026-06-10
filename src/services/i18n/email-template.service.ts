import { translationService } from "@/services/i18n/translation.service";
import { communicationService } from "@/services/communications/communication.service";
import type { AppLocale } from "@/lib/i18n/constants";

export type EmailTemplateType =
  | "payment_confirmation"
  | "invitation_ready"
  | "rsvp_confirmation"
  | "guest_reminder"
  | "admin_notification";

export class EmailTemplateService {
  async sendLocalized(
    type: EmailTemplateType,
    to: string,
    locale: AppLocale,
    params: Record<string, string>
  ) {
    const subjectKey = `${type}_subject`;
    const bodyKey = `${type}_body`;

    const [subject, body] = await Promise.all([
      translationService.tAsync(locale, "email", subjectKey, params),
      translationService.tAsync(locale, "email", bodyKey, params),
    ]);

    return communicationService.sendTransactionalEmail({
      to,
      subject,
      body,
      locale,
      templateType: type,
    });
  }
}

export const emailTemplateService = new EmailTemplateService();
