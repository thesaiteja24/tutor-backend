import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/config/index.ts";
import { devLogger } from "@/shared/utils/dev-logger.ts";

import { renderEmailChangeOtpEmail } from "./templates/email-change-otp.template.ts";
import { renderEmailChangedAlertEmail } from "./templates/email-changed-alert.template.ts";
import { renderNewLoginAlertEmail } from "./templates/new-login-alert.template.ts";
import { renderPasswordChangedEmail } from "./templates/password-changed.template.ts";
import { renderPasswordResetOtpEmail } from "./templates/password-reset-otp.template.ts";
import { renderVerificationOtpEmail } from "./templates/verification-otp.template.ts";
import { renderWelcomeEmail } from "./templates/welcome.template.ts";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      devLogger.info("EmailService", `Configured SMTP transporter with ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    } else {
      devLogger.info("EmailService", "No SMTP configured. Emails will be logged to dev console.");
    }
  }

  async sendMail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: env.SMTP_FROM,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        devLogger.info("EmailService:Sent", `Dispatched email to ${options.to} [Subject: ${options.subject}]`);
      } else {
        devLogger.info("EmailService:Mock", `[EMAIL TO ${options.to}] Subject: "${options.subject}"\n${options.text}`);
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      devLogger.error("EmailService:Error", `Failed to send email to ${options.to}: ${message}`, err);
      return false;
    }
  }

  async sendVerificationOtp(email: string, displayName: string, otp: string): Promise<boolean> {
    const rendered = renderVerificationOtpEmail({ displayName, otp });
    return this.sendMail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendWelcomeEmail(email: string, displayName: string): Promise<boolean> {
    const rendered = renderWelcomeEmail({ displayName });
    return this.sendMail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendPasswordResetOtp(email: string, displayName: string, otp: string): Promise<boolean> {
    const rendered = renderPasswordResetOtpEmail({ displayName, otp });
    return this.sendMail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendPasswordChangedConfirmation(email: string, displayName: string): Promise<boolean> {
    const rendered = renderPasswordChangedEmail({ displayName, changedAt: new Date().toUTCString() });
    return this.sendMail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendNewLoginAlert(
    email: string,
    displayName: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<boolean> {
    const rendered = renderNewLoginAlertEmail({
      displayName,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      loginTime: new Date().toUTCString(),
    });
    return this.sendMail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendEmailChangeOtp(newEmail: string, displayName: string, otp: string): Promise<boolean> {
    const rendered = renderEmailChangeOtpEmail({ displayName, otp });
    return this.sendMail({
      to: newEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendEmailChangedAlert(
    oldEmail: string,
    newEmail: string,
    displayName: string,
  ): Promise<boolean> {
    const rendered = renderEmailChangedAlertEmail({
      displayName,
      newEmail,
      changedAt: new Date().toUTCString(),
    });
    return this.sendMail({
      to: oldEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }
}

export const emailService = new EmailService();
