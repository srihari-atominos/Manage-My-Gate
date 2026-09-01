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
import { useCommunityNoteSocket } from './useCommunityNoteSocket';

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
  
  // Real-time socket updates for community notes
  useCommunityNoteSocket();

  const { myActiveNote, activeNotes: rawActiveNotes, loading, error } = useSelector(
    (state: RootState) => (state as any).communityNote || {}
  );

  const [composerOpen, setComposerOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  
  // Feed filter (defaults to ALL so notes from all categories are visible to all users)
  const [feedCategoryFilter, setFeedCategoryFilter] = useState<NoteCategory | 'ALL'>('ALL');
  // Composer category (defaults to GENERAL, updated when selecting presets or editing active note)
  const [composerCategory, setComposerCategory] = useState<NoteCategory>('GENERAL');
  const [selectedEmoji, setSelectedEmoji] = useState('💬');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchMyActiveNote());
    dispatch(fetchActiveNotes());
  }, [dispatch]);

  // Sync composer state with user's active note WITHOUT altering the feed filter
  useEffect(() => {
    if (myActiveNote?.text) {
      setNoteText(myActiveNote.text);
      if (myActiveNote.category) setComposerCategory(myActiveNote.category);
      if (myActiveNote.emoji) setSelectedEmoji(myActiveNote.emoji);
    } else if (myActiveNote === null) {
      setNoteText('');
      setComposerCategory('GENERAL');
      setSelectedEmoji('💬');
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
      // Feed Category Filter (only filter if user explicitly selected a category tab in feed)
      if (feedCategoryFilter && feedCategoryFilter !== 'ALL' && note.category !== feedCategoryFilter) {
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
  }, [rawActiveNotes, feedCategoryFilter, noteSearchQuery]);

  const handlePublishNote = useCallback(async () => {
    if (!noteText.trim() || noteText.trim().length > 80) return;
    const res = await dispatch(
      createCommunityNote({
        text: noteText.trim(),
        category: composerCategory,
        emoji: selectedEmoji,
      })
    );

    if (createCommunityNote.fulfilled.match(res)) {
      setComposerOpen(false);
      dispatch(fetchActiveNotes());
    }
  }, [dispatch, noteText, composerCategory, selectedEmoji]);

  const handleDeleteNote = useCallback(async () => {
    if (!myActiveNote) return;
    const noteId = myActiveNote?._id || myActiveNote?.id || '';
    if (!noteId) return;
    await dispatch(deleteCommunityNote(noteId));
    setNoteText('');
    setComposerCategory('GENERAL');
    setSelectedEmoji('💬');
    dispatch(fetchActiveNotes());
  }, [dispatch, myActiveNote]);

  const handleSelectPreset = useCallback(
    (presetId: string, localizedText?: string) => {
      const option = PRESET_NOTE_OPTIONS.find((p) => p.id === presetId);
      if (option) {
        setNoteText(localizedText || option.defaultText);
        setComposerCategory(option.category);
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
    selectedCategory: feedCategoryFilter,
    setSelectedCategory: setFeedCategoryFilter,
    composerCategory,
    setComposerCategory,
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
