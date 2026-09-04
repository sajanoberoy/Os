<?php
/**
 * Campus AI — Chatbot Screen
 * Location: chat.php
 */

require_once __DIR__ . '/auth/session.php';
requireAuth();

$user = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campus AI — Live Chat</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="chat-body">
    <!-- Header -->
    <header class="chat-header">
        <div class="header-left">
            <div class="logo-mark">CAI</div>
            <div class="brand-info">
                <h2>Campus AI</h2>
                <span class="brand-subtitle">Your university, explained.</span>
            </div>
        </div>

        <div class="header-center">
            <div class="rag-status-indicator">
                <span class="status-pulse"></span>
                <span>RAG Active (Official + Student Experience)</span>
            </div>
        </div>

        <div class="header-right">
            <div class="user-pill">
                <span class="avatar"><?= strtoupper(substr($user['name'] ?? 'S', 0, 1)) ?></span>
                <span class="user-name"><?= htmlspecialchars($user['name'] ?? 'Student') ?></span>
            </div>
            <a href="logout.php" class="logout-link">Log out</a>
        </div>
    </header>

    <!-- Pitch Demonstration Quick Prompts -->
    <div class="demo-prompts-bar">
        <div class="prompts-label">Pitch Demo Prompts:</div>
        <div class="prompts-scroll">
            <button class="prompt-chip" data-query="I lost my university ID card. What should I do?">
                🪪 I lost my ID card
            </button>
            <button class="prompt-chip" data-query="Where do students usually go for document verification?">
                📍 Document verification venue
            </button>
            <button class="prompt-chip" data-query="What should I carry for document verification?">
                📋 What to carry for verification
            </button>
            <button class="prompt-chip" data-query="I missed a deadline. Who should I contact?">
                ⏰ Missed deadline procedure
            </button>
            <button class="prompt-chip" data-query="How do I get my hostel allocation?">
                🏢 Hostel room allocation
            </button>
            <button class="prompt-chip" data-query="What happens if I don't have my ID card yet?">
                🚪 Campus entry without ID
            </button>
        </div>
    </div>

    <!-- Main Chat Container -->
    <main class="chat-main">
        <div id="messages-container" class="messages-container">
            <!-- Welcome message -->
            <div class="message-wrapper ai-message-wrapper">
                <div class="message-avatar">AI</div>
                <div class="message-content">
                    <div class="message-bubble ai-bubble welcome-bubble">
                        <p><strong>Hi <?= htmlspecialchars($user['name'] ?? 'Student') ?>! What would you like to know?</strong></p>
                        <p class="welcome-desc">
                            Ask me any question about admissions, rules, procedures, or campus life. I combine <strong>Official University Documents</strong> with <strong>Curated Student Practical Experiences</strong> so you get both the official policy and real ground truth.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
            <form id="chat-form" class="chat-input-form">
                <textarea 
                    id="question-input" 
                    placeholder="Ask anything (e.g. I lost my ID card, what should I do?)..." 
                    rows="1" 
                    required
                ></textarea>
                <button type="submit" id="send-btn" class="send-btn" title="Send Question">
                    <span>Send</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
            <div class="input-footer">
                <span>Official policies have higher authority than student experiences • Grounded RAG</span>
            </div>
        </div>
    </main>

    <script src="assets/js/chat.js"></script>
</body>
</html>
