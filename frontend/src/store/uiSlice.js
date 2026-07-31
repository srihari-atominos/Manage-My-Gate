import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sidebarShow: true,
  sidebarUnfoldable: false,
  theme: 'light',
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarShow: (state, action) => {
      state.sidebarShow = action.payload
    },
    setSidebarUnfoldable: (state, action) => {
      state.sidebarUnfoldable = action.payload
    },
    setTheme: (state, action) => {
      state.theme = action.payload
    },
    setUiState: (state, action) => {
      return { ...state, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    // Intercept legacy dispatch({ type: 'set', sidebarShow: true }) and map to slice state
    builder.addMatcher(
      (action) => action.type === 'set',
      (state, action) => {
        const { type, ...rest } = action
        return { ...state, ...rest }
      },
    )
  },
})

export const { setSidebarShow, setSidebarUnfoldable, setTheme, setUiState } = uiSlice.actions
export default uiSlice.reducer
