

## Refinamento: Fallback de vídeo na grid lateral

### Problema
Na grid lateral (Posts Feed, linha 1509-1527), quando o `<video>` falha a carregar, o `onError` tenta navegar para `parentElement.nextElementSibling` — mas não existe um elemento de fallback. O utilizador vê uma área completamente vazia.

No CustomEvent (células do calendário) este problema não existe porque o fallback `div` está como irmão directo do `<video>`.

### Correcção (1 ficheiro, 1 local)

**`src/pages/Calendar.tsx` — linhas 1509-1527**

Adicionar um `div` de fallback (inicialmente `hidden`) dentro do container, e ajustar o `onError` para o mostrar:

```tsx
<div className="relative w-full h-full">
  <video
    src={getFirstVideoUrl(event.resource)!}
    preload="metadata"
    muted
    playsInline
    className="w-full h-full object-cover"
    onError={(e) => {
      const target = e.currentTarget;
      target.style.display = 'none';
      const fallback = target.nextElementSibling;
      if (fallback) (fallback as HTMLElement).classList.remove('hidden');
    }}
  />
  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex-col items-center justify-center p-2 gap-1 hidden">
    <Video className="h-5 w-5 text-muted-foreground" />
    <span className="text-[9px] text-muted-foreground font-medium">Vídeo</span>
  </div>
  <div className="absolute bottom-1 right-1 bg-black/60 rounded p-0.5">
    <Video className="h-3 w-3 text-white" />
  </div>
</div>
```

Alteração mínima — apenas adiciona o fallback visual que faltava e corrige a navegação DOM do `onError`.

