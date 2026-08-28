import { useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/src/store/store';
import {
  fetchMyActiveNote,
  createCommunityNote,
  deleteCommunityNote,
} from '../store/communityNoteSlice';
import { NoteCategory, PRESET_NOTE_OPTIONS } from '../types/communityNoteTypes';

export const formatExpirationCountdown = (expiresAt?: string): string => {
  if (!expiresAt) return '';
  const now = new Date().getTime();
  const exp = new Date(expiresAt).getTime();
  const diffMinutes = Math.max(0, Math.floor((exp - now) / 60000));

  if (diffMinutes <= 0) return 'Expired';
  if (diffMinutes < 60) return `Expires in ${diffMinutes}m`;
  const hours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  return `Expires in ${hours}h ${remainingMins}m`;
};

export const useCommunityNote = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { myActiveNote, loading, error } = useSelector(
    (state: RootState) => (state as any).communityNote
  );

  const [composerOpen, setComposerOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>('GENERAL');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');

  useEffect(() => {
    dispatch(fetchMyActiveNote());
  }, [dispatch]);

  const handlePublishNote = useCallback(async () => {
    if (!noteText.trim() || noteText.trim().length > 80) return;
    const res = await dispatch(
      createCommunityNote({
        text: noteText.trim(),
        category: selectedCategory,
        emoji: selectedEmoji,
      })
    );

    if (createCommunityNote.fulfilled.match(res)) {
      setComposerOpen(false);
      setNoteText('');
    }
  }, [dispatch, noteText, selectedCategory, selectedEmoji]);

  const handleDeleteNote = useCallback(async () => {
    if (!myActiveNote?._id && !myActiveNote?.id) return;
    const noteId = myActiveNote._id || myActiveNote.id || '';
    await dispatch(deleteCommunityNote(noteId));
  }, [dispatch, myActiveNote]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const option = PRESET_NOTE_OPTIONS.find((p) => p.id === presetId);
      if (option) {
        setNoteText(option.defaultText);
        setSelectedCategory(option.category);
        setSelectedEmoji(option.emoji);
      }
    },
    []
  );

  return {
    myActiveNote,
    loading,
    error,
    composerOpen,
    setComposerOpen,
    noteText,
    setNoteText,
    selectedCategory,
    setSelectedCategory,
    selectedEmoji,
    setSelectedEmoji,
    onPublish: handlePublishNote,
    onDelete: handleDeleteNote,
    onSelectPreset: handleSelectPreset,
    expirationFormatted: formatExpirationCountdown(myActiveNote?.expiresAt),
  };
};

export default useCommunityNote;
