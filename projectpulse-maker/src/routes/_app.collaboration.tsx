import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useProjects, useUsers, useCreateJoinRequest, useProjectJoinRequests, useApproveJoinRequest, useRejectJoinRequest } from "@/lib/queries";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, Check, X, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/collaboration")({
  component: CollaborationPage,
});

function CollaborationPage() {
  const { user } = useAuth();
  const isVp = user && ((user.roleLevel ?? 0) >= 5 || user.roleName === "SUPER_ADMIN");
  const isAdmin = user && ((user.roleLevel ?? 0) >= 4 || user.roleName === "SUPER_ADMIN");

  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: requests = [] } = useProjectJoinRequests(selectedProjectId || projects[0]?.id);
  const createReq = useCreateJoinRequest();
  const approveReq = useApproveJoinRequest();
  const rejectReq = useRejectJoinRequest();

  const handleRequestAccess = async () => {
    if (!selectedProjectId || !selectedUserId) {
      return toast.error("Please select a project and a user.");
    }
    try {
      await createReq.mutateAsync({ projectId: selectedProjectId, userId: selectedUserId });
      toast.success("Collaboration request submitted to VP.");
      setSelectedUserId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create request.");
    }
  };

  const handleApprove = async (projectId: string, requestId: string) => {
    try {
      await approveReq.mutateAsync({ projectId, requestId });
      toast.success("Request approved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve.");
    }
  };

  const handleReject = async (projectId: string, requestId: string) => {
    try {
      await rejectReq.mutateAsync({ projectId, requestId });
      toast.success("Request rejected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject.");
    }
  };

  if (!isAdmin && !isVp) {
    return (
      <>
        <Topbar title="Collaboration" />
        <main className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <ShieldCheck className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only Admins and VPs can access this page.</p>
        </main>
      </>
    );
  }

  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : "");

  return (
    <>
      <Topbar title="Project Collaboration" />
      <main className="flex-1 space-y-6 p-6 overflow-auto">
        
        {/* Request Access Panel (Admins) */}
        {isAdmin && (
          <Card className="p-6 border-primary/20 bg-gradient-to-br from-card to-background shadow-glow">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">Request Project Access</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Request to add a user to a project. This requires approval from a VP or Organization Owner.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-1.5 w-full sm:w-1/3">
                <Label>Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 w-full sm:w-1/3">
                <Label>User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleRequestAccess} 
                className="w-full sm:w-auto bg-gradient-primary"
                disabled={createReq.isPending}
              >
                Submit Request
              </Button>
            </div>
          </Card>
        )}

        {/* Pending Requests Panel */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Pending Requests for Project</h2>
            <div className="w-64">
              <Select value={activeProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto opacity-50 mb-3" />
              <p className="text-sm">No pending collaboration requests found for this project.</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>User to Join</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    {isVp && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="font-medium">{req.user?.name}</div>
                        <div className="text-[10px] text-muted-foreground">{req.user?.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs">{req.requester?.name}</div>
                        <div className="text-[10px] text-muted-foreground">{req.requester?.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-warning text-warning text-[10px]">
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </TableCell>
                      {isVp && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                              onClick={() => handleApprove(req.projectId, req.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleReject(req.projectId, req.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
