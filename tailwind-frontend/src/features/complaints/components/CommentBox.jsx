import React, { useState } from 'react';
import { useComplaints } from '../hooks/useComplaints';
import { Button } from '../../../components/ui/button';
import toast from 'react-hot-toast';

const CommentBox = ({ complaintId, onCommentAdded }) => {
  const { addComment } = useComplaints();
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) return;

    try {
      setIsSubmitting(true);
      await addComment(complaintId, { remarks });
      setRemarks('');
      toast.success('Comment added successfully');
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      toast.error('Failed to add comment');
      console.error('Failed to add comment', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 border-t border-stroke dark:border-strokedark pt-6">
      <h4 className="text-base font-bold text-black dark:text-white mb-4">
        Add Comment
      </h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black dark:text-white placeholder-gray-400 outline-none transition focus:border-primary dark:border-strokedark dark:bg-meta-4"
          rows="3"
          placeholder="Type your comment here..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          disabled={!remarks.trim() || isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </form>
    </div>
  );
};

export default CommentBox;
