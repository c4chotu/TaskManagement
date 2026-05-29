import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useStatuses, useUpdateTask, useUpdateTaskStatus, useUsers } from "@/lib/queries";
import { findUser } from "@/lib/mock-data";
import { StatusDot } from "@/components/tfp/badges";
import type { Task } from "@/lib/types";
import { Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function TaskStatusSelect({ task, compact }: { task: Task; compact?: boolean }) {
  const { data: statuses = [] } = useStatuses();
  const update = useUpdateTaskStatus();
  const current = statuses.find((s) => s.id === task.statusId);
  return (
    <Select value={task.statusId} onValueChange={async (statusId) => {
      const target = statuses.find((s) => s.id === statusId);
      if (target?.requiresComment) {
        const comment = window.prompt(`${target.name} requires a comment:`);
        if (!comment) return toast.error("Comment required");
        await update.mutateAsync({ taskId: task.id, statusId, comment });
      } else {
        await update.mutateAsync({ taskId: task.id, statusId });
      }
      toast.success("Status updated");
    }}>
      <SelectTrigger className={compact ? "h-7 w-auto gap-1 border-border/60 bg-transparent px-2 text-xs" : "h-9"}>
        <span className="inline-flex items-center gap-1.5">
          {current && <StatusDot color={current.color} />}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="inline-flex items-center gap-2"><StatusDot color={s.color} />{s.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TaskAssignPopover({ task }: { task: Task }) {
  const { data: users = [] } = useUsers();
  const update = useUpdateTask();
  const toggle = async (uid: string) => {
    const next = task.assigneeIds.includes(uid)
      ? task.assigneeIds.filter((x) => x !== uid)
      : [...task.assigneeIds, uid];
    await update.mutateAsync({ id: task.id, patch: { assigneeIds: next } });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs">
          <UserPlus className="h-3 w-3" /> Assign
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div className="max-h-64 overflow-y-auto">
          {users.map((u) => {
            const on = task.assigneeIds.includes(u.id);
            return (
              <button key={u.id} onClick={() => toggle(u.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60">
                <Avatar className="h-5 w-5"><AvatarFallback className="bg-muted text-[9px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <span className="flex-1 truncate">{u.name}</span>
                {on && <Check className="h-3 w-3 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AssigneeStack({ ids, max = 3 }: { ids: string[]; max?: number }) {
  return (
    <div className="flex -space-x-1.5">
      {ids.slice(0, max).map((uid) => {
        const u = findUser(uid);
        return (
          <Avatar key={uid} className="h-6 w-6 border border-card">
            <AvatarFallback className="bg-muted text-[10px]">{u?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        );
      })}
      {ids.length > max && <span className="ml-2 text-[10px] text-muted-foreground">+{ids.length - max}</span>}
    </div>
  );
}
