using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace BeGreen.Api.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            try
            {
                var smtpHost = _config["EmailSettings:SmtpHost"];
                var smtpPort = int.Parse(_config["EmailSettings:SmtpPort"] ?? "587");
                var smtpUser = _config["EmailSettings:SmtpUser"];
                var smtpPass = _config["EmailSettings:SmtpPass"];
                var fromEmail = _config["EmailSettings:FromEmail"];

                if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
                {
                    _logger.LogWarning("Email settings are missing. Skipping email sending.");
                    return;
                }

                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    Credentials = new NetworkCredential(smtpUser, smtpPass),
                    EnableSsl = true
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail ?? smtpUser),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(to);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation($"Email sent successfully to {to}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {to}");
            }
        }

        public async Task SendPaidNotificationAsync(string to, string requesterName, string requestType, decimal amount, string currency)
        {
            var subject = $"BeGreen: Your {requestType} Request has been Paid";
            var body = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>
                    <h2 style='color: #006d4e;'>Payment Notification</h2>
                    <p>Hello <strong>{requesterName}</strong>,</p>
                    <p>We are pleased to inform you that your <strong>{requestType}</strong> request has been officially marked as <strong>PAID</strong>.</p>
                    <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;' />
                    <p><strong>Amount:</strong> {amount:N2} {currency}</p>
                    <p>The funds are now being processed for settlement.</p>
                    <br />
                    <p>Best regards,<br /><strong>BeGreen Team</strong></p>
                    <div style='font-size: 0.8rem; color: #777; margin-top: 30px;'>
                        This is an automated message. Powered by Avera.
                    </div>
                </div>";
            await SendEmailAsync(to, subject, body);
        }

        public async Task SendClosedNotificationAsync(string to, string requesterName, string requestType, string note)
        {
            var subject = $"BeGreen: Your {requestType} Request has been Closed";
            var body = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>
                    <h2 style='color: #006d4e;'>Status Update</h2>
                    <p>Hello <strong>{requesterName}</strong>,</p>
                    <p>Your <strong>{requestType}</strong> request has been marked as <strong>CLOSED</strong>.</p>
                    <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;' />
                    <p><strong>Note:</strong> {note}</p>
                    <br />
                    <p>Best regards,<br /><strong>BeGreen Team</strong></p>
                    <div style='font-size: 0.8rem; color: #777; margin-top: 30px;'>
                        This is an automated message. Powered by Avera.
                    </div>
                </div>";

            await SendEmailAsync(to, subject, body);
        }

        public async Task SendRejectedNotificationAsync(string to, string requesterName, string requestType, string rejectedBy, string reason)
        {
            var subject = $"BeGreen: Your {requestType} Request has been Rejected";
            var body = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>
                    <h2 style='color: #d32f2f;'>Request Rejected</h2>
                    <p>Hello <strong>{requesterName}</strong>,</p>
                    <p>We regret to inform you that your <strong>{requestType}</strong> request has been <strong>REJECTED</strong>.</p>
                    <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;' />
                    <p><strong>Rejected By:</strong> {rejectedBy}</p>
                    <p><strong>Reason/Note:</strong> {reason ?? "No reason provided"}</p>
                    <br />
                    <p>Best regards,<br /><strong>BeGreen Team</strong></p>
                    <div style='font-size: 0.8rem; color: #777; margin-top: 30px;'>
                        This is an automated message. Powered by Avera.
                    </div>
                </div>";

            await SendEmailAsync(to, subject, body);
        }

        public async Task SendPasswordResetEmailAsync(string to, string userName, string resetLink)
        {
            var subject = "BeGreen: Password Reset Request";
            var body = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>
                    <h2 style='color: #1e293b;'>Password Reset Request</h2>
                    <p>Hello <strong>{userName}</strong>,</p>
                    <p>A password reset has been triggered for your account. Please click the button below to set a new password.</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{resetLink}' 
                           style='background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;'>
                            Reset Password
                        </a>
                    </div>
                    <p>If you did not request this, please ignore this email.</p>
                    <p>This link will expire in 1 hour.</p>
                    <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;' />
                    <br />
                    <p>Best regards,<br /><strong>BeGreen Team</strong></p>
                    <div style='font-size: 0.8rem; color: #777; margin-top: 30px;'>
                        This is an automated message. Powered by Avera.
                    </div>
                </div>";

            await SendEmailAsync(to, subject, body);
        }
    }
}
