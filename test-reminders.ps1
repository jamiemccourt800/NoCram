# Test Reminder System

# Get auth token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@nocram.app","password":"password123"}'

$token = $loginResponse.accessToken
Write-Host "✅ Logged in as test@nocram.app"

# Get modules
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

$modules = Invoke-RestMethod -Uri "http://localhost:4000/api/modules" `
  -Method GET `
  -Headers $headers

$moduleId = $modules[0].id
Write-Host "📚 Using module: $($modules[0].name)"

# Create a test assignment with a deadline 2 days from now
$dueDate = (Get-Date).AddDays(2).ToString("yyyy-MM-ddTHH:mm:ss")

$assignmentBody = @{
  title = "Test Reminder Assignment"
  description = "This assignment is created to test the email reminder system"
  module_id = $moduleId
  due_date = $dueDate
  priority = "high"
  estimated_hours = 3
  status = "pending"
} | ConvertTo-Json

$newAssignment = Invoke-RestMethod -Uri "http://localhost:4000/api/assignments" `
  -Method POST `
  -Headers $headers `
  -Body $assignmentBody

Write-Host "✅ Created test assignment: $($newAssignment.title)"
Write-Host "📅 Due date: $dueDate"
Write-Host ""

# Manually trigger reminder check
Write-Host "🔔 Triggering manual reminder check..."
$reminderResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/reminders/trigger" `
  -Method POST `
  -Headers $headers

Write-Host "✅ $($reminderResponse.message)"
Write-Host ""
Write-Host "Check the server terminal for email preview logs!"
