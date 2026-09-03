import React, { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { base44 } from "@/api/base44Client";

// Self-contained in-app notification bell for admin staff. Shows the current
// user's notifications (approve/reject outcomes on their submissions) with an
// unread badge. Polls on mount and when the popover opens.
export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      if (!me?.id) return;
      const list = await base44.entities.Notification.filter(
        { recipient_id: me.id },
        "-created_date",
        20
      );
      setItems(list || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadItems = items.filter((n) => !n.read);
    if (!unreadItems.length) return;
    try {
      await base44.entities.Notification.bulkUpdate(
        unreadItems.map((n) => ({ id: n.id, read: true }))
      );
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  };

  const tone = (type) =>
    type === "approved" ? "bg-emerald-100 text-emerald-700"
    : type === "rejected" ? "bg-red-100 text-red-700"
    : "bg-sky-100 text-sky-700";

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <PopoverTrigger asChild>
        <button
          className="relative hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:flex"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`border-b border-border px-3 py-2.5 text-sm ${n.read ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tone(n.type)}`}>
                    {n.type}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {n.created_date ? new Date(n.created_date).toLocaleDateString() : ""}
                  </span>
                </div>
                <p className="mt-1 leading-snug">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}