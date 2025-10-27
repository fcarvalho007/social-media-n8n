import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit } from "lucide-react";
import { Instagram, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Draft {
  id: string;
  platform: string;
  caption: string;
  media_urls: string[];
  scheduled_date?: string;
  scheduled_time?: string;
  publish_immediately: boolean;
  created_at: string;
}

interface DraftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadDraft: (draft: Draft) => void;
}

const DraftsDialog = ({ open, onOpenChange, onLoadDraft }: DraftsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["drafts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("posts_drafts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Draft[];
    },
    enabled: open,
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("posts_drafts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Rascunho eliminado",
        description: "O rascunho foi eliminado com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível eliminar o rascunho.",
      });
    }
  };

  const handleLoadDraft = (draft: Draft) => {
    onLoadDraft(draft);
    onOpenChange(false);
    toast({
      title: "Rascunho carregado",
      description: "Podes continuar a editar o teu rascunho.",
    });
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === "instagram_carrousel" || platform === "instagram_stories") {
      return <Instagram className="w-4 h-4" />;
    }
    return <Linkedin className="w-4 h-4" />;
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case "instagram_carrousel":
        return "Instagram Carrousel";
      case "instagram_stories":
        return "Instagram Stories";
      case "linkedin":
        return "LinkedIn";
      default:
        return platform;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Os Meus Rascunhos</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              A carregar rascunhos...
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Não tens rascunhos guardados.
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <Card key={draft.id} className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 flex-shrink-0 bg-muted rounded overflow-hidden">
                      {draft.media_urls && draft.media_urls.length > 0 ? (
                        <img
                          src={draft.media_urls[0]}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          Sem média
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getPlatformIcon(draft.platform)}
                        <Badge variant="outline">
                          {getPlatformLabel(draft.platform)}
                        </Badge>
                        {draft.media_urls && draft.media_urls.length > 1 && (
                          <Badge variant="secondary">
                            {draft.media_urls.length} imagens
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {draft.caption || "Sem legenda"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Guardado: {new Date(draft.created_at).toLocaleDateString("pt-PT")}
                        {" às "}
                        {new Date(draft.created_at).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadDraft(draft)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(draft.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DraftsDialog;
