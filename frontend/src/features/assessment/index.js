// Public Feature API exports for assessment module

export { default as assessmentService } from './services/assessment.service.js'

export {
  fetchAssessments,
  createNewAssessment,
  modifyAssessment,
  clearAssessmentError,
  setActiveTemplate,
} from './store/assessmentSlice.js'

export { default as useAssessment } from './hooks/useAssessment.js'
