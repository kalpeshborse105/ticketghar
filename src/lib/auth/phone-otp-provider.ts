export interface PhoneOtpProvider {
  configured: boolean;
  sendOtp?(phoneNumber: string): Promise<{ success: boolean; message?: string }>;
  verifyOtp?(phoneNumber: string, otp: string): Promise<{ success: boolean; uid?: string; message?: string }>;
}

export class StubPhoneOtpProvider implements PhoneOtpProvider {
  configured = false;
}

export const phoneOtpProvider: PhoneOtpProvider = new StubPhoneOtpProvider();
