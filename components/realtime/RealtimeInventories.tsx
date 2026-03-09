'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Inventory = Database['public']['Tables']['inventories']['Row']

export default function RealtimeInventories({ 
  initialData,
  children 
}: { 
  initialData: Inventory[]
  children: (data: Inventory[]) => React.ReactNode
}) {
  const [inventories, setInventories] = useState<Inventory[]>(initialData)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventories'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInventories((current) => [payload.new as Inventory, ...current])
          } else if (payload.eventType === 'UPDATE') {
            setInventories((current) =>
              current.map((item) =>
                item.id === (payload.new as Inventory).id ? (payload.new as Inventory) : item
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setInventories((current) =>
              current.filter((item) => item.id !== (payload.old as Inventory).id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return <>{children(inventories)}</>
}
