<?php
/**
 * Campus AI — Login Handler
 * Location: auth/login.php
 */

require_once dirname(__DIR__) . '/config/database.php';
require_once __DIR__ . '/session.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?: $_POST;

$email = trim($data['email'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide both email and password.']);
    exit;
}

$pdo = getDatabaseConnection();

// Look up user
$stmt = $pdo->prepare("SELECT id, email, password, name FROM users WHERE email = :email LIMIT 1");
$stmt->execute([':email' => strtolower($email)]);
$user = $stmt->fetch();

// Seeded fallback for pitching demonstration
if (!$user && strtolower($email) === 'demo@student.com' && ($password === 'campus2026' || $password === 'demo123')) {
    $_SESSION['user_id'] = 1;
    $_SESSION['user_email'] = 'demo@student.com';
    $_SESSION['user_name'] = 'Demo Student';

    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => 1,
            'email' => 'demo@student.com',
            'name' => 'Demo Student'
        ]
    ]);
    exit;
}

if ($user && password_verify($password, $user['password'])) {
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_name'] = $user['name'];

    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name']
        ]
    ]);
    exit;
}

http_response_code(401);
echo json_encode([
    'success' => false,
    'error' => 'Invalid email or password. Use demo@student.com / campus2026'
]);
