using BeGreen.Api.Models;
using MongoDB.Driver;
using BCrypt.Net;

namespace BeGreen.Api.Data
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(MongoDbContext context)
        {
            // Seed Roles
            var rolesCount = await context.Roles.CountDocumentsAsync(_ => true);
            if (rolesCount == 0)
            {
                var roles = new List<Role>
                {
                    new Role { Name = "Admin" },
                    new Role { Name = "User" },
                    new Role { Name = "Supervisor" },
                    new Role { Name = "Head of Department" },
                    new Role { Name = "Head of Division" },
                    new Role { Name = "General Cashier" }
                };
                await context.Roles.InsertManyAsync(roles);
            }

            // Seed Divisions
            var divisionsCount = await context.Divisions.CountDocumentsAsync(_ => true);
            if (divisionsCount == 0)
            {
                var division = new Division { Name = "Administration" };
                await context.Divisions.InsertOneAsync(division);
            }

            // Seed Departments
            var departmentsCount = await context.Departments.CountDocumentsAsync(_ => true);
            if (departmentsCount == 0)
            {
                var department = new Department 
                { 
                    Name = "Information Technology", 
                    Division = "Administration",
                    SqlId = 1 
                };
                await context.Departments.InsertOneAsync(department);
            }

            // Seed Admin User
            var adminUser = await context.Users.Find(u => u.Login == "admin").FirstOrDefaultAsync();
            if (adminUser == null)
            {
                var admin = new User
                {
                    Name = "System Administrator",
                    Email = "admin@begreen.com",
                    Login = "admin",
                    Password = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = "Admin",
                    Department = "Information Technology",
                    Division = "Administration",
                    Status = 1,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await context.Users.InsertOneAsync(admin);
            }
        }
    }
}
