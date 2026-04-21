import { supabase } from '@/integrations/supabase/client'

/**
 * Sends a Telegram alert message via the backend edge function.
 * @param message - The message text to send (supports HTML formatting)
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-telegram-alert', {
    body: { message },
  })

  if (error) {
    console.error('Failed to send Telegram alert:', error)
    throw error
  }

  return data
}
