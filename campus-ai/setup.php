<?php
/**
 * Campus AI — Setup & Seeding Script
 * Location: setup.php
 * Usage: php setup.php OR visit via browser /setup.php
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

header('Content-Type: text/plain');

echo "==================================================\n";
echo "Campus AI — Prototype Setup & Database Initializer\n";
echo "==================================================\n\n";

// 1. Initialize SQLite Database & Tables
$pdo = getDatabaseConnection();
echo "[1/3] Initializing SQLite database at " . DB_FILE . " ...\n";

// 2. Seed Demo User Account
$demoEmail = 'demo@student.com';
$demoPassword = 'campus2026';
$demoName = 'Alex Rivera (Demo Student)';

$stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
$stmt->execute([':email' => $demoEmail]);
$existing = $stmt->fetch();

if (!$existing) {
    $hashedPassword = password_hash($demoPassword, PASSWORD_DEFAULT);
    $insert = $pdo->prepare("INSERT INTO users (email, password, name) VALUES (:email, :password, :name)");
    $insert->execute([
        ':email' => $demoEmail,
        ':password' => $hashedPassword,
        ':name' => $demoName
    ]);
    echo "[2/3] Seeded demo user:\n";
    echo "      Email: {$demoEmail}\n";
    echo "      Password: {$demoPassword}\n";
} else {
    echo "[2/3] Demo user {$demoEmail} already exists.\n";
}

// 3. Ingest documents and build RAG vector index
echo "[3/3] Running document ingestion & vector indexing...\n";
require_once __DIR__ . '/rag/ingest.php';

echo "\nSUCCESS! Campus AI prototype is fully initialized.\n";
echo "Open /index.php in your browser to start.\n";
