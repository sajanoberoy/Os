# Campus AI — "Your University, Explained."
**Startup Pitch Prototype (September 5, 2026)**

Campus AI is a grounded, dual-source AI assistant designed for universities. It combines **Official University Handbooks & Regulations** with **Curated Real Student Experiences**, clearly distinguishing official policy from ground-truth peer advice.

---

## 📁 Project Architecture & File Hierarchy

```
campus-ai/
│
├── index.php                 # Screen 1: Login interface with demo seed
├── chat.php                  # Screen 2: AI Chatbot interface
├── logout.php                # Session destruction & redirect
├── setup.php                 # 1-click DB & RAG vector initializer
│
├── api/
│   └── chat.php              # RAG-orchestrated chat JSON API
│
├── auth/
│   ├── login.php             # Password verification & session issuance
│   └── session.php           # Session guard middleware
│
├── config/
│   ├── config.php            # Environment variables & constants
│   └── database.php          # SQLite/PDO connection
│
├── rag/
│   ├── chunk.php             # Text parser & section chunker
│   ├── embed.php             # Vectorization & Cosine similarity
│   ├── search.php            # Hybrid vector + keyword retriever
│   ├── prompt.php            # Dual-source prompt builder & Gemini API
│   └── ingest.php            # Ingestion batch processor
│
├── data/
│   ├── documents/            # Official University Handbooks (.txt / .md / .pdf)
│   │   ├── student_handbook.txt
│   │   ├── admission_guidelines.txt
│   │   ├── academic_rules.txt
│   │   ├── examination_rules.txt
│   │   └── hostel_rules.txt
│   │
│   ├── experiences/          # Curated Real Student Experiences
│   │   └── student_experiences.json
│   │
│   └── processed/            # Generated vector index & metadata
│       ├── chunks.json
│       └── embeddings.json
│
├── database/
│   ├── campus_ai.sql         # SQL schema definition
│   └── campus_ai.sqlite      # SQLite database file
│
└── assets/
    ├── css/
    │   └── style.css         # Modern, minimal stylesheet
    └── js/
        └── chat.js           # Fetch API chat client with source rendering
```

---

## 🚀 Quick Setup & Local Run (PHP / XAMPP / MAMP / Built-in Server)

### 1. Requirements
- PHP 8.0+ with `pdo_sqlite` and `curl` extensions enabled (standard in all default PHP installs).

### 2. Set Up Database & Ingest Documents
Run the one-time setup script from terminal:
```bash
php setup.php
```
Or open `http://localhost:8000/setup.php` in your browser. This will:
1. Create `database/campus_ai.sqlite`
2. Seed the demo student user (`demo@student.com` / `campus2026`)
3. Chunk and vectorize all documents in `data/documents/` and `data/experiences/`

### 3. Start Local Server
```bash
php -S 0.0.0.0:8000
```
Open `http://localhost:8000` in your browser.

### 4. Optional Gemini API Key
To enable live LLM generation with Gemini 3.7:
- Set `GEMINI_API_KEY` in your environment or edit `config/config.php`.
- *Note:* If no API key is provided, the built-in deterministic RAG engine automatically retrieves and formats grounded responses with zero cost and zero external dependencies!

---

## 🎯 Demo Questions for Live Startup Pitch

1. **"I lost my university ID card. What should I do?"**
   - *Official:* Admin Block A, Room 104, $15 fee at Cashier Window 2, 3-5 days.
   - *Student Experience:* Get temporary gate slip first so security lets you enter campus/library; pay by card at Window 2; keep photo on phone.
2. **"Where do students usually go for document verification?"**
   - *Official:* Multi-Purpose Hall, Wing C, 09:00 AM - 04:00 PM.
   - *Student Experience:* Arrive by 8:15 AM for token counter; desks are split alphabetically.
3. **"What should I carry for document verification?"**
   - *Official:* 3 sets of self-attested photocopies, 4 photos, original marksheets.
   - *Student Experience:* Bring own blue pen, stapler, and glue stick (stationery shop queue is huge).
4. **"I missed a deadline. Who should I contact?"**
   - *Official:* Academic Exception Form AC-10, Dean of Academic Affairs, $25 late fee.
   - *Student Experience:* Don't email helpdesk; go directly to Department Secretary/Advisor at 9:30 AM with signed letter for instant override.
5. **"How do I get my hostel allocation?"**
   - *Official:* Allotment Letter, Hostel Caretaker Desk, Fee Receipt.
   - *Student Experience:* Handed out at Block C Ground Floor; aim for 2nd floor for better Wi-Fi; bring 3-pin extension cord.
