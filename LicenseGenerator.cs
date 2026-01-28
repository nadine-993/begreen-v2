using System;
using System.Security.Cryptography;
using System.Text;

/*
 * BEGREEN LICENSE GENERATOR (PRIVATE TOOL)
 * -----------------------------------------
 * This tool is for YOUR USE ONLY. Do not share this with clients.
 * It generates secure license keys for any client name and expiry date.
 */

public class LicenseGenerator
{
    // IMPORTANT: This must match the SecretKey in the client's appsettings.json
    private const string SecretKey = "BEGREEN_V2_ONPREM_SUPER_SECRET_KEY_2026";

    public static void Main(string[] args)
    {
        Console.WriteLine("=== BeGreen License Generator ===");
        
        Console.Write("Enter Client Name (e.g., BEGREEN): ");
        string client = Console.ReadLine()?.ToUpper().Trim() ?? "CLIENT";
        
        Console.Write("Enter Expiry Date (YYYYMMDD): ");
        string dateStr = Console.ReadLine()?.Trim() ?? "";
        
        if (dateStr.Length != 8 || !int.TryParse(dateStr, out _))
        {
            Console.WriteLine("Error: Date must be in YYYYMMDD format.");
            return;
        }

        string payload = $"{client}-{dateStr}";
        string signature = GenerateSignature(payload, SecretKey);
        
        string licenseKey = $"{client}-{dateStr}-{signature}";
        
        Console.WriteLine("\n-------------------------------------------");
        Console.WriteLine($"Generated License Key for {client}:");
        Console.WriteLine(licenseKey);
        Console.WriteLine("-------------------------------------------\n");
        Console.WriteLine("Copy and send this key to the client.");
    }

    private static string GenerateSignature(string payload, string key)
    {
        using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key)))
        {
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            // We use the same shortening logic as the controller (16 chars)
            return BitConverter.ToString(hash).Replace("-", "").ToUpper().Substring(0, 16);
        }
    }
}
