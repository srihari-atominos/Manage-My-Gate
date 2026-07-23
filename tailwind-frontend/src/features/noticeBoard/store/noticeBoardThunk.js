import { createAsyncThunk } from '@reduxjs/toolkit'
import noticeBoardService from '../services/noticeBoard.service.js'

export const fetchNotices = createAsyncThunk(
  'noticeBoard/fetchNotices',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { search, filters, pagination, sort } = getState().noticeBoard
      const response = await noticeBoardService.getNotices(search, filters, pagination, sort)

      return {
        notices: response.data || [],
        pagination: response.pagination || { currentPage: 1, totalPages: 1, totalRecords: 0 },
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch notices'
      return rejectWithValue(errorMsg)
    }
  },
)

export const fetchNoticeById = createAsyncThunk(
  'noticeBoard/fetchNoticeById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.getNoticeById(id)
      const payload = response.data || response
      return payload
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || 'Failed to fetch notice details'
      return rejectWithValue(errorMsg)
    }
  },
)

export const createNotice = createAsyncThunk(
  'noticeBoard/createNotice',
  async (noticeData, { dispatch, rejectWithValue }) => {
    try {
      const response = await noticeBoardService.createNotice(noticeData)
      dispatch(fetchNotices())
      dispatch(fetchNoticeStats())
      return response.data || response
    } catch (error) {
      let errorMsg = error.response?.data?.message || error.message || 'Failed to create notice'
      if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
        errorMsg = error.response.data.details.map((d) => d.message).join(', ')
      }
      return rejectWithValue(errorMsg)
    }
  },
)

export const updateNotice = createAsyncThunk(
  'noticeBoard/updateNotice',
  async ({ id, noticeData }, { dispatch, rejectWithValue }) => {
    try {
      const response = await noticeBoardService.updateNotice(id, noticeData)
      dispatch(fetchNotices())
      dispatch(fetchNoticeStats())
      return response.data || response
    } catch (error) {
      let errorMsg = error.response?.data?.message || error.message || 'Failed to update notice'
      if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
        errorMsg = error.response.data.details.map((d) => d.message).join(', ')
      }
      return rejectWithValue(errorMsg)
    }
  },
)

export const deleteNotice = createAsyncThunk(
  'noticeBoard/deleteNotice',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const response = await noticeBoardService.deleteNotice(id)
      dispatch(fetchNotices())
      dispatch(fetchNoticeStats())
      return response.data || response
    } catch (error) {
      let errorMsg = error.response?.data?.message || error.message || 'Failed to delete notice'
      if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
        errorMsg = error.response.data.details.map((d) => d.message).join(', ')
      }
      return rejectWithValue(errorMsg)
    }
  },
)

export const togglePin = createAsyncThunk(
  'noticeBoard/togglePin',
  async ({ id, isPinned }, { dispatch, rejectWithValue }) => {
    try {
      const response = await noticeBoardService.togglePin(id, isPinned)
      dispatch(fetchNoticeStats())
      return response.data || response
    } catch (error) {
      let errorMsg = error.response?.data?.message || error.message || 'Failed to toggle notice pin'
      if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
        errorMsg = error.response.data.details.map((d) => d.message).join(', ')
      }
      return rejectWithValue(errorMsg)
    }
  },
)

export const fetchNoticeStats = createAsyncThunk(
  'noticeBoard/fetchNoticeStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.getNoticeStats()
      return response.data || response
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || 'Failed to fetch notice statistics'
      return rejectWithValue(errorMsg)
    }
  },
)

export const markAsRead = createAsyncThunk(
  'noticeBoard/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.markAsRead(id)
      return response.data || response
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || 'Failed to mark notice as read'
      return rejectWithValue(errorMsg)
    }
  },
)

export const bookmarkNotice = createAsyncThunk(
  'noticeBoard/bookmarkNotice',
  async ({ id, isBookmarked }, { rejectWithValue }) => {
    try {
      const response = await noticeBoardService.bookmarkNotice(id, isBookmarked)
      return response.data || response
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to bookmark notice'
      return rejectWithValue(errorMsg)
    }
  },
)
