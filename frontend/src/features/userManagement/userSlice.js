import { createSlice } from '@reduxjs/toolkit'

export const MOCK_USERS = [
  { id: 1, name: 'Ahmed Al-Rashidi',  email: 'ahmed@ajv.sa',    role: 'Super Admin',                    status: 'Active'   },
  { id: 2, name: 'Sara Al-Otaibi',   email: 'sara@ajv.sa',     role: 'Branch Manager',                 status: 'Active'   },
  { id: 3, name: 'Khalid Mahmoud',   email: 'khalid@ajv.sa',   role: 'Branch Manager',                 status: 'Inactive' },
  { id: 4, name: 'Noor Al-Zahrani',  email: 'noor@ajv.sa',     role: 'Super Admin, System Auditor',    status: 'Active'   },
  { id: 5, name: 'Faisal Al-Ghamdi', email: 'faisal@ajv.sa',   role: 'Branch Manager',                 status: 'Inactive' },
]

export const ROLES = ['Super Admin', 'Branch Manager', 'System Auditor']
export const STATUS_OPTIONS = ['Active', 'Inactive']

const initialState = {
  users: MOCK_USERS,
  searchQuery: '',
  selectedRoles: [],
  statusFilter: ['Active', 'Inactive'],
  currentPage: 1,
  rowsPerPage: 10,
}

const userSlice = createSlice({
  name: 'userManagement',
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload
    },
    toggleRole: (state, action) => {
      const role = action.payload
      if (state.selectedRoles.includes(role)) {
        state.selectedRoles = state.selectedRoles.filter((r) => r !== role)
      } else {
        state.selectedRoles.push(role)
      }
    },
    toggleStatus: (state, action) => {
      const status = action.payload
      if (state.statusFilter.includes(status)) {
        state.statusFilter = state.statusFilter.filter((s) => s !== status)
      } else {
        state.statusFilter.push(status)
      }
    },
    clearRoleFilter: (state) => {
      state.selectedRoles = []
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
    setRowsPerPage: (state, action) => {
      state.rowsPerPage = action.payload
    },
    deleteUser: (state, action) => {
      const id = action.payload
      state.users = state.users.filter((u) => u.id !== id)
    },
    addInvitedUser: (state, action) => {
      const email = action.payload
      const nextId = state.users.length > 0 ? Math.max(...state.users.map((u) => u.id)) + 1 : 1
      state.users.push({
        id: nextId,
        name: email.split('@')[0],
        email,
        role: 'Branch Manager',
        status: 'Inactive',
      })
    },
  },
})

export const {
  setSearchQuery,
  toggleRole,
  toggleStatus,
  clearRoleFilter,
  setCurrentPage,
  setRowsPerPage,
  deleteUser,
  addInvitedUser,
} = userSlice.actions

export default userSlice.reducer
