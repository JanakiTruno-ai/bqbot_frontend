# Teams Bot Refactor - Frontend/Backend Split

## Overview
The original `teamsBot.js` has been refactored into two separate components:

### 1. Teams Frontend (`teams_frontend/`)
- **Purpose**: Lightweight Teams bot interface
- **Responsibilities**:
  - Handle Teams conversation events
  - Send welcome messages
  - Forward user queries to backend API
  - Display responses from backend (text, adaptive cards)
  - Show "Processing..." messages

### 2. Backend API (`cloudrun_code/`)
- **Purpose**: All business logic and data processing
- **Responsibilities**:
  - BigQuery queries and data processing
  - Vertex AI calls for query classification, entity extraction, SQL generation
  - Chart generation using Chart.js
  - Adaptive card creation
  - Conversation state management
  - Error handling and retry logic

## Architecture

```
Teams Client → Teams Frontend → Backend API → Google Cloud Services
                    ↓              ↓
               (teamsBot.js)   (server.js)
```

## Environment Variables

### Teams Frontend
- `BACKEND_API_URL` - URL of the backend API (default: http://localhost:3001)

### Backend
- `GCP_PROJECT_ID` - Google Cloud Project ID
- `GCP_LOCATION` - Google Cloud Location
- `PORT` - Server port (default: 3001)

## Deployment

### Teams Frontend
Deploy as a Teams bot using Microsoft 365 Agents Toolkit

### Backend
Deploy to Google Cloud Run:
```bash
cd cloudrun_code
gcloud run deploy analytics-bot-backend --source .
```

## API Endpoints

### POST /api/query
**Request:**
```json
{
  "userQuery": "string",
  "conversationId": "string"
}
```

**Response:**
```json
{
  "type": "text|card|multiple",
  "content": "string|object|array"
}
```

## Key Changes
1. **Separation of Concerns**: Teams-specific code isolated from business logic
2. **Scalability**: Backend can be scaled independently
3. **Maintainability**: Cleaner code organization
4. **Deployment Flexibility**: Different deployment strategies for frontend/backend
5. **Error Handling**: Centralized error handling in backend with graceful frontend fallbacks