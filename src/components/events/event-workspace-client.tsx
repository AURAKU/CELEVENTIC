"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ListTodo,
  Activity,
  MessageSquare,
  UserPlus,
  Search,
  Send,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";

const COLLABORATOR_ROLES = [
  "LEAD_ORGANIZER",
  "ASSISTANT_ORGANIZER",
  "FINANCE_MANAGER",
  "DESIGN_MANAGER",
  "GUEST_MANAGER",
  "TEAM_MEMBER",
  "FAMILY_MEMBER",
  "VENDOR",
  "VIEW_ONLY",
] as const;

const CHANNELS = ["general", "guests", "design", "finance", "vendors", "urgent", "announcements"];

const VALID_TABS = ["team", "tasks", "activity", "chat"] as const;
type WorkspaceTab = (typeof VALID_TABS)[number];

interface WorkspaceClientProps {
  eventId: string;
  eventTitle: string;
}

type PageMeta = { total: number; pages: number };

function EventWorkspaceClientInner({ eventId, eventTitle }: WorkspaceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const urlTab: WorkspaceTab | null = VALID_TABS.includes(rawTab as WorkspaceTab)
    ? (rawTab as WorkspaceTab)
    : null;
  const [tab, setTab] = useState<WorkspaceTab>(urlTab ?? "team");
  const [collaborators, setCollaborators] = useState<Record<string, unknown>[]>([]);
  const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [channel, setChannel] = useState("general");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [inviteRole, setInviteRole] = useState<string>("ASSISTANT_ORGANIZER");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newTask, setNewTask] = useState("");
  const [chatBody, setChatBody] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    page: teamPage,
    setPage: setTeamPage,
    resetPage: resetTeamPage,
    appendToParams: appendTeamParams,
  } = usePagination(ADMIN_TABLE_LIMIT);
  const {
    page: taskPage,
    setPage: setTaskPage,
    resetPage: resetTaskPage,
    appendToParams: appendTaskParams,
  } = usePagination(ADMIN_TABLE_LIMIT);
  const {
    page: activityPage,
    setPage: setActivityPage,
    appendToParams: appendActivityParams,
  } = usePagination(ADMIN_TABLE_LIMIT);
  const {
    page: chatPage,
    setPage: setChatPage,
    resetPage: resetChatPage,
    appendToParams: appendChatParams,
  } = usePagination(ADMIN_TABLE_LIMIT);

  const [teamMeta, setTeamMeta] = useState<PageMeta>({ total: 0, pages: 1 });
  const [taskMeta, setTaskMeta] = useState<PageMeta>({ total: 0, pages: 1 });
  const [activityMeta, setActivityMeta] = useState<PageMeta>({ total: 0, pages: 1 });
  const [chatMeta, setChatMeta] = useState<PageMeta>({ total: 0, pages: 1 });

  useEffect(() => {
    if (urlTab) setTab(urlTab);
  }, [urlTab]);

  const handleTabChange = useCallback(
    (value: string) => {
      const next = VALID_TABS.includes(value as WorkspaceTab) ? (value as WorkspaceTab) : "team";
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`/dashboard/events/${eventId}/workspace?${params.toString()}`, { scroll: false });
    },
    [eventId, router, searchParams]
  );

  const applyPage = useCallback((payload: unknown): { items: Record<string, unknown>[]; meta: PageMeta } => {
    if (Array.isArray(payload)) {
      return { items: payload as Record<string, unknown>[], meta: { total: payload.length, pages: 1 } };
    }
    const data = (payload ?? {}) as {
      items?: Record<string, unknown>[];
      total?: number;
      pages?: number;
    };
    const items = data.items ?? [];
    return {
      items,
      meta: {
        total: data.total ?? items.length,
        pages: Math.max(1, data.pages ?? 1),
      },
    };
  }, []);

  const loadCollaborators = useCallback(async () => {
    const params = appendTeamParams(new URLSearchParams());
    const res = await fetch(`/api/events/${eventId}/collaborators?${params}`);
    const d = await res.json();
    if (!res.ok) return;
    const { items, meta } = applyPage(d.data);
    setCollaborators(items);
    setTeamMeta(meta);
  }, [eventId, appendTeamParams, applyPage]);

  const loadActivity = useCallback(async () => {
    const params = appendActivityParams(new URLSearchParams());
    const res = await fetch(`/api/events/${eventId}/activity?${params}`);
    const d = await res.json();
    if (!res.ok) return;
    const { items, meta } = applyPage(d.data);
    setActivity(items);
    setActivityMeta(meta);
  }, [eventId, appendActivityParams, applyPage]);

  const loadTasks = useCallback(async () => {
    const params = appendTaskParams(new URLSearchParams());
    const res = await fetch(`/api/events/${eventId}/tasks?${params}`);
    const d = await res.json();
    if (!res.ok) return;
    const { items, meta } = applyPage(d.data);
    setTasks(items);
    setTaskMeta(meta);
  }, [eventId, appendTaskParams, applyPage]);

  const loadMessages = useCallback(async () => {
    const params = appendChatParams(new URLSearchParams());
    const res = await fetch(`/api/events/${eventId}/chat/${channel}/messages?${params}`);
    const d = await res.json();
    if (!res.ok) return;
    const { items, meta } = applyPage(d.data);
    setMessages(items);
    setChatMeta(meta);
  }, [eventId, channel, appendChatParams, applyPage]);

  useEffect(() => {
    void loadCollaborators();
  }, [loadCollaborators, teamPage]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity, activityPage]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks, taskPage]);

  useEffect(() => {
    if (tab === "chat") void loadMessages();
  }, [tab, channel, chatPage, loadMessages]);

  async function searchUsers() {
    if (!searchQ.trim()) return;
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ)}`);
    const d = await res.json();
    if (res.ok) setSearchResults(d.data.items ?? []);
  }

  async function inviteUser() {
    if (!selectedUserId) return;
    setLoading(true);
    await fetch(`/api/events/${eventId}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteeUserId: selectedUserId,
        role: inviteRole,
        directAdd: true,
      }),
    });
    setLoading(false);
    setSearchQ("");
    setSearchResults([]);
    setSelectedUserId("");
    resetTeamPage();
    await loadCollaborators();
    await loadActivity();
  }

  async function createTask() {
    if (!newTask.trim()) return;
    await fetch(`/api/events/${eventId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTask }),
    });
    setNewTask("");
    resetTaskPage();
    await loadTasks();
    await loadActivity();
  }

  async function sendMessage() {
    if (!chatBody.trim()) return;
    await fetch(`/api/events/${eventId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelSlug: channel, body: chatBody }),
    });
    setChatBody("");
    resetChatPage();
    await loadMessages();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Workspace</h1>
        <p className="text-slate-500">{eventTitle}, collaborate with your team</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" /> Team</TabsTrigger>
          <TabsTrigger value="tasks"><ListTodo className="h-4 w-4 mr-1" /> Tasks</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-1" /> Activity</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-1" /> Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Add collaborator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, email, phone, username..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                />
                <Button variant="outline" onClick={searchUsers}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                  {searchResults.map((u) => {
                    const user = u as { id: string; name: string; email?: string; username?: string };
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUserId(user.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                          selectedUserId === user.id ? "bg-brand-50" : ""
                        }`}
                      >
                        <span className="font-medium">{user.name}</span>
                        {user.username && <span className="text-slate-400 ml-2">@{user.username}</span>}
                        {user.email && <span className="text-slate-400 block text-xs">{user.email}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {COLLABORATOR_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <Button onClick={inviteUser} disabled={!selectedUserId || loading}>
                Invite to event
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Collaborators</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {collaborators.length === 0 ? (
                <p className="text-sm text-slate-500">No collaborators yet.</p>
              ) : (
                collaborators.map((c) => {
                  const col = c as { id: string; role: string; user?: { name: string; email?: string } };
                  return (
                    <div key={col.id} className="stack-mobile p-3 border rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{col.user?.name ?? "Member"}</p>
                        <p className="text-xs text-slate-500 truncate">{col.user?.email}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">{col.role.replace(/_/g, " ")}</Badge>
                    </div>
                  );
                })
              )}
              <PaginationBar
                page={teamPage}
                pages={teamMeta.pages}
                total={teamMeta.total}
                limit={ADMIN_TABLE_LIMIT}
                onPageChange={setTeamPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
            />
            <Button onClick={createTask}>Add</Button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">No tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => {
                const task = t as { id: string; title: string; status: string; priority: string };
                return (
                  <div key={task.id} className="stack-mobile p-3 border rounded-lg">
                    <span className="min-w-0 break-words">{task.title}</span>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="outline">{task.priority}</Badge>
                      <Badge>{task.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <PaginationBar
            page={taskPage}
            pages={taskMeta.pages}
            total={taskMeta.total}
            limit={ADMIN_TABLE_LIMIT}
            onPageChange={setTaskPage}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-2">
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            activity.map((a) => {
              const item = a as { id: string; action: string; createdAt: string; user?: { name: string } };
              return (
                <div key={item.id} className="text-sm p-3 border rounded-lg">
                  <span className="font-medium">{item.user?.name ?? "System"}</span>{" "}
                  <span className="text-slate-600">{item.action.replace(/\./g, " ")}</span>
                  <span className="text-xs text-slate-400 block mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
          <PaginationBar
            page={activityPage}
            pages={activityMeta.pages}
            total={activityMeta.total}
            limit={ADMIN_TABLE_LIMIT}
            onPageChange={setActivityPage}
          />
        </TabsContent>

        <TabsContent value="chat" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <Button
                key={ch}
                size="sm"
                variant={channel === ch ? "default" : "outline"}
                onClick={() => {
                  setChannel(ch);
                  resetChatPage();
                }}
              >
                #{ch}
              </Button>
            ))}
          </div>
          <div className="border rounded-lg p-4 min-h-[240px] max-h-[360px] overflow-auto space-y-2">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">No messages in #{channel} yet.</p>
            ) : (
              messages.map((m) => {
                const msg = m as { id: string; body?: string; sender?: { name: string }; createdAt: string };
                return (
                  <div key={msg.id} className="text-sm break-words">
                    <span className="font-semibold">{msg.sender?.name}</span>: {msg.body}
                    <span className="text-xs text-slate-400 ml-2">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <PaginationBar
            page={chatPage}
            pages={chatMeta.pages}
            total={chatMeta.total}
            limit={ADMIN_TABLE_LIMIT}
            onPageChange={setChatPage}
          />
          <div className="flex gap-2">
            <Input
              placeholder={`Message #${channel}`}
              value={chatBody}
              onChange={(e) => setChatBody(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button onClick={sendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function EventWorkspaceClient(props: WorkspaceClientProps) {
  return (
    <Suspense fallback={<p className="text-slate-500 py-8 text-center">Loading workspace…</p>}>
      <EventWorkspaceClientInner {...props} />
    </Suspense>
  );
}
