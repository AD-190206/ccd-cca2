# Task Tracker

Small Node.js/Express web app (add, complete, filter and delete tasks) used for the
CCA 2 CI/CD pipeline assignment.

## Run locally
    npm install
    npm test
    npm start      # http://localhost:3000

## API
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Liveness check |
| GET | /api/info | App name, version, pod hostname |
| GET | /api/stats | Task counts |
| GET | /api/tasks?status=all\|active\|done | List tasks |
| POST | /api/tasks | Create task `{title, priority}` |
| PATCH | /api/tasks/:id | Update `title`, `priority` or `done` |
| DELETE | /api/tasks/:id | Delete task |
