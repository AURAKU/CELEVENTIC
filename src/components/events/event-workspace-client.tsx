"use client";

import { useCallback, useEffect, useState } from "react";
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

interface WorkspaceClientProps {
  eventId: string;
  eventTitle: string;
}

export function EventWorkspaceClient({ eventId, eventTitle }: WorkspaceClientProps) {
  const [tab, setTab] = useState("team");
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

  const loadCollaborators = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/collaborators`);
    const d = await res.json();
    if (res.ok) setCollaborators(d.data.items ?? []);
  }, [eventId]);

  const loadActivity = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/activity`);
    const d = await res.json();
    if (res.ok) setActivity(d.data.items ?? []);
  }, [eventId]);

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/tasks`);
    const d = await res.json();
    if (res.ok) setTasks(d.data.items ?? []);
  }, [eventId]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/chat/${channel}/messages`);
    const d = await res.json();
    if (res.ok) setMessages(d.data.items ?? []);
  }, [eventId, channel]);

  useEffect(() => {
    loadCollaborators();
    loadActivity();
    loadTasks();
  }, [loadCollaborators, loadActivity, loadTasks]);

  useEffect(() => {
    if (tab === "chat") loadMessages();
  }, [tab, channel, loadMessages]);

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
    loadCollaborators();
    loadActivity();
  }

  async function createTask() {
    if (!newTask.trim()) return;
    await fetch(`/api/events/${eventId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTask }),
    });
    setNewTask("");
    loadTasks();
    loadActivity();
  }

  async function sendMessage() {
    if (!chatBody.trim()) return;
    await fetch(`/api/events/${eventId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelSlug: channel, body: chatBody }),
    });
    setChatBody("");
    loadMessages();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Workspace</h1>
        <p className="text-slate-500">{eventTitle} — collaborate with your team</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
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
              {collaborators.map((c) => {
                const col = c as { id: string; role: string; user?: { name: string; email?: string } };
                return (
                  <div key={col.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{col.user?.name ?? "Member"}</p>
                      <p className="text-xs text-slate-500">{col.user?.email}</p>
                    </div>
                    <Badge variant="outline">{col.role.replace(/_/g, " ")}</Badge>
                  </div>
                );
              })}
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
          {tasks.map((t) => {
            const task = t as { id: string; title: string; status: string; priority: string };
            return (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span>{task.title}</span>
                <div className="flex gap-2">
                  <Badge variant="outline">{task.priority}</Badge>
                  <Badge>{task.status}</Badge>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-2">
          {activity.map((a) => {
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
          })}
        </TabsContent>

        <TabsContent value="chat" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <Button
                key={ch}
                size="sm"
                variant={channel === ch ? "default" : "outline"}
                onClick={() => setChannel(ch)}
              >
                #{ch}
              </Button>
            ))}
          </div>
          <div className="border rounded-lg p-4 min-h-[240px] max-h-[360px] overflow-auto space-y-2">
            {messages.map((m) => {
              const msg = m as { id: string; body?: string; sender?: { name: string }; createdAt: string };
              return (
                <div key={msg.id} className="text-sm">
                  <span className="font-semibold">{msg.sender?.name}</span>: {msg.body}
                  <span className="text-xs text-slate-400 ml-2">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
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
