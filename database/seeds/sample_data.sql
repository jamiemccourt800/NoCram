-- database/seeds/sample_data.sql
-- Sample data for testing NoCram

-- Sample user (password: "password123" hashed with bcrypt)
-- Note: This is a bcrypt hash of "password123" with cost factor 10
INSERT INTO users (email, password_hash, name, timezone, semester_start, semester_end)
VALUES 
    ('demo@nocram.app', '$2a$10$rqOXKXLZ2p9xC2QqG8Y.8.kQxZXQJKZ9hQXLZ2p9xC2QqG8Y.8.kQx', 'Demo Student', 'America/New_York', '2026-01-15', '2026-05-15');

-- Get the user ID for foreign keys
DO $$
DECLARE
    demo_user_id INTEGER;
    devops_module_id INTEGER;
    networks_module_id INTEGER;
    software_module_id INTEGER;
    assignment_id INTEGER;
BEGIN
    SELECT id INTO demo_user_id FROM users WHERE email = 'demo@nocram.app';
    
    -- Sample modules
    INSERT INTO modules (user_id, name, code, color, credits)
    VALUES 
        (demo_user_id, 'DevOps & Cloud Computing', 'COMP4050', '#3B82F6', 5);
    
    INSERT INTO modules (user_id, name, code, color, credits)
    VALUES 
        (demo_user_id, 'Computer Networks', 'COMP4030', '#10B981', 5);
    
    INSERT INTO modules (user_id, name, code, color, credits)
    VALUES 
        (demo_user_id, 'Software Engineering', 'COMP4020', '#F59E0B', 5);
    
    SELECT id INTO devops_module_id FROM modules WHERE code = 'COMP4050' AND user_id = demo_user_id;
    SELECT id INTO networks_module_id FROM modules WHERE code = 'COMP4030' AND user_id = demo_user_id;
    SELECT id INTO software_module_id FROM modules WHERE code = 'COMP4020' AND user_id = demo_user_id;
    
    -- Sample assignments with various due dates
    INSERT INTO assignments (user_id, module_id, title, description, due_date, weighting_percent, estimated_hours, status)
    VALUES 
        (demo_user_id, devops_module_id, 'CI/CD Pipeline Project', 'Set up automated deployment pipeline using GitHub Actions and Docker', NOW() + INTERVAL '7 days', 30, 15, 'in_progress'),
        (demo_user_id, devops_module_id, 'Docker Containerization Lab', 'Containerize a multi-service application with docker-compose', NOW() + INTERVAL '14 days', 20, 10, 'not_started'),
        (demo_user_id, networks_module_id, 'Network Security Analysis', 'Analyze common network vulnerabilities and propose solutions', NOW() + INTERVAL '21 days', 25, 12, 'not_started'),
        (demo_user_id, software_module_id, 'Agile Project Management Essay', 'Compare Scrum and Kanban methodologies', NOW() + INTERVAL '10 days', 15, 8, 'not_started'),
        (demo_user_id, networks_module_id, 'TCP/IP Protocol Implementation', 'Implement a basic TCP server and client', NOW() + INTERVAL '28 days', 30, 20, 'not_started');
    
    -- Create sample reminders for the first assignment (7 days out)
    INSERT INTO reminders (assignment_id, user_id, remind_at, type, sent)
    VALUES 
        ((SELECT id FROM assignments WHERE title = 'CI/CD Pipeline Project' AND user_id = demo_user_id), 
         demo_user_id, 
         NOW() + INTERVAL '5 days', 
         'email', 
         FALSE),
        ((SELECT id FROM assignments WHERE title = 'CI/CD Pipeline Project' AND user_id = demo_user_id), 
         demo_user_id, 
         NOW() + INTERVAL '6 days', 
         'in_app', 
         FALSE);
    
    -- Create notification preferences for demo user
    INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, in_app_enabled, default_reminder_days)
    VALUES (demo_user_id, TRUE, FALSE, TRUE, '7,3,1')
    ON CONFLICT (user_id) DO NOTHING;
    
END $$;
