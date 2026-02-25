"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { serverApi } from "@/lib/api-client";
import { Loader2, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Task {
  id: string;
  name: string;
  cron: string;
  commands: string[];
  enabled: boolean;
}

export default function TasksPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cron, setCron] = useState("0 * * * *");
  const [commands, setCommands] = useState("");
  const api = serverApi(serverId);

  const fetchTasks = async () => {
    try {
      const res = await api.tasks.list() as Task[];
      setTasks(res);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [serverId]);

  const handleCreate = async () => {
    if (!name.trim() || !cron.trim() || !commands.trim()) {
      toast.error("All fields are required");
      return;
    }
    try {
      await api.tasks.create({
        name: name.trim(),
        cron: cron.trim(),
        commands: commands.split("\n").filter(Boolean),
      });
      toast.success("Task created");
      setShowForm(false);
      setName("");
      setCron("0 * * * *");
      setCommands("");
      fetchTasks();
    } catch {
      toast.error("Failed to create task");
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      await api.tasks.update({ id: task.id, enabled: !task.enabled });
      fetchTasks();
    } catch {
      toast.error("Failed to toggle task");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.tasks.remove(id);
      toast.success("Task deleted");
      fetchTasks();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Scheduled Tasks</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> New Task
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 mb-4 space-y-3">
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Task name" className="w-full border rounded-md px-3 py-2 bg-background text-sm"
          />
          <input
            type="text" value={cron} onChange={(e) => setCron(e.target.value)}
            placeholder="Cron expression (e.g. 0 * * * *)" className="w-full border rounded-md px-3 py-2 bg-background text-sm font-mono"
          />
          <textarea
            value={commands} onChange={(e) => setCommands(e.target.value)}
            placeholder="Commands (one per line)" rows={3}
            className="w-full border rounded-md px-3 py-2 bg-background text-sm font-mono"
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate}>Create</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {tasks.map((task) => (
          <div key={task.id} className="border rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{task.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{task.cron}</div>
              <div className="text-xs text-muted-foreground mt-1">{task.commands.join("; ")}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => handleToggle(task)}>
                {task.enabled ? <Power className="h-4 w-4 text-green-500" /> : <PowerOff className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(task.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No scheduled tasks
          </div>
        )}
      </div>
    </div>
  );
}
