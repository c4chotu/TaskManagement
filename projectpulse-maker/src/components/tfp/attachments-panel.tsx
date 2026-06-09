import { useRef, useState } from "react";
import { useAttachments, useDeleteAttachment, useUploadAttachment } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Paperclip, Upload, Trash2, FileText, Image as ImageIcon, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { tokenStore, USE_MOCK } from "@/lib/api";

function humanSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export async function downloadAuthenticatedFile(url: string, fileName: string) {
  if (USE_MOCK) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  try {
    const token = tokenStore.get();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    toast.error("Download failed: " + (err instanceof Error ? err.message : String(err)));
  }
}

export function AttachmentsPanel({ taskId }: { taskId: string }) {
  const { data: attachments = [] } = useAttachments(taskId);
  const upload = useUploadAttachment();
  const del = useDeleteAttachment();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string; blobUrl?: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      setProgress({ name: file.name, pct: 0 });
      try {
        await upload.mutateAsync({
          taskId,
          file,
          onProgress: (pct) => setProgress({ name: file.name, pct }),
        });
        toast.success(`Uploaded ${file.name}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setProgress(null);
      }
    }
  };

  const handlePreview = async (url: string, name: string, mime: string, fileId: string) => {
    if (USE_MOCK) {
      setPreview({ url, name, mime, blobUrl: url });
      return;
    }
    setLoadingPreview(fileId);
    try {
      const token = tokenStore.get();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Preview failed to load");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreview({ url, name, mime, blobUrl });
    } catch (err) {
      toast.error("Could not open preview: unauthorized or server error");
    } finally {
      setLoadingPreview(null);
    }
  };

  const closePreview = () => {
    if (preview?.blobUrl && !USE_MOCK) {
      URL.revokeObjectURL(preview.blobUrl);
    }
    setPreview(null);
  };

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-md border-2 border-dashed p-3 text-center transition ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
      >
        <Upload className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Drag files here or</p>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => inputRef.current?.click()}
        >
          choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {progress && (
        <div className="mt-2 rounded border border-border bg-muted/30 p-2">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="truncate">{progress.name}</span>
            <span className="font-mono">{progress.pct}%</span>
          </div>
          <Progress value={progress.pct} className="h-1" />
        </div>
      )}

      <ul className="mt-2 space-y-1">
        {attachments.map((a) => {
          const isImage = a.mimeType.startsWith("image/");
          const Icon = isImage ? ImageIcon : FileText;
          const isLoading = loadingPreview === a.id;
          return (
            <li
              key={a.id}
              className="group flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <button
                disabled={isLoading}
                onClick={() => handlePreview(a.url, a.fileName, a.mimeType, a.id)}
                className="min-w-0 flex-1 text-left flex items-center gap-1.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium hover:underline text-primary/80 hover:text-primary cursor-pointer">{a.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{humanSize(a.sizeBytes)}</p>
                </div>
                {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </button>
              <button
                onClick={() => downloadAuthenticatedFile(a.url, a.fileName)}
                className="text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={async () => {
                  await del.mutateAsync({ taskId, attachmentId: a.id });
                  toast.success("Deleted");
                }}
                className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
        {attachments.length === 0 && (
          <li className="flex items-center gap-2 px-1 py-2 text-[11px] text-muted-foreground">
            <Paperclip className="h-3 w-3" /> No attachments yet
          </li>
        )}
      </ul>

      <Dialog open={!!preview} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
            <DialogTitle className="truncate text-sm">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && preview.blobUrl &&
            (preview.mime.startsWith("image/") ? (
              <img
                src={preview.blobUrl}
                alt={preview.name}
                className="max-h-[70vh] w-full rounded object-contain"
              />
            ) : preview.mime === "application/pdf" ? (
              <iframe
                src={preview.blobUrl}
                className="h-[70vh] w-full rounded border border-border"
                title={preview.name}
              />
            ) : (
              <div className="rounded border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Preview not available for this file type.{" "}
                <button 
                  className="text-primary underline font-semibold" 
                  onClick={() => downloadAuthenticatedFile(preview.url, preview.name)}
                >
                  Download File
                </button>
              </div>
            ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
