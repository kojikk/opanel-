"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ClockFading,
  Plus,
  Trash2,
  Loader2,
  Power,
  PowerOff,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { serverApi } from "@/lib/api-client";
import { SubPage } from "../../sub-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { $ } from "@/lib/i18n";

interface TaskData {
  id: string;
  name: string;
  cron: string;
  commands: string[];
  enabled: boolean;
}

export default function TasksPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const api = serverApi(serverId);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TaskData | null>(null);

  const fetchTasks = async () => {
    try {
      const res = (await api.tasks.list()) as TaskData[];
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

  const handleToggle = async (task: TaskData) => {
    try {
      await api.tasks.update({ id: task.id, enabled: !task.enabled });
      toast.success(`Task ${task.enabled ? "disabled" : "enabled"}`);
      fetchTasks();
    } catch {
      toast.error("Failed to toggle task");
    }
  };

  const handleDelete = async (task: TaskData) => {
    try {
      await api.tasks.remove(task.id);
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
    <SubPage
      title="Scheduled Tasks"
      category={$("sidebar.config")}
      icon={<ClockFading />}
      hideNavbar
      className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex justify-end">
        <TaskDialog serverId={serverId} onSaved={fetchTasks}>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New Task
          </Button>
        </TaskDialog>
      </div>

      {tasks.length > 0 ? (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4 flex items-start justify-between shadow-none">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{task.name}</h3>
                  <Badge variant={task.enabled ? "default" : "secondary"} className="text-xs">
                    {task.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-mono mb-2">{task.cron}</p>
                <div className="text-xs font-mono bg-muted rounded-sm p-2 space-y-0.5">
                  {task.commands.map((cmd, i) => (
                    <div key={i} className="text-muted-foreground">/{cmd}</div>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <TaskDialog serverId={serverId} task={task} onSaved={fetchTasks}>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TaskDialog>
                <Button variant="ghost" size="icon" onClick={() => handleToggle(task)}>
                  {task.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(task)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No scheduled tasks
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText="Delete"
        destructive
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
      />
    </SubPage>
  );
}

function TaskDialog({
  serverId,
  task,
  onSaved,
  children,
}: {
  serverId: string;
  task?: TaskData;
  onSaved: () => void;
  children: React.ReactNode;
}) {
  const api = serverApi(serverId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(task?.name ?? "");
  const [cron, setCron] = useState(task?.cron ?? "0 */6 * * *");
  const [commands, setCommands] = useState(task?.commands?.join("\n") ?? "");

  useEffect(() => {
    if (open && task) {
      setName(task.name);
      setCron(task.cron);
      setCommands(task.commands.join("\n"));
    } else if (open) {
      setName("");
      setCron("0 */6 * * *");
      setCommands("");
    }
  }, [open, task]);

  const handleSave = async () => {
    const cmdList = commands.split("\n").map((c) => c.trim()).filter(Boolean);
    if (!name.trim() || !cron.trim() || cmdList.length === 0) {
      toast.error("Fill in all fields");
      return;
    }

    try {
      if (task) {
        await api.tasks.update({ id: task.id, name: name.trim(), cron: cron.trim(), commands: cmdList });
      } else {
        await api.tasks.create({ name: name.trim(), cron: cron.trim(), commands: cmdList });
      }
      toast.success(task ? "Task updated" : "Task created");
      onSaved();
      setOpen(false);
    } catch {
      toast.error("Failed to save task");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Backup worlds" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cron Expression</label>
            <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 */6 * * *" className="font-mono" />
            <p className="text-xs text-muted-foreground mt-1">Standard cron format (min hour day month weekday)</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Commands (one per line)</label>
            <textarea
              value={commands}
              onChange={(e) => setCommands(e.target.value)}
              placeholder={"say Backup starting...\nsave-all\nsay Backup complete!"}
              rows={5}
              className="w-full border rounded-md px-3 py-2 text-sm font-mono bg-background resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>{task ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
