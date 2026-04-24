import { getNetworkFromFormat, SocialNetwork } from '@/types/social';
import { firstCommentLimit } from '@/types/networkOptions';
import { ValidationIssue, ValidatorContext } from '../types';

const usernameRegex = /^@[A-Za-z0-9._]{1,30}$/;

function invalidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return !['http:', 'https:'].includes(url.protocol);
  } catch {
    return true;
  }
}

export async function networkOptionsValidator(ctx: ValidatorContext): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const networks = new Set(ctx.selectedFormats.map(f => getNetworkFromFormat(f)));
  const options = ctx.networkOptions ?? {};
  const storyLinkSelected = ctx.selectedFormats.includes('instagram_story_link');

  if (storyLinkSelected && ctx.selectedFormats.length > 1) {
    issues.push({
      id: 'network-options:instagram-story-link:exclusive-format',
      severity: 'error',
      category: 'platform',
      platform: 'instagram',
      format: 'instagram_story_link',
      title: 'Story com Link deve ser isolada',
      description: 'Cria a Story com Link separadamente para manter o fluxo semi-automático e evitar publicação direta por engano.',
    });
  }

  (['instagram', 'linkedin', 'facebook'] as SocialNetwork[]).forEach((network) => {
    if (!networks.has(network)) return;
    const value = network === 'instagram'
      ? options.instagram?.firstComment ?? ''
      : network === 'linkedin'
        ? options.linkedin?.firstComment ?? ''
        : options.facebook?.firstComment ?? '';
    const limit = firstCommentLimit(network);
    if (limit && value.length > limit) {
      issues.push({
        id: `network-options:${network}:first-comment-length`,
        severity: 'error',
        category: 'caption',
        platform: network,
        title: 'First comment demasiado longo',
        description: `O primeiro comentário tem ${value.length}/${limit} caracteres. Reduz o texto para publicar nesta rede.`,
        autoFixable: !!ctx.fixHelpers?.focusNetworkOption,
        fixLabel: 'Editar first comment',
        fixAction: () => ctx.fixHelpers?.focusNetworkOption?.(network, 'firstComment'),
      });
    }
  });

  if (networks.has('instagram')) {
    if (storyLinkSelected) {
      const linkUrl = options.instagram?.storyLinkUrl?.trim() ?? '';
      if (!linkUrl || invalidUrl(linkUrl)) {
        issues.push({
          id: 'network-options:instagram-story-link:invalid-url',
          severity: 'error',
          category: 'platform',
          platform: 'instagram',
          format: 'instagram_story_link',
          title: 'Link sticker obrigatório',
          description: 'Adiciona um URL válido para preparar a Story com Link.',
          autoFixable: !!ctx.fixHelpers?.focusNetworkOption,
          fixLabel: 'Editar link',
          fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('instagram', 'instagramStoryLink'),
        });
      }
    }

    const collaborators = options.instagram?.collaborators ?? [];
    if (collaborators.length > 3) {
      issues.push({ id: 'network-options:instagram:too-many-collaborators', severity: 'error', category: 'platform', platform: 'instagram', title: 'Demasiados colaboradores', description: 'O Instagram permite no máximo 3 colaboradores por publicação.', autoFixable: !!ctx.fixHelpers?.focusNetworkOption, fixLabel: 'Editar colaboradores', fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('instagram', 'collaborators') });
    }
    collaborators.filter(name => !usernameRegex.test(name)).forEach((name) => {
      issues.push({ id: `network-options:instagram:invalid-collaborator:${name}`, severity: 'error', category: 'platform', platform: 'instagram', title: 'Colaborador inválido', description: `${name} deve começar por @ e não pode ter espaços.`, autoFixable: !!ctx.fixHelpers?.focusNetworkOption, fixLabel: 'Editar colaboradores', fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('instagram', 'collaborators') });
    });
    (options.instagram?.photoTags ?? []).forEach((tag, index) => {
      if (tag.x < 0 || tag.x > 1 || tag.y < 0 || tag.y > 1) {
        issues.push({ id: `network-options:instagram:photo-tag-coordinates:${index}`, severity: 'error', category: 'platform', platform: 'instagram', title: 'Coordenadas da tag inválidas', description: 'As coordenadas X e Y têm de estar entre 0.0 e 1.0.', autoFixable: !!ctx.fixHelpers?.focusNetworkOption, fixLabel: 'Editar tags', fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('instagram', 'instagramPhotoTags') });
      }
    });
  }

  if (networks.has('linkedin')) {
    (options.linkedin?.mentions ?? []).forEach((mention, index) => {
      const profile = mention.profile.trim();
      const valid = profile.startsWith('@') ? usernameRegex.test(profile) : !invalidUrl(profile);
      if (!valid) {
        issues.push({ id: `network-options:linkedin:invalid-mention:${index}`, severity: 'warning', category: 'caption', platform: 'linkedin', title: '@mention LinkedIn a rever', description: 'Usa um @username válido ou um URL completo de perfil.', autoFixable: !!ctx.fixHelpers?.focusNetworkOption, fixLabel: 'Editar menção', fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('linkedin', 'linkedinMention') });
      }
    });
  }

  if (networks.has('youtube')) {
    const youtube = options.youtube;
    const tagsTotal = (youtube?.tags ?? []).join(',').length;
    if (!youtube?.category) issues.push({ id: 'network-options:youtube:missing-category', severity: 'error', category: 'platform', platform: 'youtube', title: 'Categoria YouTube obrigatória', description: 'Escolhe uma categoria para publicar no YouTube.', autoFixable: !!ctx.fixHelpers?.focusNetworkOption, fixLabel: 'Escolher categoria', fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('youtube', 'youtubeCategory') });
    if ((youtube?.title ?? '').length > 100) issues.push({ id: 'network-options:youtube:title-length', severity: 'error', category: 'caption', platform: 'youtube', title: 'Título YouTube demasiado longo', description: 'O título do YouTube pode ter no máximo 100 caracteres.', autoFixable: !!ctx.fixHelpers?.focusNetworkOption, fixLabel: 'Editar título', fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('youtube', 'youtubeTitle') });
    if (tagsTotal > 500) issues.push({ id: 'network-options:youtube:tags-length', severity: 'error', category: 'platform', platform: 'youtube', title: 'Tags YouTube demasiado longas', description: `As tags têm ${tagsTotal}/500 caracteres no total.`, autoFixable: !!ctx.fixHelpers?.focusNetworkOption, fixLabel: 'Editar tags', fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('youtube', 'youtubeTags') });
  }

  if (networks.has('googlebusiness')) {
    const gbp = options.googlebusiness;
    if (gbp?.ctaEnabled && gbp.ctaType !== 'call_now' && (!gbp.ctaUrl || invalidUrl(gbp.ctaUrl))) {
      issues.push({ id: 'network-options:googlebusiness:invalid-cta-url', severity: 'error', category: 'platform', platform: 'googlebusiness', title: 'URL do CTA inválido', description: 'Adiciona um URL válido para o botão de call-to-action do Google Business.', autoFixable: !!ctx.fixHelpers?.focusNetworkOption, fixLabel: 'Editar CTA', fixAction: () => ctx.fixHelpers?.focusNetworkOption?.('googlebusiness', 'googleBusinessCta') });
    }
  }

  return issues;
}