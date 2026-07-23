import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const AttorneyContext = createContext({
  pendingDocs:      0,
  unreadMessages:   0,
  activityFeed:     [],
  activityTick:     0,
  reminders:        [],
  refreshCounts:    () => {},
  refreshActivity:  () => {},
  addReminder:      async () => {},
  deleteReminder:   async () => {},
});

export function AttorneyProvider({ children }) {
  const { user } = useAuth();
  const [pendingDocs, setPendingDocs]       = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activityFeed, setActivityFeed]     = useState([]);
  const [activityTick, setActivityTick]     = useState(0);
  const [reminders, setReminders]           = useState([]);

  // Stable ref so realtime callbacks can read the latest client map without recreating subscriptions
  const clientMapRef = useRef({});

  const fetchClientMap = useCallback(async () => {
    if (!user) return [];
    const { data: links } = await supabase
      .from('attorney_clients')
      .select('client_id, profiles!attorney_clients_client_id_fkey(id, full_name, country)')
      .eq('attorney_id', user.id);
    const map = {};
    const ids = [];
    (links ?? []).forEach((l) => {
      if (l.profiles) { map[l.client_id] = l.profiles; ids.push(l.client_id); }
    });
    clientMapRef.current = map;
    return ids;
  }, [user]);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    const clientIds = Object.keys(clientMapRef.current);
    if (clientIds.length) {
      const { count } = await supabase
        .from('roadmap_documents')
        .select('*', { count: 'exact', head: true })
        .in('user_id', clientIds)
        .eq('status', 'uploaded');
      setPendingDocs(count ?? 0);
    } else {
      setPendingDocs(0);
    }
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_id', user.id)
      .eq('read', false);
    setUnreadMessages(msgCount ?? 0);
  }, [user]);

  const fetchActivityFeed = useCallback(async () => {
    if (!user) return;
    const clientIds = Object.keys(clientMapRef.current);
    const cMap      = clientMapRef.current;
    const items     = [];

    if (clientIds.length) {
      // Document uploads
      const { data: docs } = await supabase
        .from('roadmap_documents')
        .select('id, user_id, document_name, step_id, uploaded_at')
        .in('user_id', clientIds)
        .order('uploaded_at', { ascending: false })
        .limit(12);
      (docs ?? []).forEach((d) => {
        const c = cMap[d.user_id];
        items.push({
          id: `doc_${d.id}`,
          type: 'doc',
          icon: 'document-attach-outline',
          iconBg: '#e3f2fd', iconColor: '#1565c0',
          main: `${c?.full_name ?? 'A Client'} uploaded a document`,
          sub: d.document_name ?? `Step ${d.step_id}`,
          time: d.uploaded_at,
          clientName: c?.full_name ?? 'Client',
          clientCountry: c?.country ?? '',
        });
      });

      // Completed roadmap steps
      const { data: steps } = await supabase
        .from('user_progress')
        .select('user_id, step_id, completed_at')
        .in('user_id', clientIds)
        .eq('completed', true)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(8);
      (steps ?? []).forEach((s) => {
        const c = cMap[s.user_id];
        items.push({
          id: `step_${s.user_id}_${s.step_id}`,
          type: 'step',
          icon: 'checkmark-circle-outline',
          iconBg: '#e8f5e9', iconColor: '#2e7d32',
          main: `${c?.full_name ?? 'A Client'} completed a roadmap step`,
          sub: `Step ${s.step_id}`,
          time: s.completed_at,
          clientName: c?.full_name ?? 'Client',
          clientCountry: c?.country ?? '',
        });
      });
    }

    // Messages to attorney
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, from_id, content, created_at')
      .eq('to_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8);
    (msgs ?? []).forEach((m) => {
      const c = cMap[m.from_id];
      items.push({
        id: `msg_${m.id}`,
        type: 'message',
        icon: 'chatbubble-outline',
        iconBg: '#f3e5f5', iconColor: '#7b1fa2',
        main: `${c?.full_name ?? 'A Client'} sent you a message`,
        sub: (m.content?.length ?? 0) > 60 ? m.content.slice(0, 60) + '…' : m.content,
        time: m.created_at,
        clientName: c?.full_name ?? 'Client',
        clientCountry: c?.country ?? '',
      });
    });

    // New client joins
    const { data: newClients } = await supabase
      .from('attorney_clients')
      .select('client_id, linked_at, profiles!attorney_clients_client_id_fkey(full_name, country)')
      .eq('attorney_id', user.id)
      .order('linked_at', { ascending: false })
      .limit(5);
    (newClients ?? []).forEach((nc) => {
      items.push({
        id: `join_${nc.client_id}`,
        type: 'joined',
        icon: 'person-add-outline',
        iconBg: '#fff8e1', iconColor: '#e65100',
        main: 'New client joined your practice',
        sub: nc.profiles?.full_name ?? 'New client',
        time: nc.linked_at,
        clientName: nc.profiles?.full_name ?? 'New client',
        clientCountry: nc.profiles?.country ?? '',
      });
    });

    items.sort((a, b) => new Date(b.time) - new Date(a.time));
    setActivityFeed(items.slice(0, 20));
  }, [user]);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('attorney_reminders')
        .select('*, profiles!attorney_reminders_client_id_fkey(full_name)')
        .eq('attorney_id', user.id)
        .gte('due_date', new Date().toISOString().slice(0, 10))
        .order('due_date')
        .limit(10);
      setReminders(data ?? []);
    } catch {
      setReminders([]);
    }
  }, [user]);

  const addReminder = useCallback(async ({ clientId, clientName, message, dueDate }) => {
    if (!user) return { error: new Error('Not signed in') };
    try {
      const { data, error } = await supabase
        .from('attorney_reminders')
        .insert({ attorney_id: user.id, client_id: clientId, message, due_date: dueDate })
        .select()
        .single();
      if (!error && data) {
        setReminders((prev) =>
          [...prev, { ...data, profiles: { full_name: clientName } }]
            .sort((a, b) => a.due_date.localeCompare(b.due_date))
        );
      }
      return { data, error };
    } catch (e) {
      return { error: e };
    }
  }, [user]);

  const deleteReminder = useCallback(async (id) => {
    try {
      await supabase.from('attorney_reminders').delete().eq('id', id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }, []);

  const onRealtimeEvent = useCallback(() => {
    setActivityTick((t) => t + 1);
    fetchCounts();
    fetchActivityFeed();
  }, [fetchCounts, fetchActivityFeed]);

  useEffect(() => {
    if (!user) return;

    fetchClientMap().then(() => {
      fetchCounts();
      fetchActivityFeed();
      fetchReminders();
    });

    const docCh = supabase
      .channel(`att_ctx_docs_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_documents' }, onRealtimeEvent)
      .subscribe();

    const msgCh = supabase
      .channel(`att_ctx_msgs_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `to_id=eq.${user.id}` }, onRealtimeEvent)
      .subscribe();

    const clientCh = supabase
      .channel(`att_ctx_clients_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attorney_clients', filter: `attorney_id=eq.${user.id}` }, () => {
        fetchClientMap().then(() => onRealtimeEvent());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(docCh);
      supabase.removeChannel(msgCh);
      supabase.removeChannel(clientCh);
    };
  }, [user, fetchClientMap, fetchCounts, fetchActivityFeed, fetchReminders, onRealtimeEvent]);

  return (
    <AttorneyContext.Provider value={{
      pendingDocs, unreadMessages, activityFeed, activityTick, reminders,
      refreshCounts: fetchCounts,
      refreshActivity: fetchActivityFeed,
      addReminder,
      deleteReminder,
    }}>
      {children}
    </AttorneyContext.Provider>
  );
}

export const useAttorney = () => useContext(AttorneyContext);
