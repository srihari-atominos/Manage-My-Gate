import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './routes/Router';
import './css/globals.css';
import { ThemeProvider } from './components/provider/theme-provider';
import { Provider, useDispatch, useSelector } from 'react-redux';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import store from './store/store';
// @ts-ignore
import { logout } from './features/auth/store/authSlice';
// @ts-ignore
import { fetchCurrentWorkspace } from './features/workspace/store/workspaceSlice';

function MultiTabSync() {
  const dispatch = useDispatch();
  const currentToken = useSelector((state: any) => state.auth?.token);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // 1. Cross-tab logout: immediately reset session
      if (e.key === 'auth_logout' || (e.key === 'token' && !e.newValue)) {
        if (currentToken) {
          dispatch(logout());
        }
      } else if (e.key === 'token' && e.newValue && e.newValue !== currentToken) {
        // 2. Cross-tab re-authentication: safely re-sync verified session from backend
        dispatch(fetchCurrentWorkspace());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dispatch, currentToken]);

  return null;
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <MultiTabSync />
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
