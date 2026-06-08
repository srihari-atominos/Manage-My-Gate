System Task: You are an expert frontend architect. This is Phase 3. We are configuring the frontend directory using a Feature-Based Architecture and Redux Toolkit.

1. Frontend Architectural Rules (Acknowledge & Enforce):

Feature-Based folder structure inside src/features.

Components: Strictly for UI rendering. Fully responsive (mobile, tablet, laptop, desktop). NEVER call APIs directly.

Logic: Business logic and API communication must exist in hooks, feature services, or the state management layer.

No hardcoded API URLs or secrets.

2. Repository Integration & Setup:

Clone or integrate the baseline structure from [FRONTEND_REPO_LINK] into the frontend directory (if applicable, otherwise initialize a Vite/React app).

Install @reduxjs/toolkit and react-redux.

3. Global State & Routing Config:

Create src/store/store.js to configure the global Redux store.

Wrap the root application (main.jsx or index.js) with the Redux <Provider> and a global Router provider (e.g., react-router-dom).

Create an API utility wrapper (e.g., src/utils/apiClient.js using Axios or fetch) that automatically handles attaching tokens/cookies and dynamically sets the base URL from environment variables.

4. Frontend Feature Boilerplate Scaffold:

Inside src/features/sampleFeature, create the structure:

sampleFeatureSlice.js (Redux state, actions, and thunks).

sampleFeatureApi.js (The isolated API communication layer).

/components/ (Presentational UI components).

SampleFeatureView.jsx (The container/page component that connects UI to state).

Execution Output:
Output the final frontend directory structure and the exact terminal commands required to boot the application in parallel (e.g., concurrently running frontend and backend).