import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PendingThumbnail } from '@/components/PendingThumbnail';

vi.mock('@/lib/media/videoFrameExtractor',()=>({extractVideoFrame:vi.fn(async()=>{throw new Error('Sem acesso ao frame');})}));
afterEach(cleanup);
const base = {id:'d1',type:'draft' as const,thumbnail:null,mediaType:'unknown' as const,mediaCount:0,caption:'Um texto editorial guardado',createdAt:'2026-10-19T10:00:00Z',route:'/drafts',onNavigate:vi.fn()};

it('explica a ausência de ficheiros e permite abrir o texto; eliminar continua uma ação separada',()=>{
 const abrir=vi.fn(),eliminar=vi.fn();render(<PendingThumbnail {...base} onNavigate={abrir} onDelete={eliminar}/>);
 expect(screen.getByText('Sem imagem associada')).toBeVisible();
 expect(screen.queryByRole('img')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Abrir Rascunho: Um texto editorial guardado'}));expect(abrir).toHaveBeenCalledWith('/drafts');
 fireEvent.click(screen.getByRole('button',{name:'Eliminar rascunho'}));expect(eliminar).toHaveBeenCalledOnce();expect(abrir).toHaveBeenCalledOnce();
});
it('distingue uma imagem indisponível e recupera ao repetir ou receber uma nova imagem',()=>{
 const p={...base,thumbnail:'https://example.com/antiga.png',mediaType:'image' as const,mediaCount:1};
 const r=render(<PendingThumbnail {...p}/>);fireEvent.error(screen.getByRole('img'));
 expect(screen.getByText('Pré-visualização indisponível')).toBeVisible();expect(screen.queryByText('Sem imagem associada')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Recarregar pré-visualização'}));expect(screen.getByRole('img')).toHaveAttribute('src',p.thumbnail);
 fireEvent.error(screen.getByRole('img'));r.rerender(<PendingThumbnail {...p} thumbnail="https://example.com/nova.png"/>);
 expect(screen.getByRole('img')).toHaveAttribute('src','https://example.com/nova.png');expect(screen.queryByText('Pré-visualização indisponível')).not.toBeInTheDocument();
});
it('abre a capa de um PDF quando existe e identifica o PDF quando só existe o original',()=>{
 const p={...base,thumbnail:'https://example.com/original.pdf',mediaUrl:'https://example.com/original.pdf',mediaType:'document' as const,mediaCount:1};
 const r=render(<PendingThumbnail {...p}/>);expect(screen.getByText('Documento PDF')).toBeVisible();expect(screen.queryByRole('img')).not.toBeInTheDocument();
 r.rerender(<PendingThumbnail {...p} thumbnail="https://example.com/capa.png"/>);expect(screen.getByRole('img')).toHaveAttribute('src','https://example.com/capa.png');
});
it('utiliza o poster de vídeo disponível sem tentar lê-lo como um vídeo',()=>{
 render(<PendingThumbnail {...base} mediaType="video" mediaUrl="https://example.com/video.mp4" thumbnail="https://example.com/poster.png" hasPosterPreview mediaCount={1}/>);
 expect(screen.getByRole('img')).toHaveAttribute('src','https://example.com/poster.png');expect(document.querySelector('video')).toBeNull();
});
