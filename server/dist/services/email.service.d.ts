export interface EmailSender {
    sendOTP(to: string, otp: string): Promise<void>;
}
export declare function getEmailSender(): EmailSender;
//# sourceMappingURL=email.service.d.ts.map