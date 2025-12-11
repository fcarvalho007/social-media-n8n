import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDrafts, UseDraftsOptions } from '@/hooks/useDrafts';
import { DraftCard } from '@/components/drafts/DraftCard';
import { DraftsFilters } from '@/components/drafts/DraftsFilters';
import { DraftsBulkActions } from '@/components/drafts/DraftsBulkActions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Drafts() {
  const navigate = useNavigate();
  
  // Filter states
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'older'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'platform-asc' | 'platform-desc'>('newest');
  const [view, setView] = useState<'list' | 'grid'>('list');
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const options: UseDraftsOptions = { search, platform, dateFilter, sortBy };
  const { 
    drafts, 
    isLoading, 
    deleteDraft, 
    deleteManyDrafts, 
    isDeleting, 
    isDeletingMany,
    availablePlatforms,
    totalCount,
    filteredCount,
  } = useDrafts(options);

  const hasActiveFilters = search !== '' || platform !== 'all' || dateFilter !== 'all';

  const handleClearFilters = () => {
    setSearch('');
    setPlatform('all');
    setDateFilter('all');
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(drafts.map(d => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = () => {
    deleteManyDrafts(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleEdit = useCallback((draft: any) => {
    // Store draft data in sessionStorage for ManualCreate to load
    sessionStorage.setItem('editDraft', JSON.stringify(draft));
    navigate('/manual-create');
  }, [navigate]);

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteDraft(deleteId);
      setDeleteId(null);
      selectedIds.delete(deleteId);
      setSelectedIds(new Set(selectedIds));
    }
  };

  const allSelected = drafts.length > 0 && selectedIds.size === drafts.length;

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Meus Rascunhos
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} rascunho{totalCount !== 1 ? 's' : ''} guardado{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <Button onClick={() => navigate('/manual-create')}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Novo
        </Button>
      </div>

      {/* Filters */}
      <DraftsFilters
        search={search}
        onSearchChange={setSearch}
        platform={platform}
        onPlatformChange={setPlatform}
        dateFilter={dateFilter}
        onDateFilterChange={(v) => setDateFilter(v as any)}
        sortBy={sortBy}
        onSortByChange={(v) => setSortBy(v as any)}
        view={view}
        onViewChange={setView}
        availablePlatforms={availablePlatforms}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Bulk Actions */}
      {drafts.length > 0 && (
        <DraftsBulkActions
          totalCount={filteredCount}
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onSelectAll={handleSelectAll}
          onDeleteSelected={handleDeleteSelected}
          isDeleting={isDeletingMany}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="font-semibold text-lg mb-1">Nenhum resultado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Nenhum rascunho corresponde aos filtros aplicados
                </p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpar filtros
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg mb-1">Sem rascunhos</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Ainda não tens nenhum rascunho guardado
                </p>
                <Button onClick={() => navigate('/manual-create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro rascunho
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={view === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
          : "space-y-3"
        }>
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              isSelected={selectedIds.has(draft.id)}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteId(id)}
              view={view}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rascunho</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres eliminar este rascunho? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'A eliminar...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
