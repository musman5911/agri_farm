# Usman Agri Farm - Image 02 Redesign

This build applies the Image 02 visual direction to the application while preserving the existing React state, API calls, CRUD handlers, admin menu, confirmation system, exports, backup/report workflows, and database/backend files.

## Run locally

```powershell
cd frontend
npm install
npm run dev
```

Open the localhost URL shown by Vite.

## Main UI changes

- Image 02 style farm header and field backdrop
- Left green navigation rail
- Crop Manager hero and KPI strip
- My Crops photo cards with status/progress/actions
- Recent Activities
- Weather & Farming Tips
- Quick Actions
- Responsive mobile/tablet behavior
- Matching dark mode treatment
- Existing feature tabs remain available

## Important

The original `frontend/public/logo.png` is used. Crop-card photos are local assets under `frontend/public/crop_cards/`, so the UI does not depend on an external image host.


## UI cleanup applied
- Top navigation uses a dedicated activeNav key so only one nav item can be highlighted.
- Removed the hidden duplicate feature-tab navigation from the rendered JSX.
- Development service workers are unregistered and AgriFarm caches cleared automatically to prevent stale UI.
- Production PWA cache version bumped to v3.
