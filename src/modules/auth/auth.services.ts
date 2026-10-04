import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from "@/shared/errors/index.ts";
import {
  generateNumericOtp,
  hashOtp,
  hashPassword,
  verifyOtp,
  verifyPassword,
} from "@/shared/auth/password.ts";
import { signJwtToken } from "@/shared/auth/jwt.ts";
import { emailService, type EmailService } from "@/shared/email/index.ts";
import { authRepository, type AuthRepository } from "./auth.repositories.ts";
import type {
  ChangePasswordInput,
  ConfirmChangeEmailInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  RequestChangeEmailInput,
  ResendOtpInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.schemas.ts";

export class AuthService {
  constructor(
    private readonly repo: AuthRepository = authRepository,
    private readonly email: EmailService = emailService
  ) {}

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      nativeLanguage: user.nativeLanguage,
      englishLevel: user.englishLevel,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    };
  }

  async register(input: RegisterInput) {
    const existingUser = await this.repo.findUserByEmail(input.email);
    if (existingUser && existingUser.isEmailVerified) {
      throw new ConflictError("An account with this email address already exists. Please sign in.");
    }

    const passwordHash = await hashPassword(input.password);

    let user;
    if (existingUser && !existingUser.isEmailVerified) {
      // Update existing unverified profile with latest password & preferences
      user = await this.repo.updateUser(existingUser.id, {
        passwordHash,
        displayName: input.displayName,
        nativeLanguage: input.nativeLanguage,
        englishLevel: input.englishLevel,
      });
    } else {
      user = await this.repo.createUser({
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        nativeLanguage: input.nativeLanguage,
        englishLevel: input.englishLevel,
        isEmailVerified: false,
        authProvider: "local",
        isActive: true,
      });
    }

    // Generate 6-digit OTP valid for 10 minutes
    const otp = generateNumericOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.repo.createOtp({
      email: input.email,
      otpHash,
      purpose: "email_verification",
      expiresAt,
    });

    // Send verification email
    await this.email.sendVerificationOtp(input.email, input.displayName, otp);

    return {
      email: input.email,
      displayName: input.displayName,
      message: "Verification code sent to your email address.",
    };
  }

  async verifyEmail(input: VerifyEmailInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new NotFoundError("No account found with this email address.");
    }

    if (user.isEmailVerified) {
      const token = signJwtToken({
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        nativeLanguage: user.nativeLanguage,
        englishLevel: user.englishLevel,
      });
      return {
        user: this.sanitizeUser(user),
        token,
      };
    }

    const activeOtp = await this.repo.findLatestActiveOtp(input.email, "email_verification");
    if (!activeOtp) {
      throw new BadRequestError("Invalid or expired verification code. Please request a new one.");
    }

    const isMatch = await verifyOtp(input.otp, activeOtp.otpHash);
    if (!isMatch) {
      await this.repo.incrementOtpAttempts(activeOtp.id);
      throw new BadRequestError("Incorrect verification code. Please check and try again.");
    }

    await this.repo.markOtpUsed(activeOtp.id);
    const updatedUser = await this.repo.updateUser(user.id, {
      isEmailVerified: true,
      lastLoginAt: new Date(),
    });

    // Asynchronously send welcome email
    this.email.sendWelcomeEmail(user.email, user.displayName).catch(() => {});

    const token = signJwtToken({
      userId: updatedUser!.id,
      email: updatedUser!.email,
      displayName: updatedUser!.displayName,
      nativeLanguage: updatedUser!.nativeLanguage,
      englishLevel: updatedUser!.englishLevel,
    });

    return {
      user: this.sanitizeUser(updatedUser!),
      token,
    };
  }

  async resendOtp(input: ResendOtpInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      // Return success to prevent email enumeration
      return { success: true, message: "If an account exists, a new verification code was sent." };
    }

    if (input.purpose === "email_verification" && user.isEmailVerified) {
      throw new BadRequestError("Email is already verified. You can log in directly.");
    }

    const lastOtpTime = await this.repo.getLatestOtpCreatedAt(input.email, input.purpose);
    if (lastOtpTime && Date.now() - new Date(lastOtpTime).getTime() < 60 * 1000) {
      throw new TooManyRequestsError("Please wait at least 60 seconds before requesting another code.");
    }

    const otp = generateNumericOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.repo.createOtp({
      email: input.email,
      otpHash,
      purpose: input.purpose,
      expiresAt,
    });

    if (input.purpose === "email_verification") {
      await this.email.sendVerificationOtp(user.email, user.displayName, otp);
    } else {
      await this.email.sendPasswordResetOtp(user.email, user.displayName, otp);
    }

    return {
      success: true,
      message: "A new verification code has been dispatched to your email.",
    };
  }

  async login(input: LoginInput, meta?: { ipAddress?: string; userAgent?: string }) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    if (!user.isEmailVerified) {
      // Generate and send a fresh OTP for convenience
      const otp = generateNumericOtp();
      const otpHash = await hashOtp(otp);
      await this.repo.createOtp({
        email: user.email,
        otpHash,
        purpose: "email_verification",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      this.email.sendVerificationOtp(user.email, user.displayName, otp).catch(() => {});

      throw new ForbiddenError(
        "Your email is not verified yet. A new verification code has been sent to your email address."
      );
    }

    if (!user.isActive) {
      throw new ForbiddenError("This account has been deactivated. Please contact support.");
    }

    const updated = await this.repo.updateUser(user.id, {
      lastLoginAt: new Date(),
    });

    // Asynchronously dispatch new login notification
    this.email.sendNewLoginAlert(user.email, user.displayName, meta).catch(() => {});

    const token = signJwtToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      nativeLanguage: user.nativeLanguage,
      englishLevel: user.englishLevel,
    });

    return {
      user: this.sanitizeUser(updated || user),
      token,
    };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email address, a password reset code has been sent.",
      };
    }

    const otp = generateNumericOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.repo.createOtp({
      email: user.email,
      otpHash,
      purpose: "password_reset",
      expiresAt,
    });

    await this.email.sendPasswordResetOtp(user.email, user.displayName, otp);

    return {
      success: true,
      message: "If an account exists with this email address, a password reset code has been sent.",
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new BadRequestError("Invalid or expired password reset code.");
    }

    const activeOtp = await this.repo.findLatestActiveOtp(input.email, "password_reset");
    if (!activeOtp) {
      throw new BadRequestError("Invalid or expired password reset code. Please request a new one.");
    }

    const isMatch = await verifyOtp(input.otp, activeOtp.otpHash);
    if (!isMatch) {
      await this.repo.incrementOtpAttempts(activeOtp.id);
      throw new BadRequestError("Incorrect reset code. Please check and try again.");
    }

    await this.repo.markOtpUsed(activeOtp.id);

    const passwordHash = await hashPassword(input.newPassword);
    await this.repo.updateUser(user.id, {
      passwordHash,
      isEmailVerified: true,
    });

    // Send confirmation email
    this.email.sendPasswordChangedConfirmation(user.email, user.displayName).catch(() => {});

    return {
      success: true,
      message: "Password has been successfully updated. Please log in with your new password.",
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User account not found.");
    }

    if (!user.passwordHash) {
      throw new BadRequestError("This account uses social sign-in and does not have a local password set.");
    }

    const isCurrentValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestError("Current password does not match.");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await this.repo.updateUser(user.id, {
      passwordHash,
    });

    this.email.sendPasswordChangedConfirmation(user.email, user.displayName).catch(() => {});

    return {
      success: true,
      message: "Password changed successfully.",
    };
  }

  async requestChangeEmail(userId: string, input: RequestChangeEmailInput) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User account not found.");
    }

    if (!user.passwordHash) {
      throw new BadRequestError("This account uses social sign-in and does not have a local password set.");
    }

    const isCurrentValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestError("Current password does not match.");
    }

    if (input.newEmail.toLowerCase() === user.email.toLowerCase()) {
      throw new BadRequestError("New email address must be different from your current email address.");
    }

    const existingUser = await this.repo.findUserByEmail(input.newEmail);
    if (existingUser && existingUser.isEmailVerified && existingUser.id !== user.id) {
      throw new ConflictError("An account with this email address already exists.");
    }

    const otp = generateNumericOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.repo.createOtp({
      email: input.newEmail,
      otpHash,
      purpose: "email_change",
      expiresAt,
    });

    await this.email.sendEmailChangeOtp(input.newEmail, user.displayName, otp);

    return {
      success: true,
      newEmail: input.newEmail,
      message: `Verification code sent to ${input.newEmail}.`,
    };
  }

  async confirmChangeEmail(userId: string, input: ConfirmChangeEmailInput) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User account not found.");
    }

    const activeOtp = await this.repo.findLatestActiveOtp(input.newEmail, "email_change");
    if (!activeOtp) {
      throw new BadRequestError("Invalid or expired verification code. Please request a new one.");
    }

    const isMatch = await verifyOtp(input.otp, activeOtp.otpHash);
    if (!isMatch) {
      await this.repo.incrementOtpAttempts(activeOtp.id);
      throw new BadRequestError("Incorrect verification code. Please check and try again.");
    }

    await this.repo.markOtpUsed(activeOtp.id);

    const existingUser = await this.repo.findUserByEmail(input.newEmail);
    if (existingUser && existingUser.isEmailVerified && existingUser.id !== user.id) {
      throw new ConflictError("An account with this email address already exists.");
    }

    const oldEmail = user.email;
    const updatedUser = await this.repo.updateUser(user.id, {
      email: input.newEmail,
      isEmailVerified: true,
    });

    // Alert old email
    this.email.sendEmailChangedAlert(oldEmail, input.newEmail, user.displayName).catch(() => {});

    const token = signJwtToken({
      userId: updatedUser!.id,
      email: updatedUser!.email,
      displayName: updatedUser!.displayName,
      nativeLanguage: updatedUser!.nativeLanguage,
      englishLevel: updatedUser!.englishLevel,
    });

    return {
      success: true,
      user: this.sanitizeUser(updatedUser!),
      token,
      message: "Email address changed successfully.",
    };
  }

  async getMe(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }
    return this.sanitizeUser(user);
  }
}

export const authService = new AuthService();
