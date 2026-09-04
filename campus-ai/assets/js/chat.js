/**
 * Campus AI — Frontend Chat Client
 * Location: assets/js/chat.js
 */

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const questionInput = document.getElementById('question-input');
    const messagesContainer = document.getElementById('messages-container');
    const sendBtn = document.getElementById('send-btn');
    const promptChips = document.querySelectorAll('.prompt-chip');

    // Auto-resize textarea
    questionInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Pitch demo prompt chips
    promptChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            if (query) {
                questionInput.value = query;
                questionInput.style.height = 'auto';
                sendMessage(query);
            }
        });
    });

    // Handle form submit
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const question = questionInput.value.trim();
        if (!question) return;
        sendMessage(question);
    });

    async function sendMessage(question) {
        // Append user bubble
        appendUserMessage(question);
        questionInput.value = '';
        questionInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Append Thinking placeholder
        const thinkingId = appendThinkingBubble();
        scrollToBottom();

        try {
            const response = await fetch('api/chat.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            const data = await response.json();
            removeThinkingBubble(thinkingId);

            if (data.success) {
                appendAIMessage(data.answer, data.sources || []);
            } else {
                appendErrorMessage(data.error || "Sorry, I couldn't process that question right now.");
            }
        } catch (error) {
            removeThinkingBubble(thinkingId);
            appendErrorMessage("Sorry, I couldn't process that question right now. Please check server logs.");
        } finally {
            sendBtn.disabled = false;
            scrollToBottom();
            questionInput.focus();
        }
    }

    function appendUserMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper user-message-wrapper';
        wrapper.innerHTML = `
            <div class="message-avatar user-avatar">U</div>
            <div class="message-content">
                <div class="message-bubble user-bubble">${escapeHtml(text)}</div>
            </div>
        `;
        messagesContainer.appendChild(wrapper);
    }

    function appendThinkingBubble() {
        const id = 'thinking-' + Date.now();
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper ai-message-wrapper';
        wrapper.id = id;
        wrapper.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="message-bubble ai-bubble">
                    <div class="thinking-indicator">
                        <span class="dot-pulse"></span>
                        <span>Retrieving documents & student experiences...</span>
                    </div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(wrapper);
        return id;
    }

    function removeThinkingBubble(id) {
        const elem = document.getElementById(id);
        if (elem) elem.remove();
    }

    function appendAIMessage(answerText, sources) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper ai-message-wrapper';

        // Parse sections if formatted with Markdown or headers
        let formattedContent = '';
        
        // Check if sections are structured
        const hasOfficial = answerText.includes('OFFICIAL');
        const hasExperience = answerText.includes('STUDENT') || answerText.includes('EXPERIENCE');

        if (hasOfficial || hasExperience) {
            // Render structured cards
            formattedContent = renderStructuredResponse(answerText);
        } else {
            formattedContent = `<div class="rag-card-text">${escapeHtml(answerText).replace(/\n/g, '<br>')}</div>`;
        }

        // Sources chips
        let sourcesHtml = '';
        if (sources && sources.length > 0) {
            const sourceTags = sources.map(s => {
                const isOfficial = s.type === 'official';
                const tagClass = isOfficial ? 'official-source-tag' : 'student-source-tag';
                const prefix = isOfficial ? '📜 Official: ' : '🎓 Experience: ';
                const pageText = s.page ? ` (${escapeHtml(s.page)})` : '';
                return `<span class="source-tag ${tagClass}">${prefix}${escapeHtml(s.title)}${pageText}</span>`;
            }).join('');

            sourcesHtml = `
                <div class="sources-container">
                    <span class="sources-label">Sources:</span>
                    ${sourceTags}
                </div>
            `;
        }

        wrapper.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="message-bubble ai-bubble">
                    ${formattedContent}
                    ${sourcesHtml}
                </div>
            </div>
        `;

        messagesContainer.appendChild(wrapper);
    }

    function renderStructuredResponse(text) {
        // Clean markdown headings
        let officialPart = '';
        let experiencePart = '';
        let otherPart = '';

        const lines = text.split('\n');
        let currentMode = 'other';

        for (const line of lines) {
            const upper = line.toUpperCase();
            if (upper.includes('OFFICIAL UNIVERSITY') || upper.includes('OFFICIAL INFORMATION') || upper.includes('### OFFICIAL')) {
                currentMode = 'official';
                continue;
            } else if (upper.includes('STUDENT') && (upper.includes('EXPERIENCE') || upper.includes('PRACTICAL')) || upper.includes('### STUDENT')) {
                currentMode = 'experience';
                continue;
            } else if (upper.includes('NEXT STEPS') || upper.includes('### ACTIONABLE')) {
                currentMode = 'other';
            }

            if (currentMode === 'official') {
                officialPart += line + '\n';
            } else if (currentMode === 'experience') {
                experiencePart += line + '\n';
            } else {
                otherPart += line + '\n';
            }
        }

        let html = '';

        if (officialPart.trim()) {
            html += `
                <div class="rag-card official-card">
                    <div class="card-badge official-badge">
                        <span>🏛️ Official University Policy</span>
                    </div>
                    <div class="rag-card-text">${escapeHtml(officialPart.trim()).replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }

        if (experiencePart.trim()) {
            html += `
                <div class="rag-card student-card">
                    <div class="card-badge student-badge">
                        <span>🎓 Real Student Experience & Practical Advice</span>
                    </div>
                    <div class="rag-card-text">${escapeHtml(experiencePart.trim()).replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }

        if (otherPart.trim()) {
            html += `<div class="rag-card-text" style="margin-top: 8px;">${escapeHtml(otherPart.trim()).replace(/\n/g, '<br>')}</div>`;
        }

        return html || `<div class="rag-card-text">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
    }

    function appendErrorMessage(msg) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper ai-message-wrapper';
        wrapper.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="message-bubble ai-bubble" style="border-color: #fecaca; background: #fef2f2; color: #991b1b;">
                    ${escapeHtml(msg)}
                </div>
            </div>
        `;
        messagesContainer.appendChild(wrapper);
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
