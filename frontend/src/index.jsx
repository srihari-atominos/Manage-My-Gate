import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store/store'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import './i18n.js'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Provider store={store}>
      <App />
    </Provider>
  </ErrorBoundary>,
)
