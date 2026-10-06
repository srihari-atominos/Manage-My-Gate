import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import configureStore from 'redux-mock-store'
import { BrowserRouter } from 'react-router-dom'
import thunk from 'redux-thunk'
import CreateOrganizationWizard from '../views/CreateOrganizationWizard'
import '@testing-library/jest-dom'

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => opts?.defaultValue || key }),
}))

// Mock organizationApi
jest.mock('../services/organizationApi.js', () => ({
  checkOrganizationName: jest.fn().mockResolvedValue({ data: { available: true } }),
}))

const mockStore = configureStore([thunk])

describe('CreateOrganizationWizard Flow', () => {
  let store

  beforeEach(() => {
    store = mockStore({
      organization: {
        createLoading: false,
        createError: null,
      },
    })
  })

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <BrowserRouter>
          <CreateOrganizationWizard />
        </BrowserRouter>
      </Provider>,
    )

  it('renders Step 1 Organization Info by default', () => {
    renderComponent()
    expect(screen.getByText('Create Organization')).toBeInDocument()
    expect(screen.getByLabelText('Organization Name')).toBeInDocument()
  })

  it('validates Step 1 and blocks navigation on empty required fields', async () => {
    renderComponent()
    fireEvent.click(screen.getByText('Next'))

    await waitFor(() => {
      expect(screen.getByText('Organization Name is required')).toBeInDocument()
      expect(screen.getByText('Contact Email is required')).toBeInDocument()
    })
  })

  it('navigates to Step 2 when Step 1 is valid', async () => {
    renderComponent()
    fireEvent.change(screen.getByLabelText('Organization Name'), { target: { value: 'Test Org' } })
    fireEvent.change(screen.getByLabelText('Contact Phone Number'), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText('Contact Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'India' } })
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'KA' } })
    fireEvent.change(screen.getByLabelText('Timezone (e.g. Asia/Kolkata)'), { target: { value: 'Asia/Kolkata' } })

    fireEvent.click(screen.getByText('Next'))

    await waitFor(() => {
      expect(screen.getByText('Community Admin Configuration')).toBeInDocument()
    })
  })
})
