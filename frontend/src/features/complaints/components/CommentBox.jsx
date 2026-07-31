import React, { useState } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import toast from 'react-hot-toast'

const CommentBox = ({ complaintId, onCommentAdded }) => {
  const { addComment } = useComplaints()
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!remarks.trim()) return

    try {
      setIsSubmitting(true)
      await addComment(complaintId, { remarks })
      setRemarks('')
      toast.success('Comment added successfully')
      if (onCommentAdded) onCommentAdded()
    } catch (error) {
      toast.error('Failed to add comment')
      console.error('Failed to add comment', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="comment-box">
      <h4 style={{ marginBottom: '16px' }} className="fs-5">
        Add Comment
      </h4>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <textarea
            className="form-control"
            rows="3"
            placeholder="Type your comment here..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!remarks.trim() || isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  )
}

export default CommentBox
