import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  rescue_request_id: string;
  sender_id: string;
  sender_role: 'client' | 'mechanic';
  message: string | null;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
}

export async function getChatMessages(rescueRequestId: string): Promise<{ data: ChatMessage[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('rescue_chat_messages')
      .select('*')
      .eq('rescue_request_id', rescueRequestId)
      .order('created_at', { ascending: true });

    return { data: data as ChatMessage[] | null, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function sendChatMessage({
  rescueRequestId,
  senderId,
  senderRole,
  message,
  imageUrl,
}: {
  rescueRequestId: string;
  senderId: string;
  senderRole: 'client' | 'mechanic';
  message?: string;
  imageUrl?: string;
}): Promise<{ data: ChatMessage | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('rescue_chat_messages')
      .insert({
        rescue_request_id: rescueRequestId,
        sender_id: senderId,
        sender_role: senderRole,
        message: message || null,
        image_url: imageUrl || null,
      })
      .select()
      .single();

    return { data: data as ChatMessage | null, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function markMessagesAsRead(
  rescueRequestId: string,
  currentUserId: string
): Promise<void> {
  try {
    await supabase
      .from('rescue_chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('rescue_request_id', rescueRequestId)
      .neq('sender_id', currentUserId)
      .is('read_at', null);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

export function subscribeToChatMessages(
  rescueRequestId: string,
  onNewMessage: (message: ChatMessage) => void
) {
  const channel = supabase
    .channel(`rescue_chat_${rescueRequestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rescue_chat_messages',
        filter: `rescue_request_id=eq.${rescueRequestId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(payload.new as ChatMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
