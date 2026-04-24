import { forwardRef, useImperativeHandle, useRef, useState, type PointerEvent } from 'react';
import { Info, Link2, Plus, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { SocialNetwork } from '@/types/social';
import { NetworkOptionField, NetworkOptions, firstCommentLimit } from '@/types/networkOptions';
import { NETWORK_INFO } from '@/lib/socialNetworks';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AIGeneratedField } from '@/components/ai/AIGeneratedField';
import { AIActionButton } from '@/components/ai/AIActionButton';
import { FirstCommentOptionsDialog } from '@/components/manual-post/ai/FirstCommentOptionsDialog';
import { aiService } from '@/services/ai/aiService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { FirstCommentOption } from '@/types/aiEditorial';

export interface NetworkOptionsCardHandle {
  focusField: (network: SocialNetwork, field?: NetworkOptionField) => void;
}

interface NetworkOptionsCardProps {
  selectedNetworks: SocialNetwork[];
  selectedFormats?: string[];
  networkOptions: NetworkOptions;
  onNetworkOptionsChange: (next: NetworkOptions) => void;
  caption: string;
  onCaptionChange: (next: string) => void;
  networkCaptions: Record<string, string>;
  onNetworkCaptionChange: (network: string, value: string) => void;
  useSeparateCaptions: boolean;
  mediaPreviewUrls: string[];
  disabled?: boolean;
  generatedAt?: string | null;
  generatedEdited?: Record<string, boolean>;
}

const youtubeCategories = [
  { id: '1', label: 'Cinema e animação' },
  { id: '2', label: 'Automóveis e veículos' },
  { id: '10', label: 'Música' },
  { id: '15', label: 'Animais de estimação' },
  { id: '17', label: 'Desporto' },
  { id: '19', label: 'Viagens e eventos' },
  { id: '20', label: 'Gaming' },
  { id: '22', label: 'Pessoas e blogues' },
  { id: '23', label: 'Comédia' },
  { id: '24', label: 'Entretenimento' },
  { id: '25', label: 'Notícias e política' },
  { id: '26', label: 'Como fazer e estilo' },
  { id: '27', label: 'Educação' },
  { id: '28', label: 'Ciência e tecnologia' },
  { id: '29', label: 'Organizações sem fins lucrativos' },
];

const usernameRegex = /^@[A-Za-z0-9._]{1,30}$/;

export const NetworkOptionsCard = forwardRef<NetworkOptionsCardHandle, NetworkOptionsCardProps>(function NetworkOptionsCard({
  selectedNetworks,
  selectedFormats = [],
  networkOptions,
  onNetworkOptionsChange,
  caption,
  onCaptionChange,
  networkCaptions,
  onNetworkCaptionChange,
  useSeparateCaptions,
  mediaPreviewUrls,
  disabled,
  generatedAt,
  generatedEdited = {},
}, ref) {
  const [rootOpen, setRootOpen] = useState<string[]>([]);
  const [openNetworks, setOpenNetworks] = useState<string[]>([]);
  const [draftCollaborator, setDraftCollaborator] = useState('');
  const [mentionProfile, setMentionProfile] = useState('');
  const [mentionName, setMentionName] = useState('');
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [photoTagUsername, setPhotoTagUsername] = useState('');
  const [photoTagSlide, setPhotoTagSlide] = useState('0');
  const [photoTagPoint, setPhotoTagPoint] = useState({ x: 0.5, y: 0.5 });
  const [commentOptions, setCommentOptions] = useState<FirstCommentOption[]>([]);
  const [commentTarget, setCommentTarget] = useState<'instagram' | 'linkedin' | 'facebook' | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const setFieldRef = (key: string) => (node: HTMLElement | null) => { fieldRefs.current[key] = node; };
  const fieldKey = (network: SocialNetwork, field?: NetworkOptionField) => `${network}:${field ?? 'root'}`;

  useImperativeHandle(ref, () => ({
    focusField: (network, field) => {
      setRootOpen(['network-options']);
      setOpenNetworks(prev => Array.from(new Set([...prev, network])));
      requestAnimationFrame(() => fieldRefs.current[fieldKey(network, field)]?.focus());
    },
  }));

  const update = (next: NetworkOptions) => onNetworkOptionsChange(next);
  const updateNetwork = <T extends keyof NetworkOptions>(network: T, patch: NonNullable<NetworkOptions[T]>) => {
    update({ ...networkOptions, [network]: { ...(networkOptions[network] ?? {}), ...patch } });
  };

  const generateFirstComment = async (network: 'instagram' | 'linkedin' | 'facebook') => {
    const baseCaption = useSeparateCaptions ? networkCaptions[network] || caption : caption;
    const result = await aiService.generateFirstComments({ caption: baseCaption, network });
    const options = (result.options ?? []).filter(option => option.text?.trim()).slice(0, 3);
    if (options.length !== 3) throw new Error('A IA não devolveu 3 opções válidas.');
    setCommentOptions(options);
    setCommentTarget(network);
  };

  const renderFirstComment = (network: 'instagram' | 'linkedin' | 'facebook') => {
    const limit = firstCommentLimit(network) ?? 0;
    const value = networkOptions[network]?.firstComment ?? '';
    const overBy = value.length - limit;
    return (
      <AIGeneratedField generatedAt={generatedAt} edited={generatedEdited[`${network}.firstComment`]} className="border-0 bg-transparent">
        <div className="manual-field-stack">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${network}-first-comment`} className="manual-field-label">Primeiro comentário</Label>
            <AIActionButton icon={<Sparkles className="h-4 w-4" />} label="Gerar" creditCost={1} variant="ghost" disabled={disabled || !caption.trim()} onClick={() => generateFirstComment(network)} />
          </div>
          <Textarea
            id={`${network}-first-comment`}
            ref={setFieldRef(fieldKey(network, 'firstComment')) as React.Ref<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => updateNetwork(network, { firstComment: e.target.value } as never)}
            placeholder="Adiciona contexto extra ou um CTA aqui."
            disabled={disabled}
            className={cn('manual-input-radius min-h-[96px] resize-none', overBy > 0 && 'border-destructive focus-visible:ring-destructive')}
          />
          <p className={cn('manual-microcopy', overBy > 0 && 'text-destructive font-medium')}>
            {value.length}/{limit}{overBy > 0 && ` · excede ${overBy} caracteres`}
          </p>
        </div>
      </AIGeneratedField>
    );
  };

  const addCollaborator = () => {
    const value = draftCollaborator.trim();
    if (!usernameRegex.test(value)) return;
    const current = networkOptions.instagram?.collaborators ?? [];
    if (current.includes(value) || current.length >= 3) return;
    updateNetwork('instagram', { collaborators: [...current, value] });
    setDraftCollaborator('');
  };

  const [isResolvingMention, setIsResolvingMention] = useState(false);

  const insertLinkedInMention = async () => {
    const profile = mentionProfile.trim();
    const name = mentionName.trim();
    if (!profile || !name) return;
    setIsResolvingMention(true);
    try {
      // Resolve URN via Getlate (cached server-side). Sem URN, a menção
      // não dispara notificação no LinkedIn — por isso bloqueamos a inserção.
      const { data, error } = await supabase.functions.invoke(
        'getlate-linkedin-mention',
        { body: { profileUrl: profile, displayName: name } },
      );
      if (error || !data?.mentionFormat) {
        const message =
          (data && typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : null) ??
          error?.message ??
          'Não foi possível resolver esta menção. Tenta novamente.';
        toast({ title: 'Menção LinkedIn', description: message, variant: 'destructive' });
        return;
      }
      const mentionText = data.mentionFormat as string;
      if (useSeparateCaptions) {
        const current = networkCaptions.linkedin ?? caption;
        onNetworkCaptionChange('linkedin', `${current}${current ? ' ' : ''}${mentionText}`);
      } else {
        onCaptionChange(`${caption}${caption ? ' ' : ''}${mentionText}`);
      }
      // Mantém um registo interno para re-edição futura. NÃO é enviado ao publish-to-getlate.
      updateNetwork('linkedin', { mentions: [...(networkOptions.linkedin?.mentions ?? []), { profile, displayName: name }] });
      setMentionProfile('');
      setMentionName('');
    } finally {
      setIsResolvingMention(false);
    }
  };

  const addPhotoTagAtCenter = () => {
    const username = photoTagUsername.trim();
    if (!usernameRegex.test(username)) return;
    updateNetwork('instagram', {
      photoTags: [...(networkOptions.instagram?.photoTags ?? []), { username, x: photoTagPoint.x, y: photoTagPoint.y, slideIndex: Number(photoTagSlide) || 0 }],
    });
    setPhotoTagUsername('');
    setPhotoTagPoint({ x: 0.5, y: 0.5 });
    setTagModalOpen(false);
  };

  const handlePhotoTagTap = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPhotoTagPoint({
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    });
  };

  const removeInstagramTag = (index: number) => {
    updateNetwork('instagram', { photoTags: (networkOptions.instagram?.photoTags ?? []).filter((_, i) => i !== index) });
  };

  const isStoryLinkSelected = selectedFormats.includes('instagram_story_link');
  const storyLinkUrl = networkOptions.instagram?.storyLinkUrl ?? '';
  const derivedStickerText = (() => {
    try {
      return storyLinkUrl ? new URL(storyLinkUrl).hostname.replace(/^www\./, '') : '';
    } catch {
      return '';
    }
  })();

  const renderNetworkHeader = (network: SocialNetwork) => {
    const info = NETWORK_INFO[network];
    const Icon = info.icon;
    return <span className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0" style={{ color: info.color }} strokeWidth={1.5} />{info.name}</span>;
  };

  const renderInstagram = () => (
    <div className="manual-group-stack">
      {!isStoryLinkSelected && (
        <Tabs value={networkOptions.instagram?.formatVariant ?? 'feed'} onValueChange={(value) => updateNetwork('instagram', { formatVariant: value as never })}>
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1 scrollbar-hide sm:flex-wrap"><TabsTrigger value="feed">Feed</TabsTrigger><TabsTrigger value="story">Story</TabsTrigger><TabsTrigger value="reel">Reel</TabsTrigger><TabsTrigger value="carousel">Carousel</TabsTrigger></TabsList>
        </Tabs>
      )}
      {isStoryLinkSelected && (
        <div className="manual-field-stack rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <span className="manual-icon-box h-8 w-8"><Link2 className="h-4 w-4" strokeWidth={1.5} /></span>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <Label htmlFor="instagram-story-link-url" className="manual-field-label">Conteúdo do Link Sticker</Label>
                <p className="manual-microcopy">As Stories com link sticker são publicadas manualmente. O sistema prepara o pacote e o lembrete.</p>
              </div>
              <div className="manual-field-stack gap-1">
                <Label htmlFor="instagram-story-link-url" className="manual-field-label">URL do link *</Label>
                <Input id="instagram-story-link-url" ref={setFieldRef(fieldKey('instagram', 'instagramStoryLink')) as React.Ref<HTMLInputElement>} className="manual-input-radius manual-scroll-anchor min-h-11" inputMode="url" placeholder="https://..." value={storyLinkUrl} onChange={(e) => updateNetwork('instagram', { storyLinkUrl: e.target.value })} disabled={disabled} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="manual-field-stack gap-1">
                  <Label htmlFor="instagram-story-sticker-text" className="manual-field-label">Texto no sticker</Label>
                  <Input id="instagram-story-sticker-text" className="manual-input-radius min-h-11" placeholder={derivedStickerText || 'Ex: Ler no blog'} value={networkOptions.instagram?.storyLinkStickerText ?? ''} onChange={(e) => updateNetwork('instagram', { storyLinkStickerText: e.target.value })} disabled={disabled} maxLength={30} />
                  <p className="manual-microcopy">{(networkOptions.instagram?.storyLinkStickerText ?? '').length}/30 · se ficar vazio, usa o domínio.</p>
                </div>
                <div className="manual-field-stack gap-1">
                  <Label htmlFor="instagram-story-overlay-text" className="manual-field-label">Texto sobreposto</Label>
                  <Input id="instagram-story-overlay-text" className="manual-input-radius min-h-11" placeholder="Ex: Novo artigo 👇" value={networkOptions.instagram?.storyLinkOverlayText ?? ''} onChange={(e) => updateNetwork('instagram', { storyLinkOverlayText: e.target.value })} disabled={disabled} maxLength={100} />
                  <p className="manual-microcopy">{(networkOptions.instagram?.storyLinkOverlayText ?? '').length}/100</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {!isStoryLinkSelected && renderFirstComment('instagram')}
      {!isStoryLinkSelected && (
      <>
        <div className="manual-field-stack">
        <Label className="manual-field-label">Colaboradores (máx. 3)</Label>
        <div className="flex gap-2"><Input className="manual-input-radius manual-scroll-anchor min-h-11" ref={setFieldRef(fieldKey('instagram', 'collaborators')) as React.Ref<HTMLInputElement>} value={draftCollaborator} onChange={(e) => setDraftCollaborator(e.target.value)} placeholder="@username" autoCapitalize="none" autoCorrect="off" disabled={disabled || (networkOptions.instagram?.collaborators?.length ?? 0) >= 3} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCollaborator(); } }} /><Button type="button" className="manual-touch-target h-11" onClick={addCollaborator} disabled={disabled}>Adicionar</Button></div>
        <div className="flex flex-wrap gap-2">{(networkOptions.instagram?.collaborators ?? []).map((name) => <Badge key={name} variant="secondary" className="manual-chip manual-enter min-h-11 gap-2 px-3 sm:min-h-0">{name}<button type="button" className="manual-touch-target -mr-2 inline-flex items-center justify-center sm:min-h-0 sm:min-w-0" aria-label={`Remover ${name}`} onClick={() => updateNetwork('instagram', { collaborators: (networkOptions.instagram?.collaborators ?? []).filter(n => n !== name) })}>×</button></Badge>)}</div>
      </div>
      <div className="space-y-2">
        <Button type="button" variant="outline" size="sm" className="manual-touch-target h-11" onClick={() => setTagModalOpen(true)} disabled={disabled}><Plus className="h-4 w-4 mr-1" />Adicionar tag</Button>
        {(networkOptions.instagram?.photoTags ?? []).map((tag, index) => <div key={`${tag.username}-${index}`} className="flex min-h-11 items-center justify-between rounded-md border p-2 text-sm"><span>{tag.username} · slide {tag.slideIndex + 1} · {tag.x.toFixed(2)}, {tag.y.toFixed(2)}</span><Button type="button" variant="ghost" size="icon" className="manual-touch-target" onClick={() => removeInstagramTag(index)}><Trash2 className="h-4 w-4" /></Button></div>)}
      </div>
      </>
      )}
    </div>
  );

  const renderLinkedIn = () => (
    <div className="manual-group-stack">
      {renderFirstComment('linkedin')}
      <div className="manual-field-stack">
        <Label className="manual-field-label">@mention</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input className="manual-input-radius manual-scroll-anchor min-h-11" ref={setFieldRef(fieldKey('linkedin', 'linkedinMention')) as React.Ref<HTMLInputElement>} value={mentionProfile} onChange={(e) => setMentionProfile(e.target.value)} placeholder="username ou URL do perfil" autoCapitalize="none" autoCorrect="off" disabled={disabled || isResolvingMention} />
          <Input className="manual-input-radius manual-scroll-anchor min-h-11" value={mentionName} onChange={(e) => setMentionName(e.target.value)} placeholder="nome a apresentar" autoCapitalize="words" disabled={disabled || isResolvingMention} />
        </div>
        <Button type="button" size="sm" className="manual-touch-target h-11 sm:h-9" onClick={insertLinkedInMention} disabled={disabled || isResolvingMention}>
          {isResolvingMention ? 'A resolver...' : 'Inserir'}
        </Button>
        <p className="manual-microcopy">
          Menções de pessoas exigem que a tua conta LinkedIn seja admin de pelo menos uma organização. Menções de empresas funcionam sem esse requisito.
        </p>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox ref={setFieldRef(fieldKey('linkedin', 'disableLinkPreview')) as React.Ref<HTMLButtonElement>} checked={!!networkOptions.linkedin?.disableLinkPreview} onCheckedChange={(checked) => updateNetwork('linkedin', { disableLinkPreview: checked === true })} disabled={disabled} />Desativar pré-visualização do link</label>
    </div>
  );

  const renderFacebook = () => <div className="manual-group-stack"><Tabs value={networkOptions.facebook?.formatVariant ?? 'feed'} onValueChange={(value) => updateNetwork('facebook', { formatVariant: value as never })}><TabsList className="h-auto w-full justify-start gap-1 p-1"><TabsTrigger value="feed">Feed</TabsTrigger><TabsTrigger value="story">Story</TabsTrigger><TabsTrigger value="reel">Reel</TabsTrigger></TabsList></Tabs>{renderFirstComment('facebook')}</div>;
  const renderYoutube = () => <div className="manual-group-stack"><div className="manual-field-stack"><Label className="manual-field-label">Título</Label><Input className="manual-input-radius" ref={setFieldRef(fieldKey('youtube', 'youtubeTitle')) as React.Ref<HTMLInputElement>} value={networkOptions.youtube?.title ?? ''} onChange={(e) => updateNetwork('youtube', { title: e.target.value })} maxLength={100} disabled={disabled} /><p className="manual-microcopy">{(networkOptions.youtube?.title ?? '').length}/100</p></div><div className="manual-field-stack"><Label className="manual-field-label">Tags</Label><Input className="manual-input-radius" ref={setFieldRef(fieldKey('youtube', 'youtubeTags')) as React.Ref<HTMLInputElement>} placeholder="Enter para adicionar" disabled={disabled} onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { e.preventDefault(); updateNetwork('youtube', { tags: [...(networkOptions.youtube?.tags ?? []), e.currentTarget.value.trim()] }); e.currentTarget.value = ''; } }} /><div className="flex flex-wrap gap-2">{(networkOptions.youtube?.tags ?? []).map((tag) => <Badge key={tag} variant="secondary" className="manual-chip manual-enter gap-1">{tag}<button type="button" aria-label={`Remover ${tag}`} onClick={() => updateNetwork('youtube', { tags: (networkOptions.youtube?.tags ?? []).filter(t => t !== tag) })}>×</button></Badge>)}</div></div><div className="manual-field-stack"><Label className="manual-field-label">Visibilidade</Label><Tabs value={networkOptions.youtube?.visibility ?? 'public'} onValueChange={(value) => updateNetwork('youtube', { visibility: value as never })}><TabsList className="h-auto w-full justify-start gap-1 p-1 sm:flex-wrap"><TabsTrigger value="public">Público</TabsTrigger><TabsTrigger value="unlisted">Não listado</TabsTrigger><TabsTrigger value="private">Privado</TabsTrigger></TabsList></Tabs></div><div className="manual-field-stack"><Label className="manual-field-label">Categoria</Label><Select value={networkOptions.youtube?.categoryId ?? '22'} onValueChange={(value) => updateNetwork('youtube', { categoryId: value })}><SelectTrigger className="manual-input-radius" ref={setFieldRef(fieldKey('youtube', 'youtubeCategory')) as React.Ref<HTMLButtonElement>}><SelectValue /></SelectTrigger><SelectContent>{youtubeCategories.map(category => <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>)}</SelectContent></Select></div></div>;
  const renderGoogleBusiness = () => <div className="manual-group-stack"><label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox ref={setFieldRef(fieldKey('googlebusiness', 'googleBusinessCta')) as React.Ref<HTMLButtonElement>} checked={!!networkOptions.googlebusiness?.ctaEnabled} onCheckedChange={(checked) => updateNetwork('googlebusiness', { ctaEnabled: checked === true })} disabled={disabled} />Adicionar botão de ação (opcional)</label>{networkOptions.googlebusiness?.ctaEnabled && <div className="grid gap-2 sm:grid-cols-2"><Select value={networkOptions.googlebusiness?.ctaType ?? 'learn_more'} onValueChange={(value) => updateNetwork('googlebusiness', { ctaType: value as never })}><SelectTrigger className="manual-input-radius min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="book">Reservar</SelectItem><SelectItem value="order_online">Encomendar online</SelectItem><SelectItem value="buy">Comprar</SelectItem><SelectItem value="learn_more">Saber mais</SelectItem><SelectItem value="sign_up">Inscrever</SelectItem><SelectItem value="call_now">Ligar agora</SelectItem></SelectContent></Select>{networkOptions.googlebusiness?.ctaType !== 'call_now' && <Input className="manual-input-radius manual-scroll-anchor min-h-11" inputMode="url" value={networkOptions.googlebusiness?.ctaUrl ?? ''} onChange={(e) => updateNetwork('googlebusiness', { ctaUrl: e.target.value })} placeholder="https://..." disabled={disabled} />}</div>}</div>;

  if (selectedNetworks.length === 0) return null;

  return (
    <Card className="manual-card-shell manual-enter">
      <Accordion type="multiple" value={rootOpen} onValueChange={setRootOpen}>
        <AccordionItem value="network-options" className="border-b-0">
          <CardHeader className="manual-card-content pb-0"><AccordionTrigger className="min-h-11 py-0 hover:no-underline"><CardTitle className="manual-section-title manual-card-title-row"><span className="manual-icon-box"><Settings2 className="h-5 w-5" strokeWidth={1.5} /></span><span>Opções por rede</span></CardTitle></AccordionTrigger></CardHeader>
          <AccordionContent className="manual-card-content pt-4">
            <CardContent className="p-0"><Accordion type="multiple" value={openNetworks} onValueChange={setOpenNetworks} className="space-y-2">{selectedNetworks.map(network => <AccordionItem key={network} value={network} className="rounded-lg border border-border/60 bg-muted/20 px-3"><AccordionTrigger ref={setFieldRef(fieldKey(network)) as React.Ref<HTMLButtonElement>} className="min-h-11 hover:no-underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{renderNetworkHeader(network)}</AccordionTrigger><AccordionContent className="pt-2 pb-3">{network === 'instagram' && renderInstagram()}{network === 'linkedin' && renderLinkedIn()}{network === 'facebook' && renderFacebook()}{network === 'youtube' && renderYoutube()}{network === 'googlebusiness' && renderGoogleBusiness()}</AccordionContent></AccordionItem>)}</Accordion></CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}><DialogContent className="hidden sm:block"><DialogHeader><DialogTitle>Adicionar tag na fotografia</DialogTitle><DialogDescription>Define a pessoa e o slide onde a tag será aplicada.</DialogDescription></DialogHeader><div className="manual-group-stack"><div className="flex gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />Nesta versão, a tag é adicionada automaticamente ao ponto escolhido.</div><Input className="manual-input-radius" value={photoTagUsername} onChange={(e) => setPhotoTagUsername(e.target.value)} placeholder="@username" autoCapitalize="none" autoCorrect="off" />{mediaPreviewUrls.length > 1 && <Select value={photoTagSlide} onValueChange={setPhotoTagSlide}><SelectTrigger className="manual-input-radius"><SelectValue /></SelectTrigger><SelectContent>{mediaPreviewUrls.map((_, index) => <SelectItem key={index} value={String(index)}>Slide {index + 1}</SelectItem>)}</SelectContent></Select>}<Button type="button" onClick={addPhotoTagAtCenter}>Confirmar tag</Button></div></DialogContent></Dialog>
      <Drawer open={tagModalOpen} onOpenChange={setTagModalOpen}><DrawerContent className="manual-mobile-sheet-safe sm:hidden"><DrawerHeader className="border-b pb-3 text-left"><DrawerTitle>Adicionar tag</DrawerTitle></DrawerHeader><div className="manual-group-stack p-4"><div className="relative max-h-[42vh] touch-pan-x touch-pan-y overflow-hidden rounded-lg border bg-muted" onPointerDown={handlePhotoTagTap}>{mediaPreviewUrls[Number(photoTagSlide)] ? <img src={mediaPreviewUrls[Number(photoTagSlide)]} alt="Imagem para marcar tag" className="h-full max-h-[42vh] w-full object-contain" /> : <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Sem imagem</div>}<span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-foreground bg-primary shadow-lg motion-safe:animate-pulse" style={{ left: `${photoTagPoint.x * 100}%`, top: `${photoTagPoint.y * 100}%` }} /></div><Input className="manual-input-radius manual-scroll-anchor min-h-11" value={photoTagUsername} onChange={(e) => setPhotoTagUsername(e.target.value)} placeholder="@username" autoCapitalize="none" autoCorrect="off" />{mediaPreviewUrls.length > 1 && <Select value={photoTagSlide} onValueChange={setPhotoTagSlide}><SelectTrigger className="manual-input-radius min-h-11"><SelectValue /></SelectTrigger><SelectContent>{mediaPreviewUrls.map((_, index) => <SelectItem key={index} value={String(index)}>Slide {index + 1}</SelectItem>)}</SelectContent></Select>}<Button type="button" className="manual-touch-target sticky bottom-0" onClick={addPhotoTagAtCenter}>Confirmar tag</Button></div></DrawerContent></Drawer>
      <FirstCommentOptionsDialog open={!!commentTarget} options={commentOptions} onOpenChange={(open) => !open && setCommentTarget(null)} onSelect={(text) => { if (commentTarget) updateNetwork(commentTarget, { firstComment: text } as never); setCommentTarget(null); }} />
    </Card>
  );
});