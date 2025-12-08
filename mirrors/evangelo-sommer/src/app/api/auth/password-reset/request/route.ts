import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import { requestPasswordResetLimiter } from "@/lib/rate-limiter";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting by IP
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1"; // Use x-forwarded-for for Vercel
    const { success } = await requestPasswordResetLimiter.limit(ip);

    if (!success) {
      console.warn(`[Rate Limit] Blocked password reset request from IP: ${ip}`);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // 2. Get email from request body
    console.log("[API] Received password reset request.");
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Find the user in the database
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail }
    });

    // For security, always return a generic success message to prevent email enumeration
    if (!adminUser || !adminUser.isActive) {
      console.warn(`[API] Password reset requested for non-existent or inactive email: ${normalizedEmail}. Sending generic success response.`);
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link."
      });
    }
    console.log(`[API] Found active user: ${adminUser.id} for email: ${normalizedEmail}`);
    // 4. Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // 5. Store the token in the database
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: adminUser.id,
        expiresAt
      }
    });
    console.log(`[API] Generated and stored new password reset token for user: ${adminUser.id}`);

    // 6. Send the email using SendGrid
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      throw new Error("SendGrid API Key or From Email not configured.");
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    await sgMail.send({
      from: process.env.SENDGRID_FROM_EMAIL,
      to: adminUser.email,
      subject: "Password Reset Request - Evangelo Sommer CRM",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">Reset Password</a></p><p>This link will expire in 1 hour.</p>`,
      text: `You requested a password reset. Copy and paste this link into your browser to reset your password: ${resetUrl}`,
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false
        }
      }
    });

    console.log("✅ Password reset email sent to:", adminUser.email);

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link."
    });

  } catch (error) {
    console.error("❌ Password reset request error:", error);
    return NextResponse.json(
      { error: "An internal error occurred. Please try again later." },
      { status: 500 }
    );
  }
}