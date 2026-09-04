<?php
/**
 * Campus AI — Login Screen
 * Location: index.php
 */

require_once __DIR__ . '/auth/session.php';

// If already logged in, redirect straight to chat
if (isAuthenticated()) {
    header('Location: chat.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campus AI — Your university, explained.</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="auth-body">
    <div class="auth-container">
        <div class="auth-card">
            <div class="brand-header">
                <div class="brand-badge">
                    <span class="badge-dot"></span>
                    <span>AI-Powered University Assistant</span>
                </div>
                <h1 class="brand-title">Campus AI</h1>
                <p class="brand-tagline">Your university, explained.</p>
                <p class="brand-subtext">Official handbooks & policies + Real curated student experiences.</p>
            </div>

            <div id="error-box" class="error-banner" style="display: none;"></div>

            <form id="login-form" class="auth-form">
                <div class="form-group">
                    <label for="email">Student Email</label>
                    <input type="email" id="email" name="email" value="demo@student.com" placeholder="name@university.edu" required autocomplete="email">
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" value="campus2026" placeholder="••••••••" required autocomplete="current-password">
                </div>

                <button type="submit" id="submit-btn" class="primary-btn">
                    <span>Log In to Campus AI</span>
                    <span class="btn-arrow">→</span>
                </button>
            </form>

            <div class="demo-seed-box">
                <div class="demo-seed-header">
                    <span class="demo-chip">Startup Pitch Demo Account</span>
                </div>
                <div class="demo-creds">
                    <div><strong>Email:</strong> <code>demo@student.com</code></div>
                    <div><strong>Password:</strong> <code>campus2026</code></div>
                </div>
                <button type="button" id="quick-login-btn" class="secondary-btn">
                    ⚡ Auto-Fill & Instant Login
                </button>
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('login-form');
        const errBox = document.getElementById('error-box');
        const submitBtn = document.getElementById('submit-btn');
        const quickBtn = document.getElementById('quick-login-btn');

        async function handleLogin(email, password) {
            errBox.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Verifying credentials...</span>';

            try {
                const res = await fetch('auth/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (data.success) {
                    window.location.href = 'chat.php';
                } else {
                    errBox.textContent = data.error || 'Invalid credentials';
                    errBox.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>Log In to Campus AI</span><span class="btn-arrow">→</span>';
                }
            } catch (e) {
                errBox.textContent = 'Network or server error. Please try again.';
                errBox.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Log In to Campus AI</span><span class="btn-arrow">→</span>';
            }
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            handleLogin(email, password);
        });

        quickBtn.addEventListener('click', () => {
            document.getElementById('email').value = 'demo@student.com';
            document.getElementById('password').value = 'campus2026';
            handleLogin('demo@student.com', 'campus2026');
        });
    </script>
</body>
</html>
