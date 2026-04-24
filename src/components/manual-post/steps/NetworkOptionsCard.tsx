import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export interface NetworkOptionsCardHandle {
  focusField: (network: SocialNetwork, field?: NetworkOptionField) => void;
}

interface NetworkOptionsCardProps {
  selectedNetworks: SocialNetwork[];
  networkOptions: NetworkOptions;
  onNetworkOptionsChange: (next: NetworkOptions) => void;
  caption: string;
  onCaptionChange: (next: string) => void;
  networkCaptions: Record<string, string>;
  onNetworkCaptionChange: (network: string, value: string) => void;
  useSeparateCaptions: boolean;
  mediaPreviewUrls: string[];
  disabled?: boolean;
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
  networkOptions,
  onNetworkOptionsChange,
  caption,
  onCaptionChange,
  networkCaptions,
  onNetworkCaptionChange,
  useSeparateCaptions,
  mediaPreviewUrls,
  disabled,
}, ref) {
  const [rootOpen, setRootOpen] = useState<string[]>([]);
  const [openNetworks, setOpenNetworks] = useState<string[]>([]);
  const [draftCollaborator, setDraftCollaborator] = useState('');
  const [mentionProfile, setMentionProfile] = useState('');
  const [mentionName, setMentionName] = useState('');
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [photoTagUsername, setPhotoTagUsername] = useState('');
  const [photoTagSlide, setPhotoTagSlide] = useState('0');
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

  const renderFirstComment = (network: 'instagram' | 'linkedin' | 'facebook') => {
    const limit = firstCommentLimit(network) ?? 0;
    const value = networkOptions[network]?.firstComment ?? '';
    const overBy = value.length - limit;
    return (
      <div className="space-y-2">
        <Label htmlFor={`${network}-first-comment`}>Primeiro comentário</Label>
        <Textarea
          id={`${network}-first-comment`}
          ref={setFieldRef(fieldKey(network, 'firstComment')) as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => updateNetwork(network, { firstComment: e.target.value } as never)}
          placeholder="Adiciona contexto extra ou um CTA aqui."
          disabled={disabled}
          className={cn('min-h-[96px] resize-none', overBy > 0 && 'border-destructive focus-visible:ring-destructive')}
        />
        <p className={cn('text-xs text-muted-foreground', overBy > 0 && 'text-destructive font-medium')}>
          {value.length}/{limit}{overBy > 0 && ` · excede ${overBy} caracteres`}
        </p>
      </div>
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

  const insertLinkedInMention = () => {
    if (!mentionProfile.trim() || !mentionName.trim()) return;
    const mentionText = `@[${mentionName.trim()}](${mentionProfile.trim()})`;
    if (useSeparateCaptions) {
      const current = networkCaptions.linkedin ?? caption;
      onNetworkCaptionChange('linkedin', `${current}${current ? ' ' : ''}${mentionText}`);
    } else {
      onCaptionChange(`${caption}${caption ? ' ' : ''}${mentionText}`);
    }
    updateNetwork('linkedin', { mentions: [...(networkOptions.linkedin?.mentions ?? []), { profile: mentionProfile.trim(), displayName: mentionName.trim() }] });
    setMentionProfile('');
    setMentionName('');
  };

  const addPhotoTagAtCenter = () => {
    const username = photoTagUsername.trim();
    if (!usernameRegex.test(username)) return;
    updateNetwork('instagram', {
      photoTags: [...(networkOptions.instagram?.photoTags ?? []), { username, x: 0.5, y: 0.5, slideIndex: Number(photoTagSlide) || 0 }],
    });
    setPhotoTagUsername('');
    setTagModalOpen(false);
  };

  const removeInstagramTag = (index: number) => {
    updateNetwork('instagram', { photoTags: (networkOptions.instagram?.photoTags ?? []).filter((_, i) => i !== index) });
  };

  const renderNetworkHeader = (network: SocialNetwork) => {
    const info = NETWORK_INFO[network];
    const Icon = info.icon;
    return <span className="flex items-center gap-2"><Icon className="h-4 w-4" style={{ color: info.color }} />{info.name}</span>;
  };

  const renderInstagram = () => (
    <div className="space-y-4">
      <Tabs value={networkOptions.instagram?.formatVariant ?? 'feed'} onValueChange={(value) => updateNetwork('instagram', { formatVariant: value as never })}>
        <TabsList className="w-full justify-start h-auto flex-wrap"><TabsTrigger value="feed">Feed</TabsTrigger><TabsTrigger value="story">Story</TabsTrigger><TabsTrigger value="reel">Reel</TabsTrigger><TabsTrigger value="carousel">Carousel</TabsTrigger></TabsList>
      </Tabs>
      {renderFirstComment('instagram')}
      <div className="space-y-2">
        <Label>Colaboradores (máx. 3)</Label>
        <div className="flex gap-2"><Input ref={setFieldRef(fieldKey('instagram', 'collaborators')) as React.Ref<HTMLInputElement>} value={draftCollaborator} onChange={(e) => setDraftCollaborator(e.target.value)} placeholder="@username" disabled={disabled || (networkOptions.instagram?.collaborators?.length ?? 0) >= 3} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCollaborator(); } }} /><Button type="button" onClick={addCollaborator} disabled={disabled}>Adicionar</Button></div>
        <div className="flex flex-wrap gap-2">{(networkOptions.instagram?.collaborators ?? []).map((name) => <Badge key={name} variant="secondary" className="gap-1">{name}<button type="button" onClick={() => updateNetwork('instagram', { collaborators: (networkOptions.instagram?.collaborators ?? []).filter(n => n !== name) })}>×</button></Badge>)}</div>
      </div>
      <div className="space-y-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setTagModalOpen(true)} disabled={disabled}><Plus className="h-4 w-4 mr-1" />Adicionar tag</Button>
        {(networkOptions.instagram?.photoTags ?? []).map((tag, index) => <div key={`${tag.username}-${index}`} className="flex items-center justify-between rounded-md border p-2 text-sm"><span>{tag.username} · slide {tag.slideIndex + 1} · {tag.x.toFixed(2)}, {tag.y.toFixed(2)}</span><Button type="button" variant="ghost" size="icon" onClick={() => removeInstagramTag(index)}><Trash2 className="h-4 w-4" /></Button></div>)}
      </div>
    </div>
  );

  const renderLinkedIn = () => (
    <div className="space-y-4">
      {renderFirstComment('linkedin')}
      <div className="space-y-2"><Label>@mention</Label><div className="grid sm:grid-cols-2 gap-2"><Input ref={setFieldRef(fieldKey('linkedin', 'linkedinMention')) as React.Ref<HTMLInputElement>} value={mentionProfile} onChange={(e) => setMentionProfile(e.target.value)} placeholder="username ou URL do perfil" disabled={disabled} /><Input value={mentionName} onChange={(e) => setMentionName(e.target.value)} placeholder="nome a apresentar" disabled={disabled} /></div><Button type="button" size="sm" onClick={insertLinkedInMention} disabled={disabled}>Inserir</Button></div>
      <label className="flex items-center gap-2 text-sm"><Checkbox ref={setFieldRef(fieldKey('linkedin', 'disableLinkPreview')) as React.Ref<HTMLButtonElement>} checked={!!networkOptions.linkedin?.disableLinkPreview} onCheckedChange={(checked) => updateNetwork('linkedin', { disableLinkPreview: checked === true })} disabled={disabled} />Desativar pré-visualização do link</label>
    </div>
  );

  const renderFacebook = () => <div className="space-y-4"><Tabs value={networkOptions.facebook?.formatVariant ?? 'feed'} onValueChange={(value) => updateNetwork('facebook', { formatVariant: value as never })}><TabsList className="w-full justify-start"><TabsTrigger value="feed">Feed</TabsTrigger><TabsTrigger value="story">Story</TabsTrigger><TabsTrigger value="reel">Reel</TabsTrigger></TabsList></Tabs>{renderFirstComment('facebook')}</div>;
  const renderYoutube = () => <div className="space-y-4"><div className="space-y-2"><Label>Título</Label><Input ref={setFieldRef(fieldKey('youtube', 'youtubeTitle')) as React.Ref<HTMLInputElement>} value={networkOptions.youtube?.title ?? ''} onChange={(e) => updateNetwork('youtube', { title: e.target.value })} maxLength={100} disabled={disabled} /><p className="text-xs text-muted-foreground">{(networkOptions.youtube?.title ?? '').length}/100</p></div><div className="space-y-2"><Label>Tags</Label><Input ref={setFieldRef(fieldKey('youtube', 'youtubeTags')) as React.Ref<HTMLInputElement>} placeholder="Enter para adicionar" disabled={disabled} onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { e.preventDefault(); updateNetwork('youtube', { tags: [...(networkOptions.youtube?.tags ?? []), e.currentTarget.value.trim()] }); e.currentTarget.value = ''; } }} /><div className="flex flex-wrap gap-2">{(networkOptions.youtube?.tags ?? []).map((tag) => <Badge key={tag} variant="secondary" className="gap-1">{tag}<button type="button" onClick={() => updateNetwork('youtube', { tags: (networkOptions.youtube?.tags ?? []).filter(t => t !== tag) })}>×</button></Badge>)}</div></div><div className="space-y-2"><Label>Visibilidade</Label><Tabs value={networkOptions.youtube?.visibility ?? 'public'} onValueChange={(value) => updateNetwork('youtube', { visibility: value as never })}><TabsList className="w-full justify-start h-auto flex-wrap"><TabsTrigger value="public">Público</TabsTrigger><TabsTrigger value="unlisted">Não listado</TabsTrigger><TabsTrigger value="private">Privado</TabsTrigger></TabsList></Tabs></div><div className="space-y-2"><Label>Categoria</Label><Select value={networkOptions.youtube?.categoryId ?? '22'} onValueChange={(value) => updateNetwork('youtube', { categoryId: value })}><SelectTrigger ref={setFieldRef(fieldKey('youtube', 'youtubeCategory')) as React.Ref<HTMLButtonElement>}><SelectValue /></SelectTrigger><SelectContent>{youtubeCategories.map(category => <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>)}</SelectContent></Select></div></div>;
  const renderGoogleBusiness = () => <div className="space-y-4"><label className="flex items-center gap-2 text-sm"><Checkbox ref={setFieldRef(fieldKey('googlebusiness', 'googleBusinessCta')) as React.Ref<HTMLButtonElement>} checked={!!networkOptions.googlebusiness?.ctaEnabled} onCheckedChange={(checked) => updateNetwork('googlebusiness', { ctaEnabled: checked === true })} disabled={disabled} />Adicionar botão de ação (opcional)</label>{networkOptions.googlebusiness?.ctaEnabled && <div className="grid sm:grid-cols-2 gap-2"><Select value={networkOptions.googlebusiness?.ctaType ?? 'learn_more'} onValueChange={(value) => updateNetwork('googlebusiness', { ctaType: value as never })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="book">Reservar</SelectItem><SelectItem value="order_online">Encomendar online</SelectItem><SelectItem value="buy">Comprar</SelectItem><SelectItem value="learn_more">Saber mais</SelectItem><SelectItem value="sign_up">Inscrever</SelectItem><SelectItem value="call_now">Ligar agora</SelectItem></SelectContent></Select>{networkOptions.googlebusiness?.ctaType !== 'call_now' && <Input value={networkOptions.googlebusiness?.ctaUrl ?? ''} onChange={(e) => updateNetwork('googlebusiness', { ctaUrl: e.target.value })} placeholder="https://..." disabled={disabled} />}</div>}</div>;

  if (selectedNetworks.length === 0) return null;

  return (
    <Card className="border-0 sm:border shadow-none sm:shadow-sm">
      <Accordion type="multiple" value={rootOpen} onValueChange={setRootOpen}>
        <AccordionItem value="network-options" className="border-b-0">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-0"><AccordionTrigger className="py-0 hover:no-underline"><CardTitle className="text-base sm:text-lg">Opções por rede</CardTitle></AccordionTrigger></CardHeader>
          <AccordionContent className="px-3 sm:px-6 pb-4 sm:pb-6 pt-3">
            <CardContent className="p-0"><Accordion type="multiple" value={openNetworks} onValueChange={setOpenNetworks} className="space-y-2">{selectedNetworks.map(network => <AccordionItem key={network} value={network} className="rounded-lg border px-3"><AccordionTrigger ref={setFieldRef(fieldKey(network)) as React.Ref<HTMLButtonElement>} className="hover:no-underline">{renderNetworkHeader(network)}</AccordionTrigger><AccordionContent>{network === 'instagram' && renderInstagram()}{network === 'linkedin' && renderLinkedIn()}{network === 'facebook' && renderFacebook()}{network === 'youtube' && renderYoutube()}{network === 'googlebusiness' && renderGoogleBusiness()}</AccordionContent></AccordionItem>)}</Accordion></CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}><DialogContent><DialogHeader><DialogTitle>Adicionar tag na fotografia</DialogTitle><DialogDescription>Define a pessoa e o slide onde a tag será aplicada.</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground flex gap-2"><Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />Nesta versão, a tag é adicionada automaticamente ao centro da imagem.</div><Input value={photoTagUsername} onChange={(e) => setPhotoTagUsername(e.target.value)} placeholder="@username" />{mediaPreviewUrls.length > 1 && <Select value={photoTagSlide} onValueChange={setPhotoTagSlide}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{mediaPreviewUrls.map((_, index) => <SelectItem key={index} value={String(index)}>Slide {index + 1}</SelectItem>)}</SelectContent></Select>}<Button type="button" onClick={addPhotoTagAtCenter}>Adicionar no centro</Button></div></DialogContent></Dialog>
    </Card>
  );
});