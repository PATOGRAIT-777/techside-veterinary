export interface SendVerificationEmailJobData {
  to: string;
  userName: string;
  token: string;
}

export interface SendAccountExistsEmailJobData {
  to: string;
}
