# MyAI — Personal AI Coding IDE

Self-hosted AI coding assistant. Claude Haiku, Sonnet + Qwen3 Coder via aicredits.in.

## Run locally
```bash
npm install
cp .env.example .env   # fill in your keys
node server.js
# Open http://localhost:8080
```

## Environment Variables
| Variable | Description |
|---|---|
| API_KEY | aicredits.in API key |
| API_BASE_URL | https://api.aicredits.in/v1 |
| GITHUB_TOKEN | GitHub PAT (repo scope) |
| GCP_PROJECT | GCP project ID |

## Deploy to GCP Cloud Run
```bash
docker build -t gcr.io/gen-lang-client-0794202345/myai:latest .
docker push gcr.io/gen-lang-client-0794202345/myai:latest

gcloud run deploy myai \
  --image gcr.io/gen-lang-client-0794202345/myai:latest \
  --platform managed \
  --region asia-south1 \
  --project gen-lang-client-0794202345 \
  --allow-unauthenticated \
  --set-env-vars API_KEY=your-key,GITHUB_TOKEN=your-token,GCP_PROJECT=gen-lang-client-0794202345
```

## Repo
https://github.com/shantanunitinkulkaarni-ts/myai
