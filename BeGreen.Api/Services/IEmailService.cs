namespace BeGreen.Api.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body);
        Task SendPaidNotificationAsync(string to, string requesterName, string requestType, decimal amount, string currency);
        Task SendClosedNotificationAsync(string to, string requesterName, string requestType, string note);
        Task SendRejectedNotificationAsync(string to, string requesterName, string requestType, string rejectedBy, string reason);
        Task SendPasswordResetEmailAsync(string to, string userName, string resetLink);
        Task SendInvitationEmailAsync(string to, string name, string link, string loginId);
    }
}
