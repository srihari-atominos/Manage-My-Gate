import { useEffect, useCallback, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/src/store/store';
import {
  fetchMyActiveNote,
  fetchActiveNotes,
  createCommunityNote,
  deleteCommunityNote,
} from '../store/communityNoteSlice';
import { NoteCategory, PRESET_NOTE_OPTIONS, CommunityNote } from '../types/communityNoteTypes';

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
  const { myActiveNote, activeNotes: rawActiveNotes, loading, error } = useSelector(
    (state: RootState) => (state as any).communityNote || {}
  );

  const [composerOpen, setComposerOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'ALL'>('ALL');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchMyActiveNote());
    dispatch(fetchActiveNotes());
  }, [dispatch]);

  useEffect(() => {
    if (myActiveNote?.text) {
      setNoteText(myActiveNote.text);
      if (myActiveNote.category) setSelectedCategory(myActiveNote.category);
      if (myActiveNote.emoji) setSelectedEmoji(myActiveNote.emoji);
    }
  }, [myActiveNote]);

  const activeNotesList = useMemo(() => {
    const now = new Date().getTime();
    const list = Array.isArray(rawActiveNotes) ? rawActiveNotes : [];
    
    // Filter out expired notes
    const validNotes = list.filter((n) => {
      if (!n.expiresAt) return true;
      return new Date(n.expiresAt).getTime() > now;
    });

    return validNotes.filter((note) => {
      // Category filter
      if (selectedCategory && selectedCategory !== 'ALL' && note.category !== selectedCategory) {
        return false;
      }
      // Search query filter (user name, villa/unit, note text, category)
      if (noteSearchQuery.trim()) {
        const query = noteSearchQuery.trim().toLowerCase();
        const nameMatch = (note.userName || '').toLowerCase().includes(query);
        const unitMatch = (note.userUnit || '').toLowerCase().includes(query);
        const textMatch = (note.text || '').toLowerCase().includes(query);
        const categoryMatch = (note.category || '').toLowerCase().includes(query);
        if (!nameMatch && !unitMatch && !textMatch && !categoryMatch) {
          return false;
        }
      }
      return true;
    });
  }, [rawActiveNotes, selectedCategory, noteSearchQuery]);

  const handlePublishNote = useCallback(async () => {
    if (!noteText.trim() || noteText.trim().length > 80) return;
    const cat = selectedCategory === 'ALL' ? 'GENERAL' : selectedCategory;
    const res = await dispatch(
      createCommunityNote({
        text: noteText.trim(),
        category: cat as NoteCategory,
        emoji: selectedEmoji,
      })
    );

    if (createCommunityNote.fulfilled.match(res)) {
      setComposerOpen(false);
      setNoteText('');
      dispatch(fetchActiveNotes());
    }
  }, [dispatch, noteText, selectedCategory, selectedEmoji]);

  const handleDeleteNote = useCallback(async () => {
    if (!myActiveNote) return;
    const noteId = myActiveNote?._id || myActiveNote?.id || '';
    if (!noteId) return;
    await dispatch(deleteCommunityNote(noteId));
    dispatch(fetchActiveNotes());
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
    activeNotes: activeNotesList,
    totalActiveNotesCount: Array.isArray(rawActiveNotes) ? rawActiveNotes.length : 0,
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
    noteSearchQuery,
    setNoteSearchQuery,
    onPublish: handlePublishNote,
    onDelete: handleDeleteNote,
    onSelectPreset: handleSelectPreset,
    expirationFormatted: formatExpirationCountdown(myActiveNote?.expiresAt),
    refreshActiveNotes: () => dispatch(fetchActiveNotes()),
  };
};

export default useCommunityNote;
