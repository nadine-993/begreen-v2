using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;
using MongoDB.Bson;
using System.Text.RegularExpressions;
using System.Globalization;

namespace BeGreen.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MigrationController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly string _sqlFilePath = @"/Users/nkantarji/BeGreen FSH/begreen/green_db (1).sql";

        public MigrationController(MongoDbContext context)
        {
            _context = context;
        }

        [HttpPost("run")]
        public async Task<IActionResult> RunMigration()
        {
            if (!System.IO.File.Exists(_sqlFilePath))
            {
                return NotFound($"SQL file not found at {_sqlFilePath}");
            }

            try
            {
                var sqlContent = await System.IO.File.ReadAllTextAsync(_sqlFilePath);
                var tablesData = ParseSqlDump(sqlContent);

                // 1. Accounts -> Users
                if (tablesData.TryGetValue("accounts", out var accounts))
                {
                    var users = accounts.Select(row => new User
                    {
                        SqlId = TryParseInt(row, "id"),
                        Email = row.GetValueOrDefault("email", ""),
                        Name = row.GetValueOrDefault("empname", ""),
                        Login = row.GetValueOrDefault("login", ""),
                    Password = !string.IsNullOrEmpty(row.GetValueOrDefault("password")) 
                        ? BCrypt.Net.BCrypt.HashPassword(row["password"]) 
                        : null,
                        Role = "user",
                        Division = row.GetValueOrDefault("divisionid"),
                        Department = row.GetValueOrDefault("departmentid"),
                        Occupation = row.GetValueOrDefault("occupationid"),
                        Signature = row.GetValueOrDefault("signature"),
                        Status = TryParseInt(row, "status"),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }).ToList();

                    await _context.Users.DeleteManyAsync(_ => true);
                    if (users.Any()) await _context.Users.InsertManyAsync(users);
                }

                // 2. Departments & Divisions
                if (tablesData.TryGetValue("departments", out var departments))
                {
                    var deptList = departments.Select(row => new Department
                    {
                        SqlId = TryParseInt(row, "id"),
                        Division = row.GetValueOrDefault("division", ""),
                        Name = row.GetValueOrDefault("department", "")
                    }).ToList();

                    await _context.Departments.DeleteManyAsync(_ => true);
                    if (deptList.Any()) await _context.Departments.InsertManyAsync(deptList);

                    // Sync Divisions
                    var divisionNames = deptList.Select(d => d.Division).Distinct().ToList();
                    var divList = divisionNames.Select(name => new Division { Name = name }).ToList();
                    await _context.Divisions.DeleteManyAsync(_ => true);
                    if (divList.Any()) await _context.Divisions.InsertManyAsync(divList);
                }

                // 2.5 Roles
                var defaultRoles = new List<string> { "Admin", "Manager", "User" };
                var rolesList = defaultRoles.Select(r => new Role { Name = r }).ToList();
                await _context.Roles.DeleteManyAsync(_ => true);
                await _context.Roles.InsertManyAsync(rolesList);

                // 3. Petty Cash
                if (tablesData.TryGetValue("pettycashrequest", out var pettyRequests))
                {
                    var pettyList = pettyRequests.Select(row => new PettyCash
                    {
                        SqlId = TryParseInt(row, "id"),
                        ReqAccount = row.GetValueOrDefault("reqaccount", ""),
                        Requestor = row.GetValueOrDefault("requestor", ""),
                        Department = row.GetValueOrDefault("department", ""),
                        Total = TryParseDecimal(row, "total"),
                        Currency = row.GetValueOrDefault("currency", "SYP"),
                        Status = row.GetValueOrDefault("status", "Requested"),
                        Approver = row.GetValueOrDefault("approver"),
                        ApproveOrder = TryParseInt(row, "approveorder"),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("date")),
                        Items = tablesData.GetValueOrDefault("pettycashdetails", new())
                            .Where(d => d.GetValueOrDefault("pettyid") == row["id"])
                            .Select(d => new PettyCashItem
                            {
                                SqlId = TryParseInt(d, "id"),
                                Description = d.GetValueOrDefault("description", ""),
                                Amount = TryParseDecimal(d, "amount")
                            }).ToList(),
                        Notes = tablesData.GetValueOrDefault("pettynotes", new())
                            .Where(n => n.GetValueOrDefault("pettyid") == row["id"])
                            .Select(n => new PettyCashNote
                            {
                                Note = n.GetValueOrDefault("note", ""),
                                User = n.GetValueOrDefault("user", ""),
                                Date = ParseDateTime(n.GetValueOrDefault("addedon"))
                            }).ToList(),
                        History = tablesData.GetValueOrDefault("pettycashactions", new())
                            .Where(a => a.GetValueOrDefault("pettyid") == row["id"])
                            .Select(a => new HistoryRecord
                            {
                                Approver = a.GetValueOrDefault("approver"),
                                Action = a.GetValueOrDefault("action"),
                                Date = ParseDateTime(a.GetValueOrDefault("date")),
                                Note = a.GetValueOrDefault("note")
                            }).ToList()
                    }).ToList();

                    await _context.PettyCashRequests.DeleteManyAsync(_ => true);
                    if (pettyList.Any()) await _context.PettyCashRequests.InsertManyAsync(pettyList);
                }

                // 4. Cash Advance
                if (tablesData.TryGetValue("cashadvance", out var advances))
                {
                    var caList = advances.Select(row => new CashAdvance
                    {
                        SqlId = TryParseInt(row, "id"),
                        ReqAccount = row.GetValueOrDefault("reqaccount", ""),
                        Requestor = row.GetValueOrDefault("requestor", ""),
                        Department = row.GetValueOrDefault("department", ""),
                        Description = row.GetValueOrDefault("description", ""),
                        Amount = TryParseDecimal(row, "amount"),
                        Currency = row.GetValueOrDefault("currency", "SYP"),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("date")),
                        Approver = row.GetValueOrDefault("approver"),
                        ApproveOrder = TryParseInt(row, "approveorder"),
                        Status = row.GetValueOrDefault("status", "Requested"),
                        Notes = tablesData.GetValueOrDefault("cashadvancenotes", new())
                            .Where(n => n.GetValueOrDefault("cashadvanceid") == row["id"])
                            .Select(n => new CashAdvanceNote
                            {
                                Note = n.GetValueOrDefault("notes", ""),
                                User = n.GetValueOrDefault("user", ""),
                                Date = ParseDateTime(n.GetValueOrDefault("date"))
                            }).ToList(),
                        History = tablesData.GetValueOrDefault("cashadvanceactions", new())
                            .Where(a => a.GetValueOrDefault("cashid") == row["id"])
                            .Select(a => new HistoryRecord
                            {
                                Approver = a.GetValueOrDefault("approver"),
                                Action = "Approval",
                                Date = ParseDateTime(a.GetValueOrDefault("date")),
                            }).ToList()
                    }).ToList();

                    await _context.CashAdvances.DeleteManyAsync(_ => true);
                    if (caList.Any()) await _context.CashAdvances.InsertManyAsync(caList);
                }

                // 5. Engineering Orders
                if (tablesData.TryGetValue("engorders", out var engOrders))
                {
                    var eoList = engOrders.Select(row => new EngineeringOrder
                    {
                        SqlId = TryParseInt(row, "id"),
                        Requestor = row.GetValueOrDefault("requester", ""),
                        Department = row.GetValueOrDefault("dep", ""),
                        Location = row.GetValueOrDefault("location", ""),
                        Team = row.GetValueOrDefault("team", ""),
                        Description = row.GetValueOrDefault("description", ""),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("date")),
                        Status = row.GetValueOrDefault("status", "Open")
                    }).ToList();

                    await _context.EngineeringOrders.DeleteManyAsync(_ => true);
                    if (eoList.Any()) await _context.EngineeringOrders.InsertManyAsync(eoList);
                }

                // 6. IT Orders
                if (tablesData.TryGetValue("itorders", out var itOrders))
                {
                    var ioList = itOrders.Select(row => new ItOrder
                    {
                        SqlId = TryParseInt(row, "id"),
                        Requestor = row.GetValueOrDefault("requester", ""),
                        Department = row.GetValueOrDefault("dep", ""),
                        Type = row.GetValueOrDefault("type", ""),
                        SystemName = row.GetValueOrDefault("systemname", ""),
                        Description = row.GetValueOrDefault("description", ""),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("date")),
                        Status = row.GetValueOrDefault("status", "Open")
                    }).ToList();

                    await _context.ItOrders.DeleteManyAsync(_ => true);
                    if (ioList.Any()) await _context.ItOrders.InsertManyAsync(ioList);
                }

                // 7. Expenses
                if (tablesData.TryGetValue("expense", out var tableExpenses))
                {
                    var exList = tableExpenses.Select(row => new Expense
                    {
                        SqlId = TryParseInt(row, "id"),
                        ReqAccount = row.GetValueOrDefault("reqaccount", ""),
                        Requestor = row.GetValueOrDefault("requestor", ""),
                        Department = row.GetValueOrDefault("department", ""),
                        Description = row.GetValueOrDefault("description", ""),
                        TotalAmount = TryParseDecimal(row, "total"),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("date")),
                        Status = row.GetValueOrDefault("status", "Requested"),
                        Approver = row.GetValueOrDefault("approver"),
                        ApproveOrder = TryParseInt(row, "approveorder"),
                        History = tablesData.GetValueOrDefault("expenseactions", new())
                            .Where(a => a.GetValueOrDefault("expenseid") == row["id"])
                            .Select(a => new HistoryRecord
                            {
                                Approver = a.GetValueOrDefault("approver"),
                                Action = a.GetValueOrDefault("action"),
                                Date = ParseDateTime(a.GetValueOrDefault("date")),
                                Note = a.GetValueOrDefault("note")
                            }).ToList()
                    }).ToList();

                    await _context.Expenses.DeleteManyAsync(_ => true);
                    if (exList.Any()) await _context.Expenses.InsertManyAsync(exList);
                }

                // 8. Glitches
                if (tablesData.TryGetValue("glitchrequest", out var glitchReqs))
                {
                    var gList = glitchReqs.Select(row => new Glitch
                    {
                        SqlId = TryParseInt(row, "id"),
                        ReqAccount = row.GetValueOrDefault("reqaccount", ""),
                        Requestor = row.GetValueOrDefault("requestor", ""),
                        Department = row.GetValueOrDefault("department", ""),
                        GuestName = row.GetValueOrDefault("guestname", ""),
                        RoomNumber = row.GetValueOrDefault("roomnumber", ""),
                        Description = row.GetValueOrDefault("description", ""),
                        Compensation = row.GetValueOrDefault("compensation"),
                        CostEstimate = TryParseDecimal(row, "costEstimate"),
                        CompensationStatus = row.GetValueOrDefault("compensationstatus"),
                        Status = row.GetValueOrDefault("status", "Requested"),
                        Approver = row.GetValueOrDefault("approver"),
                        ApproveOrder = TryParseInt(row, "approveorder"),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("date")),
                        History = tablesData.GetValueOrDefault("glitchdetails", new())
                            .Where(d => d.GetValueOrDefault("gid") == row["id"])
                            .Select(d => new HistoryRecord
                            {
                                Note = d.GetValueOrDefault("note"),
                                Approver = d.GetValueOrDefault("user"),
                                Date = ParseDateTime(d.GetValueOrDefault("addedon"))
                            }).ToList()
                    }).ToList();

                    await _context.Glitches.DeleteManyAsync(_ => true);
                    if (gList.Any()) await _context.Glitches.InsertManyAsync(gList);
                }

                // 9. Taxi Orders
                if (tablesData.TryGetValue("taxiorder", out var taxiOrders))
                {
                    var tList = taxiOrders.Select(row => new TaxiOrder
                    {
                        SqlId = TryParseInt(row, "id"),
                        ReqAccount = row.GetValueOrDefault("reqaccount", ""),
                        Requestor = row.GetValueOrDefault("requestor", ""),
                        Department = row.GetValueOrDefault("department", ""),
                        PassengerName = row.GetValueOrDefault("passengername", ""),
                        Destination = row.GetValueOrDefault("destination", ""),
                        PickupTime = ParseDateTime(row.GetValueOrDefault("pickuptime")),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("date")),
                        Status = row.GetValueOrDefault("status", "Requested"),
                        Approver = row.GetValueOrDefault("approver"),
                        ApproveOrder = TryParseInt(row, "approveorder")
                    }).ToList();

                    await _context.TaxiOrders.DeleteManyAsync(_ => true);
                    if (tList.Any()) await _context.TaxiOrders.InsertManyAsync(tList);
                }

                // 10. Upgrade Requests
                if (tablesData.TryGetValue("upgradereq", out var upgrades))
                {
                    var uList = upgrades.Select(row => new UpgradeRequest
                    {
                        SqlId = TryParseInt(row, "id"),
                        ReqAccount = row.GetValueOrDefault("reqaccount", ""),
                        Requestor = row.GetValueOrDefault("requestor", ""),
                        Department = row.GetValueOrDefault("department", ""),
                        GuestName = row.GetValueOrDefault("guestname", ""),
                        RoomNumber = row.GetValueOrDefault("roomnumber", ""),
                        Description = row.GetValueOrDefault("description", ""),
                        CurrentRoomType = row.GetValueOrDefault("currentroomtype", ""),
                        UpgradedRoomType = row.GetValueOrDefault("upgradedroomtype", ""),
                        Rate = TryParseDecimal(row, "rate"),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("date")),
                        Status = row.GetValueOrDefault("status", "Requested"),
                        Approver = row.GetValueOrDefault("approver"),
                        ApproveOrder = TryParseInt(row, "approveorder"),
                        History = tablesData.GetValueOrDefault("upgradeactions", new())
                            .Where(a => a.GetValueOrDefault("reqid") == row["id"])
                            .Select(a => new HistoryRecord
                            {
                                Approver = a.GetValueOrDefault("approver"),
                                Action = a.GetValueOrDefault("action"),
                                Date = ParseDateTime(a.GetValueOrDefault("date")),
                                Note = a.GetValueOrDefault("note")
                            }).ToList()
                    }).ToList();

                    await _context.UpgradeRequests.DeleteManyAsync(_ => true);
                    if (uList.Any()) await _context.UpgradeRequests.InsertManyAsync(uList);
                }

                // 11. BEO
                if (tablesData.TryGetValue("beo", out var beos))
                {
                    var bList = beos.Select(row => new Beo
                    {
                        SqlId = TryParseInt(row, "id"),
                        Requestor = row.GetValueOrDefault("requester", ""),
                        RequestDate = ParseDateTime(row.GetValueOrDefault("requestdate")),
                        DateFrom = ParseDateTimeNullable(row.GetValueOrDefault("datefrom")),
                        DateTo = ParseDateTimeNullable(row.GetValueOrDefault("dateto")),
                        Notes = row.GetValueOrDefault("notes", ""),
                        HasAttachment = row.GetValueOrDefault("hasattach", "NO")
                    }).ToList();

                    await _context.Beos.DeleteManyAsync(_ => true);
                    if (bList.Any()) await _context.Beos.InsertManyAsync(bList);
                }

                return Ok(new { message = "Migration completed successfully", tablesMapped = tablesData.Keys });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal error: {ex.Message}\n{ex.StackTrace}");
            }
        }

        private int TryParseInt(Dictionary<string, string> row, string key)
        {
            if (row.TryGetValue(key, out var val) && !string.IsNullOrEmpty(val) && int.TryParse(val, out var res)) return res;
            return 0;
        }

        private decimal TryParseDecimal(Dictionary<string, string> row, string key)
        {
            if (row.TryGetValue(key, out var val) && !string.IsNullOrEmpty(val) && decimal.TryParse(val, NumberStyles.Any, CultureInfo.InvariantCulture, out var res)) return res;
            return 0;
        }

        private Dictionary<string, List<Dictionary<string, string>>> ParseSqlDump(string sql)
        {
            var result = new Dictionary<string, List<Dictionary<string, string>>>(StringComparer.OrdinalIgnoreCase);
            
            var insertRegex = new Regex(@"INSERT INTO `(?<table>.*?)` \((?<cols>.*?)\) VALUES\s*(?<rows>.*?);", RegexOptions.Singleline | RegexOptions.IgnoreCase);
            
            foreach (Match match in insertRegex.Matches(sql))
            {
                var tableName = match.Groups["table"].Value;
                var cols = match.Groups["cols"].Value.Split(',').Select(c => c.Trim(' ', '`')).ToList();
                var rowsPart = match.Groups["rows"].Value.Trim();

                if (!result.ContainsKey(tableName)) result[tableName] = new List<Dictionary<string, string>>();

                var rows = ParseRows(rowsPart);
                foreach (var rowString in rows)
                {
                    var values = ParseSqlValues(rowString);
                    var rowDict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    for (int i = 0; i < cols.Count && i < values.Count; i++)
                    {
                        rowDict[cols[i]] = values[i];
                    }
                    result[tableName].Add(rowDict);
                }
            }

            return result;
        }

        private List<string> ParseRows(string rowsPart)
        {
            var result = new List<string>();
            var current = "";
            int parenLevel = 0;
            bool inString = false;

            for (int i = 0; i < rowsPart.Length; i++)
            {
                char c = rowsPart[i];
                if (c == '\'' && (i == 0 || rowsPart[i-1] != '\\')) inString = !inString;

                if (!inString)
                {
                    if (c == '(') parenLevel++;
                    if (c == ')') parenLevel--;
                }

                if (c == ',' && parenLevel == 0 && !inString)
                {
                    result.Add(current.Trim().Trim('(', ')'));
                    current = "";
                }
                else
                {
                    current += c;
                }
            }
            if (!string.IsNullOrWhiteSpace(current))
            {
                result.Add(current.Trim().Trim('(', ')'));
            }
            return result;
        }

        private List<string> ParseSqlValues(string rowString)
        {
            var result = new List<string>();
            var current = "";
            bool inString = false;

            for (int i = 0; i < rowString.Length; i++)
            {
                char c = rowString[i];
                if (c == '\'' && (i == 0 || rowString[i-1] != '\\')) inString = !inString;

                if (c == ',' && !inString)
                {
                    result.Add(CleanValue(current));
                    current = "";
                }
                else
                {
                    current += c;
                }
            }
            result.Add(CleanValue(current));
            return result;
        }

        private string CleanValue(string val)
        {
            val = val.Trim();
            if (val.Equals("NULL", StringComparison.OrdinalIgnoreCase)) return "";
            if (val.Length >= 2 && val.StartsWith("'") && val.EndsWith("'"))
            {
                val = val.Substring(1, val.Length - 2);
                val = val.Replace("\\'", "'").Replace("\\\"", "\"").Replace("\\n", "\n").Replace("\\r", "\r");
            }
            return val;
        }

        private DateTime ParseDateTime(string dateStr)
        {
            if (string.IsNullOrWhiteSpace(dateStr)) return DateTime.UtcNow;
            if (DateTime.TryParse(dateStr, out var dt)) return dt;
            return DateTime.UtcNow;
        }

        private DateTime? ParseDateTimeNullable(string dateStr)
        {
            if (string.IsNullOrWhiteSpace(dateStr)) return null;
            if (DateTime.TryParse(dateStr, out var dt)) return dt;
            return null;
        }
    }
}
